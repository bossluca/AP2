import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { erzeugeRecoveryCode } from '../src/auth.js';

let app;
beforeEach(async () => {
  app = await buildApp({ dbPath: ':memory:' });
});
afterEach(async () => {
  await app.close();
});

/** Registriert einen Nutzer und gibt Cookie + Recovery-Code zurück. */
async function registriere(email = 'rec@example.de', password = 'geheim1234') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password },
  });
  const cookie = res.cookies.find((c) => c.name === 'ap_session');
  return {
    res,
    cookieHeader: cookie ? `ap_session=${cookie.value}` : '',
    recoveryCode: res.json().recoveryCode,
  };
}

test('erzeugeRecoveryCode: Format XXXX-XXXX-XXXX-XXXX, keine verwechselbaren Zeichen', () => {
  for (let i = 0; i < 20; i += 1) {
    const code = erzeugeRecoveryCode();
    assert.match(code, /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
    assert.doesNotMatch(code, /[IO01]/);
  }
});

test('Registrierung liefert einen Recovery-Code mit', async () => {
  const { res, recoveryCode } = await registriere();
  assert.equal(res.statusCode, 201);
  assert.match(recoveryCode, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
});

test('Recover setzt das Passwort neu, widerruft alte Sitzungen und rotiert den Code', async () => {
  const { cookieHeader, recoveryCode } = await registriere();

  // Toleranz: klein geschrieben und ohne Bindestriche eingegeben.
  const eingabe = recoveryCode.toLowerCase().replaceAll('-', ' ');
  const rec = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rec@example.de', recoveryCode: eingabe, newPassword: 'nagelneu99' },
  });
  assert.equal(rec.statusCode, 200);
  const neuerCode = rec.json().recoveryCode;
  assert.notEqual(neuerCode, recoveryCode);

  // Neues Passwort gilt, altes nicht mehr.
  const alt = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'rec@example.de', password: 'geheim1234' },
  });
  assert.equal(alt.statusCode, 401);
  const neu = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'rec@example.de', password: 'nagelneu99' },
  });
  assert.equal(neu.statusCode, 200);

  // Alte Sitzung ist widerrufen.
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie: cookieHeader } });
  assert.equal(me.statusCode, 401);

  // Alter Code ist verbraucht (Einmal-Gebrauch), neuer funktioniert.
  const nochmalAlt = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rec@example.de', recoveryCode, newPassword: 'egalegal88' },
  });
  assert.equal(nochmalAlt.statusCode, 401);
  const mitNeuem = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rec@example.de', recoveryCode: neuerCode, newPassword: 'egalegal88' },
  });
  assert.equal(mitNeuem.statusCode, 200);
});

test('Recover mit falschem Code/unbekannter E-Mail ist 401, kurzes Passwort 400', async () => {
  await registriere();
  const falsch = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rec@example.de', recoveryCode: 'AAAA-BBBB-CCCC-DDDD', newPassword: 'nagelneu99' },
  });
  assert.equal(falsch.statusCode, 401);

  const unbekannt = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'gibtsnicht@example.de', recoveryCode: 'AAAA-BBBB-CCCC-DDDD', newPassword: 'nagelneu99' },
  });
  assert.equal(unbekannt.statusCode, 401);

  const kurz = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rec@example.de', recoveryCode: 'AAAA-BBBB-CCCC-DDDD', newPassword: 'kurz' },
  });
  assert.equal(kurz.statusCode, 400);
});

test('Angemeldet lässt sich ein neuer Recovery-Code erzeugen (rotiert den alten)', async () => {
  const { cookieHeader, recoveryCode } = await registriere('rot@example.de');
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/recovery-code',
    headers: { cookie: cookieHeader },
  });
  assert.equal(res.statusCode, 200);
  const neuer = res.json().recoveryCode;
  assert.match(neuer, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);

  // Alter Code funktioniert nicht mehr, neuer schon.
  const mitAltem = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rot@example.de', recoveryCode, newPassword: 'nagelneu99' },
  });
  assert.equal(mitAltem.statusCode, 401);
  const mitNeuem = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'rot@example.de', recoveryCode: neuer, newPassword: 'nagelneu99' },
  });
  assert.equal(mitNeuem.statusCode, 200);
});

test('Recovery-Code erzeugen ohne Login ist 401', async () => {
  const res = await app.inject({ method: 'POST', url: '/api/auth/recovery-code' });
  assert.equal(res.statusCode, 401);
});
