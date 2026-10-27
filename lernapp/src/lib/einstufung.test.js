import { describe, it, expect, beforeEach } from 'vitest';
import {
  ANTWORT,
  baueEinstufungstest,
  werteEinstufungAus,
  niveauAusQuote,
  erstelleLernplan,
  aktuelleWoche,
  planAusErgebnis,
  STANDARD_TAGE,
  ladeEinstufung,
  speichereEinstufung,
  loescheEinstufung,
} from './einstufung';
import { getLerneinheiten } from '../data/useExamData';
import { AP2_THEMEN } from './themen';

function rngAus(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('baueEinstufungstest (echte Daten)', () => {
  const einheiten = getLerneinheiten();

  it('liefert je Thema mit Material eine Frage mit vier Optionen', () => {
    const fragen = baueEinstufungstest(einheiten, { rng: rngAus(5) });
    const themen = new Set(fragen.map((f) => f.themaId));
    expect(fragen.length).toBe(themen.size);
    expect(themen.size).toBeGreaterThanOrEqual(14); // fast alle 16 AP2-Themen
    for (const f of fragen) {
      expect(f.optionen).toHaveLength(4);
      expect(f.optionen[f.loesungIndex]).toBe(f.begriff);
    }
  });

  it('stellt keine Frage doppelt, auch bei mehreren Fragen je Thema', () => {
    const fragen = baueEinstufungstest(einheiten, { proThema: 2, rng: rngAus(9) });
    expect(new Set(fragen.map((f) => f.id)).size).toBe(fragen.length);
    expect(fragen.length).toBeGreaterThan(AP2_THEMEN.length);
  });
});

describe('werteEinstufungAus', () => {
  it('zählt nur „richtig" als Treffer und stuft je Thema ein', () => {
    const fragen = [
      { id: 'a', themaId: 'subnetting' },
      { id: 'b', themaId: 'subnetting' },
      { id: 'c', themaId: 'vpn' },
      { id: 'd', themaId: 'wlan' },
    ];
    const a = werteEinstufungAus(fragen, {
      a: ANTWORT.RICHTIG,
      b: ANTWORT.WEISS_NICHT,
      c: ANTWORT.RICHTIG,
      d: ANTWORT.FALSCH,
    });
    const jeId = Object.fromEntries(a.themen.map((t) => [t.id, t]));
    expect(jeId.subnetting).toMatchObject({ richtig: 1, gesamt: 2, niveau: 'mittel' });
    expect(jeId.vpn.niveau).toBe('stark');
    expect(jeId.wlan.niveau).toBe('schwach');
    expect(a).toMatchObject({ richtig: 2, gesamt: 4, quote: 0.5 });
  });

  it('niveauAusQuote hat klare Schwellen', () => {
    expect(niveauAusQuote(0.8)).toBe('stark');
    expect(niveauAusQuote(0.5)).toBe('mittel');
    expect(niveauAusQuote(0.49)).toBe('schwach');
  });
});

describe('erstelleLernplan', () => {
  const auswertung = {
    themen: [
      { id: 'subnetting', titel: 'Subnetting', quote: 0, niveau: 'schwach' },
      { id: 'wlan', titel: 'WLAN', quote: 1, niveau: 'stark' },
      { id: 'datenbanken', titel: 'DB', quote: 0.5, niveau: 'mittel' },
    ],
  };
  const start = new Date(2026, 9, 1);

  it('plant schwache, wichtige Themen zuerst und verbraucht genau die Lerntage', () => {
    const plan = erstelleLernplan(auswertung, { tage: 28, start });
    expect(plan.reihenfolge[0].id).toBe('subnetting');
    expect(plan.reihenfolge.at(-1).id).toBe('wlan');
    const simTage = 4; // 15 % von 28, gerundet
    expect(plan.reihenfolge.reduce((s, t) => s + t.tage, 0)).toBe(28 - simTage);
    expect(plan.reihenfolge[0].tage).toBeGreaterThan(plan.reihenfolge[2].tage);
  });

  it('schneidet in Wochen und endet mit einer Simulationsphase', () => {
    const plan = erstelleLernplan(auswertung, { tage: 28, start });
    expect(plan.wochen[0]).toMatchObject({ nr: 1, art: 'themen' });
    expect(plan.wochen[0].fokus[0]).toBe('subnetting');
    const letzte = plan.wochen.at(-1);
    expect(letzte.art).toBe('simulation');
    expect(letzte.bis.getDate()).toBe(28); // 1. + 27 Tage
  });

  it('kommt mit sehr wenig Zeit aus (keine Simulation, schwächstes Thema bleibt)', () => {
    const plan = erstelleLernplan(auswertung, { tage: 2, start });
    expect(plan.wochen.every((w) => w.art === 'themen')).toBe(true);
    expect(plan.reihenfolge[0].id).toBe('subnetting');
    expect(plan.reihenfolge.reduce((s, t) => s + t.tage, 0)).toBe(2);
  });

  it('aktuelleWoche findet die laufende Woche', () => {
    const plan = erstelleLernplan(auswertung, { tage: 28, start });
    expect(aktuelleWoche(plan, new Date(2026, 9, 9)).nr).toBe(2);
    expect(aktuelleWoche(plan, new Date(2026, 8, 1))).toBeNull();
  });
});

describe('planAusErgebnis', () => {
  const gespeichert = {
    datum: new Date(2026, 9, 1, 15, 30).toISOString(),
    auswertung: { themen: [{ id: 'vpn', titel: 'VPN', quote: 0, niveau: 'schwach' }] },
  };

  it('rechnet vom Testtag bis zum Prüfungstermin', () => {
    expect(planAusErgebnis(gespeichert, '2026-10-29').tage).toBe(28);
  });

  it('nimmt ohne (oder mit vergangenem) Termin den Standardzeitraum', () => {
    expect(planAusErgebnis(gespeichert, null).tage).toBe(STANDARD_TAGE);
    expect(planAusErgebnis(gespeichert, '2026-01-01').tage).toBe(STANDARD_TAGE);
    expect(planAusErgebnis(null, null)).toBeNull();
  });
});

describe('Persistenz', () => {
  beforeEach(() => localStorage.clear());

  it('speichert, lädt und löscht das Ergebnis', () => {
    expect(ladeEinstufung()).toBeNull();
    speichereEinstufung({ themen: [], quote: 0 }, new Date('2026-10-20T10:00:00Z'));
    expect(ladeEinstufung()).toMatchObject({ datum: '2026-10-20T10:00:00.000Z' });
    loescheEinstufung();
    expect(ladeEinstufung()).toBeNull();
  });

  it('ignoriert kaputte Daten', () => {
    localStorage.setItem('ap2_lernapp_einstufung_v1', '{kaputt');
    expect(ladeEinstufung()).toBeNull();
  });

  it('verwirft strukturell kaputte Einstufungen (C4)', () => {
    for (const wert of [
      { datum: 'x', auswertung: { themen: 5 } },
      { datum: '2026-10-20T10:00:00Z', auswertung: { themen: 5 } },
      { datum: 'x', auswertung: { themen: [] } },
    ]) {
      localStorage.setItem('ap2_lernapp_einstufung_v1', JSON.stringify(wert));
      expect(ladeEinstufung()).toBeNull();
    }
  });

  it('klemmt Quoten beim Laden und der Plan bleibt berechenbar (C4)', () => {
    localStorage.setItem(
      'ap2_lernapp_einstufung_v1',
      JSON.stringify({ datum: '2026-10-20T10:00:00Z', auswertung: { themen: [{ id: 'netze', quote: 'x' }, null], quote: 9 } })
    );
    const e = ladeEinstufung();
    expect(e.auswertung.quote).toBe(1);
    expect(e.auswertung.themen).toHaveLength(1);
    expect(e.auswertung.themen[0].quote).toBe(0);
    expect(() => planAusErgebnis(e, '2026-12-01')).not.toThrow();
  });
});
