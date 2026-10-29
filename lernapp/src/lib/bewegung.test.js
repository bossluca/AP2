import { describe, it, expect } from 'vitest';
import {
  projiziere,
  gummiband,
  federSchritt,
  federRuht,
  sollSchliessen,
  geschwindigkeitAusVerlauf,
} from './bewegung';

function laufe(von, ziel, opt, sekunden = 3, v0 = 0) {
  let z = { x: von, v: v0 };
  let max = von;
  for (let t = 0; t < sekunden; t += 1 / 60) {
    z = federSchritt(z, ziel, opt, 1 / 60);
    if (ziel > von) max = Math.max(max, z.x);
  }
  return { z, max };
}

describe('projiziere', () => {
  it('folgt Apples Formel (v/1000 · d / (1 − d))', () => {
    expect(projiziere(1000)).toBeCloseTo(499, 0); // 1 · 0.998 / 0.002
    expect(projiziere(-1000)).toBeCloseTo(-499, 0);
    expect(projiziere(0)).toBe(0);
  });
  it('ist robust gegen ungültige Werte', () => {
    expect(projiziere(NaN)).toBe(0);
    expect(projiziere(Infinity)).toBe(0);
  });
});

describe('gummiband', () => {
  it('folgt anfangs fast 1:1 und wird mit dem Überhang immer träger', () => {
    const klein = gummiband(10, 500);
    const gross = gummiband(400, 500);
    expect(klein).toBeGreaterThan(5);
    expect(klein).toBeLessThan(10);
    expect(gross).toBeLessThan(400 * 0.6);
    expect(gross).toBeGreaterThan(klein);
  });
  it('wächst nie über die Dimension hinaus und behält das Vorzeichen', () => {
    expect(gummiband(100000, 500)).toBeLessThan(500);
    expect(gummiband(-50, 500)).toBeLessThan(0);
    expect(gummiband(0, 500)).toBe(0);
  });
});

describe('federSchritt', () => {
  it('kritisch gedämpft (1.0): erreicht das Ziel ohne Überschwingen', () => {
    const { z, max } = laufe(0, 100, { daempfung: 1, antwort: 0.4 });
    expect(max).toBeLessThanOrEqual(100.01);
    expect(Math.abs(z.x - 100)).toBeLessThan(0.5);
  });
  it('unterdämpft (0.8): schwingt leicht über und beruhigt sich', () => {
    const { z, max } = laufe(0, 100, { daempfung: 0.8, antwort: 0.3 });
    expect(max).toBeGreaterThan(100.5);
    expect(federRuht(z, 100, 1)).toBe(true);
  });
  it('übernimmt die Anfangsgeschwindigkeit (kein Sprung beim Loslassen)', () => {
    const ruhig = federSchritt({ x: 0, v: 0 }, 100, { daempfung: 1, antwort: 0.4 }, 1 / 60);
    const schnell = federSchritt({ x: 0, v: 2000 }, 100, { daempfung: 1, antwort: 0.4 }, 1 / 60);
    expect(schnell.x).toBeGreaterThan(ruhig.x * 3);
  });
  it('ist unabhängig von der Framerate (60 Hz ≈ 120 Hz)', () => {
    let a = { x: 0, v: 0 };
    let b = { x: 0, v: 0 };
    for (let i = 0; i < 30; i += 1) a = federSchritt(a, 100, { antwort: 0.4 }, 1 / 60);
    for (let i = 0; i < 60; i += 1) b = federSchritt(b, 100, { antwort: 0.4 }, 1 / 120);
    expect(Math.abs(a.x - b.x)).toBeLessThan(0.5);
  });
});

describe('sollSchliessen', () => {
  it('langsames Ziehen knapp unter der Hälfte bleibt offen', () => {
    expect(sollSchliessen({ position: 120, geschwindigkeit: 0, hoehe: 400 })).toBe(false);
  });
  it('über der Hälfte schließt auch ohne Schwung', () => {
    expect(sollSchliessen({ position: 260, geschwindigkeit: 0, hoehe: 400 })).toBe(true);
  });
  it('ein kurzer schneller Wisch nach unten schließt (Schwung zählt, nicht die Position)', () => {
    expect(sollSchliessen({ position: 40, geschwindigkeit: 900, hoehe: 400 })).toBe(true);
  });
  it('Wurf nach oben hält offen, selbst weit unten', () => {
    expect(sollSchliessen({ position: 300, geschwindigkeit: -800, hoehe: 400 })).toBe(false);
  });
  it('ungültige Höhe schließt nicht', () => {
    expect(sollSchliessen({ position: 100, geschwindigkeit: 500, hoehe: 0 })).toBe(false);
  });
});

describe('geschwindigkeitAusVerlauf', () => {
  it('rechnet px/s aus den letzten ~100 ms', () => {
    const v = geschwindigkeitAusVerlauf([
      { y: 0, t: 0 },
      { y: 100, t: 500 }, // zu alt
      { y: 110, t: 540 },
      { y: 130, t: 580 },
      { y: 150, t: 600 },
    ]);
    // Start = erster Punkt innerhalb 100 ms vor dem letzten (t=500): 50 px / 0.1 s
    expect(v).toBeCloseTo(500, 0);
  });
  it('ohne genug Punkte → 0', () => {
    expect(geschwindigkeitAusVerlauf([])).toBe(0);
    expect(geschwindigkeitAusVerlauf([{ y: 1, t: 1 }])).toBe(0);
  });
});
