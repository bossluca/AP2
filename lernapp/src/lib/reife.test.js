import { describe, it, expect } from 'vitest';
import { berechneReife, objektMastery, READY_SCHWELLE } from './reife';

const NOW = new Date('2026-06-01T00:00:00Z');

/** Frisch gefestigtes FSRS-Objekt → Abrufwahrscheinlichkeit ≈ 1. */
function fest() {
  return { stability: 100, difficulty: 5, last_review: NOW.toISOString(), box: 5, status: 'gelernt' };
}

function frage(id, tags, punkte = 1) {
  return { id, art: 'frage', tags, punkte };
}

describe('objektMastery', () => {
  it('nutzt die FSRS-Abrufwahrscheinlichkeit (frisch ≈ 1)', () => {
    expect(objektMastery(fest(), NOW)).toBeCloseTo(1, 2);
  });

  it('fällt mit der Zeit (vor 100 Tagen gefestigt < frisch)', () => {
    const alt = { stability: 10, last_review: '2026-01-01T00:00:00Z', difficulty: 5 };
    expect(objektMastery(alt, NOW)).toBeLessThan(0.5);
  });

  it('Fallback: „gelernt" ohne SRS = 0,5, sonst 0', () => {
    expect(objektMastery({ status: 'gelernt' }, NOW)).toBe(0.5);
    expect(objektMastery({}, NOW)).toBe(0);
    expect(objektMastery(null, NOW)).toBe(0);
  });
});

describe('berechneReife', () => {
  it('alles ungelernt → Mastery 0, Prognose 0, kein bereites Thema', () => {
    const objekte = [frage('a', ['Netzwerk']), frage('b', ['SQL'])];
    const r = berechneReife(objekte, {}, NOW);
    expect(r.gesamtMastery).toBe(0);
    expect(r.prognoseProzent).toBe(0);
    expect(r.bereitThemen).toBe(0);
    expect(r.proThema.every((t) => t.mastery === 0)).toBe(true);
  });

  it('markiert ein Thema als „bereit" ab Schwelle und genug geübten Objekten', () => {
    const objekte = [frage('a', ['Netzwerk']), frage('b', ['Netzwerk']), frage('c', ['Netzwerk'])];
    const progress = { a: fest(), b: fest(), c: fest() };
    const r = berechneReife(objekte, progress, NOW);
    const netz = r.proThema.find((t) => t.tag === 'Netzwerk');
    expect(netz.mastery).toBeGreaterThanOrEqual(READY_SCHWELLE);
    expect(netz.geuebt).toBe(3);
    expect(netz.bereit).toBe(true);
  });

  it('ein einzelnes gefestigtes Objekt reicht NICHT für „bereit" (Mindestanzahl)', () => {
    const objekte = [frage('a', ['Datenschutz'])];
    const r = berechneReife(objekte, { a: fest() }, NOW);
    expect(r.proThema[0].bereit).toBe(false);
  });

  it('gewichtet die Prognose mit den Prüfungspunkten', () => {
    const objekte = [frage('a', ['X'], 10), frage('b', ['Y'], 30)];
    const r = berechneReife(objekte, { a: fest() }, NOW); // nur A gefestigt
    expect(r.prognoseProzent).toBe(25); // (10*1 + 30*0)/40
  });

  it('sortiert Themen aufsteigend nach Mastery (schwach zuerst)', () => {
    const objekte = [frage('a', ['Stark']), frage('b', ['Schwach'])];
    const r = berechneReife(objekte, { a: fest() }, NOW);
    expect(r.proThema[0].tag).toBe('Schwach');
    expect(r.proThema[r.proThema.length - 1].tag).toBe('Stark');
  });
});
