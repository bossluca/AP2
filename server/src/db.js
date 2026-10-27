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
      stability   REAL,
      difficulty  REAL,
      reps        INTEGER,
      lapses      INTEGER,
      last_review TEXT,
      updated_at  TEXT NOT NULL,
      client_updated_at TEXT,
      PRIMARY KEY (user_id, item_id)
    );
  `);

  // Gamification pro Nutzer (Aktivitäts-Log, XP, bestes Klausur-Ergebnis) –
  // damit auch Streak/XP/Quests kontogebunden sind, nicht nur lokal pro Browser.
  db.exec(`
    CREATE TABLE IF NOT EXISTS gamification (
      user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      activity     TEXT,
      xp           INTEGER,
      klausur_best INTEGER,
      updated_at   TEXT NOT NULL
    );
  `);

  // Idempotente Migration: FSRS-Spalten (und C3: client_updated_at) in bestehende DBs additiv ergänzen
  // (CREATE TABLE oben deckt nur frische DBs ab). `ALTER TABLE … ADD COLUMN`
  // ist additiv und verlustfrei.
  const vorhanden = new Set(
    db.prepare('PRAGMA table_info(progress)').all().map((c) => c.name)
  );
  const fsrsSpalten = [
    ['stability', 'REAL'],
    ['difficulty', 'REAL'],
    ['reps', 'INTEGER'],
    ['lapses', 'INTEGER'],
    ['last_review', 'TEXT'],
    // C3: Client-Zeitstempel `updatedAt` (Schutz vor veralteten Ständen).
    ['client_updated_at', 'TEXT'],
  ];
  for (const [name, typ] of fsrsSpalten) {
    if (!vorhanden.has(name)) db.exec(`ALTER TABLE progress ADD COLUMN ${name} ${typ};`);
  }

  // Idempotente Migration: Recovery-Code-Hash für den Passwort-Reset ohne
  // Mail-Server (Konten von vor dem Feature haben NULL und können sich
  // angemeldet einen Code erzeugen).
  const userSpalten = new Set(db.prepare('PRAGMA table_info(users)').all().map((c) => c.name));
  if (!userSpalten.has('recovery_hash')) {
    db.exec('ALTER TABLE users ADD COLUMN recovery_hash TEXT;');
  }
  // Idempotente Migration: opt-in Wochen-Rangliste (öffentlicher Anzeigename
  // statt E-Mail; Default = nicht sichtbar).
  if (!userSpalten.has('anzeigename')) {
    db.exec('ALTER TABLE users ADD COLUMN anzeigename TEXT;');
  }
  if (!userSpalten.has('rangliste_optin')) {
    db.exec('ALTER TABLE users ADD COLUMN rangliste_optin INTEGER NOT NULL DEFAULT 0;');
  }
  // Idempotente Migration: Admin kann Konten sperren (Login + Sitzungen aus).
  if (!userSpalten.has('gesperrt')) {
    db.exec('ALTER TABLE users ADD COLUMN gesperrt INTEGER NOT NULL DEFAULT 0;');
  }

  // Zusätzliche Konto-Daten (Lernplan, eigene Karten) als JSON je Schlüssel.
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_daten (
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      schluessel TEXT NOT NULL,
      wert       TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, schluessel)
    );
  `);

  // Lerngruppen (Klasse/Betrieb): Beitritt per Code, eigene Rangliste.
  db.exec(`
    CREATE TABLE IF NOT EXISTS gruppen (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      code       TEXT UNIQUE NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gruppen_mitglieder (
      gruppe_id INTEGER NOT NULL REFERENCES gruppen(id) ON DELETE CASCADE,
      user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (gruppe_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_gruppen_mitglieder_user ON gruppen_mitglieder(user_id);
  `);

  // Einladungs-Codes für REGISTRATION=invite. Gespeichert wird nur der
  // SHA-256-Hash; der Klartext wird dem Admin einmal angezeigt. `hinweis` = die
  // ersten Zeichen zum Wiedererkennen in der Liste.
  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id         INTEGER PRIMARY KEY,
      code_hash  TEXT UNIQUE NOT NULL,
      hinweis    TEXT NOT NULL,
      notiz      TEXT,
      max_uses   INTEGER NOT NULL DEFAULT 1,
      uses       INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT
    );
  `);
  return db;
}
