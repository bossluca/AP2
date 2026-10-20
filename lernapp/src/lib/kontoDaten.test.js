import { describe, it, expect, vi } from 'vitest';
import { mergeKontoDaten, meldeKontoDatenAenderung, KONTODATEN_EVENT } from './kontoDaten';

const e = (datum) => ({ datum, auswertung: { themen: [] } });
const s = (id) => ({ id, name: id, karten: [] });

describe('mergeKontoDaten', () => {
  it('übernimmt die jüngere Einstufung und vereinigt Stapel', () => {
    const r = mergeKontoDaten(
      { einstufung: e('2026-10-01T00:00:00Z'), eigeneKarten: [s('a')] },
      { einstufung: { wert: e('2026-10-10T00:00:00Z') }, eigeneKarten: { wert: [s('a'), s('b')] } }
    );
    expect(r.einstufung.datum).toBe('2026-10-10T00:00:00Z');
    expect(r.eigeneKarten.map((x) => x.id)).toEqual(['a', 'b']);
    expect(r).toMatchObject({ aenderungLokal: true, aenderungServer: false });
  });

  it('schiebt lokale Daten auf ein leeres Konto', () => {
    const r = mergeKontoDaten({ einstufung: e('2026-10-01T00:00:00Z'), eigeneKarten: [s('a')] }, {});
    expect(r).toMatchObject({ aenderungLokal: false, aenderungServer: true });
  });

  it('meldet keine Änderung, wenn beide gleich sind', () => {
    const lokal = { einstufung: e('2026-10-01T00:00:00Z'), eigeneKarten: [s('a')] };
    const r = mergeKontoDaten(lokal, { einstufung: { wert: lokal.einstufung }, eigeneKarten: { wert: [s('a')] } });
    expect(r).toMatchObject({ aenderungLokal: false, aenderungServer: false });
  });

  it('meldeKontoDatenAenderung feuert ein Window-Event', () => {
    const spy = vi.fn();
    window.addEventListener(KONTODATEN_EVENT, spy);
    meldeKontoDatenAenderung('eigeneKarten');
    window.removeEventListener(KONTODATEN_EVENT, spy);
    expect(spy.mock.calls[0][0].detail).toEqual({ schluessel: 'eigeneKarten' });
  });
});
