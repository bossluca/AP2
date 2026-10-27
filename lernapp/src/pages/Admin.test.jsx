import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = { user: null, ready: true };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
const api = vi.hoisted(() => ({
  uebersicht: vi.fn(),
  sperren: vi.fn(),
  loeschen: vi.fn(),
  einladen: vi.fn(),
  einladungLoeschen: vi.fn(),
}));
vi.mock('../lib/api', () => ({ adminApi: api }));

import Admin from './Admin';

const renderPage = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>
  );

const UEBERSICHT = {
  registrierung: 'invite',
  konten: [
    { id: 1, email: 'admin@fisi.dev', erstellt: '2026-10-01', gesperrt: false, admin: true, xp: 10, eintraege: 3 },
    { id: 2, email: 'lea@fisi.dev', erstellt: '2026-10-02', gesperrt: false, admin: false, xp: 50, eintraege: 9 },
    { id: 3, email: 'zweiter@fisi.dev', erstellt: '2026-10-03', gesperrt: false, admin: true, xp: 0, eintraege: 0 },
  ],
  einladungen: [],
};

describe('Admin', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.uebersicht.mockResolvedValue(UEBERSICHT);
  });

  it('sperrt Nicht-Admins aus', () => {
    auth.user = { id: 2, email: 'lea@fisi.dev', admin: false };
    renderPage();
    expect(screen.getByText('Nur für Admins')).toBeInTheDocument();
    expect(api.uebersicht).not.toHaveBeenCalled();
  });

  it('listet Konten, sperrt ein Konto und erzeugt eine Einladung mit Link', async () => {
    auth.user = { id: 1, email: 'admin@fisi.dev', admin: true };
    api.sperren.mockResolvedValue({ ok: true });
    api.einladen.mockResolvedValue({ code: 'ABCD-EFGH-JKLM', laeuftAb: null });
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('lea@fisi.dev')).toBeInTheDocument();
    expect(screen.getByText(/nur mit Einladungscode/)).toBeInTheDocument();
    // Eigenes Konto hat keine Aktionen.
    expect(screen.queryByRole('button', { name: 'admin@fisi.dev sperren' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'lea@fisi.dev sperren' }));
    expect(api.sperren).toHaveBeenCalledWith(2, true);

    await user.click(screen.getByRole('button', { name: 'Einladung erzeugen' }));
    expect(api.einladen).toHaveBeenCalledWith(1, 14, '');
    expect(await screen.findByText('ABCD-EFGH-JKLM')).toBeInTheDocument();
    expect(screen.getByLabelText('Einladungslink').value).toMatch(/#\/konto\?einladung=ABCD-EFGH-JKLM$/);
  });

  it('bietet für Admin-Konten keine Löschen-Aktion an (S18), für normale schon', async () => {
    auth.user = { id: 1, email: 'admin@fisi.dev', admin: true };
    renderPage();
    expect(await screen.findByText('lea@fisi.dev')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'lea@fisi.dev löschen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'zweiter@fisi.dev löschen' })).not.toBeInTheDocument();
  });
});
