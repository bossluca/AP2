import { describe, it, expect } from 'vitest';
import { baueWochenChallenges, wochenStart } from './challenges';
import { AP2_THEMEN } from './themen';

describe('wochenStart', () => {
  it('liefert den Montag der Woche (lokal)', () => {
    expect(wochenStart(new Date(2026, 9, 22)).getDate()).toBe(19); // Do 22.10. → Mo 19.10.
    expect(wochenStart(new Date(2026, 9, 25)).getDate()).toBe(19); // So 25.10.
    expect(wochenStart(new Date(2026, 9, 19)).getDate()).toBe(19);
  });
});

describe('baueWochenChallenges', () => {
  const jetzt = new Date(2026, 9, 22, 12);

  it('zählt aktive Tage und Bewertungen nur dieser Woche', () => {
    const activity = {
      '2026-10-18': 50, // Sonntag davor – zählt nicht
      '2026-10-19': 30,
      '2026-10-20': 40,
      '2026-10-22': 10,
    };
    const [tage, menge] = baueWochenChallenges({ activity, jetzt });
    expect(tage).toMatchObject({ wert: 3, ziel: 5, erfuellt: false });
    expect(menge).toMatchObject({ wert: 80, erfuellt: false });
  });

  it('zählt Wiederholungen im wöchentlichen Fokus-Thema und deckelt den Wert', () => {
    const [, , leer] = baueWochenChallenges({ jetzt });
    const thema = AP2_THEMEN.find((t) => t.id === leer.themaId);
    const objekte = [{ id: 'o1', titel: thema.muster[0], tags: [], front: '' }, { id: 'o2', titel: 'Kochen', tags: [], front: '' }];
    const ts = (tag) => new Date(2026, 9, tag, 10).toISOString();
    const progress = {
      o1: { history: [...Array(20)].map(() => ({ ts: ts(20), result: 'richtig' })).concat([{ ts: ts(12) }]) },
      o2: { history: [{ ts: ts(20) }] },
    };
    const [, , fokus] = baueWochenChallenges({ objekte, progress, jetzt });
    expect(fokus).toMatchObject({ wert: 15, ziel: 15, erfuellt: true });
  });

  it('rotiert das Fokus-Thema wöchentlich', () => {
    const a = baueWochenChallenges({ jetzt })[2].themaId;
    const b = baueWochenChallenges({ jetzt: new Date(2026, 9, 29) })[2].themaId;
    expect(a).not.toBe(b);
    expect(baueWochenChallenges({ jetzt: new Date(2026, 9, 25) })[2].themaId).toBe(a);
  });
});
