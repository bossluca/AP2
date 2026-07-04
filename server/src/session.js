import { randomBytes } from 'node:crypto';

/** Gültigkeitsdauer einer Sitzung in Tagen. */
const SESSION_TAGE = 30;

/** Erzeugt ein kryptografisch zufälliges Sitzungs-Token. */
export function neuesToken() {
  return randomBytes(32).toString('hex');
}

/**
 * Legt eine Sitzung an und gibt Token + Ablauf zurück.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {number} userId
 */
export function createSession(db, userId) {
  const token = neuesToken();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TAGE * 24 * 60 * 60 * 1000);
  db.prepare('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    userId,
    now.toISOString(),
    expires.toISOString()
  );
  return { token, expires };
}

/**
 * Liefert den zu einem Token gehörenden Nutzer, sofern die Sitzung gültig ist.
 * Abgelaufene Sitzungen werden entfernt.
 * @returns {{id:number, email:string}|null}
 */
export function userFromToken(db, token) {
  if (!token) return null;
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return db.prepare('SELECT id, email FROM users WHERE id = ?').get(session.user_id) || null;
}

/** Löscht eine Sitzung (Logout). */
export function deleteSession(db, token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
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
