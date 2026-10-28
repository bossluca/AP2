import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PROGRESS_STATUS,
  PROGRESS_REGELN,
  PROGRESS_MAX_EINTRAEGE,
  GAMI_REGELN,
  STAPEL_REGELN,
  bereinigeDatum,
  bereinigeProgressEintrag,
  bereinigeProgress,
  bereinigeGamification,
  bereinigeKarte,
  bereinigeStapel,
  bereinigeStapelListe,
  bereinigeEinstufung,
  istGueltigeId,
  istTagesKey,
} from './validiere';
import { bewerten } from './fsrs';
import * as server from '../../../server/src/lib/validierung.js';

describe('Vertrag mit server/src/lib/validierung.js (C3)', () => {
  it('Konstanten sind identisch', () => {
    expect([...PROGRESS_STATUS]).toEqual([...server.PROGRESS_STATUS]);
    expect({ ...PROGRESS_REGELN }).toEqual({ ...server.PROGRESS_REGELN });
    expect({ ...GAMI_REGELN }).toEqual({ ...server.GAMI_REGELN });
    // `server/src/progress.js` ist ein Routen-Modul (nicht importierbar im
    // Browser-Test) – die Grenze wird aus dem Quelltext gelesen.
    const quelle = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../server/src/progress.js'), 'utf8');
    expect(PROGRESS_MAX_EINTRAEGE).toBe(Number(/maxEintraege:\s*([\d_]+)/.exec(quelle)[1].replace(/_/g, '')));
  });

  it('ID-, Datums- und Tagesregeln verhalten sich gleich', () => {
    const ids = ['2022_Frühjahr_1a', 'eigen_abc_0', 'a:b.c-d', '', 'a b', 'x/y', 'ä'.repeat(100), 'a'.repeat(101), '<script>'];
    for (const id of ids) expect(istGueltigeId(id)).toBe(server.pruefeItemId(id) === null);
    const daten = ['2025-01-01', '2025-01-01T10:00:00.000Z', '2025-01-01T10:00+02:00', 'kaputt', '2025-13-45', 5, null];
    for (const d of daten) expect(bereinigeDatum(d) !== null && bereinigeDatum(d) === d).toBe(server.istIsoDatum(d));
    const tage = ['2025-02-28', '2025-02-30', '2025-1-1', 'heute', '2024-02-29'];
    for (const t of tage) {
      const r = server.pruefeGamification({ activity: { [t]: 1 } });
      expect(istTagesKey(t)).toBe(!r.fehler);
    }
  });

  it('jeder bereinigte Eintrag besteht die Server-Prüfung (auch aus Müll)', () => {
    const muell = [
      { status: 'xx', box: 99, due: 'kaputt', history: 5, difficulty: -3, stability: 'NaN' },
      { box: 0.4, reps: -2, lapses: 1e9, difficulty: 0, stability: 0, lastResult: { a: 1 } },
      { history: [null, 5, { ts: 'x', result: 'a' }, { ts: '2025-01-01', result: 'r'.repeat(99) }] },
      { updatedAt: 1735689600000, lastSeen: '2025-01-01 10:00', last_review: '2025-01-01T10:00:00Z' },
      { status: 'gelernt', history: Array.from({ length: 50 }, () => ({ ts: '2025-01-01T00:00:00Z', result: 'gewusst' })) },
      { stability: Infinity, difficulty: 5, box: '3' },
    ];
    for (const m of muell) {
      const e = bereinigeProgressEintrag(m);
      expect(e).not.toBeNull();
      expect(server.pruefeProgressEintrag(e).fehler).toBeUndefined();
    }
  });

  it('bereinigter Gamification-Stand besteht die Server-Prüfung', () => {
    const { stand } = bereinigeGamification({
      activity: { '2025-01-01': 3, kaputt: 1, '2025-01-02': -5, '2025-01-03': 'x', __proto__: 1 },
      xp: 1e12,
      klausurBest: -1,
    });
    const r = server.pruefeGamification(stand);
    expect(r.fehler).toBeUndefined();
    expect(r.stand).toEqual(stand);
  });
});

describe('bereinigeProgressEintrag', () => {
  it('lässt gültige FSRS-Einträge unverändert', () => {
    const e = { ...bewerten({}, 3, new Date(2025, 0, 1)), status: 'ueben', updatedAt: '2025-01-01T00:00:00.000Z' };
    expect(bereinigeProgressEintrag(e)).toEqual(e);
  });

  it('history: 5 wird verworfen, der Rest bleibt', () => {
    const e = bereinigeProgressEintrag({ status: 'gelernt', history: 5 });
    expect(e).toEqual({ status: 'gelernt' });
  });

  it('difficulty <= 0 wird geklemmt (kein NaN in FSRS)', () => {
    const e = bereinigeProgressEintrag({ stability: 3, difficulty: 0 });
    expect(e.difficulty).toBe(1);
    expect(e.stability).toBe(3);
    const neu = bewerten(e, 3, new Date(2025, 0, 1));
    expect(Number.isFinite(neu.stability)).toBe(true);
  });

  it('due: "kaputt" fällt weg (Karte wird wieder fällig)', () => {
    expect(bereinigeProgressEintrag({ due: 'kaputt', box: 2 })).toEqual({ box: 2 });
  });

  it('klemmt Zahlen statt Einträge zu verwerfen', () => {
    expect(bereinigeProgressEintrag({ box: 9, reps: -1, lapses: 2.6 })).toEqual({ box: 5, reps: 0, lapses: 3 });
  });

  it('kein Objekt / nichts Gültiges → null', () => {
    for (const v of [null, 5, 'x', [], {}, { foo: 1 }]) expect(bereinigeProgressEintrag(v)).toBeNull();
  });

  it('übernimmt keine unbekannten Felder', () => {
    expect(bereinigeProgressEintrag({ status: 'ueben', boese: '<img>' })).toEqual({ status: 'ueben' });
  });
});

describe('bereinigeProgress', () => {
  it('verwirft __proto__/constructor und ungültige IDs, zählt sie', () => {
    const roh = JSON.parse(
      '{"__proto__":{"status":"gelernt"},"constructor":{"status":"gelernt"},"a b":{"status":"ueben"},"ok_1":{"status":"ueben"},"leer":null}'
    );
    const r = bereinigeProgress(roh);
    expect(Object.keys(r.progress)).toEqual(['ok_1']);
    expect(Object.getPrototypeOf(r.progress)).toBe(Object.prototype);
    expect(r.progress.status).toBeUndefined();
    expect(r.uebernommen).toBe(1);
    expect(r.verworfen).toBe(4);
  });

  it('begrenzt auf die jüngsten Einträge', () => {
    const map = {};
    for (let i = 0; i < 12; i++) map[`id${i}`] = { updatedAt: new Date(2025, 0, i + 1).toISOString() };
    const r = bereinigeProgress(map, { maxEintraege: 10 });
    expect(r.uebernommen).toBe(10);
    expect(r.verworfen).toBe(2);
    expect(r.progress.id0).toBeUndefined();
    expect(r.progress.id11).toBeDefined();
  });

  it('kein Objekt → leer', () => {
    expect(bereinigeProgress([1, 2]).progress).toEqual({});
  });
});

describe('bereinigeGamification', () => {
  it('repariert Typen und zählt Verworfenes', () => {
    const r = bereinigeGamification({ activity: { '2025-01-01': '4', nein: 1 }, xp: '120', klausurBest: 88.7 });
    expect(r.stand).toEqual({ activity: { '2025-01-01': 4 }, xp: 120, klausurBest: 88 });
    expect(r.verworfen).toBe(1);
  });

  it('kürzt auf die jüngsten 400 Tage, außer maxTage: Infinity', () => {
    const activity = {};
    const d = new Date(Date.UTC(2023, 0, 1));
    for (let i = 0; i < 410; i++) {
      activity[d.toISOString().slice(0, 10)] = 1;
      d.setUTCDate(d.getUTCDate() + 1);
    }
    expect(Object.keys(bereinigeGamification({ activity }).stand.activity)).toHaveLength(400);
    expect(Object.keys(bereinigeGamification({ activity }, { maxTage: Infinity }).stand.activity)).toHaveLength(410);
  });

  it('Müll → leerer Stand', () => {
    expect(bereinigeGamification('x').stand).toEqual({ activity: {}, xp: 0, klausurBest: 0 });
  });
});

describe('Eigene Kartenstapel', () => {
  const gut = { id: 'abc123', name: 'Netz', erstellt: '2025-01-01T00:00:00.000Z', karten: [{ id: 'eigen_abc123_0', front: 'F', back: 'B' }] };

  it('gültiger Stapel bleibt unverändert', () => {
    expect(bereinigeStapel(gut)).toEqual({ stapel: gut, verworfeneKarten: 0 });
  });

  it('Karte null wird verworfen, der Rest bleibt', () => {
    const r = bereinigeStapel({ ...gut, karten: [null, ...gut.karten, { id: 'x', front: {}, back: 'b' }] });
    expect(r.stapel.karten).toEqual(gut.karten);
    expect(r.verworfeneKarten).toBe(2);
  });

  it('name als Objekt wird zum Standardnamen', () => {
    expect(bereinigeStapel({ ...gut, name: { a: 1 } }).stapel.name).toBe('Eigener Stapel');
  });

  it('bereinigeKarte kürzt lange Texte und verlangt eine gültige ID', () => {
    expect(bereinigeKarte({ id: '__proto__', front: 'a', back: 'b' })).toBeNull();
    expect(bereinigeKarte({ id: 'k', front: 'x'.repeat(9999), back: 'b' }).front).toHaveLength(STAPEL_REGELN.textMaxLaenge);
  });

  it('Liste: begrenzt Anzahl, entfernt Duplikate und Müll', () => {
    const viele = Array.from({ length: 60 }, (_, i) => ({ ...gut, id: `s${i}` }));
    const r = bereinigeStapelListe([null, gut, gut, { id: 'ohneKarten' }, ...viele]);
    expect(r.stapel).toHaveLength(STAPEL_REGELN.maxStapel);
    expect(r.stapel[0]).toEqual(gut);
    expect(r.verworfen).toBeGreaterThanOrEqual(3);
    expect(bereinigeStapelListe('x')).toEqual({ stapel: [], verworfen: 0 });
  });

  it('begrenzt Karten je Stapel', () => {
    const karten = Array.from({ length: STAPEL_REGELN.maxKartenJeStapel + 5 }, (_, i) => ({ id: `k${i}`, front: 'a', back: 'b' }));
    const r = bereinigeStapel({ ...gut, karten });
    expect(r.stapel.karten).toHaveLength(STAPEL_REGELN.maxKartenJeStapel);
    expect(r.verworfeneKarten).toBe(5);
  });
});

describe('bereinigeEinstufung', () => {
  const gut = {
    datum: '2025-03-01T10:00:00.000Z',
    auswertung: {
      themen: [{ id: 'netze', titel: 'Netze', richtig: 1, gesamt: 2, quote: 0.5, niveau: 'mittel' }],
      richtig: 1,
      gesamt: 2,
      quote: 0.5,
    },
  };

  it('gültige Einstufung bleibt erhalten', () => {
    expect(bereinigeEinstufung(gut)).toEqual(gut);
  });

  it('kaputte Struktur → null', () => {
    expect(bereinigeEinstufung({ datum: 'x', auswertung: { themen: 5 } })).toBeNull();
    expect(bereinigeEinstufung({ datum: 'x', auswertung: gut.auswertung })).toBeNull();
    expect(bereinigeEinstufung({ datum: gut.datum, auswertung: { themen: 5 } })).toBeNull();
    expect(bereinigeEinstufung(null)).toBeNull();
  });

  it('klemmt Quoten, verwirft kaputte Themen und leitet Niveau ab', () => {
    const r = bereinigeEinstufung({
      datum: gut.datum,
      auswertung: { themen: [null, { id: 'a', quote: 7, niveau: 'super' }, { id: { x: 1 } }, { id: 'a' }], quote: -1 },
    });
    expect(r.auswertung.themen).toEqual([{ id: 'a', titel: 'a', richtig: 0, gesamt: 0, quote: 1, niveau: 'stark' }]);
    expect(r.auswertung.quote).toBe(0);
  });
});
