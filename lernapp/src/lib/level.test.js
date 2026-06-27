import { describe, it, expect } from 'vitest';
import { xpFuerErgebnis, berechneLevel } from './level';

describe('xpFuerErgebnis', () => {
  it('belohnt nach Ergebnis (richtig > teilweise > falsch)', () => {
    expect(xpFuerErgebnis('richtig')).toBe(10);
    expect(xpFuerErgebnis('teilweise')).toBe(5);
    expect(xpFuerErgebnis('falsch')).toBe(2);
  });

  it('mappt Leitner-Ergebnisse (gewusst/nicht)', () => {
    expect(xpFuerErgebnis('gewusst')).toBe(10);
    expect(xpFuerErgebnis('nicht')).toBe(2);
  });

  it('ist robust gegen Unbekanntes', () => {
    expect(xpFuerErgebnis('quatsch')).toBe(0);
  });
});

describe('berechneLevel', () => {
  it('startet bei Level 1 mit 0 XP', () => {
    const l = berechneLevel(0);
    expect(l.level).toBe(1);
    expect(l.xpImLevel).toBe(0);
    expect(l.xpFuerLevel).toBe(50);
    expect(l.fortschritt).toBe(0);
  });

  it('steigt an den Schwellen 50/150/300 auf', () => {
    expect(berechneLevel(49).level).toBe(1);
    expect(berechneLevel(50).level).toBe(2);
    expect(berechneLevel(149).level).toBe(2);
    expect(berechneLevel(150).level).toBe(3);
    expect(berechneLevel(300).level).toBe(4);
  });

  it('rechnet Fortschritt innerhalb des Levels korrekt', () => {
    // Level 2 reicht von 50 bis 150 (100 XP breit); 100 XP → 50/100 = 0,5.
    const l = berechneLevel(100);
    expect(l.level).toBe(2);
    expect(l.xpImLevel).toBe(50);
    expect(l.xpFuerLevel).toBe(100);
    expect(l.xpBisNaechstes).toBe(50);
    expect(l.fortschritt).toBeCloseTo(0.5);
  });

  it('behandelt ungültige Eingaben als 0 XP', () => {
    expect(berechneLevel(-5).level).toBe(1);
    expect(berechneLevel(undefined).level).toBe(1);
  });
});
