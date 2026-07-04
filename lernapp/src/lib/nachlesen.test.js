import { describe, it, expect } from 'vitest';
import { findeLernzettel } from './nachlesen';

const einheiten = [
  { id: 'a', titel: 'VLAN-Grundlagen', thema_tags: ['Netzwerk/IP-Adressierung'], pruefungsteil: 'AP1' },
  { id: 'b', titel: 'Routing & NAT', thema_tags: ['Netzwerk/IP-Adressierung'], pruefungsteil: 'AP2' },
  { id: 'c', titel: 'RAID-Level', thema_tags: ['Datensicherung/Storage'], pruefungsteil: 'AP2' },
  { id: 'd', titel: 'Netz + Storage', thema_tags: ['Netzwerk/IP-Adressierung', 'Datensicherung/Storage'], pruefungsteil: 'AP2' },
];

describe('findeLernzettel', () => {
  it('findet Lernzettel über gemeinsame Tags, meiste Überschneidung zuerst', () => {
    const r = findeLernzettel(einheiten, {
      thema_tags: ['Netzwerk/IP-Adressierung', 'Datensicherung/Storage'],
      pruefungsteil: 'AP2',
    });
    expect(r[0].id).toBe('d'); // 2 gemeinsame Tags schlagen 1
    expect(r).toHaveLength(2);
  });

  it('bevorzugt bei Gleichstand den gleichen Prüfungsteil', () => {
    const r = findeLernzettel(einheiten, {
      thema_tags: ['Netzwerk/IP-Adressierung'],
      pruefungsteil: 'AP2',
    });
    expect(r[0].id).toBe('b'); // AP2 vor AP1 bei gleicher Tag-Überschneidung
  });

  it('liefert leer ohne Tags oder ohne Treffer', () => {
    expect(findeLernzettel(einheiten, {})).toEqual([]);
    expect(findeLernzettel(einheiten, { thema_tags: ['Gibt/EsNicht'] })).toEqual([]);
    expect(findeLernzettel([], { thema_tags: ['x'] })).toEqual([]);
  });

  it('respektiert das max-Limit', () => {
    const r = findeLernzettel(einheiten, { thema_tags: ['Netzwerk/IP-Adressierung'] }, { max: 1 });
    expect(r).toHaveLength(1);
  });
});
