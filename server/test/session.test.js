import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { hashToken, createSession, userFromToken, raeumeSessionsAuf } from '../src/session.js';

// S7/C6: Das Cookie trägt das zufällige Token, die DB nur sha256(token).

let app;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function registriere(email, password = 'geheim1234') {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password } });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  return { res, token: c?.value, cookie: c ? `ap_session=${c.value}` : '' };
}

/** Alle Text-Inhalte aller Tabellen als ein String (für „kommt nicht vor“-Prüfungen). */
function dbDump(db) {
  const tabellen = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((t) => t.name);
  return tabellen
    .map((t) => JSON.stringify(db.prepare(`SELECT * FROM "${t}"`).all()))
    .join('\n');
}

test('hashToken: sha256 hex, deterministisch, ≠ Token', () => {
  const h = hashToken('abc');
  assert.equal(h, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(hashToken('abc'), h);
  assert.notEqual(hashToken('abd'), h);
});

test('DB-Inhalt enthält den Cookie-Wert nicht, nur dessen Hash', async () => {
  app = await buildApp();
  const { token, cookie } = await registriere('hash@example.de');
  assert.match(token, /^[0-9a-f]{64}$/);
  const dump = dbDump(app.db);
  assert.equal(dump.includes(token), false, 'Klartext-Token liegt in der DB');
  const zeile = app.db.prepare('SELECT * FROM sessions').get();
  assert.equal(zeile.token_hash, hashToken(token));
  assert.equal('token' in zeile, false);
  // Und das Cookie funktioniert weiterhin.
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie } });
  assert.equal(me.statusCode, 200);
});

test('Der gespeicherte Hash selbst taugt nicht als Cookie', async () => {
  app = await buildApp();
  const { token } = await registriere('h2@example.de');
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie: `ap_session=${hashToken(token)}` } });
  assert.equal(me.statusCode, 401);
});

test('Login, Logout, Sperre und Konto löschen arbeiten mit dem Hash', async () => {
  app = await buildApp({ adminEmails: 'admin@example.de' });
  const admin = await registriere('admin@example.de');
  const nutzer = await registriere('nutzer@example.de');

  // Zweite Sitzung per Login; Logout beendet genau diese.
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'nutzer@example.de', password: 'geheim1234' },
  });
  assert.equal(login.statusCode, 200);
  const zweit = login.cookies.find((c) => c.name === 'ap_session').value;
  const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: `ap_session=${zweit}` } });
  assert.equal(out.statusCode, 200);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?').get(hashToken(zweit)).n, 0);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: `ap_session=${zweit}` } })).statusCode, 401);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: nutzer.cookie } })).statusCode, 200);

  // Sperre beendet alle Sitzungen des Kontos.
  const id = nutzer.res.json().user.id;
  const sperre = await app.inject({
    method: 'PATCH',
    url: `/api/admin/users/${id}`,
    headers: { cookie: admin.cookie },
    payload: { gesperrt: true },
  });
  assert.equal(sperre.statusCode, 200);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(id).n, 0);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: nutzer.cookie } })).statusCode, 401);

  // Konto löschen räumt per CASCADE die Sitzungen mit ab.
  await app.inject({ method: 'PATCH', url: `/api/admin/users/${id}`, headers: { cookie: admin.cookie }, payload: { gesperrt: false } });
  const neu = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'nutzer@example.de', password: 'geheim1234' },
  });
  const c = `ap_session=${neu.cookies.find((x) => x.name === 'ap_session').value}`;
  const weg = await app.inject({ method: 'DELETE', url: '/api/auth/account', headers: { cookie: c }, payload: { password: 'geheim1234' } });
  assert.equal(weg.statusCode, 200);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?').get(id).n, 0);
});

test('Abgelaufene Sitzung: Lookup per Hash liefert null und entfernt sie', () => {
  const db = openDb(':memory:');
  db.prepare("INSERT INTO users (email, password_hash, created_at) VALUES ('a@b.de', 'x', '2026-01-01')").run();
  const { token } = createSession(db, 1);
  assert.equal(userFromToken(db, token)?.id, 1);
  db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
  assert.equal(userFromToken(db, token), null);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
  // Aufräumjob zählt per Hash gespeicherte Zeilen.
  createSession(db, 1);
  db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
  assert.equal(raeumeSessionsAuf(db), 1);
  db.close();
});

test('Ungültige Cookie-Typen werfen nicht', () => {
  const db = openDb(':memory:');
  assert.equal(userFromToken(db, undefined), null);
  assert.equal(userFromToken(db, ''), null);
  assert.equal(userFromToken(db, ['a']), null);
  db.close();
});

test('Migration: alte DB mit Klartext-Token → Tabelle mit token_hash, alte Sitzungen gelöscht', () => {
  const dir = mkdtempSync(join(tmpdir(), 'c6-migration-'));
  const pfad = join(dir, 'alt.sqlite');
  const altesToken = 'f'.repeat(16) + 'deadbeefcafebabe'.repeat(3);
  try {
    // Vorab gebaute „alte“ DB im Schema vor C6.
    const alt = new DatabaseSync(pfad);
    alt.exec('PRAGMA journal_mode = WAL;');
    alt.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
      CREATE INDEX idx_sessions_user ON sessions(user_id);
    `);
    alt.prepare("INSERT INTO users (email, password_hash, created_at) VALUES ('alt@example.de', 'h', '2026-01-01')").run();
    alt.prepare("INSERT INTO sessions VALUES (?, 1, '2026-01-01', '2999-01-01')").run(altesToken);
    alt.close();

    const db = openDb(pfad);
    const spalten = db.prepare('PRAGMA table_info(sessions)').all().map((c) => c.name);
    assert.ok(spalten.includes('token_hash'));
    assert.equal(spalten.includes('token'), false);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n, 0);
    // Konten bleiben erhalten, das alte Token gilt nicht mehr.
    assert.equal(db.prepare('SELECT email FROM users').get().email, 'alt@example.de');
    assert.equal(userFromToken(db, altesToken), null);
    // Neue Sitzungen funktionieren.
    const { token } = createSession(db, 1);
    assert.equal(userFromToken(db, token)?.id, 1);
    db.close();

    // Idempotent: zweites Öffnen lässt die neue Sitzung stehen.
    const db2 = openDb(pfad);
    assert.equal(userFromToken(db2, token)?.id, 1);
    db2.close();

    // secure_delete: Das alte Token steht nicht mehr im Dateirest.
    const roh = readFileSync(pfad);
    assert.equal(roh.includes(Buffer.from(altesToken)), false, 'altes Token noch in der Datei');
    if (existsSync(`${pfad}-wal`)) assert.equal(readFileSync(`${pfad}-wal`).includes(Buffer.from(altesToken)), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
