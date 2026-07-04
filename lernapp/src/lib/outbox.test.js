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
});
