import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCountUp } from './useCountUp';

describe('useCountUp', () => {
  // In jsdom ist window.matchMedia nicht verfügbar → „reduzierte Bewegung":
  // der Zielwert wird ohne Animation sofort geliefert (gut fürs Testen/SSR).
  it('liefert ohne ermittelbare Bewegungspräferenz sofort den Zielwert', () => {
    const { result } = renderHook(() => useCountUp(100));
    expect(result.current).toBe(100);
  });

  it('aktualisiert auf einen neuen Zielwert', () => {
    const { result, rerender } = renderHook(({ z }) => useCountUp(z), {
      initialProps: { z: 42 },
    });
    expect(result.current).toBe(42);
    rerender({ z: 87 });
    expect(result.current).toBe(87);
  });
});
