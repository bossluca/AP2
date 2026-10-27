import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pruefeProgressEintrag,
  pruefeItemId,
  pruefeGamification,
  istIsoDatum,
  istObjektOderListe,
} from '../src/lib/validierung.js';

const ISO = '2026-10-27T10:00:00.000Z';

/** Kurzform: Eintrag ist gültig → bereinigter Eintrag. */
function ok(entry) {
  const r = pruefeProgressEintrag(entry);
  assert.equal(r.fehler, undefined, `unerwartet ungültig: ${r.fehler}`);
  return r.eintrag;
}
/** Kurzform: Eintrag ist ungültig → Fehlermeldung (Text muss `muster` enthalten). */
function falsch(entry, muster) {
  const r = pruefeProgressEintrag(entry);
  assert.equal(r.eintrag, undefined, `unerwartet gültig: ${JSON.stringify(entry)}`);
  assert.match(r.fehler, muster);
}

test('pruefeItemId: Länge, Zeichen, Umlaute', () => {
  assert.equal(pruefeItemId('q1'), null);
  assert.equal(pruefeItemId('2022_Frühjahr_1a'), null); // echte ID mit Umlaut
  assert.equal(pruefeItemId('eigen_m1abc_0'), null);
  assert.equal(pruefeItemId('ap2:set-1.a'), null);
  assert.equal(pruefeItemId('a'.repeat(100)), null); // Grenzwert
  assert.match(pruefeItemId('a'.repeat(101)), /zu lang/);
  assert.match(pruefeItemId(''), /fehlt/);
  assert.match(pruefeItemId(undefined), /fehlt/);
  assert.match(pruefeItemId('a b'), /unzulässige/);
  assert.match(pruefeItemId('../x'), /unzulässige/);
  assert.match(pruefeItemId('a<script>'), /unzulässige/);
});

test('Eintrag: Objekt erforderlich, leerer Eintrag ok, unbekannte Felder werden entfernt', () => {
  falsch(null, /Objekt/);
  falsch([], /Objekt/);
  falsch('x', /Objekt/);
  assert.deepEqual(ok({}), {});
  assert.deepEqual(ok({ status: 'gelernt', foo: 1, __proto__x: 2 }), { status: 'gelernt' });
  // null-Felder sind erlaubt und fallen weg
  assert.deepEqual(ok({ status: null, box: null, due: null, history: null }), {});
});

test('status: nur gelernt/ueben', () => {
  assert.equal(ok({ status: 'gelernt' }).status, 'gelernt');
  assert.equal(ok({ status: 'ueben' }).status, 'ueben');
  falsch({ status: 'neu' }, /status/);
  falsch({ status: 1 }, /status/);
});

test('box: ganze Zahl 1–5', () => {
  assert.equal(ok({ box: 1 }).box, 1);
  assert.equal(ok({ box: 5 }).box, 5);
  falsch({ box: 0 }, /box/);
  falsch({ box: 6 }, /box/);
  falsch({ box: 2.5 }, /ganze/);
  falsch({ box: '3' }, /box/);
});

test('Zeitstempel due/lastSeen/last_review/updatedAt: ISO oder null', () => {
  for (const feld of ['due', 'lastSeen', 'last_review', 'updatedAt']) {
    assert.equal(ok({ [feld]: ISO })[feld], ISO);
    assert.equal(ok({ [feld]: '2026-10-27' })[feld], '2026-10-27');
    falsch({ [feld]: 'gestern' }, new RegExp(feld));
    falsch({ [feld]: '2026-13-45T00:00:00Z' }, new RegExp(feld));
    falsch({ [feld]: 12345 }, new RegExp(feld));
    falsch({ [feld]: { a: 1 } }, new RegExp(feld));
  }
  assert.equal(istIsoDatum('2026-10-27T10:00:00+02:00'), true);
  assert.equal(istIsoDatum(`${ISO}${'0'.repeat(40)}`), false);
});

test('stability 0,01–36500 und difficulty 1–10 (endlich)', () => {
  assert.equal(ok({ stability: 0.01 }).stability, 0.01);
  assert.equal(ok({ stability: 36500 }).stability, 36500);
  assert.equal(ok({ stability: 3.14159 }).stability, 3.14159);
  falsch({ stability: 0 }, /stability/);
  falsch({ stability: 36500.1 }, /stability/);
  falsch({ stability: { x: 1 } }, /stability/); // früher 500 beim SQLite-Binding
  falsch({ stability: '1' }, /stability/);
  assert.equal(ok({ difficulty: 1 }).difficulty, 1);
  assert.equal(ok({ difficulty: 10 }).difficulty, 10);
  falsch({ difficulty: 0.99 }, /difficulty/);
  falsch({ difficulty: 10.01 }, /difficulty/);
  falsch({ difficulty: Infinity }, /difficulty/);
  falsch({ difficulty: NaN }, /difficulty/);
});

test('reps/lapses: ganze Zahlen 0–100000', () => {
  for (const feld of ['reps', 'lapses']) {
    assert.equal(ok({ [feld]: 0 })[feld], 0);
    assert.equal(ok({ [feld]: 100000 })[feld], 100000);
    falsch({ [feld]: -1 }, new RegExp(feld));
    falsch({ [feld]: 100001 }, new RegExp(feld));
    falsch({ [feld]: 1.5 }, /ganze/);
  }
});

test('lastResult: kurzer Text', () => {
  assert.equal(ok({ lastResult: 'teilweise' }).lastResult, 'teilweise');
  falsch({ lastResult: '' }, /lastResult/);
  falsch({ lastResult: 'x'.repeat(41) }, /lastResult/);
  falsch({ lastResult: 3 }, /lastResult/);
});

test('history: höchstens 20 Einträge {ts, result}, Längenlimit, Extra-Felder weg', () => {
  const h = (n) => Array.from({ length: n }, () => ({ ts: ISO, result: 'gewusst' }));
  assert.equal(ok({ history: h(20) }).history.length, 20);
  assert.deepEqual(ok({ history: [{ ts: ISO, result: 'nicht', x: 'weg' }] }).history, [
    { ts: ISO, result: 'nicht' },
  ]);
  falsch({ history: h(21) }, /höchstens 20/);
  falsch({ history: 5 }, /Liste/);
  falsch({ history: [null] }, /Objekte/);
  falsch({ history: [{ ts: 'x', result: 'gewusst' }] }, /ts/);
  falsch({ history: [{ ts: ISO, result: 'x'.repeat(41) }] }, /result/);
  falsch({ history: [{ ts: ISO }] }, /result/);
});

test('realistischer FSRS-Eintrag aus dem Client bleibt vollständig erhalten', () => {
  const e = {
    status: 'gelernt',
    box: 3,
    due: '2026-11-05T23:00:00.000Z',
    lastSeen: ISO,
    lastResult: 'richtig',
    history: [{ ts: ISO, result: 'gewusst' }],
    stability: 8.2956,
    difficulty: 4.93,
    reps: 3,
    lapses: 1,
    last_review: ISO,
    updatedAt: ISO,
  };
  assert.deepEqual(ok(e), e);
});

test('Gamification: gültig, Defaults, Grenzwerte', () => {
  const r = pruefeGamification({ activity: { '2026-10-27': 5 }, xp: 1234.7, klausurBest: 88 });
  assert.deepEqual(r.stand, { activity: { '2026-10-27': 5 }, xp: 1234, klausurBest: 88 });
  assert.deepEqual(pruefeGamification({}).stand, { activity: {}, xp: 0, klausurBest: 0 });
  assert.equal(pruefeGamification({ xp: 10_000_000, klausurBest: 100000 }).fehler, undefined);
  assert.equal(pruefeGamification({ activity: { '2026-01-01': 100000 } }).fehler, undefined);
});

test('Gamification: ungültige Werte → Fehler', () => {
  assert.match(pruefeGamification(null).fehler, /Objekt/);
  assert.match(pruefeGamification({ activity: [] }).fehler, /activity/);
  assert.match(pruefeGamification({ activity: { heute: 1 } }).fehler, /Datum/);
  assert.match(pruefeGamification({ activity: { '2026-02-30': 1 } }).fehler, /Datum/);
  assert.match(pruefeGamification({ activity: { '2026-10-27': 100001 } }).fehler, /activity/);
  assert.match(pruefeGamification({ activity: { '2026-10-27': -1 } }).fehler, /activity/);
  assert.match(pruefeGamification({ activity: { '2026-10-27': '5' } }).fehler, /activity/);
  assert.match(pruefeGamification({ xp: 10_000_001 }).fehler, /xp/);
  assert.match(pruefeGamification({ xp: -5 }).fehler, /xp/);
  assert.match(pruefeGamification({ xp: '9' }).fehler, /xp/);
  assert.match(pruefeGamification({ klausurBest: 100001 }).fehler, /klausurBest/);
});

test('Gamification: mehr als 400 Tage → jüngste 400 bleiben', () => {
  const activity = {};
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < 450; i++) {
    activity[new Date(start + i * 86400000).toISOString().slice(0, 10)] = 1;
  }
  const r = pruefeGamification({ activity });
  assert.equal(r.gekuerzt, 50);
  const tage = Object.keys(r.stand.activity).sort();
  assert.equal(tage.length, 400);
  assert.equal(tage.at(-1), new Date(start + 449 * 86400000).toISOString().slice(0, 10));
  assert.equal(tage[0], new Date(start + 50 * 86400000).toISOString().slice(0, 10));
});

test('istObjektOderListe', () => {
  assert.equal(istObjektOderListe({}), true);
  assert.equal(istObjektOderListe([]), true);
  assert.equal(istObjektOderListe(null), true);
  assert.equal(istObjektOderListe('x'), false);
  assert.equal(istObjektOderListe(5), false);
  assert.equal(istObjektOderListe(true), false);
});
