import { describe, it, expect } from 'vitest';
import { getLernobjekte, filterLernobjekte, defaultLernfilter } from './lernobjekte';

const noStatus = () => null;
const allDue = () => true;

describe('getLernobjekte', () => {
  const objekte = getLernobjekte();

  it('vereint Fragen und Lernzettel', () => {
    const arten = new Set(objekte.map((o) => o.art));
    expect(arten.has('frage')).toBe(true);
    expect(arten.has('lernzettel')).toBe(true);
  });

  it('jedes Objekt hat id, art, pruefungsteil, front', () => {
    expect(
      objekte.every((o) => o.id && o.art && o.pruefungsteil && typeof o.front === 'string')
    ).toBe(true);
  });

  it('enthält AP2-Lernzettel', () => {
    expect(objekte.some((o) => o.art === 'lernzettel' && o.pruefungsteil === 'AP2')).toBe(true);
  });
});

describe('filterLernobjekte', () => {
  const objekte = getLernobjekte();
  const helpers = { getStatus: noStatus, isDue: allDue };

  it('filtert nach art', () => {
    const nurFragen = filterLernobjekte(objekte, { ...defaultLernfilter, art: 'frage' }, helpers);
    expect(nurFragen.every((o) => o.art === 'frage')).toBe(true);
    expect(nurFragen.length).toBeGreaterThan(0);
  });

  it('filtert nach pruefungsteil', () => {
    const ap2 = filterLernobjekte(
      objekte,
      { ...defaultLernfilter, pruefungsteil: 'AP2' },
      helpers
    );
    expect(ap2.every((o) => o.pruefungsteil === 'AP2')).toBe(true);
  });

  it('filtert per Volltext-Query', () => {
    const res = filterLernobjekte(objekte, { ...defaultLernfilter, query: 'Subnetz' }, helpers);
    expect(res.length).toBeGreaterThan(0);
    expect(
      res.every((o) => `${o.titel} ${o.front} ${o.back || ''}`.toLowerCase().includes('subnetz'))
    ).toBe(true);
  });

  it('nurFaellig nutzt isDue', () => {
    const keineFaellig = filterLernobjekte(
      objekte,
      { ...defaultLernfilter, nurFaellig: true },
      { getStatus: noStatus, isDue: () => false }
    );
    expect(keineFaellig.length).toBe(0);
  });
});
