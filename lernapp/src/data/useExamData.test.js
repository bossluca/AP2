import { describe, it, expect } from 'vitest';
import {
  getAllQuestions,
  getLearnableQuestions,
  getAllExams,
  getAllPruefungsteile,
  getLerneinheiten,
} from './useExamData';

describe('useExamData – Datenmodell-Erweiterung', () => {
  it('reichert jede Frage mit pruefungsteil an (Default AP1)', () => {
    const qs = getAllQuestions();
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.pruefungsteil === 'AP1' || q.pruefungsteil === 'AP2')).toBe(true);
  });

  it('jede Prüfung hat einen pruefungsteil in den Metadaten', () => {
    expect(getAllExams().every((m) => m.pruefungsteil === 'AP1' || m.pruefungsteil === 'AP2')).toBe(
      true
    );
  });

  it('getAllPruefungsteile enthält AP1', () => {
    expect(getAllPruefungsteile()).toContain('AP1');
  });

  it('getLerneinheiten liefert ein Array (leer, solange keine gepflegt)', () => {
    expect(Array.isArray(getLerneinheiten())).toBe(true);
  });

  it('lernbare Fragen sind eine Teilmenge ohne Kontextblöcke', () => {
    const learnable = getLearnableQuestions();
    expect(learnable.every((q) => !q.ist_kontext_block)).toBe(true);
  });
});
