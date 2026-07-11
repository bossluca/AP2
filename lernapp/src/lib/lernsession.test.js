import { describe, it, expect } from 'vitest';
import {
  baueLernsession,
  baueSchwaechenSession,
  normalisiereSessionUmfang,
  STANDARD_UMFANG,
} from './lernsession';

/** Baut Helfer aus einfachen Maps. */
function helfer({ status = {}, due = {}, box = {} } = {}) {
  return {
    getStatus: (id) => status[id] ?? null,
    isDue: (id) => due[id] === true,
    getEntry: (id) => (box[id] != null ? { box: box[id] } : null),
  };
}

const obj = (id) => ({ id });

describe('baueLernsession', () => {
  it('normalisiert die auswählbare Sessionlänge', () => {
    expect(normalisiereSessionUmfang('5')).toBe(5);
    expect(normalisiereSessionUmfang(20)).toBe(20);
    expect(normalisiereSessionUmfang('7')).toBe(STANDARD_UMFANG);
  });

  it('lässt bereits Gelerntes, das nicht fällig ist, weg', () => {
    const objekte = [obj('a'), obj('b')];
    const h = helfer({ status: { a: 'gelernt', b: 'gelernt' }, due: { a: false, b: false } });
    expect(baueLernsession(objekte, h)).toHaveLength(0);
  });

  it('priorisiert „üben" vor fällig vor neu', () => {
    const objekte = [obj('neu1'), obj('faellig1'), obj('ueben1')];
    const h = helfer({
      status: { ueben1: 'ueben' },
      due: { faellig1: true },
      box: { faellig1: 2 },
    });
    const session = baueLernsession(objekte, h, { rng: () => 0 });
    expect(session.map((o) => o.id)).toEqual(['ueben1', 'faellig1', 'neu1']);
  });

  it('nimmt neue Objekte auf (nie gesehen)', () => {
    const objekte = [obj('x')];
    const session = baueLernsession(objekte, helfer());
    expect(session.map((o) => o.id)).toEqual(['x']);
  });

  it('bezieht fällige Wiederholungen von gelernten Objekten ein', () => {
    const objekte = [obj('g')];
    const h = helfer({ status: { g: 'gelernt' }, due: { g: true }, box: { g: 3 } });
    expect(baueLernsession(objekte, h).map((o) => o.id)).toEqual(['g']);
  });

  it('deckelt die Länge auf den Umfang', () => {
    const objekte = Array.from({ length: 25 }, (_, i) => obj(`n${i}`));
    expect(baueLernsession(objekte, helfer())).toHaveLength(STANDARD_UMFANG);
    expect(baueLernsession(objekte, helfer(), { umfang: 5 })).toHaveLength(5);
  });

  it('sortiert neue Objekte leicht → schwer (unbekannt = mittel)', () => {
    const objekte = [
      { id: 's', schwierigkeit: 3 },
      { id: 'l', schwierigkeit: 1 },
      { id: 'o' }, // ohne Angabe → wie mittel (2)
      { id: 'm', schwierigkeit: 2 },
    ];
    const session = baueLernsession(objekte, helfer(), { rng: () => 0 });
    const stufen = session.map((x) => x.schwierigkeit ?? 2);
    expect(stufen).toEqual([...stufen].sort((a, b) => a - b)); // aufsteigend
    expect(session[0].id).toBe('l');
    expect(session[session.length - 1].id).toBe('s');
  });
});

const tagObj = (id, tags) => ({ id, tags });

describe('baueSchwaechenSession', () => {
  it('priorisiert Objekte aus schwachen Themen', () => {
    const objekte = [
      tagObj('netz1', ['Netzwerk/IP-Adressierung']),
      tagObj('sql1', ['Datenbank/SQL/ER-Modell']),
      tagObj('netz2', ['Netzwerk/IP-Adressierung']),
    ];
    const session = baueSchwaechenSession(objekte, helfer(), {
      schwachTags: ['Netzwerk/IP-Adressierung'],
      umfang: 2,
      rng: () => 0,
    });
    expect(session.map((o) => o.id).sort()).toEqual(['netz1', 'netz2']);
  });

  it('hält innerhalb der schwachen Themen die Reihenfolge üben > fällig > neu', () => {
    const objekte = [
      tagObj('neu', ['T']),
      tagObj('faellig', ['T']),
      tagObj('ueben', ['T']),
    ];
    const h = helfer({ status: { ueben: 'ueben' }, due: { faellig: true }, box: { faellig: 2 } });
    const session = baueSchwaechenSession(objekte, h, { schwachTags: ['T'], rng: () => 0 });
    expect(session.map((o) => o.id)).toEqual(['ueben', 'faellig', 'neu']);
  });

  it('füllt mit normaler Session auf, wenn der Schwächen-Pool zu klein ist', () => {
    const objekte = [
      tagObj('schwach', ['T']),
      tagObj('rest1', ['X']),
      tagObj('rest2', ['Y']),
    ];
    const session = baueSchwaechenSession(objekte, helfer(), {
      schwachTags: ['T'],
      umfang: 3,
      rng: () => 0,
    });
    expect(session).toHaveLength(3);
    expect(session[0].id).toBe('schwach'); // Schwäche zuerst
    expect(session.map((o) => o.id).sort()).toEqual(['rest1', 'rest2', 'schwach']);
  });

  it('ohne schwache Tags = reine Auffüll-Session (wie normal)', () => {
    const objekte = [tagObj('a', ['T']), tagObj('b', ['X'])];
    const session = baueSchwaechenSession(objekte, helfer(), { schwachTags: [] });
    expect(session.map((o) => o.id).sort()).toEqual(['a', 'b']);
  });

  it('deckelt auf den Umfang', () => {
    const objekte = Array.from({ length: 25 }, (_, i) => tagObj(`n${i}`, ['T']));
    expect(
      baueSchwaechenSession(objekte, helfer(), { schwachTags: ['T'], umfang: 6 })
    ).toHaveLength(6);
  });
});
