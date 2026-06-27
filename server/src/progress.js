/**
 * Fortschritts-API unter /api/progress. Spiegelt die Client-Struktur:
 * Map von item_id → { status, box, due, lastSeen, lastResult, history,
 * stability, difficulty, reps, lapses, last_review }. Die FSRS-Felder
 * (stability/difficulty/reps/lapses/last_review) werden mitpersistiert, damit
 * der Spaced-Repetition-Zustand auch geräteübergreifend (Login) erhalten bleibt.
 * Alle Routen erfordern eine gültige Sitzung (preHandler `requireAuth`).
 */

/** DB-Zeile → Client-Eintrag (nur gesetzte Felder). */
function rowToEntry(row) {
  const e = {};
  if (row.status != null) e.status = row.status;
  if (row.box != null) e.box = row.box;
  if (row.due != null) e.due = row.due;
  if (row.last_seen != null) e.lastSeen = row.last_seen;
  if (row.last_result != null) e.lastResult = row.last_result;
  if (row.stability != null) e.stability = row.stability;
  if (row.difficulty != null) e.difficulty = row.difficulty;
  if (row.reps != null) e.reps = row.reps;
  if (row.lapses != null) e.lapses = row.lapses;
  if (row.last_review != null) e.last_review = row.last_review;
  if (row.history != null) {
    try {
      e.history = JSON.parse(row.history);
    } catch {
      /* defekte Historie ignorieren */
    }
  }
  return e;
}

/** Upsert eines Eintrags für (user, item). */
function upsert(db, userId, itemId, entry) {
  const history = Array.isArray(entry.history) ? JSON.stringify(entry.history.slice(-20)) : null;
  db.prepare(
    `INSERT INTO progress
       (user_id, item_id, status, box, due, last_seen, last_result, history,
        stability, difficulty, reps, lapses, last_review, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, item_id) DO UPDATE SET
       status=excluded.status, box=excluded.box, due=excluded.due,
       last_seen=excluded.last_seen, last_result=excluded.last_result,
       history=excluded.history, stability=excluded.stability,
       difficulty=excluded.difficulty, reps=excluded.reps, lapses=excluded.lapses,
       last_review=excluded.last_review, updated_at=excluded.updated_at`
  ).run(
    userId,
    itemId,
    entry.status ?? null,
    entry.box ?? null,
    entry.due ?? null,
    entry.lastSeen ?? null,
    entry.lastResult ?? null,
    history,
    entry.stability ?? null,
    entry.difficulty ?? null,
    entry.reps ?? null,
    entry.lapses ?? null,
    entry.last_review ?? null,
    new Date().toISOString()
  );
}

export async function progressRoutes(app) {
  const { db } = app;

  // Alle folgenden Routen brauchen Login.
  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
  });

  // Gesamten Fortschritt als Map laden.
  app.get('/api/progress', async (req) => {
    const rows = db.prepare('SELECT * FROM progress WHERE user_id = ?').all(req.user.id);
    const map = {};
    for (const r of rows) map[r.item_id] = rowToEntry(r);
    return { progress: map };
  });

  // Einen Eintrag setzen/aktualisieren.
  app.put('/api/progress/:itemId', async (req, reply) => {
    const { itemId } = req.params;
    const entry = req.body || {};
    if (typeof itemId !== 'string' || !itemId) {
      return reply.code(400).send({ error: 'itemId fehlt.' });
    }
    upsert(db, req.user.id, itemId, entry);
    return { ok: true };
  });

  // Nicht-destruktives Zusammenführen (für die Migration lokaler Daten):
  // nur fehlende Einträge werden übernommen, vorhandene bleiben unangetastet.
  app.post('/api/progress/merge', async (req, reply) => {
    const incoming = req.body?.progress;
    if (!incoming || typeof incoming !== 'object') {
      return reply.code(400).send({ error: 'progress-Map erforderlich.' });
    }
    const existing = new Set(
      db.prepare('SELECT item_id FROM progress WHERE user_id = ?').all(req.user.id).map((r) => r.item_id)
    );
    let imported = 0;
    db.exec('BEGIN');
    try {
      for (const [itemId, entry] of Object.entries(incoming)) {
        if (existing.has(itemId)) continue;
        if (entry && typeof entry === 'object') {
          upsert(db, req.user.id, itemId, entry);
          imported += 1;
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return { imported };
  });

  // Fortschritt zurücksetzen.
  app.delete('/api/progress', async (req) => {
    db.prepare('DELETE FROM progress WHERE user_id = ?').run(req.user.id);
    return { ok: true };
  });
}
