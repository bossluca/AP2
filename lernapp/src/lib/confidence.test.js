import { describe, it, expect } from 'vitest';
import { noteAusConfidence, istFehlSicherheit } from './confidence';

describe('confidence', () => {
  it('mappt Sicherheit + Ergebnis auf FSRS-Noten', () => {
    expect(noteAusConfidence(true, true)).toBe(4); // sicher + gewusst → Leicht
    expect(noteAusConfidence(false, true)).toBe(3); // unsicher + gewusst → Gut
    expect(noteAusConfidence(false, false)).toBe(1); // nicht gewusst → Nochmal
    expect(noteAusConfidence(true, false)).toBe(1); // Fehl-Sicherheit → Nochmal
  });

  it('erkennt Fehl-Sicherheit nur bei sicher + falsch', () => {
    expect(istFehlSicherheit(true, false)).toBe(true);
    expect(istFehlSicherheit(true, true)).toBe(false);
    expect(istFehlSicherheit(false, false)).toBe(false);
    expect(istFehlSicherheit(false, true)).toBe(false);
  });
});
