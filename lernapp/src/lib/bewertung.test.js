import { describe, it, expect } from 'vitest';
import { BEWERTUNGEN, ANTEIL } from './bewertung';

describe('Bewertungsstufen', () => {
  it('definiert genau richtig/teilweise/falsch in dieser Reihenfolge', () => {
    expect(BEWERTUNGEN.map((b) => b.key)).toEqual(['richtig', 'teilweise', 'falsch']);
  });

  it('hat die Punktanteile 1 / 0,5 / 0', () => {
    expect(ANTEIL.richtig).toBe(1);
    expect(ANTEIL.teilweise).toBe(0.5);
    expect(ANTEIL.falsch).toBe(0);
  });

  it('liefert für jede Stufe Label und Style-Klassen', () => {
    for (const b of BEWERTUNGEN) {
      expect(b.label).toBeTruthy();
      expect(b.classes).toContain('bg-');
      expect(b.ring).toContain('ring-');
    }
  });
});
