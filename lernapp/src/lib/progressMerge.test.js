import { describe, it, expect } from 'vitest';
import { mergeProgress } from './progressMerge';

describe('mergeProgress', () => {
  const alt = { status: 'ueben', updatedAt: '2026-01-01T10:00:00.000Z' };
  const neu = { status: 'gelernt', updatedAt: '2026-02-01T10:00:00.000Z' };

  it('übernimmt Einträge, die lokal fehlen', () => {
    expect(mergeProgress({}, { a: neu })).toEqual({ a: neu });
  });

  it('jüngerer updatedAt gewinnt – in beide Richtungen', () => {
    expect(mergeProgress({ a: alt }, { a: neu }).a).toEqual(neu);
    expect(mergeProgress({ a: neu }, { a: alt }).a).toEqual(neu);
  });

  it('ohne Zeitstempel bleibt der vorhandene Eintrag stehen', () => {
    const ohne = { status: 'gelernt' };
    expect(mergeProgress({ a: alt }, { a: ohne }).a).toEqual(alt);
  });

  it('nutzt lastSeen als Fallback-Zeitstempel', () => {
    const viaLastSeen = { status: 'gelernt', lastSeen: '2026-03-01T10:00:00.000Z' };
    expect(mergeProgress({ a: alt }, { a: viaLastSeen }).a).toEqual(viaLastSeen);
  });

  it('ist defensiv bei kaputten Eingaben', () => {
    expect(mergeProgress(null, null)).toEqual({});
    expect(mergeProgress({ a: alt }, { b: null, c: 'quatsch' })).toEqual({ a: alt });
    // Original wird nicht mutiert.
    const basis = { a: alt };
    mergeProgress(basis, { a: neu });
    expect(basis.a).toEqual(alt);
  });
});
