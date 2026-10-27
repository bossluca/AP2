import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { erstelleRateLimiter } from '../src/lib/rateLimit.js';
import {
  AUDIT_EREIGNISSE,
  audit,
  auditAbfrage,
  baueAuditZeile,
  bereinigeDetail,
  raeumeAuditAuf,
} from '../src/lib/audit.js';

// S8/C6: Sicherheitsprotokoll.

// --- reine Teile ------------------------------------------------------------

test('baueAuditZeile: Whitelist, Konto-ID, IP, Zeit', () => {
  const jetzt = new Date('2026-10-27T10:00:00.000Z');
  assert.deepEqual(baueAuditZeile({ ereignis: 'login_ok', kontoId: 3, ip: '10.0.0.1' }, jetzt), {
    zeit: '2026-10-27T10:00:00.000Z',
    ereignis: 'login_ok',
    konto_id: 3,
    ip: '10.0.0.1',
    detail: null,
  });
  assert.throws(() => baueAuditZeile({ ereignis: 'quatsch' }), RangeError);
  assert.equal(baueAuditZeile({ ereignis: 'login_ok', kontoId: '3' }).konto_id, null);
  assert.equal(baueAuditZeile({ ereignis: 'login_ok', ip: 'x'.repeat(200) }).ip.length, 64);
});

test('bereinigeDetail: kürzt auf 120 Zeichen und maskiert Geheimnis-artiges', () => {
  assert.equal(bereinigeDetail(undefined), null);
  assert.equal(bereinigeDetail('   '), null);
  const lang = bereinigeDetail('x'.repeat(500));
  assert.equal(lang.length, 120);
  assert.equal(bereinigeDetail('von lea@fisi.dev'), 'von [E-Mail]');
  assert.equal(bereinigeDetail('Code ABCD-EFGH-JKLM-NPQR'), 'Code [Code]');
  assert.equal(bereinigeDetail('Einladung ABCD-EFGH-JKLM'), 'Einladung [Code]');
  assert.equal(bereinigeDetail(`Token ${'ab'.repeat(32)}`), 'Token [Hex]');
  assert.equal(bereinigeDetail('Zeile1\nZeile2'), 'Zeile1 Zeile2');
  assert.equal(bereinigeDetail('Konto #12 durch Admin #1'), 'Konto #12 durch Admin #1');
});

test('auditAbfrage: limit-Default 100, max 500, Ereignis-Whitelist', () => {
  assert.deepEqual(auditAbfrage({}), { ok: true, limit: 100, ereignis: null });
  assert.deepEqual(auditAbfrage({ limit: '9999' }), { ok: true, limit: 500, ereignis: null });
  assert.deepEqual(auditAbfrage({ limit: '5', ereignis: 'login_ok' }), { ok: true, limit: 5, ereignis: 'login_ok' });
  assert.equal(auditAbfrage({ limit: '0' }).ok, false);
  assert.equal(auditAbfrage({ limit: 'abc' }).ok, false);
  assert.equal(auditAbfrage({ ereignis: "x' OR 1=1" }).ok, false);
});

test('audit() ist fehlertolerant (fehlende Tabelle, unbekanntes Ereignis)', () => {
  const db = openDb(':memory:');
  const warnungen = [];
  const log = { warn: (...a) => warnungen.push(a) };
  assert.equal(audit(db, { ereignis: 'login_ok' }, { log }), true);
  assert.equal(audit(db, { ereignis: 'gibtsnicht' }, { log }), false);
  db.exec('DROP TABLE audit');
  assert.equal(audit(db, { ereignis: 'login_ok' }, { log }), false);
  assert.equal(warnungen.length, 2);
  // Auch ein defekter Logger wirft nicht.
  assert.equal(audit(db, { ereignis: 'login_ok' }, { log: { warn: () => { throw new Error('x'); } } }), false);
  db.close();
});

test('Aufräumen nach 90 Tagen + Zeilen-Obergrenze', () => {
  const db = openDb(':memory:');
  const jetzt = new Date('2026-10-27T00:00:00.000Z');
  const tag = 24 * 60 * 60 * 1000;
  audit(db, { ereignis: 'login_ok' }, { jetzt: new Date(jetzt.getTime() - 91 * tag) });
  audit(db, { ereignis: 'login_ok' }, { jetzt: new Date(jetzt.getTime() - 90 * tag - 1000) });
  audit(db, { ereignis: 'login_ok' }, { jetzt: new Date(jetzt.getTime() - 89 * tag) });
  audit(db, { ereignis: 'login_ok' }, { jetzt });
  assert.equal(raeumeAuditAuf(db, { jetzt }), 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit').get().n, 2);
  assert.equal(raeumeAuditAuf(db, { jetzt }), 0); // idempotent

  // Obergrenze: nur die jüngsten Zeilen bleiben.
  for (let i = 0; i < 10; i += 1) audit(db, { ereignis: 'login_fehlgeschlagen', detail: `n${i}` }, { jetzt });
  assert.equal(raeumeAuditAuf(db, { jetzt, maxZeilen: 5 }), 7);
  const rest = db.prepare('SELECT detail FROM audit ORDER BY id').all().map((z) => z.detail);
  assert.deepEqual(rest, ['n5', 'n6', 'n7', 'n8', 'n9']);
  db.close();
});

// --- API --------------------------------------------------------------------

let app;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const PW = 'Sehr-Geheim-1234';

async function registriere(email, extra = {}) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email, password: PW, ...extra } });
  const c = res.cookies.find((x) => x.name === 'ap_session');
  return { res, token: c?.value, cookie: c ? `ap_session=${c.value}` : '' };
}
const login = (email, password = PW) =>
  app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
const alle = () => app.db.prepare('SELECT * FROM audit ORDER BY id').all();
const ereignisse = () => alle().map((z) => z.ereignis);

test('Audit-Einträge entstehen für alle Ereignisse und enthalten keine Geheimnisse', async () => {
  app = await buildApp({
    registrierung: 'open',
    adminEmails: 'chef@example.de',
    loginLimiter: erstelleRateLimiter({ maxVersuche: 2, fensterMs: 60_000 }),
  });
  const geheimnisse = [PW, 'chef@example.de', 'lea@example.de', 'niemand@example.de', 'Falsch-Passwort-99'];
  const admin = await registriere('chef@example.de');
  geheimnisse.push(admin.token, admin.res.json().recoveryCode);
  app.config.registrierung = 'invite';

  // Einladung erzeugen → Registrierung mit Code; ungültiger Code wird abgelehnt.
  const inv = await app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin.cookie }, payload: {} });
  const { code, id: einladungId } = inv.json();
  geheimnisse.push(code, code.replace(/-/g, ''));
  assert.equal((await registriere('x@example.de', { inviteCode: 'ZZZZ-ZZZZ-ZZZZ' })).res.statusCode, 403);
  geheimnisse.push('ZZZZ-ZZZZ-ZZZZ');
  const lea = await registriere('lea@example.de', { inviteCode: code });
  assert.equal(lea.res.statusCode, 201);
  const leaId = lea.res.json().user.id;
  geheimnisse.push(lea.token, lea.res.json().recoveryCode);

  // Login ok / fehlgeschlagen (bekannt + unbekannt) / gebremst.
  const ok = await login('lea@example.de');
  assert.equal(ok.statusCode, 200);
  geheimnisse.push(ok.cookies.find((c) => c.name === 'ap_session').value);
  const falsch = await login('lea@example.de', 'Falsch-Passwort-99');
  const unbekannt = await login('niemand@example.de', 'Falsch-Passwort-99');
  // Keine Auskunft, ob die E-Mail existiert: gleiche Antwort.
  assert.equal(falsch.statusCode, 401);
  assert.deepEqual(falsch.json(), unbekannt.json());
  await login('lea@example.de', 'Falsch-Passwort-99');
  const gebremst = await login('lea@example.de', 'Falsch-Passwort-99');
  assert.equal(gebremst.statusCode, 429);

  // Recovery fehlgeschlagen + ok (andere IP-unabhängige Bremse: eigener Schlüssel je E-Mail).
  const recFalsch = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'chef@example.de', recoveryCode: 'AAAA-BBBB-CCCC-DDDD', newPassword: 'Neu-Geheim-5678' },
  });
  assert.equal(recFalsch.statusCode, 401);
  geheimnisse.push('AAAA-BBBB-CCCC-DDDD', 'Neu-Geheim-5678');
  const recOk = await app.inject({
    method: 'POST',
    url: '/api/auth/recover',
    payload: { email: 'chef@example.de', recoveryCode: admin.res.json().recoveryCode, newPassword: 'Neu-Geheim-5678' },
  });
  assert.equal(recOk.statusCode, 200);
  geheimnisse.push(recOk.json().recoveryCode);
  const adminCookie = `ap_session=${recOk.cookies.find((c) => c.name === 'ap_session').value}`;
  geheimnisse.push(adminCookie.slice('ap_session='.length));

  // Recovery-Code erneuern (Passwort falsch → Bestätigung fehlgeschlagen, dann ok).
  const rcFalsch = await app.inject({
    method: 'POST',
    url: '/api/auth/recovery-code',
    headers: { cookie: lea.cookie },
    payload: { password: 'Falsch-Passwort-99' },
  });
  assert.equal(rcFalsch.statusCode, 401);
  const rc = await app.inject({ method: 'POST', url: '/api/auth/recovery-code', headers: { cookie: lea.cookie }, payload: { password: PW } });
  assert.equal(rc.statusCode, 200);
  geheimnisse.push(rc.json().recoveryCode);

  // Admin: sperren, entsperren, Einladung löschen, Konto löschen.
  const patch = (gesperrt) =>
    app.inject({ method: 'PATCH', url: `/api/admin/users/${leaId}`, headers: { cookie: adminCookie }, payload: { gesperrt } });
  assert.equal((await patch(true)).statusCode, 200);
  assert.equal((await patch(false)).statusCode, 200);
  assert.equal(
    (await app.inject({ method: 'DELETE', url: `/api/admin/invites/${einladungId}`, headers: { cookie: adminCookie } })).statusCode,
    200
  );
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/admin/users/${leaId}`, headers: { cookie: adminCookie } })).statusCode, 200);

  const e = ereignisse();
  for (const erwartet of [
    'registrierung',
    'einladung_erzeugt',
    'registrierung_abgelehnt',
    'login_ok',
    'login_fehlgeschlagen',
    'login_gebremst',
    'recovery_fehlgeschlagen',
    'recovery_ok',
    'passwort_bestaetigung_fehlgeschlagen',
    'recovery_code_erneuert',
    'konto_gesperrt',
    'konto_entsperrt',
    'einladung_geloescht',
    'konto_geloescht',
  ]) {
    assert.ok(e.includes(erwartet), `Ereignis fehlt: ${erwartet} (${e.join(', ')})`);
  }
  for (const z of alle()) assert.ok(AUDIT_EREIGNISSE.includes(z.ereignis));

  // Fehlversuch mit unbekannter E-Mail: konto_id NULL; mit bekannter: die ID
  // (wurde beim Löschen des Kontos entkoppelt → jetzt ebenfalls NULL).
  const fehl = alle().filter((z) => z.ereignis === 'login_fehlgeschlagen');
  assert.ok(fehl.every((z) => z.konto_id === null));
  assert.ok(alle().every((z) => z.konto_id !== leaId), 'Einträge des gelöschten Kontos nicht entkoppelt');
  // IP aus req.ip.
  assert.ok(alle().every((z) => z.ip === '127.0.0.1'));
  // Detail ≤ 120 Zeichen.
  assert.ok(alle().every((z) => z.detail === null || z.detail.length <= 120));

  // Kein Geheimnis in irgendeiner Spalte (auch nicht teilweise E-Mail-Teile/Codes).
  const dump = JSON.stringify(alle()).toLowerCase();
  for (const g of geheimnisse) {
    assert.ok(g, 'leeres Geheimnis im Test');
    assert.equal(dump.includes(String(g).toLowerCase()), false, `Geheimnis im Audit-Log: ${g}`);
  }
  assert.equal(dump.includes('@'), false, 'E-Mail-artiger Inhalt im Audit-Log');
});

test('Fehlversuch mit bekanntem Konto trägt dessen konto_id', async () => {
  app = await buildApp();
  const a = await registriere('k@example.de');
  await login('k@example.de', 'Falsch-Passwort-99');
  const z = alle().find((x) => x.ereignis === 'login_fehlgeschlagen');
  assert.equal(z.konto_id, a.res.json().user.id);
  assert.equal(z.detail, 'Passwort falsch');
});

test('nur Admin darf das Audit-Log lesen', async () => {
  app = await buildApp({ adminEmails: 'chef@example.de' });
  const admin = await registriere('chef@example.de');
  const nutzer = await registriere('lea@example.de');
  assert.equal((await app.inject({ url: '/api/admin/audit' })).statusCode, 401);
  assert.equal((await app.inject({ url: '/api/admin/audit', headers: { cookie: nutzer.cookie } })).statusCode, 403);
  const res = await app.inject({ url: '/api/admin/audit', headers: { cookie: admin.cookie } });
  assert.equal(res.statusCode, 200);
  const { eintraege } = res.json();
  assert.equal(eintraege.length, 2);
  // Neueste zuerst, E-Mail per Join (nur hier).
  assert.equal(eintraege[0].email, 'lea@example.de');
  assert.equal(eintraege[1].email, 'chef@example.de');
  assert.equal(eintraege[0].ereignis, 'registrierung');
});

test('Admin-API: limit (max 500) und Ereignis-Filter', async () => {
  app = await buildApp({ adminEmails: 'chef@example.de' });
  const admin = await registriere('chef@example.de');
  for (let i = 0; i < 3; i += 1) await login('chef@example.de', 'Falsch-Passwort-99');
  const get = (q) => app.inject({ url: `/api/admin/audit${q}`, headers: { cookie: admin.cookie } });
  assert.equal((await get('?limit=2')).json().eintraege.length, 2);
  const gefiltert = (await get('?ereignis=login_fehlgeschlagen')).json().eintraege;
  assert.equal(gefiltert.length, 3);
  assert.ok(gefiltert.every((z) => z.ereignis === 'login_fehlgeschlagen'));
  assert.equal((await get('?limit=0')).statusCode, 400);
  assert.equal((await get('?ereignis=unbekannt')).statusCode, 400);
  assert.equal((await get('?limit=100000')).statusCode, 200);
});

test('Audit-Fehler bricht keine Anfrage ab', async () => {
  app = await buildApp({ adminEmails: 'chef@example.de' });
  const admin = await registriere('chef@example.de');
  app.db.exec('DROP TABLE audit');
  assert.equal((await login('chef@example.de')).statusCode, 200);
  assert.equal((await login('chef@example.de', 'Falsch-Passwort-99')).statusCode, 401);
  assert.equal((await registriere('neu@example.de')).res.statusCode, 201);
  const inv = await app.inject({ method: 'POST', url: '/api/admin/invites', headers: { cookie: admin.cookie }, payload: {} });
  assert.equal(inv.statusCode, 201);
  const neu = await login('neu@example.de');
  const c = `ap_session=${neu.cookies.find((x) => x.name === 'ap_session').value}`;
  const weg = await app.inject({ method: 'DELETE', url: '/api/auth/account', headers: { cookie: c }, payload: { password: PW } });
  assert.equal(weg.statusCode, 200);
});

test('Registrierung abgelehnt (ungültiger Code) protokolliert ohne Code und ohne E-Mail', async () => {
  app = await buildApp({ registrierung: 'invite' });
  const res = await registriere('wer@example.de', { inviteCode: 'QQQQ-QQQQ-QQQQ' });
  assert.equal(res.res.statusCode, 403);
  const [z] = alle();
  assert.equal(z.ereignis, 'registrierung_abgelehnt');
  assert.equal(z.konto_id, null);
  assert.equal(z.detail, 'Einladungscode ungültig');
});
