import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { ProgressProvider, useProgress } from './ProgressContext';
import { useGamification } from './GamificationContext';
import KontoDatenSync from '../components/KontoDatenSync';
import UebernahmeDialog from '../components/UebernahmeDialog';
import { erzeugeFakeBackend } from '../test/fakeBackend';

/**
 * C1 – Daten zwischen Konten trennen. Integrationstests mit echten Providern
 * (Auth, Progress, Gamification, KontoDatenSync) gegen ein In-Memory-Backend.
 */

let backend;

function Sonde() {
  const { user, login, logout, deleteAccount } = useAuth();
  const { progress, recordReview } = useProgress();
  const { gami, recordXp } = useGamification();
  return (
    <div>
      <p data-testid="user">{user ? user.email : 'abgemeldet'}</p>
      <p data-testid="anzahl">{Object.keys(progress).length}</p>
      <p data-testid="xp">{gami.xp}</p>
      <button onClick={() => login('a@x.de', 'geheim1234')}>Login A</button>
      <button onClick={() => login('b@x.de', 'geheim1234')}>Login B</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => deleteAccount()}>Löschen</button>
      <button
        onClick={() => {
          recordReview('frage_a', 3);
          recordXp(50);
        }}
      >
        Lernen
      </button>
    </div>
  );
}

function renderApp() {
  return render(
    <AuthProvider>
      <ProgressProvider>
        <Sonde />
        <KontoDatenSync />
        <UebernahmeDialog />
      </ProgressProvider>
    </AuthProvider>
  );
}

const nutzerdatenSchluessel = () =>
  Object.keys(localStorage).filter((k) => k.startsWith('ap2_lernapp_') && k !== 'ap2_lernapp_theme_v1');

/** Stand, den Konto A (id 1) auf dem Gerät hinterlassen hat (ohne Logout). */
function hinterlasseDatenVonA(aId) {
  localStorage.setItem('ap2_lernapp_owner_v1', JSON.stringify({ userId: aId }));
  localStorage.setItem(
    'ap2_lernapp_progress_v1',
    JSON.stringify({ frage_a: { status: 'gelernt', updatedAt: '2026-10-01T00:00:00.000Z' } })
  );
  localStorage.setItem(
    'ap2_lernapp_outbox_v1',
    JSON.stringify([{ id: 'frage_a', entry: { status: 'gelernt' }, userId: aId }])
  );
  localStorage.setItem(
    'ap2_lernapp_gamification_v1',
    JSON.stringify({ activity: { '2026-10-01': 3 }, xp: 99, klausurBest: 0 })
  );
  localStorage.setItem(
    'ap2_lernapp_eigene_karten_v1',
    JSON.stringify([{ id: 'stapel_a', name: 'Von A', erstellt: '2026-10-01T00:00:00.000Z', karten: [] }])
  );
}

describe('C1 – Daten zwischen Konten trennen', () => {
  let a;
  let b;
  beforeEach(() => {
    localStorage.clear();
    backend = erzeugeFakeBackend();
    a = backend.legeKontoAn('a@x.de');
    b = backend.legeKontoAn('b@x.de');
    vi.stubGlobal('fetch', vi.fn(backend.fetch));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('A lernt → Logout räumt lokal auf → B sieht nichts von A, Bs Konto bekommt nichts von A', async () => {
    const ue = userEvent.setup();
    localStorage.setItem('ap2_lernapp_theme_v1', 'dark');
    renderApp();
    await ue.click(screen.getByText('Login A'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));
    await ue.click(screen.getByText('Lernen'));
    await waitFor(() => expect(screen.getByTestId('anzahl')).toHaveTextContent('1'));
    await waitFor(() => expect(backend.speicherVon(a.id).progress.frage_a).toBeTruthy());

    await ue.click(screen.getByText('Logout'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('abgemeldet'));
    expect(screen.getByTestId('anzahl')).toHaveTextContent('0');
    expect(screen.getByTestId('xp')).toHaveTextContent('0');
    expect(nutzerdatenSchluessel()).toEqual([]);
    expect(localStorage.getItem('ap2_lernapp_theme_v1')).toBe('dark'); // Theme bleibt

    await ue.click(screen.getByText('Login B'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('b@x.de'));
    // keine Rückfrage: lokal liegt nach dem Logout nichts mehr
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(backend.requestsVon(b.id).some((r) => r.pfad === '/progress')).toBe(true)
    );
    expect(screen.getByTestId('anzahl')).toHaveTextContent('0');
    expect(screen.getByTestId('xp')).toHaveTextContent('0');
    expect(backend.speicherVon(b.id).progress).toEqual({});
    const unterB = JSON.stringify(backend.requestsVon(b.id));
    expect(unterB).not.toContain('frage_a');
    expect(JSON.parse(localStorage.getItem('ap2_lernapp_owner_v1'))).toEqual({ userId: b.id });
  });

  it('Kontowechsel ohne Logout: As Reste (Fortschritt, Outbox, XP, Karten) gehen nie in Bs Konto', async () => {
    hinterlasseDatenVonA(a.id);
    const ue = userEvent.setup();
    renderApp();
    await ue.click(screen.getByText('Login B'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('b@x.de'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(backend.requestsVon(b.id).some((r) => r.pfad === '/daten' && r.method === 'GET')).toBe(true)
    );
    await waitFor(() =>
      expect(backend.requestsVon(b.id).some((r) => r.pfad === '/gamification')).toBe(true)
    );
    // Lokal ist As Stand weg …
    expect(screen.getByTestId('anzahl')).toHaveTextContent('0');
    expect(screen.getByTestId('xp')).toHaveTextContent('0');
    expect(localStorage.getItem('ap2_lernapp_eigene_karten_v1')).toBeNull();
    expect(localStorage.getItem('ap2_lernapp_outbox_v1')).toBeNull();
    // … und unter B kam nichts davon an: kein Merge, kein Outbox-PUT, keine XP, kein Stapel.
    const unterB = backend.requestsVon(b.id);
    expect(unterB.some((r) => r.pfad === '/progress/merge')).toBe(false);
    expect(JSON.stringify(unterB)).not.toContain('frage_a');
    expect(JSON.stringify(unterB)).not.toContain('stapel_a');
    expect(unterB.filter((r) => r.pfad === '/gamification' && r.method === 'PUT').every((r) => !(r.body.xp > 0))).toBe(true);
    expect(backend.speicherVon(b.id).progress).toEqual({});
  });

  it('anonym lernen → Login mit „Ja“ übernimmt den Stand ins Konto', async () => {
    localStorage.setItem('ap2_lernapp_progress_v1', JSON.stringify({ frage_anon: { status: 'gelernt' } }));
    const ue = userEvent.setup();
    renderApp();
    await ue.click(screen.getByText('Login A'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    // vor der Antwort gilt niemand als angemeldet, nichts wird gesendet
    expect(screen.getByTestId('user')).toHaveTextContent('abgemeldet');
    expect(backend.requestsVon(a.id).some((r) => r.pfad === '/progress/merge')).toBe(false);

    await ue.click(screen.getByRole('button', { name: /Ja, übernehmen/ }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));
    await waitFor(() => expect(backend.speicherVon(a.id).progress.frage_anon).toBeTruthy());
    expect(screen.getByTestId('anzahl')).toHaveTextContent('1');
    expect(JSON.parse(localStorage.getItem('ap2_lernapp_owner_v1'))).toEqual({ userId: a.id });
  });

  it('anonym lernen → Login mit „Nein“ verwirft lokal und übernimmt nichts', async () => {
    localStorage.setItem('ap2_lernapp_progress_v1', JSON.stringify({ frage_anon: { status: 'gelernt' } }));
    const ue = userEvent.setup();
    renderApp();
    await ue.click(screen.getByText('Login A'));
    await ue.click(await screen.findByRole('button', { name: /Nein, verwerfen/ }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));
    await waitFor(() =>
      expect(backend.requestsVon(a.id).some((r) => r.pfad === '/progress' && r.method === 'GET')).toBe(true)
    );
    expect(screen.getByTestId('anzahl')).toHaveTextContent('0');
    expect(backend.requestsVon(a.id).some((r) => r.pfad === '/progress/merge')).toBe(false);
    expect(backend.speicherVon(a.id).progress).toEqual({});
    expect(localStorage.getItem('ap2_lernapp_progress_v1')).toBeNull();
  });

  it('gleiches Konto erneut anmelden behält den lokalen Stand (ohne Rückfrage)', async () => {
    localStorage.setItem('ap2_lernapp_owner_v1', JSON.stringify({ userId: a.id }));
    localStorage.setItem('ap2_lernapp_progress_v1', JSON.stringify({ frage_offline: { status: 'ueben' } }));
    const ue = userEvent.setup();
    renderApp();
    await ue.click(screen.getByText('Login A'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(backend.speicherVon(a.id).progress.frage_offline).toBeTruthy());
    expect(screen.getByTestId('anzahl')).toHaveTextContent('1');
  });

  it('Outbox: fehlgeschlagene Writes tragen die Konto-ID; Logout sendet sie vorher', async () => {
    const ue = userEvent.setup();
    renderApp();
    await ue.click(screen.getByText('Login A'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));
    await waitFor(() =>
      expect(backend.requestsVon(a.id).some((r) => r.pfad === '/progress' && r.method === 'GET')).toBe(true)
    );
    backend.zustand.putsFehlschlagen = true;
    await ue.click(screen.getByText('Lernen'));
    await waitFor(() => expect(localStorage.getItem('ap2_lernapp_outbox_v1')).not.toBeNull());
    const outbox = JSON.parse(localStorage.getItem('ap2_lernapp_outbox_v1'));
    expect(outbox).toEqual([expect.objectContaining({ id: 'frage_a', userId: a.id })]);

    backend.zustand.putsFehlschlagen = false;
    await ue.click(screen.getByText('Logout'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('abgemeldet'));
    expect(backend.speicherVon(a.id).progress.frage_a).toBeTruthy();
    expect(nutzerdatenSchluessel()).toEqual([]);
  });

  it('Konto löschen räumt lokal auf', async () => {
    const ue = userEvent.setup();
    renderApp();
    await ue.click(screen.getByText('Login A'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));
    await ue.click(screen.getByText('Lernen'));
    await waitFor(() => expect(screen.getByTestId('anzahl')).toHaveTextContent('1'));
    await ue.click(screen.getByText('Löschen'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('abgemeldet'));
    expect(screen.getByTestId('anzahl')).toHaveTextContent('0');
    expect(screen.getByTestId('xp')).toHaveTextContent('0');
    expect(nutzerdatenSchluessel()).toEqual([]);
  });
});
