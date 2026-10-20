import { describe, it, expect } from 'vitest';
import { baueMatchingRunde, istRichtigeZuordnung, werteMatchingAus } from './matching';

/** Deterministischer RNG (LCG) für reproduzierbare Mischungen. */
function rngAus(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const item = (n, begriff, einheitId = `e${n}`) => ({
  id: `c${n}`,
  einheitId,
  begriff,
  text: `{{${begriff}}}: Erklärung Nummer ${n} mit genug Kontext`,
  tags: ['netz'],
  quelle: `Zettel ${n}`,
});

describe('baueMatchingRunde', () => {
  it('liefert die gewünschte Anzahl Paare; Glossarzeilen ohne Begriff-Präfix', () => {
    const items = ['DNS', 'DHCP', 'VLAN', 'NAT', 'RAID', 'VPN'].map((b, i) => item(i, b));
    const r = baueMatchingRunde(items, { anzahl: 5, rng: rngAus(3) });
    expect(r.paare).toHaveLength(5);
    for (const p of r.paare) {
      expect(p.definition).toMatch(/^Erklärung Nummer \d/);
      expect(p.definition).not.toContain('{{');
    }
  });

  it('setzt bei Fließtext eine Lücke statt des Begriffs', () => {
    const satz = { ...item(1, 'VLAN'), text: 'Ein {{VLAN}} trennt Broadcast-Domänen logisch.' };
    const [p] = baueMatchingRunde([satz], { rng: rngAus(1) }).paare;
    expect(p.definition).toBe('Ein ____ trennt Broadcast-Domänen logisch.');
  });

  it('mischt Begriffe und Definitionen getrennt, enthält aber dieselben IDs', () => {
    const items = ['DNS', 'DHCP', 'VLAN', 'NAT', 'RAID'].map((b, i) => item(i, b));
    const r = baueMatchingRunde(items, { anzahl: 5, rng: rngAus(7) });
    const ids = r.paare.map((p) => p.id).sort();
    expect([...r.begriffe].sort()).toEqual(ids);
    expect([...r.definitionen].sort()).toEqual(ids);
  });

  it('nimmt Begriffe nur einmal (ohne Groß/Klein) und je Einheit höchstens ein Paar', () => {
    const items = [item(1, 'DNS'), item(2, 'dns'), item(3, 'NAT', 'e1'), item(4, 'VPN')];
    const r = baueMatchingRunde(items, { anzahl: 10, rng: rngAus(1) });
    const begriffe = r.paare.map((p) => p.begriff.toLowerCase());
    expect(new Set(begriffe).size).toBe(begriffe.length);
    const einheiten = r.paare.map((p) => p.einheitId);
    expect(new Set(einheiten).size).toBe(einheiten.length);
  });

  it('verwirft Definitionen, die den Begriff verraten', () => {
    const verraeter = { ...item(1, 'RAID'), text: '{{RAID}}: RAID steht für redundante Platten' };
    const r = baueMatchingRunde([verraeter, item(2, 'VPN')], { anzahl: 5, rng: rngAus(2) });
    expect(r.paare.map((p) => p.begriff)).toEqual(['VPN']);
  });

  it('ist robust bei leerer Eingabe', () => {
    expect(baueMatchingRunde(undefined).paare).toEqual([]);
  });
});

describe('istRichtigeZuordnung', () => {
  it('erkennt passende und falsche Paare', () => {
    expect(istRichtigeZuordnung('a', 'a')).toBe(true);
    expect(istRichtigeZuordnung('a', 'b')).toBe(false);
    expect(istRichtigeZuordnung('', '')).toBe(false);
  });
});

describe('werteMatchingAus', () => {
  it('vergibt Gut (3) nur bei fehlerfreier Zuordnung, sonst Nochmal (1)', () => {
    const paare = [
      { id: 'p1', einheitId: 'e1' },
      { id: 'p2', einheitId: 'e2' },
      { id: 'p3', einheitId: 'e3' },
      { id: 'p4', einheitId: 'e4' },
    ];
    const a = werteMatchingAus(paare, { p2: 2 });
    expect(a.noten.map((n) => n.note)).toEqual([3, 1, 3, 3]);
    expect(a).toMatchObject({ richtigBeimErsten: 3, gesamt: 4, fehler: 2, quote: 75 });
  });

  it('liefert 0 % bei leerer Runde', () => {
    expect(werteMatchingAus([], {})).toMatchObject({ gesamt: 0, quote: 0 });
  });
});
