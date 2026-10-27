/**
 * C3 / S19: Server-Eingaben validieren, Speicher je Konto begrenzen,
 * veraltete Client-Stände (updatedAt) nicht übernehmen, Migration.
 */
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buildApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { PROGRESS_GRENZEN } from '../src/progress.js';

let app;
beforeEach(async () => {
  app = await buildApp({ dbPath: ':memory:' });
});
afterEach(async () => {
  await app.close();
});

async function registriere(email = 'c3@example.de') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'geheim1234' },
  });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  return `ap_session=${c.value}`;
}

const put = (cookie, id, payload) =>
  app.inject({ method: 'PUT', url: `/api/progress/${encodeURIComponent(id)}`, headers: { cookie }, payload });
const laden = async (cookie) => (await app.inject({ url: '/api/progress', headers: { cookie } })).json().progress;

test('PUT /api/progress: ungültige Einträge → 400 mit Meldung, nichts gespeichert', async () => {
  const cookie = await registriere();
  const faelle = [
    [{ stability: { boese: true } }, /stability/],
    [{ status: 'admin' }, /status/],
    [{ box: 9 }, /box/],
    [{ due: 'morgen' }, /due/],
    [{ history: Array.from({ length: 21 }, () => ({ ts: '2026-01-01', result: 'x' })) }, /history/],
    [{ reps: -1 }, /reps/],
  ];
  for (const [payload, muster] of faelle) {
    const res = await put(cookie, 'q1', payload);
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
    assert.match(res.json().error, muster);
  }
  // > 100 Zeichen: Fastify antwortet schon vor der Route mit 414 (maxParamLength 100),
  // die Validierung greift zusätzlich beim Merge.
  const lang = await put(cookie, 'x'.repeat(101), { status: 'gelernt' });
  assert.ok([400, 414].includes(lang.statusCode), String(lang.statusCode));
  assert.equal((await put(cookie, 'x'.repeat(100), { status: 'nix' })).statusCode, 400);
  const zeichen = await put(cookie, 'a b', { status: 'gelernt' });
  assert.equal(zeichen.statusCode, 400);
  assert.deepEqual(await laden(cookie), {});
});

test('PUT /api/progress: gültiger Eintrag mit Umlaut-ID wird gespeichert und mit updatedAt geladen', async () => {
  const cookie = await registriere();
  const entry = {
    status: 'gelernt',
    box: 2,
    stability: 2.4,
    difficulty: 5.1,
    reps: 1,
    lapses: 0,
    due: '2026-10-30T23:00:00.000Z',
    last_review: '2026-10-27T10:00:00.000Z',
    lastSeen: '2026-10-27T10:00:00.000Z',
    history: [{ ts: '2026-10-27T10:00:00.000Z', result: 'gewusst' }],
    updatedAt: '2026-10-27T10:00:00.000Z',
    unbekannt: 'wird verworfen',
  };
  const res = await put(cookie, '2022_Frühjahr_1a', entry);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true, uebernommen: true });
  const { unbekannt, ...erwartet } = entry;
  void unbekannt;
  assert.deepEqual((await laden(cookie))['2022_Frühjahr_1a'], erwartet);
});

test('updatedAt: veralteter Stand überschreibt neueren nicht, gleich/neuer schon', async () => {
  const cookie = await registriere();
  await put(cookie, 'q1', { status: 'gelernt', updatedAt: '2026-10-27T10:00:00.000Z' });

  const alt = await put(cookie, 'q1', { status: 'ueben', updatedAt: '2026-10-27T09:00:00.000Z' });
  assert.equal(alt.statusCode, 200); // 200, damit die Outbox nicht endlos wiederholt
  assert.deepEqual(alt.json(), { ok: true, uebernommen: false });
  assert.equal((await laden(cookie)).q1.status, 'gelernt');

  const ohne = await put(cookie, 'q1', { status: 'ueben' });
  assert.equal(ohne.json().uebernommen, false, 'ohne updatedAt kein Überschreiben eines gestempelten Stands');
  assert.equal((await laden(cookie)).q1.status, 'gelernt');

  const gleich = await put(cookie, 'q1', { status: 'ueben', updatedAt: '2026-10-27T10:00:00.000Z' });
  assert.equal(gleich.json().uebernommen, true);
  assert.equal((await laden(cookie)).q1.status, 'ueben');

  // Andere Zeitzonen-Schreibweise wird zeitlich (nicht als Text) verglichen.
  const neuer = await put(cookie, 'q1', { status: 'gelernt', updatedAt: '2026-10-27T12:30:00+02:00' });
  assert.equal(neuer.json().uebernommen, true);
  const q1 = (await laden(cookie)).q1;
  assert.equal(q1.status, 'gelernt');
  assert.equal(q1.updatedAt, '2026-10-27T10:30:00.000Z');
});

test('updatedAt: ohne Zeitstempel nur, wenn neu oder Altbestand ohne Zeitstempel', async () => {
  const cookie = await registriere();
  assert.equal((await put(cookie, 'q2', { status: 'ueben' })).json().uebernommen, true);
  assert.equal((await put(cookie, 'q2', { status: 'gelernt' })).json().uebernommen, true);
  assert.equal((await laden(cookie)).q2.status, 'gelernt');
  assert.equal((await laden(cookie)).q2.updatedAt, undefined);
  // Danach mit Zeitstempel → gewinnt gegen den ungestempelten Altbestand.
  assert.equal((await put(cookie, 'q2', { status: 'ueben', updatedAt: '2020-01-01T00:00:00Z' })).json().uebernommen, true);
});

test('updatedAt aus der Zukunft wird auf die Server-Zeit gekappt', async () => {
  const cookie = await registriere();
  await put(cookie, 'q3', { status: 'ueben', updatedAt: '2999-01-01T00:00:00.000Z' });
  const gespeichert = (await laden(cookie)).q3.updatedAt;
  assert.ok(Date.parse(gespeichert) <= Date.now());
  // Ein späterer, korrekt gestempelter Stand eines anderen Geräts wird nicht blockiert.
  const res = await put(cookie, 'q3', { status: 'gelernt', updatedAt: new Date(Date.now() + 1000).toISOString() });
  assert.equal(res.json().uebernommen, true);
});

test('Obergrenze je Konto: neue Einträge darüber → 413, bestehende bleiben änderbar', async () => {
  const vorher = PROGRESS_GRENZEN.maxEintraege;
  PROGRESS_GRENZEN.maxEintraege = 3;
  try {
    const cookie = await registriere();
    for (const id of ['a', 'b', 'c']) assert.equal((await put(cookie, id, { status: 'ueben' })).statusCode, 200);
    const zuViel = await put(cookie, 'd', { status: 'ueben' });
    assert.equal(zuViel.statusCode, 413);
    assert.match(zuViel.json().error, /max\. 3/);
    // Bestehender Eintrag darf weiter aktualisiert werden.
    const update = await put(cookie, 'a', { status: 'gelernt' });
    assert.equal(update.statusCode, 200);
    assert.equal(Object.keys(await laden(cookie)).length, 3);
    // Ein anderes Konto hat sein eigenes Kontingent.
    const andere = await registriere('andere@example.de');
    assert.equal((await put(andere, 'd', { status: 'ueben' })).statusCode, 200);
  } finally {
    PROGRESS_GRENZEN.maxEintraege = vorher;
  }
});

test('Merge: ungültige Einträge werden übersprungen und gezählt', async () => {
  const cookie = await registriere();
  const res = await app.inject({
    method: 'POST',
    url: '/api/progress/merge',
    headers: { cookie },
    payload: {
      progress: {
        gut: { status: 'gelernt', updatedAt: '2026-10-01T00:00:00.000Z' },
        'Frühjahr_2': { box: 2 },
        boese: { stability: 'viel' },
        'mit leerzeichen': { status: 'ueben' },
        ['y'.repeat(101)]: { status: 'ueben' },
        kaputt: null,
      },
    },
  });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { imported: 2, skipped: 4 });
  const p = await laden(cookie);
  assert.deepEqual(Object.keys(p).sort(), ['Frühjahr_2', 'gut']);
  assert.equal(p.gut.updatedAt, '2026-10-01T00:00:00.000Z');

  const liste = await app.inject({ method: 'POST', url: '/api/progress/merge', headers: { cookie }, payload: { progress: [] } });
  assert.equal(liste.statusCode, 400);
});

test('Merge zählt zur Obergrenze', async () => {
  const vorher = PROGRESS_GRENZEN.maxEintraege;
  PROGRESS_GRENZEN.maxEintraege = 3;
  try {
    const cookie = await registriere();
    await put(cookie, 'a', { status: 'ueben' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/progress/merge',
      headers: { cookie },
      payload: { progress: { a: { status: 'gelernt' }, b: {}, c: {}, d: {}, e: {} } },
    });
    assert.deepEqual(res.json(), { imported: 2, skipped: 2, limitErreicht: true });
    assert.equal(Object.keys(await laden(cookie)).length, 3);
    assert.equal((await laden(cookie)).a.status, 'ueben', 'Merge überschreibt Vorhandenes nicht');
  } finally {
    PROGRESS_GRENZEN.maxEintraege = vorher;
  }
});

test('PUT /api/gamification: Grenzen und Kürzung', async () => {
  const cookie = await registriere();
  const putG = (payload) => app.inject({ method: 'PUT', url: '/api/gamification', headers: { cookie }, payload });
  const getG = async () => (await app.inject({ url: '/api/gamification', headers: { cookie } })).json().gamification;

  assert.equal((await putG({ activity: { '2026-10-27': 3 }, xp: 50, klausurBest: 80 })).statusCode, 200);
  assert.deepEqual(await getG(), { activity: { '2026-10-27': 3 }, xp: 50, klausurBest: 80 });

  for (const payload of [
    { xp: 10_000_001 },
    { klausurBest: 100001 },
    { activity: { '2026-10-27': 100001 } },
    { activity: { nichtDatum: 1 } },
    { activity: 'x' },
    { xp: 'viel' },
  ]) {
    const res = await putG(payload);
    assert.equal(res.statusCode, 400, JSON.stringify(payload));
    assert.match(res.json().error, /Ungültiger Stand/);
  }
  assert.deepEqual(await getG(), { activity: { '2026-10-27': 3 }, xp: 50, klausurBest: 80 }, 'unverändert');

  const activity = {};
  for (let i = 0; i < 410; i++) activity[new Date(Date.UTC(2025, 0, 1) + i * 86400000).toISOString().slice(0, 10)] = 1;
  assert.equal((await putG({ activity, xp: 1 })).statusCode, 200);
  assert.equal(Object.keys((await getG()).activity).length, 400);
});

test('PUT /api/daten: wert muss Objekt/Liste (oder null) sein', async () => {
  const cookie = await registriere();
  const putD = (wert) => app.inject({ method: 'PUT', url: '/api/daten/einstufung', headers: { cookie }, payload: { wert } });
  assert.equal((await putD('text')).statusCode, 400);
  assert.equal((await putD(42)).statusCode, 400);
  assert.equal((await putD({ a: 1 })).statusCode, 200);
  assert.equal((await putD([1, 2])).statusCode, 200);
  assert.equal((await putD(null)).statusCode, 200);
});

test('Migration: bestehende DB ohne client_updated_at wird additiv und idempotent ergänzt', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fisidev-c3-'));
  try {
    const pfad = join(dir, 'alt.sqlite');
    // Alte DB wie vor C3 (progress mit FSRS-Spalten, aber ohne client_updated_at).
    const alt = new DatabaseSync(pfad);
    alt.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE progress (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_id TEXT NOT NULL, status TEXT, box INTEGER, due TEXT, last_seen TEXT,
        last_result TEXT, history TEXT, stability REAL, difficulty REAL, reps INTEGER,
        lapses INTEGER, last_review TEXT, updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, item_id));
      INSERT INTO users VALUES (1, 'alt@example.de', 'h', '2025-01-01');
      INSERT INTO progress (user_id, item_id, status, box, history, updated_at)
        VALUES (1, 'q_alt', 'gelernt', 9, '[{"ts":"x","result":"y"}]', '2025-01-01');
    `);
    alt.close();

    const db = openDb(pfad);
    const spalten = db.prepare('PRAGMA table_info(progress)').all().map((c) => c.name);
    assert.ok(spalten.includes('client_updated_at'));
    // Altbestand (auch mit heute ungültigen Werten) bleibt lesbar und unverändert.
    const row = db.prepare('SELECT * FROM progress WHERE item_id = ?').get('q_alt');
    assert.equal(row.status, 'gelernt');
    assert.equal(row.box, 9);
    assert.equal(row.client_updated_at, null);
    db.close();

    // Zweiter Start: idempotent (kein „duplicate column“).
    const nochmal = openDb(pfad);
    assert.equal(
      nochmal.prepare('PRAGMA table_info(progress)').all().filter((c) => c.name === 'client_updated_at').length,
      1
    );
    nochmal.close();

    // Über die API: Altbestand ohne Zeitstempel wird geladen und darf überschrieben werden.
    const a2 = await buildApp({ dbPath: pfad });
    try {
      const reg = await a2.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'neu@example.de', password: 'geheim1234' } });
      assert.equal(reg.statusCode, 201);
    } finally {
      await a2.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
