import { describe, it, expect } from 'vitest';
import { tageBisTermin } from './pruefungstermin';

const NOW = new Date('2026-06-01T09:00:00');

describe('tageBisTermin', () => {
  it('zählt ganze Tage bis zum Termin', () => {
    expect(tageBisTermin('2026-06-11', NOW)).toBe(10);
  });

  it('ist 0 am Prüfungstag und negativ danach', () => {
    expect(tageBisTermin('2026-06-01', NOW)).toBe(0);
    expect(tageBisTermin('2026-05-30', NOW)).toBe(-2);
  });

  it('liefert null ohne/ungültigem Datum', () => {
    expect(tageBisTermin(null, NOW)).toBeNull();
    expect(tageBisTermin('', NOW)).toBeNull();
    expect(tageBisTermin('quatsch', NOW)).toBeNull();
  });
});
