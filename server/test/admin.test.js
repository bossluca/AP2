import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  registrierungsModus,
  adminEmails,
  erzeugeEinladungsCode,
  normalisiereEinladung,
  einladungGueltig,
} from '../src/lib/einladung.js';

// --- reine Helfer ---------------------------------------------------------

test('registrierungsModus fällt bei Unbekanntem auf open zurück', () => {
  assert.equal(registrierungsModus('INVITE'), 'invite');
  assert.equal(registrierungsModus('closed'), 'closed');
  assert.equal(registrierungsModus(''), 'open');
  assert.equal(registrierungsModus('quatsch'), 'open');
});

test('adminEmails parst Listen robust', () => {
  assert.deepEqual([...adminEmails(' A@x.de, b@y.de;c@z.de ')], ['a@x.de', 'b@y.de', 'c@z.de']);
  assert.equal(adminEmails(undefined).size, 0);
});

test('Einladungs-Codes: Format, Normalisierung, Gültigkeit', () => {
  const code = erzeugeEinladungsCode();
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(normalisiereEinladung(code.toLowerCase().replace(/-/g, ' ')), code.replace(/-/g, ''));
  const jetzt = new Date('2026-10-20T00:00:00Z');
  assert.equal(einladungGueltig({ uses: 0, max_uses: 1 }, jetzt), true);
  assert.equal(einladungGueltig({ uses: 1, max_uses: 1 }, jetzt), false);
  assert.equal(einladungGueltig({ uses: 0, max_uses: 1, expires_at: '2026-10-19T00:00:00Z' }, jetzt), false);
  assert.equal(einladungGueltig(undefined, jetzt), false);
});

// --- API ------------------------------------------------------------------

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
  return { res, cookie: c ? `ap_session=${c.value}` : '' };
}

test('config + geschlossene Registrierung', async () => {
  app = await buildApp({ registrierung: 'closed' });
  assert.deepEqual((await app.inject({ url: '/api/auth/config' })).json(), { registrierung: 'closed' });
  const { res } = await registriere('a@b.de');
  assert.equal(res.statusCode, 403);
});

test('Admin erzeugt Einladung; Registrierung nur mit gültigem Code, Code wird verbraucht', async () => {
  // Erst offen registrieren (Admin anlegen), dann auf invite umschalten.
  app = await buildApp({ registrierung: 'open', adminEmails: 'admin@fisi.dev' });
  const { cookie: admin } = await registriere('admin@fisi.dev');
  app.config.registrierung = 'invite';

  const neu = await app.inject({
    method: 'POST',
    url: '/api/admin/invites',
    headers: { cookie: admin },
    payload: { maxUses: 1, gueltigTage: 7, notiz: 'Klasse FISI 24' },
  });
  assert.equal(neu.statusCode, 201);
  const { code } = neu.json();

  const ohne = await registriere('ohne@b.de');
  assert.equal(ohne.res.statusCode, 403);
  const falsch = await registriere('falsch@b.de', { inviteCode: 'AAAA-BBBB-CCCC' });
  assert.equal(falsch.res.statusCode, 403);
  const mit = await registriere('mit@b.de', { inviteCode: code.toLowerCase() });
  assert.equal(mit.res.statusCode, 201);
  const nochmal = await registriere('nochmal@b.de', { inviteCode: code });
  assert.equal(nochmal.res.statusCode, 403, 'Code mit maxUses 1 ist aufgebraucht');

  const ueb = (await app.inject({ url: '/api/admin/uebersicht', headers: { cookie: admin } })).json();
  assert.equal(ueb.registrierung, 'invite');
  assert.equal(ueb.einladungen[0].uses, 1);
  assert.equal(ueb.einladungen[0].gueltig, false);
  assert.ok(!JSON.stringify(ueb.einladungen).includes(code), 'Klartext-Code wird nicht gespeichert/ausgeliefert');
  assert.deepEqual(ueb.konten.map((k) => k.email).sort(), ['admin@fisi.dev', 'mit@b.de']);
});

test('invite: Admin-E-Mail registriert sich ohne Code, andere nicht', async () => {
  app = await buildApp({ registrierung: 'invite', adminEmails: 'admin@fisi.dev' });
  const admin = await registriere('Admin@Fisi.dev');
  assert.equal(admin.res.statusCode, 201);
  assert.equal(admin.res.json().user.admin, true);
  const fremd = await registriere('fremd@b.de');
  assert.equal(fremd.res.statusCode, 403);
});

test('Nicht-Admins kommen nicht in den Admin-Bereich', async () => {
  app = await buildApp({ adminEmails: 'admin@fisi.dev' });
  const { cookie } = await registriere('normal@b.de');
  assert.equal((await app.inject({ url: '/api/admin/uebersicht' })).statusCode, 401);
  assert.equal((await app.inject({ url: '/api/admin/uebersicht', headers: { cookie } })).statusCode, 403);
  const me = (await app.inject({ url: '/api/auth/me', headers: { cookie } })).json();
  assert.equal(me.user.admin, false);
});

test('Sperren beendet Sitzungen und verhindert Login; Entsperren erlaubt ihn wieder', async () => {
  app = await buildApp({ adminEmails: 'admin@fisi.dev' });
  const { cookie: admin, res: adminRes } = await registriere('admin@fisi.dev');
  assert.equal(adminRes.json().user.admin, true);
  const { cookie: nutzer, res } = await registriere('nutzer@b.de');
  const id = res.json().user.id;

  const sperren = await app.inject({
    method: 'PATCH',
    url: `/api/admin/users/${id}`,
    headers: { cookie: admin },
    payload: { gesperrt: true },
  });
  assert.equal(sperren.statusCode, 200);
  assert.equal((await app.inject({ url: '/api/auth/me', headers: { cookie: nutzer } })).statusCode, 401);
  const login = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'nutzer@b.de', password: 'geheim1234' },
  });
  assert.equal(login.statusCode, 403);

  await app.inject({
    method: 'PATCH',
    url: `/api/admin/users/${id}`,
    headers: { cookie: admin },
    payload: { gesperrt: false },
  });
  const wieder = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'nutzer@b.de', password: 'geheim1234' },
  });
  assert.equal(wieder.statusCode, 200);
});

test('Admin kann sich nicht selbst sperren/löschen, aber andere löschen', async () => {
  app = await buildApp({ adminEmails: 'admin@fisi.dev' });
  const { cookie: admin, res: adminRes } = await registriere('admin@fisi.dev');
  const { res } = await registriere('weg@b.de');
  const selbst = await app.inject({
    method: 'DELETE',
    url: `/api/admin/users/${adminRes.json().user.id}`,
    headers: { cookie: admin },
  });
  assert.equal(selbst.statusCode, 400);
  const weg = await app.inject({
    method: 'DELETE',
    url: `/api/admin/users/${res.json().user.id}`,
    headers: { cookie: admin },
  });
  assert.equal(weg.statusCode, 200);
  const ueb = (await app.inject({ url: '/api/admin/uebersicht', headers: { cookie: admin } })).json();
  assert.equal(ueb.konten.length, 1);
});
