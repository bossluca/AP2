import { describe, it, expect } from 'vitest';
import { mergeGamification } from './gamiMerge';

describe('mergeGamification', () => {
  it('nimmt je Tag den höheren Aktivitätswert und das Maximum von XP/Klausur', () => {
    const lokal = { activity: { '2026-06-26': 3, '2026-06-27': 10 }, xp: 100, klausurBest: 70 };
    const server = { activity: { '2026-06-27': 5, '2026-06-28': 8 }, xp: 250, klausurBest: 60 };
    const m = mergeGamification(lokal, server);
    expect(m.activity).toEqual({ '2026-06-26': 3, '2026-06-27': 10, '2026-06-28': 8 });
    expect(m.xp).toBe(250);
    expect(m.klausurBest).toBe(70);
  });

  it('verträgt null/leer (z. B. Konto ohne bisherigen Stand)', () => {
    const lokal = { activity: { a: 2 }, xp: 40, klausurBest: 0 };
    expect(mergeGamification(lokal, null)).toEqual(lokal);
    expect(mergeGamification(null, null)).toEqual({ activity: {}, xp: 0, klausurBest: 0 });
  });

  it('ist kommutativ und idempotent (kein Stand geht verloren)', () => {
    const a = { activity: { x: 1 }, xp: 10, klausurBest: 50 };
    const b = { activity: { x: 4, y: 2 }, xp: 30, klausurBest: 20 };
    const ab = mergeGamification(a, b);
    const ba = mergeGamification(b, a);
    expect(ab).toEqual(ba);
    expect(mergeGamification(ab, a)).toEqual(ab); // idempotent
  });
});
