import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { ProgressProvider, useProgress } from './ProgressContext';
import { erzeugeFakeBackend } from '../test/fakeBackend';

/**
 * C3 – Der Server liefert `updatedAt` mit zurück und lehnt ungültige/veraltete
 * Einträge ab. Der Client muss beides vertragen: geladene Einträge mit
 * `updatedAt` weiterverwenden und vom Server endgültig abgelehnte Writes
 * (400/413) nicht endlos in der Outbox wiederholen.
 */

let backend;

function Sonde() {
  const { user, login } = useAuth();
  const { progress, recordReview } = useProgress();
  return (
    <div>
      <p data-testid="user">{user ? user.email : 'abgemeldet'}</p>
      <p data-testid="eintrag">{JSON.stringify(progress.frage_a || null)}</p>
      <button onClick={() => login('a@x.de', 'geheim1234')}>Login</button>
      <button onClick={() => recordReview('frage_a', 3)}>Lernen A</button>
      <button onClick={() => recordReview('frage_b', 3)}>Lernen B</button>
    </div>
  );
}

const eintrag = () => JSON.parse(screen.getByTestId('eintrag').textContent);

describe('C3 – updatedAt vom Server, abgelehnte Writes', () => {
  let a;
  beforeEach(() => {
    localStorage.clear();
    backend = erzeugeFakeBackend();
    a = backend.legeKontoAn('a@x.de');
    vi.stubGlobal('fetch', vi.fn(backend.fetch));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('lädt Einträge mit updatedAt und schreibt danach einen neueren Stand durch', async () => {
    backend.speicherVon(a.id).progress.frage_a = {
      status: 'gelernt',
      box: 2,
      stability: 2.4,
      difficulty: 5,
      reps: 1,
      lapses: 0,
      due: '2026-01-05T00:00:00.000Z',
      last_review: '2026-01-01T00:00:00.000Z',
      history: [{ ts: '2026-01-01T00:00:00.000Z', result: 'gewusst' }],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const ue = userEvent.setup();
    render(
      <AuthProvider>
        <ProgressProvider>
          <Sonde />
        </ProgressProvider>
      </AuthProvider>
    );
    await ue.click(screen.getByText('Login'));
    await waitFor(() => expect(eintrag()?.updatedAt).toBe('2026-01-01T00:00:00.000Z'));

    await ue.click(screen.getByText('Lernen A'));
    await waitFor(() => expect(backend.speicherVon(a.id).progress.frage_a.reps).toBe(2));
    const server = backend.speicherVon(a.id).progress.frage_a;
    expect(Date.parse(server.updatedAt)).toBeGreaterThan(Date.parse('2026-01-01T00:00:00.000Z'));
    expect(server.history).toHaveLength(2);
    expect(eintrag().reps).toBe(2);
  });

  it('vom Server abgelehnter Write (400) wird nicht endlos wiederholt', async () => {
    const ue = userEvent.setup();
    render(
      <AuthProvider>
        <ProgressProvider>
          <Sonde />
        </ProgressProvider>
      </AuthProvider>
    );
    await ue.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('a@x.de'));

    backend.zustand.ablehnen.add('frage_a');
    await ue.click(screen.getByText('Lernen A'));
    // Lokal bleibt der Stand erhalten, der Write landet zunächst in der Outbox.
    await waitFor(() => expect(localStorage.getItem('ap2_lernapp_outbox_v1')).toContain('frage_a'));
    expect(eintrag().reps).toBe(1);

    await ue.click(screen.getByText('Lernen B'));
    // Nach dem nächsten Erfolg wird die Outbox geleert: der abgelehnte Eintrag
    // blockiert nicht und wird verworfen statt erneut gepuffert.
    await waitFor(() => expect(localStorage.getItem('ap2_lernapp_outbox_v1')).toBeNull());
    expect(backend.speicherVon(a.id).progress.frage_b).toBeTruthy();
    expect(backend.speicherVon(a.id).progress.frage_a).toBeUndefined();
  });
});
