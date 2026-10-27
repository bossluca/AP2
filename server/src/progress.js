/**
 * Fortschritts-API unter /api/progress. Spiegelt die Client-Struktur:
 * Map von item_id → { status, box, due, lastSeen, lastResult, history,
 * stability, difficulty, reps, lapses, last_review }. Die FSRS-Felder
 * (stability/difficulty/reps/lapses/last_review) werden mitpersistiert, damit
 * der Spaced-Repetition-Zustand auch geräteübergreifend (Login) erhalten bleibt.
 * Alle Routen erfordern eine gültige Sitzung (preHandler `requireAuth`).
 *
 * C3: Eingaben werden über `lib/validierung.js` geprüft (ungültig → 400), je
 * Konto gilt eine Obergrenze an Einträgen, und der Client-Zeitstempel
 * `updatedAt` wird als `client_updated_at` gespeichert: ein PUT mit älterem
 * Stand überschreibt keinen neueren (Schutz vor veralteten Outbox-Einträgen).
 */
import { pruefeItemId, pruefeProgressEintrag } from './lib/validierung.js';

/**
 * Obergrenzen je Konto. Bewusst ein veränderbares Objekt, damit Tests die
 * Grenze klein setzen können (Routen lesen den Wert bei jedem Request).
 */
export const PROGRESS_GRENZEN = { maxEintraege: 5000 };

/**
 * Zeitstempel, mit dem verglichen/gespeichert wird: Client-`updatedAt`, aber
 * höchstens „jetzt“ (Server-Uhr). Eine vorgehende Geräteuhr kann so nicht alle
 * späteren Stände anderer Geräte blockieren.
 * @param {string|undefined} updatedAt  bereits validierter ISO-String
 * @param {Date} jetzt
 * @returns {string|null} ISO-String (UTC) oder null
 */
function effektiverZeitstempel(updatedAt, jetzt) {
  if (!updatedAt) return null;
  const ms = Math.min(Date.parse(updatedAt), jetzt.getTime());
  return new Date(ms).toISOString();
}

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
  if (row.client_updated_at != null) e.updatedAt = row.client_updated_at;
  if (row.history != null) {
    try {
      e.history = JSON.parse(row.history);
    } catch {
      /* defekte Historie ignorieren */
    }
  }
  return e;
}

/**
 * Upsert eines (bereits validierten) Eintrags für (user, item).
 * @param {string|null} clientTs  effektiver Client-Zeitstempel (s. oben)
 */
function upsert(db, userId, itemId, entry, clientTs, jetzt) {
  const history = Array.isArray(entry.history) ? JSON.stringify(entry.history) : null;
  db.prepare(
    `INSERT INTO progress
       (user_id, item_id, status, box, due, last_seen, last_result, history,
        stability, difficulty, reps, lapses, last_review, updated_at, client_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, item_id) DO UPDATE SET
       status=excluded.status, box=excluded.box, due=excluded.due,
       last_seen=excluded.last_seen, last_result=excluded.last_result,
       history=excluded.history, stability=excluded.stability,
       difficulty=excluded.difficulty, reps=excluded.reps, lapses=excluded.lapses,
       last_review=excluded.last_review, updated_at=excluded.updated_at,
       client_updated_at=excluded.client_updated_at`
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
    jetzt.toISOString(),
    clientTs
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

  const zaehle = (userId) =>
    db.prepare('SELECT COUNT(*) AS n FROM progress WHERE user_id = ?').get(userId).n;

  // Einen Eintrag setzen/aktualisieren. Antwort `uebernommen:false` (mit 200,
  // damit die Client-Outbox nicht endlos wiederholt), wenn der Server bereits
  // einen neueren Stand hat.
  app.put('/api/progress/:itemId', async (req, reply) => {
    const { itemId } = req.params;
    const idFehler = pruefeItemId(itemId);
    if (idFehler) return reply.code(400).send({ error: idFehler });
    const { eintrag, fehler } = pruefeProgressEintrag(req.body ?? {});
    if (fehler) return reply.code(400).send({ error: `Ungültiger Eintrag: ${fehler}` });

    const jetzt = new Date();
    const clientTs = effektiverZeitstempel(eintrag.updatedAt, jetzt);
    const vorhanden = db
      .prepare('SELECT client_updated_at FROM progress WHERE user_id = ? AND item_id = ?')
      .get(req.user.id, itemId);

    if (vorhanden) {
      const gespeichert = vorhanden.client_updated_at;
      // Ohne Client-Zeitstempel nur überschreiben, wenn auch der gespeicherte
      // keinen hat (Altbestand); sonst nur bei neuer-oder-gleich.
      const veraltet = gespeichert != null && (clientTs == null || Date.parse(clientTs) < Date.parse(gespeichert));
      if (veraltet) return { ok: true, uebernommen: false };
    } else if (zaehle(req.user.id) >= PROGRESS_GRENZEN.maxEintraege) {
      return reply.code(413).send({
        error: `Zu viele Fortschritts-Einträge (max. ${PROGRESS_GRENZEN.maxEintraege} je Konto).`,
      });
    }
    upsert(db, req.user.id, itemId, eintrag, clientTs, jetzt);
    return { ok: true, uebernommen: true };
  });

  // Nicht-destruktives Zusammenführen (für die Migration lokaler Daten):
  // nur fehlende Einträge werden übernommen, vorhandene bleiben unangetastet.
  // Ungültige Einträge und Einträge über der Obergrenze werden übersprungen
  // und gezählt (`skipped`), statt den ganzen Merge abzulehnen.
  app.post('/api/progress/merge', async (req, reply) => {
    const incoming = req.body?.progress;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return reply.code(400).send({ error: 'progress-Map erforderlich.' });
    }
    const existing = new Set(
      db.prepare('SELECT item_id FROM progress WHERE user_id = ?').all(req.user.id).map((r) => r.item_id)
    );
    const jetzt = new Date();
    let anzahl = existing.size;
    let imported = 0;
    let skipped = 0;
    let limitErreicht = false;
    db.exec('BEGIN');
    try {
      for (const [itemId, entry] of Object.entries(incoming)) {
        if (existing.has(itemId)) continue;
        const { eintrag, fehler } = pruefeItemId(itemId) ? { fehler: 'id' } : pruefeProgressEintrag(entry);
        if (fehler) {
          skipped += 1;
          continue;
        }
        if (anzahl >= PROGRESS_GRENZEN.maxEintraege) {
          limitErreicht = true;
          skipped += 1;
          continue;
        }
        upsert(db, req.user.id, itemId, eintrag, effektiverZeitstempel(eintrag.updatedAt, jetzt), jetzt);
        existing.add(itemId);
        anzahl += 1;
        imported += 1;
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return limitErreicht ? { imported, skipped, limitErreicht } : { imported, skipped };
  });

  // Fortschritt zurücksetzen.
  app.delete('/api/progress', async (req) => {
    db.prepare('DELETE FROM progress WHERE user_id = ?').run(req.user.id);
    return { ok: true };
  });
}
