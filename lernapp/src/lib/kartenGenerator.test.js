import { describe, it, expect } from 'vitest';
import { generiereKarten } from './kartenGenerator';

const front = (karten) => karten.map((k) => k.front);

describe('generiereKarten', () => {
  it('erkennt Glossarzeilen „Begriff: Erklärung"', () => {
    const k = generiereKarten('Subnetzmaske: Trennt in der IPv4-Adresse den Netz- vom Hostanteil.');
    expect(k).toEqual([
      {
        front: 'Was ist/bedeutet „Subnetzmaske"?',
        back: 'Trennt in der IPv4-Adresse den Netz- vom Hostanteil.',
        art: 'begriff',
      },
    ]);
  });

  it('erkennt „Begriff – Erklärung"', () => {
    const k = generiereKarten('Failover – automatische Übernahme durch ein Ersatzsystem bei Ausfall');
    expect(k[0]).toMatchObject({ front: 'Was ist/bedeutet „Failover"?', art: 'begriff' });
  });

  it('erkennt Frage + Antwort in den Folgezeilen', () => {
    const k = generiereKarten('Was macht ein Switch?\nLeitet Frames anhand der MAC-Adresse weiter.\n\nNächstes');
    expect(k[0]).toEqual({
      front: 'Was macht ein Switch?',
      back: 'Leitet Frames anhand der MAC-Adresse weiter.',
      art: 'frage',
    });
  });

  it('macht aus Überschrift + Aufzählung eine Listenkarte', () => {
    const k = generiereKarten('RAID-Level\n• RAID 0 Striping\n• RAID 1 Spiegelung\n- RAID 5 Parität\nFließtext danach.');
    expect(k[0]).toEqual({
      front: 'Was gehört zu „RAID-Level"?',
      back: '- RAID 0 Striping\n- RAID 1 Spiegelung\n- RAID 5 Parität',
      art: 'liste',
    });
  });

  it('erkennt Abkürzungen mit passender Langform, nicht aber beliebige Klammern', () => {
    const k = generiereKarten(
      'Der DHCP (Dynamic Host Configuration Protocol) verteilt Adressen. Die USV (Hallo Welt Test) passt nicht.'
    );
    expect(front(k)).toEqual(['Wofür steht „DHCP"?']);
    expect(k[0].back).toBe('Dynamic Host Configuration Protocol');
  });

  it('fügt Silbentrennung am Zeilenende zusammen und dedupliziert', () => {
    const k = generiereKarten('Firewall: Filtert den Daten-\nverkehr zwischen Netzen nach Regeln.\nFirewall: doppelt doppelt doppelt doppelt');
    expect(k).toHaveLength(1);
    expect(k[0].back).toContain('Datenverkehr');
  });

  it('begrenzt die Anzahl und ist robust bei leerem Text', () => {
    const viele = Array.from({ length: 30 }, (_, i) => `Begriff${i}: Erklärung Nummer ${i} mit genug Inhalt`).join('\n');
    expect(generiereKarten(viele, { max: 5 })).toHaveLength(5);
    expect(generiereKarten('')).toEqual([]);
    expect(generiereKarten(undefined)).toEqual([]);
  });
});
