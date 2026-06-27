import { describe, it, expect } from 'vitest';
import { ERFOLGE, bewerteErfolge, anzahlFreigeschaltet } from './erfolge';

describe('bewerteErfolge', () => {
  it('schaltet bei leerem Kontext nichts frei', () => {
    const res = bewerteErfolge({});
    expect(res).toHaveLength(ERFOLGE.length);
    expect(res.every((e) => !e.freigeschaltet)).toBe(true);
  });

  it('schaltet „Erste Schritte" ab dem ersten Gelernt frei', () => {
    const res = bewerteErfolge({ gelernt: 1 });
    expect(res.find((e) => e.id === 'erste-schritte').freigeschaltet).toBe(true);
    expect(res.find((e) => e.id === 'fleissig').freigeschaltet).toBe(false);
  });

  it('berücksichtigt Streak-Schwellen', () => {
    const res = bewerteErfolge({ streak: 7 });
    expect(res.find((e) => e.id === 'durchstarter').freigeschaltet).toBe(true); // ≥3
    expect(res.find((e) => e.id === 'dranbleiber').freigeschaltet).toBe(true); // ≥7
    expect(res.find((e) => e.id === 'marathon').freigeschaltet).toBe(false); // ≥30
  });

  it('schaltet Klausur-Held ab 80 % frei', () => {
    expect(bewerteErfolge({ klausurBesteProzent: 79 }).find((e) => e.id === 'klausur-held').freigeschaltet).toBe(false);
    expect(bewerteErfolge({ klausurBesteProzent: 80 }).find((e) => e.id === 'klausur-held').freigeschaltet).toBe(true);
  });

  it('anzahlFreigeschaltet zählt korrekt', () => {
    expect(anzahlFreigeschaltet({})).toBe(0);
    expect(anzahlFreigeschaltet({ gelernt: 1, streak: 3 })).toBe(2); // erste-schritte + durchstarter
  });
});
