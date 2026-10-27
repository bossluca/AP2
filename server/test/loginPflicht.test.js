import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { schalterAusEnv } from '../src/lib/konfig.js';
import { erstelleEinladung } from '../src/einladung-cli.js';

/**
 * C9 – Login-Pflicht (`REQUIRE_LOGIN` → `loginPflicht` in /api/auth/config) und
 * Einladungs-Bremse (falsche Codes zählen gegen `app.loginLimiter`).
 */

let app;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const registriere = (email, inviteCode, ip = '203.0.113.7') =>
  app.inject({
    method: 'POST',
    url: '/api/auth/register',
    remoteAddress: ip,
    payload: { email, password: 'geheim1234', inviteCode },
  });

test('schalterAusEnv liest boolesche Env-Werte robust', () => {
  for (const w of ['true', 'TRUE', '1', 'yes', 'ja', ' on ']) assert.equal(schalterAusEnv(w), true, w);
  for (const w of ['false', '0', 'no', 'nein', 'off']) assert.equal(schalterAusEnv(w, true), false, w);
  assert.equal(schalterAusEnv(undefined), false);
  assert.equal(schalterAusEnv(''), false);
  assert.equal(schalterAusEnv('quatsch', true), true);
});

test('config: loginPflicht ist ohne Option false (lokale Entwicklung unverändert)', async () => {
  app = await buildApp();
  const res = await app.inject({ url: '/api/auth/config' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { registrierung: 'open', loginPflicht: false });
});

test('config: requireLogin → loginPflicht true', async () => {
  app = await buildApp({ requireLogin: true, registrierung: 'invite' });
  assert.deepEqual((await app.inject({ url: '/api/auth/config' })).json(), {
    registrierung: 'invite',
    loginPflicht: true,
  });
});

test('auth_request-Ziel: /api/auth/me ohne Sitzung → 401, mit Sitzung → 200', async () => {
  app = await buildApp({ requireLogin: true });
  assert.equal((await app.inject({ url: '/api/auth/me' })).statusCode, 401);
  const reg = await registriere('a@b.de');
  const c = reg.cookies.find((x) => x.name === 'ap_session');
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie: `ap_session=${c.value}` } });
  assert.equal(me.statusCode, 200);
});

test('Einladungs-Bremse: 8 falsche Codes je IP → danach 429 (auch mit gültigem Code)', async () => {
  app = await buildApp({ registrierung: 'invite' });
  const { code } = erstelleEinladung(app.db);
  for (let i = 0; i < 8; i += 1) {
    const res = await registriere(`x${i}@b.de`, 'AAAA-BBBB-CCCC');
    assert.equal(res.statusCode, 403, `Versuch ${i + 1}`);
  }
  const gebremst = await registriere('y@b.de', 'AAAA-BBBB-CCCC');
  assert.equal(gebremst.statusCode, 429);
  assert.ok(Number(gebremst.headers['retry-after']) > 0);
  const auchGueltig = await registriere('z@b.de', code);
  assert.equal(auchGueltig.statusCode, 429, 'gebremst ist gebremst');
  // Andere IP ist nicht betroffen.
  const andereIp = await registriere('z@b.de', code, '198.51.100.9');
  assert.equal(andereIp.statusCode, 201);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1);
});

test('Einladungs-Bremse: erfolgreiche Registrierung setzt den Zähler zurück', async () => {
  app = await buildApp({ registrierung: 'invite' });
  const { code } = erstelleEinladung(app.db);
  for (let i = 0; i < 7; i += 1) {
    assert.equal((await registriere(`x${i}@b.de`, 'AAAA-BBBB-CCCC')).statusCode, 403);
  }
  assert.equal((await registriere('ok@b.de', code)).statusCode, 201);
  for (let i = 0; i < 8; i += 1) {
    assert.equal((await registriere(`w${i}@b.de`, 'AAAA-BBBB-CCCC')).statusCode, 403, `nach Reset ${i + 1}`);
  }
});

test('Einladungs-Bremse betrifft den offenen Modus nicht', async () => {
  app = await buildApp({ registrierung: 'open' });
  for (let i = 0; i < 10; i += 1) {
    assert.equal((await registriere(`o${i}@b.de`)).statusCode, 201);
  }
});
