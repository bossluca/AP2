import { describe, it, expect } from 'vitest';
import { baueBefehle, filterBefehle, fuzzyScore } from './befehle';

const NAV = [
  { to: '/', label: 'Start' },
  { to: '/lernen', label: 'Lernen' },
  { to: '/klausur', label: 'Klausur' },
  { to: '/statistik', label: 'Statistik' },
];

describe('baueBefehle', () => {
  it('enthält Schnellaktionen + alle Nav-Ziele', () => {
    const b = baueBefehle({ navItems: NAV, theme: 'light' });
    expect(b.some((x) => x.id === 'akt-heute')).toBe(true);
    expect(b.some((x) => x.id === 'akt-theme')).toBe(true);
    expect(b.filter((x) => x.gruppe === 'Navigation')).toHaveLength(NAV.length);
  });

  it('nimmt Resume nur auf, wenn vorhanden', () => {
    expect(baueBefehle({ navItems: NAV }).some((x) => x.id === 'resume')).toBe(false);
    const mit = baueBefehle({ navItems: NAV, resume: { to: '/lernen', titel: 'Heute' } });
    expect(mit[0].id).toBe('resume');
  });

  it('Theme-Label richtet sich nach aktuellem Theme', () => {
    expect(baueBefehle({ theme: 'dark' }).find((x) => x.id === 'akt-theme').label).toBe('Hellmodus');
    expect(baueBefehle({ theme: 'light' }).find((x) => x.id === 'akt-theme').label).toBe('Dunkelmodus');
  });
});

describe('fuzzyScore', () => {
  it('leere Query matcht alles mit Score 0', () => {
    expect(fuzzyScore('klausur', '')).toBe(0);
  });
  it('Teilfolge matcht (klr → klausur)', () => {
    expect(fuzzyScore('klausur', 'klr')).not.toBeNull();
  });
  it('fehlendes Zeichen → kein Match', () => {
    expect(fuzzyScore('klausur', 'xyz')).toBeNull();
  });
  it('zusammenhängender Treffer rankt besser (kleinerer Score)', () => {
    expect(fuzzyScore('statistik', 'stat')).toBeLessThan(fuzzyScore('statistik', 'sttk'));
  });
});

describe('filterBefehle', () => {
  const befehle = baueBefehle({ navItems: NAV, theme: 'light' });

  it('leere Query → unverändert', () => {
    expect(filterBefehle(befehle, '')).toHaveLength(befehle.length);
  });

  it('findet per Substring/Teilfolge', () => {
    const r = filterBefehle(befehle, 'klausur');
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].label.toLowerCase()).toContain('klausur');
  });

  it('umlaut-/akzenttolerant (kein Treffer-Verlust bei ue/ü)', () => {
    const r = filterBefehle(befehle, 'wiederholen');
    // 'Wiederholen' ist als Aktion drin
    expect(r.some((x) => x.label === 'Wiederholen')).toBe(true);
  });

  it('kein Treffer → leere Liste', () => {
    expect(filterBefehle(befehle, 'zzzqqq')).toHaveLength(0);
  });
});
