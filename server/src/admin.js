import { einladungGueltig } from './lib/einladung.js';
import { erstelleEinladung } from './einladung-cli.js';
import { loescheKonto } from './auth.js';
import { auditAbfrage } from './lib/audit.js';

/**
 * Admin-Bereich unter /api/admin – nur für Konten aus `ADMIN_EMAILS`.
 * Konten ansehen/sperren/löschen und Einladungs-Codes verwalten, damit eine
 * selbst gehostete Instanz ohne SQL-Zugriff betreibbar ist.
 */
export async function adminRoutes(app) {
  const { db } = app;

  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
    if (!req.user.admin) return reply.code(403).send({ error: 'Nur für Admins.' });
  });

  /** Konto-ID aus dem Pfad; Admins können sich nicht selbst sperren/löschen. */
  function zielKonto(req, reply) {
    const id = Number(req.params.id);
    const konto = Number.isInteger(id) ? db.prepare('SELECT id, email FROM users WHERE id = ?').get(id) : null;
    if (!konto) {
      reply.code(404).send({ error: 'Konto nicht gefunden.' });
      return null;
    }
    if (konto.id === req.user.id) {
      reply.code(400).send({ error: 'Das eigene Konto kann hier nicht geändert werden.' });
      return null;
    }
    return konto;
  }

  app.get('/api/admin/uebersicht', async () => {
    const konten = db
      .prepare(
        `SELECT u.id, u.email, u.created_at, u.gesperrt, u.anzeigename,
                g.xp, g.updated_at AS zuletzt_aktiv,
                (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS eintraege
           FROM users u LEFT JOIN gamification g ON g.user_id = u.id
          ORDER BY u.created_at DESC`
      )
      .all()
      .map((k) => ({
        id: k.id,
        email: k.email,
        erstellt: k.created_at,
        gesperrt: k.gesperrt === 1,
        admin: app.config.adminEmails.has(k.email),
        anzeigename: k.anzeigename || null,
        xp: k.xp || 0,
        zuletztAktiv: k.zuletzt_aktiv || null,
        eintraege: k.eintraege,
      }));
    const jetzt = new Date();
    const einladungen = db
      .prepare('SELECT * FROM invites ORDER BY created_at DESC')
      .all()
      .map((e) => ({
        id: e.id,
        hinweis: e.hinweis,
        notiz: e.notiz || '',
        maxUses: e.max_uses,
        uses: e.uses,
        erstellt: e.created_at,
        laeuftAb: e.expires_at,
        gueltig: einladungGueltig(e, jetzt),
      }));
    return { registrierung: app.config.registrierung, konten, einladungen };
  });

  app.patch('/api/admin/users/:id', async (req, reply) => {
    const konto = zielKonto(req, reply);
    if (!konto) return reply;
    const { gesperrt } = req.body || {};
    if (typeof gesperrt !== 'boolean') return reply.code(400).send({ error: 'gesperrt muss true/false sein.' });
    db.prepare('UPDATE users SET gesperrt = ? WHERE id = ?').run(gesperrt ? 1 : 0, konto.id);
    // Sperren beendet alle Sitzungen sofort.
    if (gesperrt) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(konto.id);
    app.audit(req, {
      ereignis: gesperrt ? 'konto_gesperrt' : 'konto_entsperrt',
      kontoId: konto.id,
      detail: `durch Admin #${req.user.id}`,
    });
    return { ok: true };
  });

  app.delete('/api/admin/users/:id', async (req, reply) => {
    const konto = zielKonto(req, reply);
    if (!konto) return reply;
    // Admin-Konten nie löschen: Die Rolle hängt an der E-Mail, ein neues Konto mit
    // Einladungscode würde sie erben (S18).
    if (app.config.adminEmails.has(konto.email)) {
      return reply.code(409).send({
        error: 'Admin-Konten können nicht gelöscht werden. Entferne die E-Mail zuerst aus ADMIN_EMAILS.',
      });
    }
    loescheKonto(db, konto.id);
    app.audit(req, { ereignis: 'konto_geloescht', detail: `Konto #${konto.id} durch Admin #${req.user.id}` });
    return { ok: true };
  });

  app.post('/api/admin/invites', async (req, reply) => {
    const { maxUses = 1, gueltigTage = 14, notiz = '' } = req.body || {};
    try {
      // Klartext nur in dieser Antwort – gespeichert ist nur der Hash.
      const neu = erstelleEinladung(db, { maxUses, gueltigTage, notiz, erstelltVon: req.user.id });
      // Nur ID und Rahmen, nie der Code (auch nicht der Hinweis-Präfix).
      app.audit(req, {
        ereignis: 'einladung_erzeugt',
        kontoId: req.user.id,
        detail: `Einladung #${neu.id}, max. ${neu.maxUses} Nutzung(en), ${neu.laeuftAb ? 'befristet' : 'unbefristet'}`,
      });
      return reply.code(201).send(neu);
    } catch (err) {
      if (err instanceof RangeError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });

  app.delete('/api/admin/invites/:id', async (req, reply) => {
    const info = db.prepare('DELETE FROM invites WHERE id = ?').run(Number(req.params.id));
    if (Number(info.changes) === 0) return reply.code(404).send({ error: 'Einladung nicht gefunden.' });
    app.audit(req, { ereignis: 'einladung_geloescht', kontoId: req.user.id, detail: `Einladung #${Number(req.params.id)}` });
    return { ok: true };
  });

  // Sicherheitsprotokoll lesen (S8/C6): neueste zuerst, `limit` max 500,
  // optional nach Ereignis gefiltert. Die E-Mail kommt per Join nur hier im
  // Admin-Bereich dazu – gespeichert wird sie im Protokoll nie.
  app.get('/api/admin/audit', async (req, reply) => {
    const abfrage = auditAbfrage(req.query);
    if (!abfrage.ok) return reply.code(400).send({ error: abfrage.fehler });
    const eintraege = db
      .prepare(
        `SELECT a.id, a.zeit, a.ereignis, a.konto_id, u.email, a.ip, a.detail
           FROM audit a LEFT JOIN users u ON u.id = a.konto_id
          WHERE (? IS NULL OR a.ereignis = ?)
          ORDER BY a.zeit DESC, a.id DESC
          LIMIT ?`
      )
      .all(abfrage.ereignis, abfrage.ereignis, abfrage.limit)
      .map((z) => ({
        id: z.id,
        zeit: z.zeit,
        ereignis: z.ereignis,
        kontoId: z.konto_id ?? null,
        email: z.email ?? null,
        ip: z.ip ?? null,
        detail: z.detail ?? '',
      }));
    return { eintraege };
  });
}
