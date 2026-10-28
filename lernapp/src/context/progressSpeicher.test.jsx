import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveProgress, SPEICHERFEHLER_EVENT } from './ProgressContext';

describe('saveProgress – Speicherfehler (C4)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('meldet Erfolg per Rückgabewert', () => {
    expect(saveProgress({ a: { status: 'ueben' } })).toBe(true);
    expect(JSON.parse(localStorage.getItem('ap2_lernapp_progress_v1')).a.status).toBe('ueben');
  });

  it('Quota-Fehler: false + Ereignis statt stillem Schlucken', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('voll', 'QuotaExceededError');
    });
    const handler = vi.fn();
    window.addEventListener(SPEICHERFEHLER_EVENT, handler);
    expect(saveProgress({ a: { status: 'ueben' } })).toBe(false);
    window.removeEventListener(SPEICHERFEHLER_EVENT, handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
