import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { sitzungsCookieName, pruefeAnfrageHerkunft } from '../src/lib/csrf.js';

/**
 * C2 / S18: Passwort-Bestätigung für sensible Konto-Aktionen, CSRF-Härtung,
 * `__Host-`-Cookie und Schutz der Admin-Konten.
 */

let app;
afterEach(async () => {
  await app?.close();
});

const PW = 'geheim1234';

async function registriere(email, cookieName = 'ap_session', extra = {}) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: PW, ...extra } });
  const c = res.cookies.find((x) => x.name === cookieName);
  return { res, cookie: c ? `${cookieName}=${c.value}` : '' };
}

// ---------------------------------------------------------------------------
// 1) Passwort-Bestätigung
// ---------------------------------------------------------------------------

for (const [methode, url] of [
  ['POST', '/api/auth/recovery-code'],
  ['DELETE', '/api/auth/account'],
]) {
  test(`${methode} ${url}: ohne/falsches Passwort → 401, mit richtigem → 200`, async () => {
    app = await buildApp();
    const { cookie } = await registriere('pw@example.de');
    const headers = { cookie };

    const ohne = await app.inject({ method: methode, url, headers });
    assert.equal(ohne.statusCode, 401);
    const leer = await app.inject({ method: methode, url, headers, payload: { password: '' } });
    assert.equal(leer.statusCode, 401);
    const falsch = await app.inject({ method: methode, url, headers, payload: { password: 'falsch-falsch' } });
    assert.equal(falsch.statusCode, 401);
    const typ = await app.inject({ method: methode, url, headers, payload: { password: { $ne: 1 } } });
    assert.equal(typ.statusCode, 401);
    // Nichts passiert: Konto besteht weiter.
    assert.equal((await app.inject({ url: '/api/auth/me', headers })).statusCode, 200);

    const ok = await app.inject({ method: methode, url, headers, payload: { password: PW } });
    assert.equal(ok.statusCode, 200);
  });

  test(`${methode} ${url}: Bremse greift nach 8 Fehlversuchen (429), Erfolg setzt zurück`, async () => {
    app = await buildApp();
    const { cookie } = await registriere('bremse@example.de');
    const headers = { cookie };
    const versuch = (password) => app.inject({ method: methode, url, headers, payload: { password } });

    for (let i = 0; i < 7; i += 1) assert.equal((await versuch('falsch-falsch')).statusCode, 401);
    // Erfolg setzt den Zähler zurück (beim Recovery-Code unkritisch, beim Löschen
    // wäre das Konto weg – daher nur dort prüfen, wo die Aktion folgenlos ist).
    if (methode === 'POST') {
      assert.equal((await versuch(PW)).statusCode, 200);
      for (let i = 0; i < 7; i += 1) assert.equal((await versuch('falsch-falsch')).statusCode, 401);
    }
    assert.equal((await versuch('falsch-falsch')).statusCode, 401); // 8. Versuch
    const gesperrt = await versuch('falsch-falsch');
    assert.equal(gesperrt.statusCode, 429);
    assert.ok(Number(gesperrt.headers['retry-after']) > 0);
    // Auch das richtige Passwort wird jetzt gebremst.
    assert.equal((await versuch(PW)).statusCode, 429);
  });
}

test('Bremse der Konto-Aktionen ist vom Login-Schlüssel getrennt und pro Konto', async () => {
  app = await buildApp();
  const a = await registriere('a@example.de');
  const b = await registriere('b@example.de');
  for (let i = 0; i < 9; i += 1) {
    await app.inject({ method: 'POST', url: '/api/auth/recovery-code', headers: { cookie: a.cookie }, payload: { password: 'x-falsch-x' } });
  }
  // Konto A ist gebremst, Konto B (gleiche IP) nicht; Login von A weiter möglich.
  const rA = await app.inject({ method: 'POST', url: '/api/auth/recovery-code', headers: { cookie: a.cookie }, payload: { password: PW } });
  assert.equal(rA.statusCode, 429);
  const rB = await app.inject({ method: 'POST', url: '/api/auth/recovery-code', headers: { cookie: b.cookie }, payload: { password: PW } });
  assert.equal(rB.statusCode, 200);
  const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@example.de', password: PW } });
  assert.equal(login.statusCode, 200);
});

// ---------------------------------------------------------------------------
// 2) CSRF: Sec-Fetch-Site / Origin / Content-Type
// ---------------------------------------------------------------------------

const LOGIN = { email: 'x@example.de', password: 'irgendwas123' };

async function loginMit(headers, payload = LOGIN) {
  return app.inject({ method: 'POST', url: '/api/auth/login', headers, payload });
}

test('CSRF: Sec-Fetch-Site – nur same-origin und none erlaubt', async () => {
  app = await buildApp();
  await registriere('x@example.de');
  for (const site of ['same-origin', 'none']) {
    assert.equal((await loginMit({ 'sec-fetch-site': site })).statusCode, 401, site); // erreicht die Route (falsches Passwort)
  }
  for (const site of ['cross-site', 'same-site', 'unbekannt']) {
    assert.equal((await loginMit({ 'sec-fetch-site': site })).statusCode, 403, site);
  }
});

test('CSRF: ohne Sec-Fetch-Site muss Origin zum Host passen (Port ignoriert)', async () => {
  app = await buildApp();
  const host = { host: 'lernen.example.de' };
  assert.equal((await loginMit({ ...host, origin: 'https://lernen.example.de' })).statusCode, 401);
  assert.equal((await loginMit({ ...host, origin: 'https://lernen.example.de:8443' })).statusCode, 401);
  assert.equal((await loginMit({ host: 'lernen.example.de:8443', origin: 'https://lernen.example.de' })).statusCode, 401);
  assert.equal((await loginMit({ ...host, origin: 'https://cloud.example.de' })).statusCode, 403);
  assert.equal((await loginMit({ ...host, origin: 'https://evil.com' })).statusCode, 403);
  assert.equal((await loginMit({ ...host, origin: 'null' })).statusCode, 403);
  // Sec-Fetch-Site hat Vorrang: same-origin gilt auch bei abweichendem Origin-Header nicht als Freibrief für cross-site.
  assert.equal((await loginMit({ ...host, origin: 'https://lernen.example.de', 'sec-fetch-site': 'cross-site' })).statusCode, 403);
});

test('CSRF: X-Forwarded-Proto – Schema des Origin muss zum Proxy passen', async () => {
  app = await buildApp();
  const h = { host: 'lernen.example.de', 'x-forwarded-proto': 'https' };
  assert.equal((await loginMit({ ...h, origin: 'https://lernen.example.de' })).statusCode, 401);
  assert.equal((await loginMit({ ...h, origin: 'http://lernen.example.de' })).statusCode, 403);
});

test('CSRF: ohne Sec-Fetch-Site und Origin (curl, Tests, alte Clients) bleibt erlaubt', async () => {
  app = await buildApp();
  assert.equal((await loginMit({})).statusCode, 401);
});

test('CSRF: GET/HEAD/OPTIONS werden nie blockiert', async () => {
  app = await buildApp();
  const get = await app.inject({ url: '/api/health', headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.com' } });
  assert.equal(get.statusCode, 200);
});

test('CSRF: Dev-Setup mit CORS_ORIGIN (Frontend auf anderem Port) bleibt nutzbar', async () => {
  app = await buildApp({ corsOrigin: 'http://localhost:5173' });
  const ok = await loginMit({ origin: 'http://localhost:5173', 'sec-fetch-site': 'same-site', host: 'localhost:3001' });
  assert.equal(ok.statusCode, 401); // erreicht die Route
  const fremd = await loginMit({ origin: 'http://localhost:6666', 'sec-fetch-site': 'same-site', host: 'localhost:3001' });
  assert.equal(fremd.statusCode, 403);
});

test('Content-Type: Requests mit Body brauchen application/json (sonst 415), auch Admin-Einladungen', async () => {
  app = await buildApp({ adminEmails: 'admin@example.de', registrierung: 'open' });
  const { cookie } = await registriere('admin@example.de');
  const textPlain = await app.inject({
    method: 'POST',
    url: '/api/admin/invites',
    headers: { cookie, 'content-type': 'text/plain' },
    payload: '{"maxUses":5}',
  });
  assert.equal(textPlain.statusCode, 415);
  const formular = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    payload: 'email=a@b.de&password=x',
  });
  assert.equal(formular.statusCode, 415);
  const json = await app.inject({
    method: 'POST',
    url: '/api/admin/invites',
    headers: { cookie, 'content-type': 'application/json; charset=utf-8' },
    payload: '{"maxUses":2}',
  });
  assert.equal(json.statusCode, 201);
  // Bodylose POSTs bleiben erlaubt (Logout).
  const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
  assert.equal(logout.statusCode, 200);
});

test('pruefeAnfrageHerkunft: reine Funktion', () => {
  const mk = (method, headers = {}) => ({ method, headers });
  assert.equal(pruefeAnfrageHerkunft(mk('GET', { 'sec-fetch-site': 'cross-site' })).ok, true);
  assert.equal(pruefeAnfrageHerkunft(mk('POST', { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal(pruefeAnfrageHerkunft(mk('DELETE', { origin: 'https://a.de', host: 'b.de' })).status, 403);
  assert.equal(pruefeAnfrageHerkunft(mk('PUT', { 'content-length': '5' })).status, 415);
  assert.equal(pruefeAnfrageHerkunft(mk('PUT', { 'content-length': '5', 'content-type': 'application/json' })).ok, true);
  assert.equal(pruefeAnfrageHerkunft(mk('POST', {})).ok, true);
});

// ---------------------------------------------------------------------------
// 3) __Host--Cookie
// ---------------------------------------------------------------------------

test('Cookie-Name: im Produktivmodus __Host-<Name>, sonst unverändert', () => {
  assert.equal(sitzungsCookieName(undefined, false), 'ap_session');
  assert.equal(sitzungsCookieName('x', false), 'x');
  assert.equal(sitzungsCookieName(undefined, true), '__Host-ap_session');
  assert.equal(sitzungsCookieName('__Host-x', true), '__Host-x');
});

test('Produktivmodus: __Host--Cookie (Secure, Pfad /, ohne Domain) wird gesetzt, gelesen und beim Logout gelöscht', async () => {
  app = await buildApp({ secureCookie: true });
  const { res, cookie } = await registriere('prod@example.de', '__Host-ap_session');
  const roh = res.cookies.find((c) => c.name === '__Host-ap_session');
  assert.ok(roh, 'Cookie mit __Host--Präfix');
  assert.equal(roh.secure, true);
  assert.equal(roh.path, '/');
  assert.equal(roh.domain, undefined);
  assert.ok(!res.cookies.some((c) => c.name === 'ap_session'), 'kein Cookie ohne Präfix');

  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).statusCode, 200);
  // Das alte, ungeschützte Cookie wird nicht mehr akzeptiert.
  const alt = cookie.replace('__Host-', '');
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: alt } })).statusCode, 401);

  const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
  assert.ok(logout.cookies.some((c) => c.name === '__Host-ap_session' && c.value === ''), 'Logout löscht __Host--Cookie');
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).statusCode, 401);
});

// ---------------------------------------------------------------------------
// 4) Admin-Konten nicht löschbar
// ---------------------------------------------------------------------------

test('Admin kann sich nicht per DELETE /api/auth/account löschen (409); E-Mail bleibt belegt', async () => {
  app = await buildApp({ adminEmails: 'admin@example.de', registrierung: 'open' });
  const { cookie } = await registriere('admin@example.de');
  const del = await app.inject({ method: 'DELETE', url: '/api/auth/account', headers: { cookie }, payload: { password: PW } });
  assert.equal(del.statusCode, 409);
  assert.match(del.json().error, /ADMIN_EMAILS/);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie } })).json().user.admin, true);

  // Auch mit Einladungs-Modus: die E-Mail kann nicht neu vergeben werden.
  const nochmal = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'admin@example.de', password: PW } });
  assert.equal(nochmal.statusCode, 409);
});

test('Admin-Bereich: Admin-Konten lassen sich nicht löschen (409), normale schon', async () => {
  app = await buildApp({ adminEmails: 'admin@example.de,zweiter@example.de', registrierung: 'open' });
  const admin = await registriere('admin@example.de');
  const zweiter = await registriere('zweiter@example.de');
  const normal = await registriere('normal@example.de');
  const idVon = (e) => app.db.prepare('SELECT id FROM users WHERE email = ?').get(e).id;
  void zweiter;

  const gegenAdmin = await app.inject({ method: 'DELETE', url: `/api/admin/users/${idVon('zweiter@example.de')}`, headers: { cookie: admin.cookie } });
  assert.equal(gegenAdmin.statusCode, 409);
  assert.ok(app.db.prepare('SELECT id FROM users WHERE email = ?').get('zweiter@example.de'));

  void normal;
  const gegenNormal = await app.inject({ method: 'DELETE', url: `/api/admin/users/${idVon('normal@example.de')}`, headers: { cookie: admin.cookie } });
  assert.equal(gegenNormal.statusCode, 200);
});
