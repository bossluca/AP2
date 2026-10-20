import { describe, it, expect } from 'vitest';
import {
  AUFGABEN_TYPEN,
  erzeugeAufgabe,
  kuerzeIpv6,
  parseZahl,
  pruefeRechenantwort,
} from './rechentrainer';

function rngAus(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('erzeugeAufgabe', () => {
  it('erzeugt für jeden Typ gültige Aufgaben, deren Lösung die eigene Prüfung besteht', () => {
    const rng = rngAus(42);
    for (const t of AUFGABEN_TYPEN) {
      for (let i = 0; i < 25; i += 1) {
        const a = erzeugeAufgabe([t.id], rng);
        expect(a.typ).toBe(t.id);
        expect(a.frage.length).toBeGreaterThan(10);
        expect(a.loesungsweg.length).toBeGreaterThan(5);
        expect(pruefeRechenantwort(a, String(a.loesung))).toBe(true);
      }
    }
  });

  it('ist mit gleichem Seed reproduzierbar und mischt ohne Typvorgabe', () => {
    expect(erzeugeAufgabe([], rngAus(3))).toEqual(erzeugeAufgabe([], rngAus(3)));
    const rng = rngAus(7);
    const typen = new Set(Array.from({ length: 60 }, () => erzeugeAufgabe([], rng).typ));
    expect(typen.size).toBeGreaterThan(5);
  });
});

describe('Rechenwege (Stichproben)', () => {
  it('Hosts: /24 → 254', () => {
    const rng = () => 0.4; // ganz(20,30) → 20 + floor(0.4*11)=24
    expect(erzeugeAufgabe(['hosts'], rng).loesung).toBe(254);
  });

  it('Netzadresse/Broadcast stimmen mit der Blockgröße', () => {
    for (let i = 0; i < 30; i += 1) {
      const a = erzeugeAufgabe(['netzadresse'], rngAus(i + 10));
      const m = a.frage.match(/\*\*([\d.]+)\/(\d+)\*\*/);
      const [ip, praefix] = [m[1].split('.').map(Number), Number(m[2])];
      const z = ip.reduce((acc, o) => acc * 256 + o, 0);
      const block = 2 ** (32 - praefix);
      const loes = String(a.loesung).split('.').map(Number).reduce((acc, o) => acc * 256 + o, 0);
      if (/Netzadresse/.test(a.frage)) expect(loes).toBe(z - (z % block));
      else expect(loes).toBe(z - (z % block) + block - 1);
    }
  });

  it('kuerzeIpv6 nach RFC 5952', () => {
    expect(kuerzeIpv6('2001:0db8:0000:0000:0000:ff00:0042:8329'.split(':'))).toBe('2001:db8::ff00:42:8329');
    expect(kuerzeIpv6('2001:0db8:0000:0001:0000:0000:0000:0001'.split(':'))).toBe('2001:db8:0:1::1');
    expect(kuerzeIpv6('2001:0db8:0001:0000:0001:0000:0001:0001'.split(':'))).toBe('2001:db8:1:0:1:0:1:1');
    expect(kuerzeIpv6('2001:0db8:0000:0000:0001:0000:0000:0000'.split(':'))).toBe('2001:db8:0:0:1::');
  });
});

describe('Antwortprüfung', () => {
  it('parseZahl versteht deutsche und englische Schreibweisen', () => {
    expect(parseZahl('1.234,56 €')).toBe(1234.56);
    expect(parseZahl('1,5')).toBe(1.5);
    expect(parseZahl('1.5')).toBe(1.5);
    expect(parseZahl('12.000')).toBe(12000);
    expect(parseZahl('/26')).toBe(26);
    expect(parseZahl('abc')).toBeNull();
  });

  it('Zahlen mit Toleranz, Text normalisiert', () => {
    expect(pruefeRechenantwort({ art: 'zahl', loesung: 100, toleranz: 0.01 }, '100,9')).toBe(true);
    expect(pruefeRechenantwort({ art: 'zahl', loesung: 100, toleranz: 0.01 }, '102')).toBe(false);
    expect(pruefeRechenantwort({ art: 'zahl', loesung: 254, toleranz: 0 }, '253')).toBe(false);
    expect(pruefeRechenantwort({ art: 'text', typ: 'zahlensysteme', loesung: 'FF' }, '0xff')).toBe(true);
    expect(pruefeRechenantwort({ art: 'text', typ: 'zahlensysteme', loesung: '00101010' }, '101010')).toBe(true);
    expect(pruefeRechenantwort({ art: 'text', typ: 'ipv6', loesung: '2001:db8::1' }, '2001:DB8::1 ')).toBe(true);
    expect(pruefeRechenantwort({ art: 'text', typ: 'ipv6', loesung: '2001:db8::1' }, '2001:db8:0::1')).toBe(false);
  });
});
