import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

/**
 * Sicherheits-Invarianten des Backends. Jeder Test hält eine Regel fest, die
 * bei einem Umbau nicht still verloren gehen darf (s. SECURITY.md).
 */

let app;
afterEach(async () => {
  await app?.close();
});

async function registriere(email, extra = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { email, password: 'geheim1234', ...extra },
  });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  return { res, cookie: c ? `ap_session=${c.value}` : '', roh: c };
}

test('Session-Cookie: HttpOnly, SameSite=Lax, Secure im Produktivbetrieb', async () => {
  app = await buildApp({ secureCookie: true });
  const { roh } = await registriere('a@b.de');
  assert.ok(roh, 'Cookie gesetzt');
  assert.equal(roh.httpOnly, true);
  assert.equal(String(roh.sameSite).toLowerCase(), 'lax');
  assert.equal(roh.secure, true);
  assert.equal(roh.path, '/');
});

test('Passwörter liegen nur als argon2id-Hash in der DB', async () => {
  app = await buildApp();
  await registriere('a@b.de');
  const row = app.db.prepare('SELECT password_hash FROM users WHERE email = ?').get('a@b.de');
  assert.match(row.password_hash, /^\$argon2id\$/);
  assert.ok(!row.password_hash.includes('geheim1234'));
});

test('Keine Hashes oder Geheimnisse in API-Antworten', async () => {
  app = await buildApp({ adminEmails: 'admin@fisi.dev' });
  const { res: reg, cookie } = await registriere('admin@fisi.dev');
  await app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie }, payload: {} });
  const antworten = [
    reg.body,
    (await app.inject({ url: '/api/auth/me', headers: { cookie } })).body,
    (await app.inject({ url: '/api/admin/uebersicht', headers: { cookie } })).body,
    (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'admin@fisi.dev', password: 'geheim1234' } })).body,
  ];
  for (const body of antworten) {
    assert.doesNotMatch(body, /argon2|password_hash|recovery_hash|code_hash|"token"/i, body);
  }
});

test('Login verrät nicht, ob ein Konto existiert', async () => {
  app = await buildApp();
  await registriere('da@b.de');
  const falschesPw = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'da@b.de', password: 'falsch12345' } });
  const unbekannt = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'weg@b.de', password: 'falsch12345' } });
  assert.equal(falschesPw.statusCode, 401);
  assert.equal(unbekannt.statusCode, 401);
  assert.deepEqual(falschesPw.json(), unbekannt.json());
});

test('Admin-API: ohne Login 401, als normales Konto 403 – für jede Route', async () => {
  app = await buildApp({ adminEmails: 'admin@fisi.dev' });
  const { cookie } = await registriere('normal@b.de');
  const routen = [
    ['GET', '/api/admin/uebersicht'],
    ['PATCH', '/api/admin/users/1'],
    ['DELETE', '/api/admin/users/1'],
    ['POST', '/api/admin/invites'],
    ['DELETE', '/api/admin/invites/1'],
  ];
  for (const [method, url] of routen) {
    const anonym = await app.inject({ method, url, payload: {} });
    assert.equal(anonym.statusCode, 401, `${method} ${url} anonym`);
    const normal = await app.inject({ method, url, headers: { cookie }, payload: {} });
    assert.equal(normal.statusCode, 403, `${method} ${url} als Nicht-Admin`);
  }
});

test('Admin-Rechte lassen sich nicht per API erschleichen', async () => {
  app = await buildApp({ adminEmails: 'admin@fisi.dev' });
  const { res, cookie } = await registriere('normal@b.de', { admin: true });
  assert.equal(res.json().user.admin, false);
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie } });
  assert.equal(me.json().user.admin, false);
});

test('invite-Modus: ohne gültigen Code kein Konto – auch nicht mit Admin-E-Mail', async () => {
  app = await buildApp({ registrierung: 'invite', adminEmails: 'admin@fisi.dev' });
  for (const [email, extra] of [
    ['admin@fisi.dev', {}],
    ['ADMIN@fisi.dev', { inviteCode: '' }],
    ['x@b.de', { inviteCode: 'AAAA-BBBB-CCCC' }],
    ['y@b.de', { inviteCode: { $ne: null } }],
  ]) {
    const { res } = await registriere(email, extra);
    assert.equal(res.statusCode, 403, email);
  }
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0);
});

test('Logout macht die Sitzung serverseitig ungültig', async () => {
  app = await buildApp();
  const { cookie } = await registriere('a@b.de');
  await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
  const me = await app.inject({ url: '/api/auth/me', headers: { cookie } });
  assert.equal(me.statusCode, 401, 'altes Cookie gilt nicht mehr');
});

test('Gefälschte oder fremde Session-Tokens werden abgewiesen', async () => {
  app = await buildApp();
  for (const token of ['', 'x', '0'.repeat(64), "' OR 1=1 --"]) {
    const me = await app.inject({ url: '/api/auth/me', headers: { cookie: `ap_session=${encodeURIComponent(token)}` } });
    assert.equal(me.statusCode, 401, JSON.stringify(token));
  }
});

test('SQL-Sonderzeichen in Eingaben richten keinen Schaden an', async () => {
  app = await buildApp();
  const boese = "x'); DROP TABLE users; --@b.de";
  await registriere(boese);
  await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: boese, password: 'egal123456' } });
  assert.ok(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n >= 0, 'Tabelle users existiert noch');
});
