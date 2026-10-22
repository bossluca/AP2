import { describe, it, expect, afterEach } from 'vitest';
import {
  holeExamDaten,
  setzeExamDaten,
  examDatenGeladen,
  ladeExamDaten,
} from './examDaten';
import { getAllQuestions, getLerneinheiten, getKlausuren, getAllTags } from './useExamData';
import { getLernobjekte } from './lernobjekte';

/** C9: Daten kommen erst nach dem Login (dynamischer Import). */
describe('examDaten – nachgeladene Prüfungsdaten', () => {
  const original = holeExamDaten(); // vom Test-Setup bereitgestellt
  afterEach(() => setzeExamDaten(original));

  it('ohne geladene Daten liefern die Selektoren leere Listen – und cachen sie nicht', () => {
    setzeExamDaten(null);
    expect(examDatenGeladen()).toBe(false);
    expect(getAllQuestions()).toEqual([]);
    expect(getLerneinheiten()).toEqual([]);
    expect(getKlausuren()).toEqual([]);
    expect(getAllTags()).toEqual([]);
    expect(getLernobjekte()).toEqual([]);

    setzeExamDaten(original);
    expect(getAllQuestions().length).toBeGreaterThan(0);
    expect(getLerneinheiten().length).toBeGreaterThan(0);
    expect(getLernobjekte().length).toBeGreaterThan(0);
  });

  it('ladeExamDaten lädt einmal über den Importer und teilt parallele Aufrufe', async () => {
    setzeExamDaten(null);
    let aufrufe = 0;
    const importer = async () => {
      aufrufe += 1;
      return { default: { exams: [], lerneinheiten: [{ id: 'lz_x', titel: 'X', inhalt_text: '' }] } };
    };
    const [a, b] = await Promise.all([ladeExamDaten(importer), ladeExamDaten(importer)]);
    expect(aufrufe).toBe(1);
    expect(a).toBe(b);
    expect(getLerneinheiten().map((l) => l.id)).toEqual(['lz_x']);
    await ladeExamDaten(importer);
    expect(aufrufe).toBe(1);
  });

  it('nach einem Ladefehler ist ein neuer Versuch möglich', async () => {
    setzeExamDaten(null);
    await expect(ladeExamDaten(async () => Promise.reject(new Error('401')))).rejects.toThrow('401');
    expect(examDatenGeladen()).toBe(false);
    await ladeExamDaten(async () => ({ default: { exams: [], lerneinheiten: [] } }));
    expect(examDatenGeladen()).toBe(true);
  });
});
