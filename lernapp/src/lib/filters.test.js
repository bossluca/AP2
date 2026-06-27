import { describe, it, expect } from 'vitest';
import { applyFilters, examKey, hasActiveFilters, defaultFilters } from './filters';

/** Baut eine minimale Frage für Filtertests. */
function q(id, { jahr = 2022, saison = 'Frühjahr', tags = [] } = {}) {
  return { id, jahr, saison, thema_tags: tags };
}

/** getStatus-Stub aus einer Map id→status. */
const statusFrom = (map) => (id) => map[id] ?? null;

describe('examKey', () => {
  it('verbindet Jahr und Saison', () => {
    expect(examKey({ jahr: 2023, saison: 'Herbst' })).toBe('2023_Herbst');
  });
});

describe('hasActiveFilters', () => {
  it('ist false bei Standardfiltern', () => {
    expect(hasActiveFilters(defaultFilters)).toBe(false);
  });
  it('erkennt aktive Tag-/Exam-/Status-Filter', () => {
    expect(hasActiveFilters({ ...defaultFilters, tags: ['Netzwerk'] })).toBe(true);
    expect(hasActiveFilters({ ...defaultFilters, exams: ['2022_Frühjahr'] })).toBe(true);
    expect(hasActiveFilters({ ...defaultFilters, status: 'gelernt' })).toBe(true);
  });
});

describe('applyFilters', () => {
  const questions = [
    q('a', { jahr: 2022, saison: 'Frühjahr', tags: ['Netzwerk'] }),
    q('b', { jahr: 2022, saison: 'Herbst', tags: ['SQL', 'Netzwerk'] }),
    q('c', { jahr: 2023, saison: 'Herbst', tags: [] }),
  ];

  it('gibt ohne aktive Filter alle Fragen zurück', () => {
    const out = applyFilters(questions, defaultFilters, () => null);
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('filtert nach Prüfungstermin (OR)', () => {
    const out = applyFilters(
      questions,
      { ...defaultFilters, exams: ['2022_Herbst', '2023_Herbst'] },
      () => null
    );
    expect(out.map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('filtert nach Tags (OR, mind. ein Treffer)', () => {
    const out = applyFilters(questions, { ...defaultFilters, tags: ['Netzwerk'] }, () => null);
    expect(out.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('kombiniert Termin- und Tag-Filter (UND zwischen Dimensionen)', () => {
    const out = applyFilters(
      questions,
      { ...defaultFilters, exams: ['2022_Frühjahr'], tags: ['Netzwerk'] },
      () => null
    );
    expect(out.map((x) => x.id)).toEqual(['a']);
  });

  it('status "neu" liefert nur Fragen ohne gespeicherten Status', () => {
    const getStatus = statusFrom({ a: 'gelernt', b: 'ueben' });
    const out = applyFilters(questions, { ...defaultFilters, status: 'neu' }, getStatus);
    expect(out.map((x) => x.id)).toEqual(['c']);
  });

  it('status "gelernt"/"ueben" liefert nur passend markierte Fragen', () => {
    const getStatus = statusFrom({ a: 'gelernt', b: 'ueben' });
    expect(
      applyFilters(questions, { ...defaultFilters, status: 'gelernt' }, getStatus).map((x) => x.id)
    ).toEqual(['a']);
    expect(
      applyFilters(questions, { ...defaultFilters, status: 'ueben' }, getStatus).map((x) => x.id)
    ).toEqual(['b']);
  });
});
