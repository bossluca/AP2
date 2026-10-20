import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { pruefeAnzeigename, wochenPunkte, rangiere } from '../src/lib/rangliste.js';

// --- reine Helfer ---------------------------------------------------------

test('pruefeAnzeigename akzeptiert gültige und lehnt ungültige Namen ab', () => {
  assert.equal(pruefeAnzeigename('  Max  Müller '), 'Max Müller');
  assert.equal(pruefeAnzeigename('fisi_42'), 'fisi_42');
  assert.equal(pruefeAnzeigename('ab'), null);
  assert.equal(pruefeAnzeigename('x'.repeat(21)), null);
  assert.equal(pruefeAnzeigename('<script>'), null);
  assert.equal(pruefeAnzeigename(42), null);
});

test('wochenPunkte summiert nur die letzten 7 Tage', () => {
  const heute = new Date('2026-10-20T12:00:00Z');
  const activity = {
    '2026-10-20': 5,
    '2026-10-14': 3, // Tag 7 (inklusive)
    '2026-10-13': 100, // zu alt
    '2026-10-18': 'kaputt',
  };
  assert.equal(wochenPunkte(activity, heute), 8);
  assert.equal(wochenPunkte(null, heute), 0);
});

test('rangiere sortiert nach Punkten, dann XP, und teilt Ränge bei Gleichstand', () => {
  const r = rangiere([
    { id: 1, anzeigename: 'B', punkte: 10, xp: 5 },
    { id: 2, anzeigename: 'A', punkte: 10, xp: 5 },
    { id: 3, anzeigename: 'C', punkte: 20, xp: 0 },
    { id: 4, anzeigename: 'D', punkte: 10, xp: 1 },
  ]);
  assert.deepEqual(
    r.map((e) => [e.anzeigename, e.rang]),
    [
      ['C', 1],
      ['A', 2],
      ['B', 2],
      ['D', 4],
    ]
  );
});

// --- API ------------------------------------------------------------------

let app;
beforeEach(async () => {
  app = await buildApp({ dbPath: ':memory:' });
});
afterEach(async () => {
  await app.close();
});

async function registriere(email) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'geheim1234' },
  });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  return `ap_session=${c.value}`;
}

function heuteKey() {
  return new Date().toISOString().slice(0, 10);
}

test('Rangliste erfordert Login', async () => {
  const res = await app.inject({ url: '/api/rangliste' });
  assert.equal(res.statusCode, 401);
});

test('nur Opt-in-Nutzer erscheinen, ohne E-Mail, mit Wochenpunkten', async () => {
  const anna = await registriere('anna@example.de');
  const ben = await registriere('ben@example.de');

  for (const [cookie, n] of [
    [anna, 7],
    [ben, 12],
  ]) {
    await app.inject({
      method: 'PUT',
      url: '/api/gamification',
      headers: { cookie },
      payload: { activity: { [heuteKey()]: n }, xp: n * 10, klausurBest: 0 },
    });
  }

  // Standard: niemand sichtbar.
  let res = await app.inject({ url: '/api/rangliste', headers: { cookie: anna } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().teilnehmer, 0);
  assert.equal(res.json().profil.optIn, false);

  res = await app.inject({
    method: 'PUT',
    url: '/api/rangliste/profil',
    headers: { cookie: anna },
    payload: { optIn: true, anzeigename: 'Anna' },
  });
  assert.equal(res.statusCode, 200);

  res = await app.inject({ url: '/api/rangliste', headers: { cookie: ben } });
  const body = res.json();
  assert.equal(body.teilnehmer, 1); // Ben ist nicht opt-in
  assert.deepEqual(body.eintraege, [{ rang: 1, anzeigename: 'Anna', punkte: 7, xp: 70, istIch: false }]);
  assert.equal(body.ich, null);
  assert.ok(!JSON.stringify(body).includes('@'), 'keine E-Mail in der Antwort');
});

test('Anzeigename wird validiert und ist eindeutig; Opt-out blendet aus', async () => {
  const anna = await registriere('anna@example.de');
  const ben = await registriere('ben@example.de');

  let res = await app.inject({
    method: 'PUT',
    url: '/api/rangliste/profil',
    headers: { cookie: anna },
    payload: { optIn: true, anzeigename: 'x' },
  });
  assert.equal(res.statusCode, 400);

  await app.inject({
    method: 'PUT',
    url: '/api/rangliste/profil',
    headers: { cookie: anna },
    payload: { optIn: true, anzeigename: 'Fisi' },
  });
  res = await app.inject({
    method: 'PUT',
    url: '/api/rangliste/profil',
    headers: { cookie: ben },
    payload: { optIn: true, anzeigename: 'FISI' },
  });
  assert.equal(res.statusCode, 409);

  res = await app.inject({
    method: 'PUT',
    url: '/api/rangliste/profil',
    headers: { cookie: anna },
    payload: { optIn: false },
  });
  assert.equal(res.statusCode, 200);
  res = await app.inject({ url: '/api/rangliste', headers: { cookie: anna } });
  assert.equal(res.json().teilnehmer, 0);
  assert.equal(res.json().profil.anzeigename, 'Fisi'); // Name bleibt für erneutes Opt-in
});
