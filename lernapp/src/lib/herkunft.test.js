import { describe, it, expect } from 'vitest';
import { herkunftsHinweis } from './herkunft';

describe('herkunftsHinweis', () => {
  it('null bei leerem/normalem Objekt', () => {
    expect(herkunftsHinweis(null)).toBeNull();
    expect(herkunftsHinweis({})).toBeNull();
    expect(herkunftsHinweis({ frage_text: 'x' })).toBeNull();
  });

  it('unverifiziert hat Vorrang (Warnung)', () => {
    const h = herkunftsHinweis({
      unverifiziert_markiert: true,
      examMeta: { paraphrasiert: true },
    });
    expect(h.art).toBe('unverifiziert');
    expect(h.ton).toBe('warnung');
  });

  it('KI-Quelle (über quelle-Feld)', () => {
    const h = herkunftsHinweis({ quelle: 'KI-generiert (an AP2-Prüfungsthemen angelehnt)' });
    expect(h.art).toBe('ki');
  });

  it('KI-Quelle (über examMeta.quelle_dateiname ki_)', () => {
    const h = herkunftsHinweis({ examMeta: { quelle_dateiname: 'ki_ap2_uebung2_2025' } });
    expect(h.art).toBe('ki');
  });

  it('paraphrasiert über examMeta', () => {
    const h = herkunftsHinweis({ examMeta: { paraphrasiert: true } });
    expect(h.art).toBe('paraphrasiert');
    expect(h.ton).toBe('info');
  });

  it('paraphrasiert direkt am Objekt', () => {
    expect(herkunftsHinweis({ paraphrasiert: true }).art).toBe('paraphrasiert');
  });

  it('KI schlägt paraphrasiert, wenn beides', () => {
    const h = herkunftsHinweis({ quelle: 'KI-generiert', examMeta: { paraphrasiert: true } });
    expect(h.art).toBe('ki');
  });
});
