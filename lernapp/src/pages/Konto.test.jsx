import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// API-Client mocken – kein echtes Netzwerk im Test.
vi.mock('../lib/api', () => ({
  authApi: {
    me: vi.fn().mockRejectedValue(new Error('401')),
    login: vi.fn().mockResolvedValue({ user: { id: 1, email: 'a@b.de' } }),
    register: vi.fn().mockResolvedValue({ user: { id: 2, email: 'neu@b.de' } }),
    logout: vi.fn().mockResolvedValue({ ok: true }),
    deleteAccount: vi.fn().mockResolvedValue({ ok: true }),
    neuerRecoveryCode: vi.fn().mockResolvedValue({ recoveryCode: 'AAAA-BBBB-CCCC-DDDD' }),
    config: vi.fn().mockResolvedValue({ registrierung: 'open' }),
  },
  progressApi: {
    getAll: vi.fn().mockResolvedValue({ progress: {} }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    merge: vi.fn().mockResolvedValue({ imported: 0 }),
    reset: vi.fn().mockResolvedValue({ ok: true }),
  },
  gamificationApi: {
    get: vi.fn().mockResolvedValue({ gamification: null }),
    put: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { authApi, progressApi } from '../lib/api';
import { AuthProvider } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import Konto from './Konto';

function renderKonto(pfad = '/konto') {
  return render(
    <MemoryRouter initialEntries={[pfad]}>
      <AuthProvider>
        <ProgressProvider>
          <Konto />
        </ProgressProvider>
      </AuthProvider>
    </MemoryRouter>
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

  it('Einladungslink öffnet die Registrierung mit vorausgefülltem Code (invite-Modus)', async () => {
    authApi.config.mockResolvedValueOnce({ registrierung: 'invite' });
    authApi.register.mockResolvedValueOnce({ user: { id: 3, email: 'x@b.de' } });
    const user = userEvent.setup();
    renderKonto('/konto?einladung=ABCD-EFGH-JKLM');
    expect(await screen.findByLabelText('Einladungscode')).toHaveValue('ABCD-EFGH-JKLM');
    await user.type(screen.getByLabelText('E-Mail'), 'x@b.de');
    await user.type(screen.getByLabelText(/^Passwort \(mind/), 'geheim1234');
    await user.type(screen.getByLabelText('Passwort bestätigen'), 'geheim1234');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Konto erstellen' }));
    await waitFor(() =>
      expect(authApi.register).toHaveBeenCalledWith('x@b.de', 'geheim1234', 'ABCD-EFGH-JKLM')
    );
  });

  it('blendet die Registrierung aus, wenn sie geschlossen ist', async () => {
    authApi.config.mockResolvedValueOnce({ registrierung: 'closed' });
    renderKonto();
    expect(await screen.findByText(/derzeit nicht möglich/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrieren' })).not.toBeInTheDocument();
  });

  it('zeigt Admins den Link zum Admin-Bereich', async () => {
    authApi.me.mockResolvedValueOnce({ user: { id: 1, email: 'admin@b.de', admin: true } });
    renderKonto();
    expect(await screen.findByRole('link', { name: /Admin-Bereich/ })).toHaveAttribute('href', '/admin');
  });

  describe('sensible Aktionen fragen das Passwort ab (C2)', () => {
    const angemeldet = (admin = false) =>
      authApi.me.mockResolvedValueOnce({ user: { id: 1, email: 'a@b.de', admin } });

    it('Konto löschen: erst Dialog, dann deleteAccount mit Passwort', async () => {
      angemeldet();
      const user = userEvent.setup();
      renderKonto();
      await user.click(await screen.findByRole('button', { name: 'Konto löschen …' }));
      const dialog = screen.getByRole('dialog', { name: 'Konto endgültig löschen?' });
      expect(authApi.deleteAccount).not.toHaveBeenCalled();
      await user.type(screen.getByLabelText('Aktuelles Passwort'), 'geheim1234');
      await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }));
      await waitFor(() => expect(authApi.deleteAccount).toHaveBeenCalledWith('geheim1234'));
      await waitFor(() => expect(dialog).not.toBeInTheDocument());
    });

    it('Konto löschen: falsches Passwort zeigt Fehler im Dialog, Konto bleibt', async () => {
      angemeldet();
      authApi.deleteAccount.mockRejectedValueOnce(Object.assign(new Error('Passwort falsch'), { status: 401 }));
      const user = userEvent.setup();
      renderKonto();
      await user.click(await screen.findByRole('button', { name: 'Konto löschen …' }));
      await user.type(screen.getByLabelText('Aktuelles Passwort'), 'falsch');
      await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Das Passwort ist falsch.');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Angemeldet als/)).toBeInTheDocument();
    });

    it('Neuer Recovery-Code: Dialog, Aufruf mit Passwort, Code wird einmalig angezeigt', async () => {
      angemeldet();
      const user = userEvent.setup();
      renderKonto();
      await user.click(await screen.findByRole('button', { name: 'Neuen Recovery-Code erzeugen' }));
      expect(authApi.neuerRecoveryCode).not.toHaveBeenCalled();
      await user.type(screen.getByLabelText('Aktuelles Passwort'), 'geheim1234');
      await user.click(screen.getByRole('button', { name: 'Code erzeugen' }));
      await waitFor(() => expect(authApi.neuerRecoveryCode).toHaveBeenCalledWith('geheim1234'));
      expect(await screen.findByText('AAAA-BBBB-CCCC-DDDD')).toBeInTheDocument();
    });

    it('Admin-Konten bekommen keine Löschen-Aktion, sondern einen Hinweis', async () => {
      angemeldet(true);
      renderKonto();
      expect(await screen.findByText(/Angemeldet als/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Konto löschen …' })).not.toBeInTheDocument();
      expect(screen.getByText(/nicht gelöscht werden/)).toBeInTheDocument();
    });
  });
});
