import { describe, it, expect } from 'vitest';
import {
  bewerten,
  istFaellig,
  abrufwahrscheinlichkeit,
  abrufwahrscheinlichkeitEintrag,
  intervallTage,
  noteAusGewusst,
  boxAusStabilitaet,
  NOTEN,
} from './fsrs';

const TAG = 86400000;
const JETZT = new Date('2026-06-01T10:00:00Z');

/** Intervall (Tage) zwischen `jetzt` (Tagesbeginn) und der Fälligkeit eines Ergebnisses. */
function intervall(result, jetzt = JETZT) {
  const start = new Date(jetzt);
  start.setHours(0, 0, 0, 0);
  return Math.round((new Date(result.due).getTime() - start.getTime()) / TAG);
}

describe('abrufwahrscheinlichkeit', () => {
  it('ist 1 direkt nach dem Lernen (t=0) und fällt monoton', () => {
    expect(abrufwahrscheinlichkeit(10, 0)).toBeCloseTo(1, 5);
    expect(abrufwahrscheinlichkeit(10, 20)).toBeLessThan(abrufwahrscheinlichkeit(10, 10));
  });

  it('erreicht die Ziel-Retention 0,9 ungefähr nach „Stabilität" Tagen', () => {
    expect(abrufwahrscheinlichkeit(10, 10)).toBeCloseTo(0.9, 2);
  });
});

describe('intervallTage', () => {
  it('ist bei 90 % Retention ≈ Stabilität', () => {
    expect(intervallTage(10, 0.9)).toBe(10);
    expect(intervallTage(3.173, 0.9)).toBe(3);
  });

  it('ist nie kleiner als 1 Tag', () => {
    expect(intervallTage(0.1, 0.9)).toBe(1);
  });
});

describe('bewerten – Erstbewertung (neues Objekt)', () => {
  it('„Gut" ergibt ~3 Tage, reps=1, keinen Lapse', () => {
    const r = bewerten(null, NOTEN.GUT, JETZT);
    expect(intervall(r)).toBe(3);
    expect(r.reps).toBe(1);
    expect(r.lapses).toBe(0);
    expect(r.difficulty).toBeGreaterThanOrEqual(1);
    expect(r.difficulty).toBeLessThanOrEqual(10);
    expect(r.box).toBe(boxAusStabilitaet(r.stability));
  });

  it('„Nochmal" ergibt 1 Tag und zählt einen Lapse', () => {
    const r = bewerten(null, NOTEN.NOCHMAL, JETZT);
    expect(intervall(r)).toBe(1);
    expect(r.lapses).toBe(1);
  });

  it('„Leicht" plant deutlich länger als „Gut"', () => {
    const leicht = bewerten(null, NOTEN.LEICHT, JETZT);
    const gut = bewerten(null, NOTEN.GUT, JETZT);
    expect(intervall(leicht)).toBeGreaterThan(intervall(gut));
  });
});

describe('bewerten – Folgebewertungen', () => {
  it('wiederholtes „Gut" (jeweils zur Fälligkeit) verlängert das Intervall', () => {
    const r1 = bewerten(null, NOTEN.GUT, JETZT);
    const t1 = new Date(r1.due);
    const r2 = bewerten(r1, NOTEN.GUT, t1);
    const t2 = new Date(r2.due);
    const r3 = bewerten(r2, NOTEN.GUT, t2);
    expect(intervall(r2, t1)).toBeGreaterThan(intervall(r1, JETZT));
    expect(intervall(r3, t2)).toBeGreaterThan(intervall(r2, t1));
  });

  it('„Nochmal" senkt die Stabilität und setzt das Intervall stark zurück (~1–2 Tage)', () => {
    const r1 = bewerten(null, NOTEN.GUT, JETZT);
    const r2 = bewerten(r1, NOTEN.GUT, new Date(r1.due));
    const vorIntervall = intervall(r2, new Date(r1.due));
    const lapse = bewerten(r2, NOTEN.NOCHMAL, new Date(r2.due));
    expect(lapse.stability).toBeLessThan(r2.stability);
    expect(intervall(lapse, new Date(r2.due))).toBeLessThanOrEqual(2);
    expect(intervall(lapse, new Date(r2.due))).toBeLessThan(vorIntervall);
    expect(lapse.lapses).toBe(1);
  });
});

describe('bewerten – Leitner-Migration & Kompatibilität', () => {
  it('migriert einen Leitner-Eintrag (box) verlustfrei in einen FSRS-Zustand', () => {
    const alt = { box: 3, due: '2026-05-01T00:00:00Z', lastSeen: '2026-04-25T00:00:00Z' };
    const r = bewerten(alt, NOTEN.GUT, JETZT);
    expect(Number.isFinite(r.stability)).toBe(true);
    expect(r.stability).toBeGreaterThan(0);
    expect(r.difficulty).toBeGreaterThanOrEqual(1);
    expect(new Date(r.due).getTime()).toBeGreaterThan(JETZT.getTime());
  });

  it('akzeptiert eine boolesche Bewertung (gewusst → Gut, nicht → Nochmal)', () => {
    expect(bewerten(null, true, JETZT).stability).toBeCloseTo(
      bewerten(null, NOTEN.GUT, JETZT).stability,
      6
    );
    expect(bewerten(null, false, JETZT).stability).toBeCloseTo(
      bewerten(null, NOTEN.NOCHMAL, JETZT).stability,
      6
    );
  });

  it('ist deterministisch bei injiziertem Zeitpunkt', () => {
    expect(bewerten(null, NOTEN.GUT, JETZT).due).toBe(bewerten(null, NOTEN.GUT, JETZT).due);
  });
});

describe('istFaellig', () => {
  it('neue Objekte (ohne due) sind fällig', () => {
    expect(istFaellig(null, JETZT)).toBe(true);
    expect(istFaellig({}, JETZT)).toBe(true);
  });

  it('vergleicht andernfalls das Fälligkeitsdatum', () => {
    expect(istFaellig({ due: '2026-05-01T00:00:00Z' }, JETZT)).toBe(true);
    expect(istFaellig({ due: '2026-07-01T00:00:00Z' }, JETZT)).toBe(false);
  });
});

describe('Hilfsfunktionen', () => {
  it('noteAusGewusst mappt boolean auf FSRS-Note', () => {
    expect(noteAusGewusst(true)).toBe(NOTEN.GUT);
    expect(noteAusGewusst(false)).toBe(NOTEN.NOCHMAL);
  });

  it('abrufwahrscheinlichkeitEintrag liefert null ohne Stabilität, sonst 0..1', () => {
    expect(abrufwahrscheinlichkeitEintrag({}, JETZT)).toBeNull();
    const r = bewerten(null, NOTEN.GUT, JETZT);
    const p = abrufwahrscheinlichkeitEintrag(r, JETZT);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});
