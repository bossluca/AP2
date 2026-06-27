import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Initialisiert die SQLite-Datenbank (node:sqlite, keine native Abhängigkeit)
 * und legt das Schema idempotent an.
 *
 * Tabellen:
 *  - users     (Konten; Passwort als argon2-Hash)
 *  - sessions  (serverseitige Sitzungen; Token im httpOnly-Cookie)
 *  - progress  (Fortschritt pro Nutzer & Lernobjekt; spiegelt die Client-Struktur)
 *
 * @param {string} path  Dateipfad oder ":memory:".
 * @returns {DatabaseSync}
 */
export function openDb(path) {
  if (path && path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }
  const db = new DatabaseSync(path || ':memory:');
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS progress (
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id     TEXT NOT NULL,
      status      TEXT,
      box         INTEGER,
      due         TEXT,
      last_seen   TEXT,
      last_result TEXT,
      history     TEXT,
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (user_id, item_id)
    );
  `);
  return db;
}
