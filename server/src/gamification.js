/**
 * Gamification-API unter /api/gamification – speichert den lokalen Gamification-
 * Stand (Aktivitäts-Log, XP, bestes Klausur-Ergebnis) **pro Nutzer**, damit
 * Streak/XP/Quests kontogebunden und geräteübergreifend sind. Der Client mischt
 * beim Login den lokalen Stand mit dem Server-Stand (max-basiert) und schreibt
 * danach durch (PUT = Overwrite des kompletten Blobs).
 *
 * Alle Routen erfordern eine gültige Sitzung.
 */

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

  app.put('/api/gamification', async (req) => {
    const g = req.body || {};
    const activity = g.activity && typeof g.activity === 'object' ? JSON.stringify(g.activity) : '{}';
    const xp = Number.isFinite(g.xp) ? Math.floor(g.xp) : 0;
    const klausurBest = Number.isFinite(g.klausurBest) ? Math.floor(g.klausurBest) : 0;
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
