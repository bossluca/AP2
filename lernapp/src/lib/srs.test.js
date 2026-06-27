import { describe, it, expect } from 'vitest';
import {
  MAX_BOX,
  LEITNER_INTERVALS_TAGE,
  naechsteBox,
  faelligAb,
  istFaellig,
  bewerten,
} from './srs';

describe('naechsteBox', () => {
  it('steigt bei "gewusst" um eine Box, gedeckelt bei MAX_BOX', () => {
    expect(naechsteBox(undefined, true)).toBe(1);
    expect(naechsteBox(1, true)).toBe(2);
    expect(naechsteBox(4, true)).toBe(5);
    expect(naechsteBox(5, true)).toBe(MAX_BOX);
  });
  it('fällt bei "nicht gewusst" immer auf Box 1', () => {
    expect(naechsteBox(5, false)).toBe(1);
    expect(naechsteBox(undefined, false)).toBe(1);
  });
});

describe('faelligAb', () => {
  it('addiert das Box-Intervall in Tagen', () => {
    const ab = new Date('2026-06-21T10:00:00');
    const due = new Date(faelligAb(1, ab));
    const erwartet = new Date('2026-06-21T00:00:00');
    erwartet.setDate(erwartet.getDate() + LEITNER_INTERVALS_TAGE[0]);
    expect(due.getFullYear()).toBe(erwartet.getFullYear());
    expect(due.getDate()).toBe(erwartet.getDate());
  });
  it('Box 5 hat das längste Intervall', () => {
    const ab = new Date('2026-06-21T10:00:00');
    expect(new Date(faelligAb(5, ab)) > new Date(faelligAb(1, ab))).toBe(true);
  });
});

describe('istFaellig', () => {
  it('neue Einträge (ohne Box/due) sind fällig', () => {
    expect(istFaellig(null)).toBe(true);
    expect(istFaellig({})).toBe(true);
    expect(istFaellig({ box: 2 })).toBe(true); // due fehlt
  });
  it('vergangenes due = fällig, künftiges due = nicht fällig', () => {
    const jetzt = new Date('2026-06-21T10:00:00');
    expect(istFaellig({ box: 1, due: '2026-06-20T00:00:00' }, jetzt)).toBe(true);
    expect(istFaellig({ box: 3, due: '2026-06-25T00:00:00' }, jetzt)).toBe(false);
  });
});

describe('bewerten', () => {
  it('liefert neue Box + Fälligkeit', () => {
    const jetzt = new Date('2026-06-21T10:00:00');
    const r = bewerten({ box: 2 }, true, jetzt);
    expect(r.box).toBe(3);
    expect(new Date(r.due) > jetzt).toBe(true);
  });
  it('Rückstufung bei falsch', () => {
    expect(bewerten({ box: 4 }, false).box).toBe(1);
  });
});
