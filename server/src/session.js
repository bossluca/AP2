import { randomBytes, createHash } from 'node:crypto';

/** Gültigkeitsdauer einer Sitzung in Tagen. */
const SESSION_TAGE = 30;

/** Erzeugt ein kryptografisch zufälliges Sitzungs-Token. */
export function neuesToken() {
  return randomBytes(32).toString('hex');
}

/**
 * SHA-256-Hash eines Sitzungs-Tokens (hex). Die DB speichert nur diesen Hash
 * (S7): Wer DB oder Backup liest, kann damit keine Sitzung übernehmen. Ein
 * schneller Hash genügt, weil das Token 256 Bit Zufall hat (kein Wörterbuch).
 * @param {string} token
 */
export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Legt eine Sitzung an und gibt Token + Ablauf zurück. Das Token geht nur ins
 * Cookie; gespeichert wird `sha256(token)`.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} userId
 */
export function createSession(db, userId) {
  const token = neuesToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TAGE * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    hashToken(token),
    userId,
    now.toISOString(),
    expires.toISOString()
  );
  return { token, expires };
}

/**
 * Liefert den zu einem Token gehörenden Nutzer, sofern die Sitzung gültig ist.
 * Abgelaufene Sitzungen werden entfernt.
 * Gesperrte Konten liefern null.
 * @returns {{id:number, email:string}|null}
 */
export function userFromToken(db, token) {
  if (!token || typeof token !== 'string') return null;
  const tokenHash = hashToken(token);
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(tokenHash);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  // Gesperrte Konten verlieren sofort den Zugriff (auch mit gültigem Token).
  return (
    db.prepare('SELECT id, email FROM users WHERE id = ? AND gesperrt = 0').get(session.user_id) || null
  );
}

/** Löscht eine Sitzung (Logout). */
export function deleteSession(db, token) {
  if (token && typeof token === 'string') {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }
}

/**
 * Räumt abgelaufene Sitzungen auf. Ohne diesen Job wachsen verwaiste Zeilen
 * unbegrenzt (gelöscht wurde bisher nur beim zufälligen Zugriff auf das
 * jeweilige Token). Wird vom Entrypoint periodisch aufgerufen.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Date} [jetzt]  Injizierbar für Tests.
 * @returns {number} Anzahl entfernter Sitzungen.
 */
export function raeumeSessionsAuf(db, jetzt = new Date()) {
  const info = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(jetzt.toISOString());
  return Number(info.changes);
}
