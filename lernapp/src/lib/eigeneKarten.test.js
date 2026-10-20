import { describe, it, expect, beforeEach } from 'vitest';
import { stapelHinzufuegen, stapelEntfernen, ladeStapel, speichereStapel, lernReihe } from './eigeneKarten';

const jetzt = new Date('2026-10-20T10:00:00Z');
const rng = () => 0.5;

describe('eigeneKarten', () => {
  beforeEach(() => localStorage.clear());

  it('legt einen Stapel mit eindeutigen eigen_-IDs an und verwirft leere Karten', () => {
    const s = stapelHinzufuegen([], '  Netzwerk ', [
      { front: 'A?', back: 'a' },
      { front: '', back: 'leer' },
      { front: 'B?', back: 'b' },
    ], { jetzt, rng });
    expect(s).toHaveLength(1);
    expect(s[0].name).toBe('Netzwerk');
    expect(s[0].karten.map((k) => k.front)).toEqual(['A?', 'B?']);
    expect(s[0].karten.every((k) => k.id.startsWith(`eigen_${s[0].id}_`))).toBe(true);
    expect(stapelHinzufuegen([], '', [{ front: 'x', back: 'y' }], { jetzt, rng })[0].name).toBe('Eigener Stapel');
  });

  it('entfernt Stapel und speichert/lädt robust', () => {
    const s = stapelHinzufuegen([], 'X', [{ front: 'a', back: 'b' }], { jetzt, rng });
    expect(speichereStapel(s)).toBe(true);
    expect(ladeStapel()).toEqual(s);
    expect(stapelEntfernen(s, s[0].id)).toEqual([]);
    localStorage.setItem('ap2_lernapp_eigene_karten_v1', 'kaputt');
    expect(ladeStapel()).toEqual([]);
  });

  it('lernReihe: fällig vor neu vor Rest', () => {
    const stapel = {
      karten: [
        { id: 'rest', front: 'r', back: 'r' },
        { id: 'neu', front: 'n', back: 'n' },
        { id: 'faellig', front: 'f', back: 'f' },
      ],
    };
    const eintraege = {
      rest: { last_review: '2026-10-19', due: '2026-11-01' },
      faellig: { last_review: '2026-10-01', due: '2026-10-10' },
    };
    const r = lernReihe(stapel, { getEntry: (id) => eintraege[id], isDue: (id) => id === 'faellig' });
    expect(r.reihe.map((k) => k.id)).toEqual(['faellig', 'neu', 'rest']);
    expect(r).toMatchObject({ faellig: 1, neu: 1 });
  });
});
