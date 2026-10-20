import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { erzeugeGruppenCode, pruefeGruppenname } from '../src/gruppen.js';
import { erstelleRateLimiter } from '../src/lib/rateLimit.js';

test('Gruppen-Helfer', () => {
  assert.match(erzeugeGruppenCode(), /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(pruefeGruppenname('  FISI   24a '), 'FISI 24a');
  assert.equal(pruefeGruppenname('ab'), null);
  assert.equal(pruefeGruppenname('x'.repeat(41)), null);
});

let app;
beforeEach(async () => {
  app = await buildApp({ loginLimiter: erstelleRateLimiter({ maxVersuche: 3, fensterMs: 60_000 }) });
});
afterEach(async () => {
  await app.close();
});

async function nutzer(email, name) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: 'geheim1234' } });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  const cookie = `ap_session=${c.value}`;
  if (name) {
    // Nur Name, kein globales Opt-in.
    const p = await app.inject({
      method: 'PUT',
      url: '/api/rangliste/profil',
      headers: { cookie },
      payload: { optIn: false, anzeigename: name },
    });
    assert.equal(p.statusCode, 200);
  }
  return cookie;
}

const heute = () => new Date().toISOString().slice(0, 10);
async function aktivitaet(cookie, n) {
  await app.inject({
    method: 'PUT',
    url: '/api/gamification',
    headers: { cookie },
    payload: { activity: { [heute()]: n }, xp: n, klausurBest: 0 },
  });
}

test('Gruppe anlegen, per Code beitreten, Gruppen-Rangliste zeigt nur Mitglieder', async () => {
  const lea = await nutzer('lea@b.de', 'Lea');
  const tom = await nutzer('tom@b.de', 'Tom');
  const fremd = await nutzer('fremd@b.de', 'Fremd');
  await aktivitaet(lea, 5);
  await aktivitaet(tom, 9);
  await aktivitaet(fremd, 50);

  const neu = await app.inject({ method: 'POST', url: '/api/gruppen', headers: { cookie: lea }, payload: { name: 'FISI 24a' } });
  assert.equal(neu.statusCode, 201);
  const { id, code } = neu.json().gruppe;

  const beitritt = await app.inject({
    method: 'POST',
    url: '/api/gruppen/beitreten',
    headers: { cookie: tom },
    payload: { code: code.toLowerCase().replace('-', ' ') },
  });
  assert.equal(beitritt.statusCode, 200);

  const liste = await app.inject({ url: `/api/rangliste?gruppe=${id}`, headers: { cookie: lea } });
  assert.equal(liste.statusCode, 200);
  assert.deepEqual(
    liste.json().eintraege.map((e) => [e.anzeigename, e.punkte]),
    [
      ['Tom', 9],
      ['Lea', 5],
    ]
  );
  // Globale Liste bleibt leer (niemand hat global zugestimmt).
  assert.equal((await app.inject({ url: '/api/rangliste', headers: { cookie: lea } })).json().teilnehmer, 0);
  // Nicht-Mitglieder sehen die Gruppe nicht.
  assert.equal((await app.inject({ url: `/api/rangliste?gruppe=${id}`, headers: { cookie: fremd } })).statusCode, 403);

  const meine = (await app.inject({ url: '/api/gruppen', headers: { cookie: tom } })).json().gruppen;
  assert.deepEqual(meine, [{ id, name: 'FISI 24a', code, mitglieder: 2, erstellt: false }]);
});

test('ohne Anzeigename kein Beitritt; falsche Codes werden gebremst', async () => {
  const lea = await nutzer('lea@b.de', 'Lea');
  const ohneName = await nutzer('x@b.de');
  const { code } = (
    await app.inject({ method: 'POST', url: '/api/gruppen', headers: { cookie: lea }, payload: { name: 'Gruppe' } })
  ).json().gruppe;
  const r = await app.inject({ method: 'POST', url: '/api/gruppen/beitreten', headers: { cookie: ohneName }, payload: { code } });
  assert.equal(r.statusCode, 400);

  const tom = await nutzer('tom@b.de', 'Tom');
  const codes = [];
  for (let i = 0; i < 4; i += 1) {
    const f = await app.inject({ method: 'POST', url: '/api/gruppen/beitreten', headers: { cookie: tom }, payload: { code: 'AAAA-AAAA' } });
    codes.push(f.statusCode);
  }
  assert.deepEqual(codes, [404, 404, 404, 429]);
});

test('Verlassen; letzte Person löscht die Gruppe', async () => {
  const lea = await nutzer('lea@b.de', 'Lea');
  const { id } = (
    await app.inject({ method: 'POST', url: '/api/gruppen', headers: { cookie: lea }, payload: { name: 'Solo' } })
  ).json().gruppe;
  const raus = await app.inject({ method: 'DELETE', url: `/api/gruppen/${id}/mitgliedschaft`, headers: { cookie: lea } });
  assert.equal(raus.statusCode, 200);
  assert.deepEqual((await app.inject({ url: '/api/gruppen', headers: { cookie: lea } })).json().gruppen, []);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM gruppen').get().n, 0);
});
