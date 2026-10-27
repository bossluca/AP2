/**
 * Vertragstest Frontend ↔ Backend (C3): Alles, was der Client tatsächlich
 * an `/api/progress` schickt, muss die serverseitige Validierung passieren.
 * Erzeugt echte Einträge mit FSRS/Leitner wie `ProgressContext.recordReview`
 * und prüft alle echten Lernobjekt-IDs (inkl. Umlaute) und eigene Karten-IDs.
 */
import { describe, it, expect } from 'vitest';
import { bewerten } from './fsrs';
import { bewerten as leitnerBewerten } from './srs';
import { stapelHinzufuegen } from './eigeneKarten';
import daten from '../data/exam_data.json';
import {
  pruefeProgressEintrag,
  pruefeItemId,
  pruefeGamification,
} from '../../../server/src/lib/validierung.js';

/** Deterministischer RNG (Park-Miller). */
function rng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe('Server-Validierung akzeptiert echte Client-Daten', () => {
  it('FSRS-/Leitner-Einträge über viele Bewertungsfolgen', () => {
    const r = rng(42);
    const noten = [1, 2, 3, 4, true, false];
    const labels = ['gewusst', 'nicht', 'schwer', 'sicher-falsch'];
    const fehler = [];
    for (let lauf = 0; lauf < 300; lauf++) {
      let t = new Date(2025, 0, 1).getTime();
      let e = {};
      if (lauf % 3 === 0) {
        for (let k = 0; k < 6; k++) e = { ...e, ...leitnerBewerten(e, r() < 0.6, new Date(t)) };
      }
      for (let i = 0; i < 40; i++) {
        t += r() * 86400000 * (r() < 0.1 ? 600 : 20);
        const jetzt = new Date(t);
        const srs = bewerten(e, noten[Math.floor(r() * noten.length)], jetzt, {
          objektSchwierigkeit: [undefined, 1, 2, 3][Math.floor(r() * 4)],
        });
        const history = [
          ...(e.history || []),
          { ts: jetzt.toISOString(), result: labels[Math.floor(r() * labels.length)] },
        ].slice(-20);
        e = {
          ...e,
          ...srs,
          status: r() < 0.5 ? 'gelernt' : 'ueben',
          lastResult: ['richtig', 'teilweise', 'falsch'][Math.floor(r() * 3)],
          lastSeen: jetzt.toISOString(),
          history,
          updatedAt: jetzt.toISOString(),
        };
        // Über die Leitung geht JSON.
        const res = pruefeProgressEintrag(JSON.parse(JSON.stringify(e)));
        if (res.fehler) fehler.push(res.fehler);
      }
    }
    expect(fehler).toEqual([]);
  });

  it('alle echten Lernobjekt-IDs und eigene Karten-IDs sind gültig', () => {
    const ids = [];
    for (const ex of daten.exams) for (const f of ex.fragen) ids.push(f.id);
    for (const l of daten.lerneinheiten) ids.push(l.id);
    const [stapel] = stapelHinzufuegen([], 'Test', [{ front: 'a', back: 'b' }]);
    ids.push(...stapel.karten.map((k) => k.id));
    expect(ids.length).toBeGreaterThan(500);
    expect(ids.filter((id) => pruefeItemId(id) !== null)).toEqual([]);
  });

  it('Gamification-Stand des Clients ist gültig', () => {
    const res = pruefeGamification({ activity: { '2026-10-27': 12 }, xp: 1234, klausurBest: 87 });
    expect(res.fehler).toBeUndefined();
  });
});
