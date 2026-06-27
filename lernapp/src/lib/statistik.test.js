import { describe, it, expect } from 'vitest';
import { berechneStatistik } from './statistik';

const obj = (id, art, teil, tags = []) => ({ id, art, pruefungsteil: teil, tags });

const objekte = [
  obj('q1', 'frage', 'AP1', ['Netzwerk/IP-Adressierung']),
  obj('q2', 'frage', 'AP2', ['Netzwerk/IP-Adressierung']),
  obj('l1', 'lernzettel', 'AP2', ['OSI-Modell']),
  obj('l2', 'lernzettel', 'AP1', []),
];

describe('berechneStatistik', () => {
  it('zählt Status, Art und Gesamt', () => {
    const progress = {
      q1: { status: 'gelernt' },
      l1: { status: 'ueben' },
    };
    const s = berechneStatistik(objekte, progress, new Date('2026-06-21'));
    expect(s.total).toBe(4);
    expect(s.status).toEqual({ gelernt: 1, ueben: 1, offen: 2 });
    expect(s.art).toEqual({ frage: 2, lernzettel: 2 });
  });

  it('verteilt Boxen und zählt Fälligkeit (neu = fällig)', () => {
    const progress = {
      q1: { box: 3, due: '2999-01-01T00:00:00' }, // nicht fällig
      q2: { box: 1, due: '2000-01-01T00:00:00' }, // fällig
    };
    const s = berechneStatistik(objekte, progress, new Date('2026-06-21'));
    expect(s.boxen.neu).toBe(2); // l1, l2 ohne Box
    expect(s.boxen[3]).toBe(1);
    expect(s.boxen[1]).toBe(1);
    expect(s.faellig).toBe(3); // q2 + 2 neue
  });

  it('aggregiert Schwachstellen nach Tag', () => {
    const progress = {
      q2: { status: 'ueben' }, // Netzwerk
      l1: { lastResult: 'falsch' }, // OSI
    };
    const s = berechneStatistik(objekte, progress, new Date('2026-06-21'));
    const map = Object.fromEntries(s.schwachstellen.map((x) => [x.tag, x.count]));
    expect(map['Netzwerk/IP-Adressierung']).toBe(1);
    expect(map['OSI-Modell']).toBe(1);
  });

  it('baut den Lernverlauf pro Tag', () => {
    const progress = {
      q1: {
        history: [
          { ts: '2026-06-20T10:00:00', result: 'gewusst' },
          { ts: '2026-06-20T11:00:00', result: 'nicht' },
          { ts: '2026-06-21T09:00:00', result: 'gewusst' },
        ],
      },
    };
    const s = berechneStatistik(objekte, progress, new Date('2026-06-21'));
    const v = Object.fromEntries(s.verlauf.map((x) => [x.date, x.count]));
    expect(v['2026-06-20']).toBe(2);
    expect(v['2026-06-21']).toBe(1);
  });

  it('schlüsselt nach Prüfungsteil auf', () => {
    const s = berechneStatistik(objekte, {}, new Date('2026-06-21'));
    expect(s.proTeil.AP1.total).toBe(2);
    expect(s.proTeil.AP2.total).toBe(2);
  });
});
