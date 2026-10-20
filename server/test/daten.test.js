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

async function registriere(email) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: 'geheim1234' } });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  return `ap_session=${c.value}`;
}

test('Konto-Daten: speichern, laden, je Nutzer getrennt', async () => {
  const anna = await registriere('anna@b.de');
  const ben = await registriere('ben@b.de');
  const stapel = [{ id: 's1', name: 'Netz', karten: [{ id: 'eigen_s1_0', front: 'a', back: 'b' }] }];
  const put = await app.inject({ method: 'PUT', url: '/api/daten/eigeneKarten', headers: { cookie: anna }, payload: { wert: stapel } });
  assert.equal(put.statusCode, 200);
  assert.ok(put.json().updatedAt);

  const a = (await app.inject({ url: '/api/daten', headers: { cookie: anna } })).json();
  assert.deepEqual(a.daten.eigeneKarten.wert, stapel);
  const b = (await app.inject({ url: '/api/daten', headers: { cookie: ben } })).json();
  assert.deepEqual(b.daten, {});
});

test('Konto-Daten: null löscht logisch, unbekannte Schlüssel und Übergröße werden abgelehnt', async () => {
  const anna = await registriere('anna@b.de');
  await app.inject({ method: 'PUT', url: '/api/daten/einstufung', headers: { cookie: anna }, payload: { wert: { datum: 'x' } } });
  await app.inject({ method: 'PUT', url: '/api/daten/einstufung', headers: { cookie: anna }, payload: { wert: null } });
  const a = (await app.inject({ url: '/api/daten', headers: { cookie: anna } })).json();
  assert.equal(a.daten.einstufung.wert, null);

  const unbekannt = await app.inject({ method: 'PUT', url: '/api/daten/passwort', headers: { cookie: anna }, payload: { wert: 1 } });
  assert.equal(unbekannt.statusCode, 400);
  const gross = await app.inject({
    method: 'PUT',
    url: '/api/daten/einstufung',
    headers: { cookie: anna },
    payload: { wert: 'x'.repeat(70 * 1024) },
  });
  assert.equal(gross.statusCode, 413);
  assert.equal((await app.inject({ url: '/api/daten' })).statusCode, 401);
});
