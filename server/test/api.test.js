import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { erstelleRateLimiter } from '../src/lib/rateLimit.js';

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

test('Login-Rate-Limit: nach zu vielen Fehlversuchen 429 mit Retry-After', async () => {
  // Eigene App mit kleinem Limit, damit der Test schnell greift.
  const eng = await buildApp({
    dbPath: ':memory:',
    loginLimiter: erstelleRateLimiter({ maxVersuche: 3, fensterMs: 60_000 }),
  });
  try {
    await eng.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'rl@example.de', password: 'richtig123' },
    });
    const falsch = () =>
      eng.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'rl@example.de', password: 'falsch999' },
      });
    assert.equal((await falsch()).statusCode, 401);
    assert.equal((await falsch()).statusCode, 401);
    assert.equal((await falsch()).statusCode, 401);
    const blockiert = await falsch(); // 4. Versuch
    assert.equal(blockiert.statusCode, 429);
    assert.ok(Number(blockiert.headers['retry-after']) > 0);
  } finally {
    await eng.close();
  }
});

test('Login-Rate-Limit: erfolgreicher Login setzt den Zähler zurück', async () => {
  const eng = await buildApp({
    dbPath: ':memory:',
    loginLimiter: erstelleRateLimiter({ maxVersuche: 3, fensterMs: 60_000 }),
  });
  try {
    await eng.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'ok@example.de', password: 'richtig123' },
    });
    const login = (pw) =>
      eng.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'ok@example.de', password: pw } });
    await login('falsch999'); // 1 Fehlversuch
    await login('falsch999'); // 2 Fehlversuche
    assert.equal((await login('richtig123')).statusCode, 200); // Erfolg → reset
    // Danach wieder volles Budget: zwei Fehlversuche bleiben unter dem Limit.
    assert.equal((await login('falsch999')).statusCode, 401);
    assert.equal((await login('falsch999')).statusCode, 401);
    assert.notEqual((await login('falsch999')).statusCode, 429); // 3. erst jetzt am Limit, nicht drüber
  } finally {
    await eng.close();
  }
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

test('Fortschritt: FSRS-Felder (stability/difficulty/reps/lapses/last_review) bleiben erhalten', async () => {
  const { cookieHeader } = await registriere();
  const headers = { cookie: cookieHeader };

  await app.inject({
    method: 'PUT',
    url: '/api/progress/lz_ap2_fsrs_1',
    headers,
    payload: {
      box: 3,
      due: '2026-07-01T00:00:00.000Z',
      stability: 12.34,
      difficulty: 5.67,
      reps: 4,
      lapses: 1,
      last_review: '2026-06-01T00:00:00.000Z',
    },
  });

  const e = (await app.inject({ url: '/api/progress', headers })).json().progress.lz_ap2_fsrs_1;
  assert.equal(e.stability, 12.34);
  assert.equal(e.difficulty, 5.67);
  assert.equal(e.reps, 4);
  assert.equal(e.lapses, 1);
  assert.equal(e.last_review, '2026-06-01T00:00:00.000Z');
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

test('Gamification: pro Nutzer speichern, laden und isolieren', async () => {
  const a = await registriere('gami-a@example.de');
  const ha = { cookie: a.cookieHeader };

  // Anfangs nichts gespeichert.
  assert.equal((await app.inject({ url: '/api/gamification', headers: ha })).json().gamification, null);

  await app.inject({
    method: 'PUT',
    url: '/api/gamification',
    headers: ha,
    payload: { activity: { '2026-06-27': 5 }, xp: 120, klausurBest: 80 },
  });

  const g = (await app.inject({ url: '/api/gamification', headers: ha })).json().gamification;
  assert.equal(g.xp, 120);
  assert.equal(g.klausurBest, 80);
  assert.equal(g.activity['2026-06-27'], 5);

  // Anderer Nutzer sieht davon nichts.
  const b = await registriere('gami-b@example.de');
  const gb = (await app.inject({ url: '/api/gamification', headers: { cookie: b.cookieHeader } })).json();
  assert.equal(gb.gamification, null);
});

test('Gamification ohne Login ist 401', async () => {
  const res = await app.inject({ url: '/api/gamification' });
  assert.equal(res.statusCode, 401);
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
