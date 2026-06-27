import { describe, it, expect } from 'vitest';
import {
  tagesKey,
  addAktivitaet,
  heuteAnzahl,
  berechneStreak,
  streakDetail,
  verfuegbareFreezes,
  aktiveTage,
  baueHeatmap,
} from './aktivitaet';

/** Hilfsfunktion: Datum um `n` Tage vor `basis`. */
function vorTagen(basis, n) {
  const d = new Date(basis.getFullYear(), basis.getMonth(), basis.getDate());
  d.setDate(d.getDate() - n);
  return d;
}

const HEUTE = new Date(2026, 5, 21); // 2026-06-21 (lokal)

describe('tagesKey', () => {
  it('formatiert lokal als YYYY-MM-DD mit Nullen', () => {
    expect(tagesKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(tagesKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('addAktivitaet / heuteAnzahl', () => {
  it('zählt den Tag hoch (rein, ohne Mutation)', () => {
    const log0 = {};
    const log1 = addAktivitaet(log0, 1, HEUTE);
    const log2 = addAktivitaet(log1, 3, HEUTE);
    expect(log0).toEqual({}); // Original unverändert
    expect(heuteAnzahl(log2, HEUTE)).toBe(4);
  });
});

describe('berechneStreak', () => {
  it('ist 0 ohne jede Aktivität', () => {
    expect(berechneStreak({}, HEUTE)).toBe(0);
  });

  it('zählt aufeinanderfolgende Tage inkl. heute', () => {
    const log = {
      [tagesKey(HEUTE)]: 2,
      [tagesKey(vorTagen(HEUTE, 1))]: 1,
      [tagesKey(vorTagen(HEUTE, 2))]: 5,
    };
    expect(berechneStreak(log, HEUTE)).toBe(3);
  });

  it('bricht bei einer Lücke ab', () => {
    const log = {
      [tagesKey(HEUTE)]: 1,
      // gestern fehlt
      [tagesKey(vorTagen(HEUTE, 2))]: 1,
    };
    expect(berechneStreak(log, HEUTE)).toBe(1);
  });

  it('bleibt lebendig, wenn heute offen, aber gestern aktiv war', () => {
    const log = {
      [tagesKey(vorTagen(HEUTE, 1))]: 1,
      [tagesKey(vorTagen(HEUTE, 2))]: 1,
    };
    expect(berechneStreak(log, HEUTE)).toBe(2);
  });

  it('ist 0, wenn weder heute noch gestern aktiv', () => {
    const log = { [tagesKey(vorTagen(HEUTE, 2))]: 1 };
    expect(berechneStreak(log, HEUTE)).toBe(0);
  });
});

describe('Streak-Freeze', () => {
  it('verfuegbareFreezes: einer je 7 aktive Tage, gedeckelt bei 2', () => {
    expect(verfuegbareFreezes(0)).toBe(0);
    expect(verfuegbareFreezes(6)).toBe(0);
    expect(verfuegbareFreezes(7)).toBe(1);
    expect(verfuegbareFreezes(14)).toBe(2);
    expect(verfuegbareFreezes(100)).toBe(2);
  });

  it('überbrückt eine verpasste gestrige Lücke mit einem Freeze', () => {
    const log = {
      [tagesKey(HEUTE)]: 1,
      // gestern fehlt
      [tagesKey(vorTagen(HEUTE, 2))]: 1,
      [tagesKey(vorTagen(HEUTE, 3))]: 1,
    };
    expect(berechneStreak(log, HEUTE, 0)).toBe(1); // ohne Freeze gebrochen
    const det = streakDetail(log, HEUTE, 1);
    expect(det.streak).toBe(3); // 3 aktive Tage erhalten
    expect(det.genutzt).toBe(1);
  });

  it('bricht trotzdem, wenn mehr Lücken als Freezes vorliegen', () => {
    const log = {
      [tagesKey(HEUTE)]: 1,
      // -1 fehlt, -2 fehlt
      [tagesKey(vorTagen(HEUTE, 3))]: 1,
    };
    expect(berechneStreak(log, HEUTE, 1)).toBe(1); // 1 Freeze deckt 2 Lücken nicht
    expect(berechneStreak(log, HEUTE, 2).valueOf()).toBe(2); // 2 Freezes überbrücken beide
  });

  it('verbraucht keinen Freeze für nachlaufende Leer-Tage', () => {
    const log = { [tagesKey(HEUTE)]: 1 };
    const det = streakDetail(log, HEUTE, 2);
    expect(det.streak).toBe(1);
    expect(det.genutzt).toBe(0);
  });
});

describe('aktiveTage', () => {
  it('zählt nur Tage mit Aktivität > 0', () => {
    expect(aktiveTage({ a: 1, b: 0, c: 3 })).toBe(2);
  });
});

describe('baueHeatmap', () => {
  it('liefert volle Wochen (7 Zeilen) und endet mit heute', () => {
    const log = { [tagesKey(HEUTE)]: 4 };
    const { weeks, max } = baueHeatmap(log, { wochen: 4, today: HEUTE });
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    // Jede Woche hat 7 Slots (Mo–So).
    for (const w of weeks) expect(w).toHaveLength(7);
    expect(max).toBe(4);
    // Heute ist in der letzten Woche enthalten und hat das höchste Level.
    const heuteKey = tagesKey(HEUTE);
    const alle = weeks.flat().filter(Boolean);
    const heuteZelle = alle.find((z) => z.date === heuteKey);
    expect(heuteZelle).toBeTruthy();
    expect(heuteZelle.count).toBe(4);
    expect(heuteZelle.level).toBe(4);
  });

  it('markiert leere Tage mit Level 0', () => {
    const { weeks } = baueHeatmap({}, { wochen: 2, today: HEUTE });
    const alle = weeks.flat().filter(Boolean);
    expect(alle.every((z) => z.level === 0)).toBe(true);
  });
});
