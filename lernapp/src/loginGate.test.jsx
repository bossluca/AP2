import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { ThemeProvider } from './context/ThemeContext';
import { erzeugeFakeBackend } from './test/fakeBackend';
import { holeExamDaten, setzeExamDaten, examDatenGeladen } from './data/examDaten';
import { EXAMDATEN_CACHE } from './lib/examdatenCache';

/**
 * C9 – Login-Pflicht: Gate zeigt ohne Sitzung nur die Konto-Seite, lädt keine
 * Lerninhalte; nach dem Login volle App; Logout → Gate + Cache gelöscht.
 * Ohne Backend bleibt das rein lokale Verhalten.
 */

const original = holeExamDaten();
let backend;

function renderApp(hash = '#/') {
  window.location.hash = hash;
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const lernNavSichtbar = () => screen.queryAllByRole('link', { name: /statistik/i }).length > 0;

describe('C9 – Login-Gate', () => {
  beforeEach(() => {
    localStorage.clear();
    setzeExamDaten(null); // wie im Browser: Daten sind nicht im Start-Bundle
    backend = erzeugeFakeBackend({ konfig: { registrierung: 'invite', loginPflicht: true } });
    backend.legeKontoAn('a@x.de');
    vi.stubGlobal('fetch', vi.fn(backend.fetch));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setzeExamDaten(original);
  });

  it('ohne Sitzung: nur Konto-Seite, keine Lernnavigation, keine Daten geladen', async () => {
    renderApp('#/');
    expect(await screen.findByRole('button', { name: 'Jetzt anmelden' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/konto');
    expect(lernNavSichtbar()).toBe(false);
    expect(screen.getByText(/nur mit Konto nutzbar/)).toBeInTheDocument();
    expect(examDatenGeladen()).toBe(false);
    expect(localStorage.getItem('ap2_lernapp_loginpflicht_v1')).toBe('1');
  });

  it('Lernseiten per Direktlink leiten aufs Gate um', async () => {
    renderApp('#/lernzettel');
    expect(await screen.findByRole('button', { name: 'Jetzt anmelden' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/konto');
    expect(examDatenGeladen()).toBe(false);
  });

  it('Einladungslink öffnet im Gate die Registrierung mit Code', async () => {
    renderApp('#/konto?einladung=ABCD-EFGH-JKLM');
    expect(await screen.findByLabelText('Einladungscode')).toHaveValue('ABCD-EFGH-JKLM');
    expect(examDatenGeladen()).toBe(false);
  });

  it('Login im Gate → volle App, Daten werden geladen; Logout → Gate + Cache gelöscht', async () => {
    const cacheDelete = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', { delete: cacheDelete });
    const ue = userEvent.setup();
    renderApp('#/konto');
    await ue.type(await screen.findByLabelText('E-Mail'), 'a@x.de');
    await ue.type(screen.getByLabelText(/Passwort/), 'geheim1234');
    await ue.click(screen.getByRole('button', { name: 'Jetzt anmelden' }));

    await waitFor(() => expect(examDatenGeladen()).toBe(true), { timeout: 10000 });
    expect(await screen.findByText(/Angemeldet als/)).toBeInTheDocument();
    await waitFor(() => expect(lernNavSichtbar()).toBe(true));

    await ue.click(screen.getByRole('button', { name: 'Abmelden' }));
    expect(await screen.findByRole('button', { name: 'Jetzt anmelden' })).toBeInTheDocument();
    expect(lernNavSichtbar()).toBe(false);
    expect(cacheDelete).toHaveBeenCalledWith(EXAMDATEN_CACHE);
  });

  it('Recovery-Code nach Registrierung übersteht den Wechsel Gate → App', async () => {
    const ue = userEvent.setup();
    renderApp('#/konto?einladung=ABCD-EFGH-JKLM');
    await ue.type(await screen.findByLabelText('E-Mail'), 'neu@x.de');
    await ue.type(screen.getByLabelText(/^Passwort \(mind/), 'geheim1234');
    await ue.type(screen.getByLabelText('Passwort bestätigen'), 'geheim1234');
    await ue.click(screen.getByRole('checkbox'));
    await ue.click(screen.getByRole('button', { name: 'Konto erstellen' }));
    await waitFor(() => expect(lernNavSichtbar()).toBe(true), { timeout: 10000 });
    expect(await screen.findByText('AAAA-BBBB-CCCC-DDDD')).toBeInTheDocument();
  });
});

describe('C9 – Server nicht erreichbar', () => {
  beforeEach(() => {
    localStorage.clear();
    setzeExamDaten(null);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    setzeExamDaten(original);
  });

  it('ohne Backend und ohne früheren Login: rein lokal wie bisher (volle App)', async () => {
    renderApp('#/');
    await waitFor(() => expect(lernNavSichtbar()).toBe(true), { timeout: 10000 });
    expect(examDatenGeladen()).toBe(true);
  });

  it('offline nach früherem Login (Besitzer-Marker): App läuft mit lokalen Daten', async () => {
    localStorage.setItem('ap2_lernapp_loginpflicht_v1', '1');
    localStorage.setItem('ap2_lernapp_owner_v1', JSON.stringify({ userId: 1 }));
    renderApp('#/');
    await waitFor(() => expect(lernNavSichtbar()).toBe(true), { timeout: 10000 });
  });

  it('offline und abgemeldet auf einer login-pflichtigen Instanz: Gate', async () => {
    localStorage.setItem('ap2_lernapp_loginpflicht_v1', '1');
    renderApp('#/');
    expect(await screen.findByRole('button', { name: 'Jetzt anmelden' })).toBeInTheDocument();
    expect(screen.getByText(/Server ist gerade nicht erreichbar/)).toBeInTheDocument();
    expect(lernNavSichtbar()).toBe(false);
    expect(examDatenGeladen()).toBe(false);
  });
});
