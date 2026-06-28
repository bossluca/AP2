import { describe, it, expect, beforeEach } from 'vitest';
import { ladeResume, speichereResume, loescheResume, RESUME_TTL_MS } from './resume';

describe('resume', () => {
  beforeEach(() => localStorage.clear());

  it('null, wenn nichts gespeichert', () => {
    expect(ladeResume()).toBeNull();
  });

  it('speichert und lädt einen Eintrag', () => {
    speichereResume({ to: '/lernen?modus=heute', titel: 'Heute lernen' });
    const e = ladeResume();
    expect(e.to).toBe('/lernen?modus=heute');
    expect(e.titel).toBe('Heute lernen');
    expect(typeof e.ts).toBe('string');
  });

  it('lehnt unvollständige Eingaben ab', () => {
    expect(speichereResume({ to: '/x' })).toBeNull(); // titel fehlt
    expect(speichereResume(null)).toBeNull();
  });

  it('abgelaufener Eintrag wird als null geladen', () => {
    const alt = new Date(Date.now() - RESUME_TTL_MS - 1000).toISOString();
    speichereResume({ to: '/lernen', titel: 'Alt', ts: alt });
    expect(ladeResume()).toBeNull();
  });

  it('frischer Eintrag innerhalb der TTL bleibt gültig', () => {
    const fast = new Date(Date.now() - RESUME_TTL_MS + 60_000).toISOString();
    speichereResume({ to: '/lernen', titel: 'Frisch', ts: fast });
    expect(ladeResume()).not.toBeNull();
  });

  it('loescheResume entfernt den Eintrag', () => {
    speichereResume({ to: '/lernen', titel: 'X' });
    loescheResume();
    expect(ladeResume()).toBeNull();
  });

  it('robust gegen kaputten JSON', () => {
    localStorage.setItem('ap2_lernapp_resume_v1', '{nicht json');
    expect(ladeResume()).toBeNull();
  });

  it('ts in der Zukunft (negatives Alter) gilt als ungültig', () => {
    const zukunft = new Date(Date.now() + 60_000).toISOString();
    speichereResume({ to: '/lernen', titel: 'Zukunft', ts: zukunft });
    expect(ladeResume()).toBeNull();
  });
});
