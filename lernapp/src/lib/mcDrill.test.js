import { describe, it, expect } from 'vitest';
import { baueMcFragen } from './mcDrill';

/** Deterministischer „RNG" (immer 0 → shuffle ist stabil genug zum Testen). */
const rng = () => 0;

const items = [
  { id: 'a', text: '{{RAID}}: Verbund mehrerer Festplatten', begriff: 'RAID', tags: ['speicher'], quelle: 'Z1' },
  { id: 'b', text: '{{Backup}}: Sicherungskopie von Daten', begriff: 'Backup', tags: ['speicher'], quelle: 'Z2' },
  { id: 'c', text: '{{VLAN}}: logisches Teilnetz', begriff: 'VLAN', tags: ['netz'], quelle: 'Z3' },
  { id: 'd', text: '{{DNS}}: löst Namen in IP-Adressen auf', begriff: 'DNS', tags: ['netz'], quelle: 'Z4' },
  { id: 'e', text: '{{DHCP}}: verteilt IP-Konfiguration', begriff: 'DHCP', tags: ['netz'], quelle: 'Z5' },
];

describe('baueMcFragen', () => {
  it('baut Fragen mit Lücke, 4 Optionen und korrektem Lösungs-Index', () => {
    const fragen = baueMcFragen(items, { anzahl: 3, rng });
    expect(fragen.length).toBe(3);
    for (const f of fragen) {
      expect(f.frage).toContain('____');
      expect(f.frage).not.toContain(f.begriff); // Antwort steht nicht in der Frage
      expect(f.optionen).toHaveLength(4);
      expect(f.optionen[f.loesungIndex]).toBe(f.begriff);
      // Distraktoren sind eindeutig und nie die richtige Antwort.
      expect(new Set(f.optionen.map((o) => o.toLowerCase())).size).toBe(4);
    }
  });

  it('liefert [] bei zu wenig Material für Distraktoren', () => {
    expect(baueMcFragen(items.slice(0, 2), { rng })).toEqual([]);
    expect(baueMcFragen([], { rng })).toEqual([]);
  });

  it('begrenzt auf die gewünschte Anzahl', () => {
    expect(baueMcFragen(items, { anzahl: 2, rng })).toHaveLength(2);
    expect(baueMcFragen(items, { anzahl: 99, rng }).length).toBeLessThanOrEqual(items.length);
  });

  it('ist mit injiziertem RNG deterministisch', () => {
    const a = baueMcFragen(items, { anzahl: 5, rng });
    const b = baueMcFragen(items, { anzahl: 5, rng });
    expect(a).toEqual(b);
  });
});
