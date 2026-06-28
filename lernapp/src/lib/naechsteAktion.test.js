import { describe, it, expect } from 'vitest';
import { naechsteAktion } from './naechsteAktion';

describe('naechsteAktion', () => {
  it('Default ohne alles: Heute lernen', () => {
    const a = naechsteAktion();
    expect(a.art).toBe('lernen');
    expect(a.to).toBe('/lernen');
  });

  it('Resume hat höchste Priorität', () => {
    const a = naechsteAktion({
      resume: { to: '/lernpfade/1/2', titel: 'Grundlagen' },
      faellig: 10,
      schwachstellen: [{ tag: 'Netzwerk' }],
    });
    expect(a.art).toBe('resume');
    expect(a.to).toBe('/lernpfade/1/2');
    expect(a.text).toContain('Grundlagen');
  });

  it('Fällig schlägt Schwächen und Standard', () => {
    const a = naechsteAktion({ faellig: 3, schwachstellen: [{ tag: 'SQL' }] });
    expect(a.art).toBe('faellig');
    expect(a.to).toBe('/wiederholen');
    expect(a.text).toContain('3');
  });

  it('Fällig Singular-Text', () => {
    expect(naechsteAktion({ faellig: 1 }).text).toContain('Objekt ist');
  });

  it('Schwächen, wenn nichts fällig und Tagesziel offen', () => {
    const a = naechsteAktion({
      faellig: 0,
      schwachstellen: [{ tag: 'Netzwerk' }, { tag: 'SQL' }],
      heuteAktivitaet: 2,
      tagesziel: 10,
    });
    expect(a.art).toBe('schwaechen');
    expect(a.to).toContain('modus=schwaechen');
    expect(a.text).toContain('Netzwerk');
  });

  it('bei erreichtem Tagesziel keine Schwächen, sondern Standard', () => {
    const a = naechsteAktion({
      faellig: 0,
      schwachstellen: [{ tag: 'Netzwerk' }],
      heuteAktivitaet: 10,
      tagesziel: 10,
    });
    expect(a.art).toBe('lernen');
  });

  it('liefert immer cta/titel/icon', () => {
    for (const inp of [
      {},
      { faellig: 1 },
      { schwachstellen: [{ tag: 'X' }], tagesziel: 5 },
      { resume: { to: '/x', titel: 'Y' } },
    ]) {
      const a = naechsteAktion(inp);
      expect(a.cta).toBeTruthy();
      expect(a.titel).toBeTruthy();
      expect(a.icon).toBeTruthy();
    }
  });
});
