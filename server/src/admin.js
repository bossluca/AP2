import { einladungGueltig } from './lib/einladung.js';
import { erstelleEinladung } from './einladung-cli.js';

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
    db.prepare('DELETE FROM users WHERE id = ?').run(konto.id);
    return { ok: true };
  });

  app.post('/api/admin/invites', async (req, reply) => {
    const { maxUses = 1, gueltigTage = 14, notiz = '' } = req.body || {};
    try {
      // Klartext nur in dieser Antwort – gespeichert ist nur der Hash.
      const neu = erstelleEinladung(db, { maxUses, gueltigTage, notiz, erstelltVon: req.user.id });
      return reply.code(201).send(neu);
    } catch (err) {
      if (err instanceof RangeError) return reply.code(400).send({ error: err.message });
      throw err;
    }
  });

  app.delete('/api/admin/invites/:id', async (req, reply) => {
    const info = db.prepare('DELETE FROM invites WHERE id = ?').run(Number(req.params.id));
    if (Number(info.changes) === 0) return reply.code(404).send({ error: 'Einladung nicht gefunden.' });
    return { ok: true };
  });
}
