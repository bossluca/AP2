import { describe, it, expect } from 'vitest';
import { baueTagesplan } from './tagesplan';

const jetzt = new Date('2026-07-04T10:00:00');

/** n Objekte mit fortlaufenden IDs. */
const objekte = (n) => Array.from({ length: n }, (_, i) => ({ id: `o${i}` }));

describe('baueTagesplan', () => {
  it('null ohne Termin, bei ungültigem Datum und am/nach dem Prüfungstag', () => {
    expect(baueTagesplan(objekte(5), {}, null, jetzt)).toBeNull();
    expect(baueTagesplan(objekte(5), {}, 'quatsch', jetzt)).toBeNull();
    expect(baueTagesplan(objekte(5), {}, '2026-07-04', jetzt)).toBeNull();
    expect(baueTagesplan(objekte(5), {}, '2026-06-01', jetzt)).toBeNull();
  });

  it('verteilt neue Objekte auf die Lerntage (letzter Tag bleibt frei)', () => {
    // 20 neue Objekte, 5 Tage → 4 Lerntage → 5 neue/Tag.
    const plan = baueTagesplan(objekte(20), {}, '2026-07-09', jetzt);
    expect(plan.tage).toBe(5);
    expect(plan.neu).toBe(20);
    expect(plan.neuProTag).toBe(5);
    expect(plan.wiederholungenHeute).toBe(0);
    expect(plan.pensumHeute).toBe(5);
  });

  it('zählt fällige geübte Objekte als Wiederholungen, nicht als neu', () => {
    const progress = {
      o0: { reps: 2, due: '2026-07-01T00:00:00.000Z' }, // fällig
      o1: { reps: 1, due: '2026-08-01T00:00:00.000Z' }, // noch nicht fällig
      o2: { status: 'gelernt', due: '2026-07-03T00:00:00.000Z' }, // geübt + fällig
    };
    const plan = baueTagesplan(objekte(4), progress, '2026-07-14', jetzt);
    expect(plan.wiederholungenHeute).toBe(2); // o0 + o2
    expect(plan.neu).toBe(1); // o3
  });

  it('Einschätzung: locker / gut / sportlich nach Tagespensum', () => {
    expect(baueTagesplan(objekte(10), {}, '2026-07-09', jetzt).einschaetzung).toBe('locker');
    expect(baueTagesplan(objekte(100), {}, '2026-07-09', jetzt).einschaetzung).toBe('gut');
    const stramm = baueTagesplan(objekte(500), {}, '2026-07-09', jetzt);
    expect(stramm.einschaetzung).toBe('sportlich');
    expect(stramm.schaffbarBisTermin).toBe(false);
  });

  it('Pensum heute übersteigt nie die tatsächlich vorhandenen neuen Objekte', () => {
    // 2 neue, 10 Tage → neuProTag 1; pensum = min(neu, neuProTag) = 1.
    const plan = baueTagesplan(objekte(2), {}, '2026-07-14', jetzt);
    expect(plan.pensumHeute).toBe(1);
  });
});
