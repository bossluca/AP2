import { describe, expect, it } from 'vitest';
import daten from './exam_data.json';
import { pruefeAntwort } from '../lib/antwortpruefung';

const set5 = daten.exams.find(
  (exam) => exam.meta?.quelle_dateiname === 'ki_ap2_uebung5_2026'
);

describe('AP2-Übungsklausur 5', () => {
  it('enthält 22 eindeutige Fragen mit zusammen 87 Punkten', () => {
    expect(set5).toBeDefined();
    expect(set5.fragen).toHaveLength(22);
    expect(new Set(set5.fragen.map((frage) => frage.id)).size).toBe(22);
    expect(set5.fragen.reduce((summe, frage) => summe + frage.punkte, 0)).toBe(87);
  });

  it('jede Musterlösung besteht ihre eigene Schlagwortprüfung', () => {
    for (const frage of set5.fragen) {
      const ergebnis = pruefeAntwort(frage.loesung_text, frage.schluesselwoerter, {
        erforderlich: frage.mindest_treffer,
      });
      expect(ergebnis.bewertung, frage.id).toBe('richtig');
    }
  });
});
