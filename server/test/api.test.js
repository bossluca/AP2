import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

let app;
beforeEach(async () => {
  app = await buildApp({ dbPath: ':memory:' });
});
afterEach(async () => {
  await app.close();
});

/** Hilfsfunktion: registriert einen Nutzer und gibt das Session-Cookie zurück. */
async function registriere(email = 'test@example.de', password = 'geheim1234') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password },
  });
  const cookie = res.cookies.find((c) => c.name === 'ap_session');
  return { res, cookieHeader: cookie ? `ap_session=${cookie.value}` : '' };
}

test('health antwortet ok', async () => {
  const res = await app.inject({ url: '/api/health' });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, 'ok');
});

test('Registrieren legt Nutzer an und setzt Cookie', async () => {
  const { res, cookieHeader } = await registriere();
  assert.equal(res.statusCode, 201);
  assert.equal(res.json().user.email, 'test@example.de');
  assert.ok(cookieHeader.startsWith('ap_session='));
});

test('Registrieren lehnt kurzes Passwort und doppelte E-Mail ab', async () => {
  const kurz = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'a@b.de', password: 'kurz' },
  });
  assert.equal(kurz.statusCode, 400);

  await registriere('dup@example.de');
  const dup = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email: 'dup@example.de', password: 'geheim1234' },
  });
  assert.equal(dup.statusCode, 409);
});

test('me erfordert Login, funktioniert mit Cookie', async () => {
  const ohne = await app.inject({ url: '/api/auth/me' });
  assert.equal(ohne.statusCode, 401);

  const { cookieHeader } = await registriere();
  const mit = await app.inject({ url: '/api/auth/me', headers: { cookie: cookieHeader } });
  assert.equal(mit.statusCode, 200);
  assert.equal(mit.json().user.email, 'test@example.de');
});

test('Login mit falschem Passwort schlägt fehl, mit richtigem klappt', async () => {
  await registriere('login@example.de', 'richtig123');
  const falsch = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'login@example.de', password: 'falsch123' },
  });
  assert.equal(falsch.statusCode, 401);

  const ok = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'login@example.de', password: 'richtig123' },
  });
  assert.equal(ok.statusCode, 200);
});

test('Fortschritt: setzen, laden, zurücksetzen', async () => {
  const { cookieHeader } = await registriere();
  const headers = { cookie: cookieHeader };

  await app.inject({
    method: 'PUT',
    url: '/api/progress/lz_ap2_vlan_1',
    headers,
    payload: { status: 'gelernt', box: 2, due: '2026-07-01T00:00:00.000Z' },
  });

  const get = await app.inject({ url: '/api/progress', headers });
  assert.equal(get.statusCode, 200);
  assert.equal(get.json().progress.lz_ap2_vlan_1.box, 2);
  assert.equal(get.json().progress.lz_ap2_vlan_1.status, 'gelernt');

  await app.inject({ method: 'DELETE', url: '/api/progress', headers });
  const leer = await app.inject({ url: '/api/progress', headers });
  assert.deepEqual(leer.json().progress, {});
});

test('Fortschritt ohne Login ist 401', async () => {
  const res = await app.inject({ url: '/api/progress' });
  assert.equal(res.statusCode, 401);
});

test('Merge übernimmt nur fehlende Einträge (nicht-destruktiv)', async () => {
  const { cookieHeader } = await registriere();
  const headers = { cookie: cookieHeader };

  // Serverseitig existiert bereits ein Eintrag mit box=3.
  await app.inject({
    method: 'PUT',
    url: '/api/progress/a',
    headers,
    payload: { box: 3 },
  });

  const merge = await app.inject({
    method: 'POST',
    url: '/api/progress/merge',
    headers,
    payload: { progress: { a: { box: 1 }, b: { status: 'ueben' } } },
  });
  assert.equal(merge.statusCode, 200);
  assert.equal(merge.json().imported, 1); // nur "b" neu

  const get = await app.inject({ url: '/api/progress', headers });
  assert.equal(get.json().progress.a.box, 3); // unverändert (Server gewinnt)
  assert.equal(get.json().progress.b.status, 'ueben');
});

test('Nutzer sehen den Fortschritt anderer nicht', async () => {
  const a = await registriere('a@example.de');
  await app.inject({
    method: 'PUT',
    url: '/api/progress/x',
    headers: { cookie: a.cookieHeader },
    payload: { box: 5 },
  });
  const b = await registriere('b@example.de');
  const get = await app.inject({ url: '/api/progress', headers: { cookie: b.cookieHeader } });
  assert.deepEqual(get.json().progress, {});
});
