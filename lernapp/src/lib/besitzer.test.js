import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BESITZER_KEY,
  NUTZERDATEN_SCHLUESSEL,
  NUTZERDATEN_GELOESCHT_EVENT,
  ladeBesitzer,
  setzeBesitzer,
  loescheLokaleNutzerdaten,
  hatLokaleNutzerdaten,
  entscheideNachLogin,
} from './besitzer';

describe('besitzer', () => {
  beforeEach(() => localStorage.clear());

  it('Besitzer-Roundtrip: Konto setzen, lesen, entfernen', () => {
    expect(ladeBesitzer()).toBeNull();
    setzeBesitzer(7);
    expect(ladeBesitzer()).toEqual({ userId: 7 });
    setzeBesitzer(null);
    expect(ladeBesitzer()).toBeNull();
    expect(localStorage.getItem(BESITZER_KEY)).toBeNull();
  });

  it('kaputter Marker gilt als anonym', () => {
    localStorage.setItem(BESITZER_KEY, '{kaputt');
    expect(ladeBesitzer()).toBeNull();
    localStorage.setItem(BESITZER_KEY, JSON.stringify({ userId: { x: 1 } }));
    expect(ladeBesitzer()).toBeNull();
  });

  it('entscheideNachLogin: anonym → übernehmen, gleich → behalten, fremd → verwerfen', () => {
    expect(entscheideNachLogin(null, 1)).toBe('uebernehmen');
    expect(entscheideNachLogin({ userId: 1 }, 1)).toBe('behalten');
    expect(entscheideNachLogin({ userId: '1' }, 1)).toBe('behalten');
    expect(entscheideNachLogin({ userId: 1 }, 2)).toBe('verwerfen');
  });

  it('loescheLokaleNutzerdaten entfernt alle ap2_lernapp_*-Schlüssel außer Theme', () => {
    for (const k of NUTZERDATEN_SCHLUESSEL) localStorage.setItem(k, '"x"');
    localStorage.setItem('ap2_lernapp_kuenftig_v9', '1'); // unbekannter, später ergänzter Schlüssel
    localStorage.setItem('ap2_lernapp_theme_v1', 'dark');
    localStorage.setItem('fremde_app', 'bleibt');
    setzeBesitzer(3);

    const spy = vi.fn();
    window.addEventListener(NUTZERDATEN_GELOESCHT_EVENT, spy);
    loescheLokaleNutzerdaten();
    window.removeEventListener(NUTZERDATEN_GELOESCHT_EVENT, spy);

    const rest = Object.keys(localStorage).sort();
    expect(rest).toEqual(['ap2_lernapp_theme_v1', 'fremde_app']);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('hatLokaleNutzerdaten: leere Ausgangszustände zählen nicht', () => {
    expect(hatLokaleNutzerdaten()).toBe(false);
    localStorage.setItem('ap2_lernapp_progress_v1', '{}');
    localStorage.setItem(
      'ap2_lernapp_gamification_v1',
      JSON.stringify({ activity: {}, xp: 0, klausurBest: 0 })
    );
    localStorage.setItem('ap2_lernapp_eigene_karten_v1', '[]');
    expect(hatLokaleNutzerdaten()).toBe(false);
    localStorage.setItem('ap2_lernapp_progress_v1', JSON.stringify({ q1: { status: 'gelernt' } }));
    expect(hatLokaleNutzerdaten()).toBe(true);
  });

  it('hatLokaleNutzerdaten erkennt XP, Einstufung und eigene Karten', () => {
    localStorage.setItem('ap2_lernapp_gamification_v1', JSON.stringify({ activity: {}, xp: 5 }));
    expect(hatLokaleNutzerdaten()).toBe(true);
    localStorage.clear();
    localStorage.setItem('ap2_lernapp_einstufung_v1', JSON.stringify({ datum: 'x', auswertung: {} }));
    expect(hatLokaleNutzerdaten()).toBe(true);
    localStorage.clear();
    localStorage.setItem('ap2_lernapp_eigene_karten_v1', JSON.stringify([{ id: 's' }]));
    expect(hatLokaleNutzerdaten()).toBe(true);
  });
});
