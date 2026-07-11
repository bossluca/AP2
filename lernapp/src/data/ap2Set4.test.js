import { describe, expect, it } from 'vitest';
import daten from './exam_data.json';
import { pruefeAntwort } from '../lib/antwortpruefung';

const set4 = daten.exams.find(
  (exam) => exam.meta?.quelle_dateiname === 'ki_ap2_uebung4_2026'
);

describe('AP2-Übungsklausur 4', () => {
  it('enthält 22 eindeutige Fragen mit zusammen 99 Punkten', () => {
    expect(set4).toBeDefined();
    expect(set4.fragen).toHaveLength(22);
    expect(new Set(set4.fragen.map((frage) => frage.id)).size).toBe(22);
    expect(set4.fragen.reduce((summe, frage) => summe + frage.punkte, 0)).toBe(99);
  });

  it('jede Musterlösung besteht ihre eigene Schlagwortprüfung', () => {
    for (const frage of set4.fragen) {
      const ergebnis = pruefeAntwort(frage.loesung_text, frage.schluesselwoerter, {
        erforderlich: frage.mindest_treffer,
      });
      expect(ergebnis.bewertung, frage.id).toBe('richtig');
    }
  });
});
