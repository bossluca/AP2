import { randomBytes } from 'node:crypto';
import { normalisiereEinladung } from './lib/einladung.js';

/** Alphabet ohne verwechselbare Zeichen (kein I/O/0/1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
/** Höchstens so viele eigene Gruppen je Konto (Missbrauchsbremse). */
const MAX_EIGENE = 10;

/** Beitritts-Code `XXXX-XXXX` (~40 Bit; Brute-Force bremst das Rate-Limit). */
export function erzeugeGruppenCode() {
  const bytes = randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) code += '-';
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Gruppenname: 3–40 Zeichen, Whitespace normalisiert. */
export function pruefeGruppenname(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim().replace(/\s+/g, ' ');
  return n.length >= 3 && n.length <= 40 ? n : null;
}

/**
 * Lerngruppen unter /api/gruppen: anlegen, per Code beitreten, verlassen.
 * Wer Mitglied ist, erscheint in der Gruppen-Rangliste (`/api/rangliste?gruppe=`)
 * mit seinem Anzeigenamen – deshalb ist ein Anzeigename Voraussetzung.
 *
 * Alle Routen erfordern eine gültige Sitzung.
 */
export async function gruppenRoutes(app) {
  const { db } = app;

  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
  });

  const brauchtName = (req, reply) => {
    const row = db.prepare('SELECT anzeigename FROM users WHERE id = ?').get(req.user.id);
    if (!row?.anzeigename) {
      reply.code(400).send({ error: 'Lege zuerst einen Anzeigenamen fest (Rangliste → Profil).' });
      return false;
    }
    return true;
  };

  const meineGruppen = (userId) =>
    db
      .prepare(
        `SELECT g.id, g.name, g.code, g.created_by,
                (SELECT COUNT(*) FROM gruppen_mitglieder x WHERE x.gruppe_id = g.id) AS mitglieder
           FROM gruppen g JOIN gruppen_mitglieder m ON m.gruppe_id = g.id
          WHERE m.user_id = ?
          ORDER BY g.name`
      )
      .all(userId)
      .map((g) => ({
        id: g.id,
        name: g.name,
        code: g.code,
        mitglieder: g.mitglieder,
        erstellt: g.created_by === userId,
      }));

  app.get('/api/gruppen', async (req) => ({ gruppen: meineGruppen(req.user.id) }));

  app.post('/api/gruppen', async (req, reply) => {
    if (!brauchtName(req, reply)) return reply;
    const name = pruefeGruppenname(req.body?.name);
    if (!name) return reply.code(400).send({ error: 'Gruppenname: 3–40 Zeichen.' });
    const anzahl = db.prepare('SELECT COUNT(*) AS n FROM gruppen WHERE created_by = ?').get(req.user.id).n;
    if (anzahl >= MAX_EIGENE) {
      return reply.code(400).send({ error: `Höchstens ${MAX_EIGENE} eigene Gruppen.` });
    }
    const jetzt = new Date().toISOString();
    const code = erzeugeGruppenCode();
    const info = db
      .prepare('INSERT INTO gruppen (name, code, created_by, created_at) VALUES (?, ?, ?, ?)')
      .run(name, code, req.user.id, jetzt);
    db.prepare('INSERT INTO gruppen_mitglieder (gruppe_id, user_id, joined_at) VALUES (?, ?, ?)').run(
      Number(info.lastInsertRowid),
      req.user.id,
      jetzt
    );
    return reply.code(201).send({ gruppe: { id: Number(info.lastInsertRowid), name, code } });
  });

  app.post('/api/gruppen/beitreten', async (req, reply) => {
    if (!brauchtName(req, reply)) return reply;
    // Gleiche Bremse wie der Login, damit Codes nicht durchprobiert werden.
    const schluessel = `${req.ip}|gruppe`;
    const limit = app.loginLimiter.pruefe(schluessel);
    if (!limit.erlaubt) {
      reply.header('Retry-After', String(limit.retryNachSek));
      return reply.code(429).send({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' });
    }
    const norm = normalisiereEinladung(req.body?.code);
    const gruppe = norm
      ? db.prepare("SELECT id, name FROM gruppen WHERE replace(code, '-', '') = ?").get(norm)
      : null;
    if (!gruppe) return reply.code(404).send({ error: 'Keine Gruppe mit diesem Code gefunden.' });
    app.loginLimiter.erfolg(schluessel);
    db.prepare(
      'INSERT OR IGNORE INTO gruppen_mitglieder (gruppe_id, user_id, joined_at) VALUES (?, ?, ?)'
    ).run(gruppe.id, req.user.id, new Date().toISOString());
    return { gruppe: { id: gruppe.id, name: gruppe.name } };
  });

  app.delete('/api/gruppen/:id/mitgliedschaft', async (req, reply) => {
    const id = Number(req.params.id);
    const info = db
      .prepare('DELETE FROM gruppen_mitglieder WHERE gruppe_id = ? AND user_id = ?')
      .run(id, req.user.id);
    if (Number(info.changes) === 0) return reply.code(404).send({ error: 'Keine Mitgliedschaft.' });
    // Leere Gruppen aufräumen.
    db.prepare(
      'DELETE FROM gruppen WHERE id = ? AND NOT EXISTS (SELECT 1 FROM gruppen_mitglieder WHERE gruppe_id = ?)'
    ).run(id, id);
    return { ok: true };
  });
}
