import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// API-Client mocken – kein echtes Netzwerk im Test.
vi.mock('../lib/api', () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error('401')),
    login: vi.fn().mockResolvedValue({ user: { id: 1, email: 'a@b.de' } }),
    register: vi.fn().mockResolvedValue({ user: { id: 2, email: 'neu@b.de' } }),
    logout: vi.fn().mockResolvedValue({ ok: true }),
  },
  progressApi: {
    getAll: vi.fn().mockResolvedValue({ progress: {} }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    merge: vi.fn().mockResolvedValue({ imported: 0 }),
    reset: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { authApi, progressApi } from '../lib/api';
import { AuthProvider } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import Konto from './Konto';

function renderKonto() {
  return render(
    <AuthProvider>
      <ProgressProvider>
        <Konto />
      </ProgressProvider>
    </AuthProvider>
  );
}

describe('Konto-Seite + Login-Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    authApi.me.mockRejectedValue(new Error('401'));
    authApi.login.mockResolvedValue({ user: { id: 1, email: 'a@b.de' } });
    progressApi.getAll.mockResolvedValue({ progress: {} });
    progressApi.merge.mockResolvedValue({ imported: 0 });
  });

  it('zeigt das Anmeldeformular, wenn niemand angemeldet ist', async () => {
    renderKonto();
    expect(await screen.findByRole('button', { name: 'Anmelden' })).toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
  });

  it('meldet an und stößt die Fortschritts-Migration an', async () => {
    const user = userEvent.setup();
    renderKonto();

    await user.type(screen.getByLabelText('E-Mail'), 'a@b.de');
    await user.type(screen.getByLabelText(/Passwort/), 'geheim1234');
    await user.click(screen.getByRole('button', { name: 'Jetzt anmelden' }));

    // Nach Login: Bestätigung sichtbar.
    expect(await screen.findByText(/Angemeldet als/)).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith('a@b.de', 'geheim1234');

    // ProgressContext synchronisiert: erst Merge (Migration), dann Laden.
    await waitFor(() => expect(progressApi.merge).toHaveBeenCalled());
    await waitFor(() => expect(progressApi.getAll).toHaveBeenCalled());
  });
});
