import { describe, it, expect, beforeEach } from 'vitest';
import { ladeOutbox, speichereOutbox, merkeEintrag, flusheOutbox } from './outbox';

describe('outbox', () => {
  beforeEach(() => localStorage.clear());

  it('koalesziert pro ID – nur der letzte Stand bleibt', () => {
    let liste = merkeEintrag([], 'a', { v: 1 });
    liste = merkeEintrag(liste, 'b', { v: 1 });
    liste = merkeEintrag(liste, 'a', { v: 2 });
    expect(liste).toEqual([
      { id: 'b', entry: { v: 1 } },
      { id: 'a', entry: { v: 2 } },
    ]);
  });

  it('flusht alles bei funktionierendem Kanal', async () => {
    const gesendet = [];
    const liste = [
      { id: 'a', entry: { v: 1 } },
      { id: 'b', entry: { v: 2 } },
    ];
    const r = await flusheOutbox(liste, async (id, entry) => gesendet.push([id, entry.v]));
    expect(r.rest).toEqual([]);
    expect(r.gesendet).toBe(2);
    expect(gesendet).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('bricht beim ersten Fehler ab und behält den Rest in Reihenfolge', async () => {
    const liste = [
      { id: 'a', entry: {} },
      { id: 'b', entry: {} },
      { id: 'c', entry: {} },
    ];
    let n = 0;
    const r = await flusheOutbox(liste, async () => {
      n += 1;
      if (n === 2) throw new Error('offline');
    });
    expect(r.gesendet).toBe(1);
    expect(r.rest.map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('persistiert defensiv (Roundtrip, kaputte Daten → leer)', () => {
    speichereOutbox([{ id: 'a', entry: { v: 1 } }]);
    expect(ladeOutbox()).toEqual([{ id: 'a', entry: { v: 1 } }]);
    speichereOutbox([]);
    expect(localStorage.getItem('ap2_lernapp_outbox_v1')).toBeNull();
    localStorage.setItem('ap2_lernapp_outbox_v1', 'kein json');
    expect(ladeOutbox()).toEqual([]);
    localStorage.setItem('ap2_lernapp_outbox_v1', '[{"kaputt":true},{"id":"x","entry":{}}]');
    expect(ladeOutbox()).toEqual([{ id: 'x', entry: {} }]);
  });

  it('C1: Einträge tragen die Konto-ID und koaleszieren nur je Konto', () => {
    let liste = merkeEintrag([], 'a', { v: 1 }, 1);
    liste = merkeEintrag(liste, 'a', { v: 2 }, 2);
    liste = merkeEintrag(liste, 'a', { v: 3 }, 1);
    expect(liste).toEqual([
      { id: 'a', entry: { v: 2 }, userId: 2 },
      { id: 'a', entry: { v: 3 }, userId: 1 },
    ]);
  });

  it('C1: sendet nie Einträge eines anderen Kontos (und verwirft sie)', async () => {
    const liste = [
      { id: 'a', entry: { v: 1 }, userId: 1 },
      { id: 'b', entry: { v: 2 }, userId: 2 },
      { id: 'c', entry: { v: 3 } }, // Alt-Eintrag ohne Konto-Bindung
    ];
    const gesendet = [];
    const r = await flusheOutbox(liste, async (id) => gesendet.push(id), 2);
    expect(gesendet).toEqual(['b']);
    expect(r).toEqual({ rest: [], gesendet: 1, verworfen: 2, abgelehnt: 0 });
  });

  it('verwirft vom Server endgültig abgelehnte Einträge (C3), behält vorübergehende Fehler', async () => {
    const fehler = (status) => Object.assign(new Error('x'), { status });
    const liste = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, entry: {}, userId: 1 }));
    const antworten = { a: fehler(400), b: null, c: fehler(413), d: fehler(503), e: null };
    const gesendet = [];
    const r = await flusheOutbox(
      liste,
      async (id) => {
        if (antworten[id]) throw antworten[id];
        gesendet.push(id);
      },
      1
    );
    expect(gesendet).toEqual(['b']);
    expect(r.abgelehnt).toBe(2);
    expect(r.rest.map((e) => e.id)).toEqual(['d', 'e']);
  });

  it('401 und Netzfehler gelten als vorübergehend', async () => {
    const liste = [{ id: 'a', entry: {}, userId: 1 }];
    for (const err of [Object.assign(new Error('x'), { status: 401 }), new Error('offline')]) {
      const r = await flusheOutbox(liste, async () => { throw err; }, 1);
      expect(r.rest).toHaveLength(1);
      expect(r.abgelehnt).toBe(0);
    }
  });
});
