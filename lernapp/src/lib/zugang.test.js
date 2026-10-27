import { describe, it, expect, beforeEach } from 'vitest';
import {
  bestimmeZugang,
  merkeLoginPflicht,
  ladeLoginPflichtBekannt,
  LOGINPFLICHT_KEY,
} from './zugang';
import { loescheLokaleNutzerdaten } from './besitzer';

const basis = { bereit: true, konfig: null, user: null, besitzer: null, loginPflichtBekannt: false };
const z = (p) => bestimmeZugang({ ...basis, ...p });

describe('bestimmeZugang (C9)', () => {
  it('angemeldet → app, auch bei Login-Pflicht', () => {
    expect(z({ user: { id: 1 }, konfig: { loginPflicht: true } })).toBe('app');
  });

  it('solange me()/Konfiguration laufen → laedt', () => {
    expect(z({ bereit: false })).toBe('laedt');
    expect(z({ konfig: undefined })).toBe('laedt');
  });

  it('Server erreichbar + Login-Pflicht + keine Sitzung → gate (auch mit Besitzer-Marker)', () => {
    expect(z({ konfig: { loginPflicht: true } })).toBe('gate');
    expect(z({ konfig: { loginPflicht: true }, besitzer: { userId: 1 } })).toBe('gate');
  });

  it('Server erreichbar ohne Login-Pflicht → app (lokal nutzbar)', () => {
    expect(z({ konfig: { loginPflicht: false } })).toBe('app');
    expect(z({ konfig: { registrierung: 'open' } })).toBe('app');
  });

  it('kein Backend und nie angemeldet → app (rein lokal wie bisher)', () => {
    expect(z({})).toBe('app');
  });

  it('offline nach früherem Login (Besitzer-Marker) → app', () => {
    expect(z({ besitzer: { userId: 7 }, loginPflichtBekannt: true })).toBe('app');
  });

  it('offline, abgemeldet, Instanz als login-pflichtig bekannt → gate', () => {
    expect(z({ loginPflichtBekannt: true })).toBe('gate');
  });
});

describe('Geräte-Merker Login-Pflicht', () => {
  beforeEach(() => localStorage.clear());

  it('Roundtrip und übersteht das Aufräumen nach Logout', () => {
    expect(ladeLoginPflichtBekannt()).toBe(false);
    merkeLoginPflicht(true);
    loescheLokaleNutzerdaten();
    expect(localStorage.getItem(LOGINPFLICHT_KEY)).toBe('1');
    expect(ladeLoginPflichtBekannt()).toBe(true);
    merkeLoginPflicht(false);
    expect(ladeLoginPflichtBekannt()).toBe(false);
  });
});
