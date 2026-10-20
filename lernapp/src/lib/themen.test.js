import { describe, it, expect } from 'vitest';
import { AP2_THEMEN, themaPerId, normThema, einheitenImThema, objekteImThema } from './themen';

describe('themen', () => {
  it('hat 16 eindeutige Themen mit Gewicht 1–3', () => {
    expect(AP2_THEMEN).toHaveLength(16);
    expect(new Set(AP2_THEMEN.map((t) => t.id)).size).toBe(16);
    expect(AP2_THEMEN.every((t) => t.gewicht >= 1 && t.gewicht <= 3)).toBe(true);
    expect(themaPerId('vpn').titel).toMatch(/VPN/);
  });

  it('normalisiert Umlaute und Groß/Klein', () => {
    expect(normThema('Hochverfügbarkeit')).toBe('hochverfugbarkeit');
  });

  it('findet Einheiten präzise über den Titel, sonst breiter über den Inhalt', () => {
    const einheiten = [
      { id: '1', titel: 'VLAN-Grundlagen', inhalt_text: '' },
      { id: '2', titel: 'Netzplan', inhalt_text: 'Hier geht es um Kerberos-Tickets.' },
      { id: '3', titel: 'Kochrezept', inhalt_text: 'Nudeln' },
    ];
    expect(einheitenImThema(einheiten, 'routing', { mindestens: 1 }).map((e) => e.id)).toEqual(['1']);
    // Kein Titel-Treffer für Identitäten → Fallback auf den Inhalt.
    expect(einheitenImThema(einheiten, 'identitaeten').map((e) => e.id)).toEqual(['2']);
    expect(einheitenImThema(einheiten, 'gibtsnicht')).toEqual([]);
  });

  it('ordnet Lernobjekte über Titel/Tags/Vorderseite zu', () => {
    const objekte = [
      { id: 'a', titel: 'Aufgabe 1', tags: ['Datenbank/SQL/ER-Modell'], front: '' },
      { id: 'b', titel: 'Aufgabe 2', tags: [], front: 'Berechnen Sie die USV-Laufzeit.' },
    ];
    expect(objekteImThema(objekte, 'datenbanken').map((o) => o.id)).toEqual(['a']);
    expect(objekteImThema(objekte, 'hardware').map((o) => o.id)).toEqual(['b']);
  });
});
