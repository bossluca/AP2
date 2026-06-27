import { describe, it, expect } from 'vitest';
import { baueLernsession, STANDARD_UMFANG } from './lernsession';

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
});
