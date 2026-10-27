/**
 * Gamification-API unter /api/gamification – speichert den lokalen Gamification-
 * Stand (Aktivitäts-Log, XP, bestes Klausur-Ergebnis) **pro Nutzer**, damit
 * Streak/XP/Quests kontogebunden und geräteübergreifend sind. Der Client mischt
 * beim Login den lokalen Stand mit dem Server-Stand (max-basiert) und schreibt
 * danach durch (PUT = Overwrite des kompletten Blobs).
 *
 * Alle Routen erfordern eine gültige Sitzung.
 *
 * C3: Der Stand wird über `pruefeGamification` geprüft (Tages-Schlüssel,
 * Wertebereiche; ungültig → 400). `activity` wird auf die jüngsten 400 Tage
 * gekürzt, damit langjährige Nutzer nicht aus dem Sync fallen.
 */
import { pruefeGamification } from './lib/validierung.js';

/** DB-Zeile → Client-Stand (oder null, wenn noch nichts gespeichert). */
function rowToGami(row) {
  if (!row) return null;
  let activity = {};
  try {
    activity = row.activity ? JSON.parse(row.activity) : {};
  } catch {
    activity = {};
  }
  return { activity, xp: row.xp || 0, klausurBest: row.klausur_best || 0 };
}

export async function gamificationRoutes(app) {
  const { db } = app;

  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
  });

  app.get('/api/gamification', async (req) => {
    const row = db.prepare('SELECT * FROM gamification WHERE user_id = ?').get(req.user.id);
    return { gamification: rowToGami(row) };
  });

  app.put('/api/gamification', async (req, reply) => {
    const ergebnis = pruefeGamification(req.body ?? {});
    if (ergebnis.fehler) return reply.code(400).send({ error: `Ungültiger Stand: ${ergebnis.fehler}` });
    const { stand } = ergebnis;
    const activity = JSON.stringify(stand.activity);
    const { xp, klausurBest } = stand;
    db.prepare(
      `INSERT INTO gamification (user_id, activity, xp, klausur_best, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         activity=excluded.activity, xp=excluded.xp,
         klausur_best=excluded.klausur_best, updated_at=excluded.updated_at`
    ).run(req.user.id, activity, xp, klausurBest, new Date().toISOString());
    return { ok: true };
  });
}
