import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const authZustand = { user: null, ready: true };
vi.mock('../context/AuthContext', () => ({ useAuth: () => authZustand }));
const api = vi.hoisted(() => ({ get: vi.fn(), setProfil: vi.fn() }));
vi.mock('../lib/api', () => ({ ranglisteApi: api }));

import Rangliste from './Rangliste';

const renderPage = () =>
  render(
    <MemoryRouter>
      <Rangliste />
    </MemoryRouter>
  );

describe('Rangliste', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.setProfil.mockReset();
  });

  it('verweist ohne Login aufs Konto', () => {
    authZustand.user = null;
    renderPage();
    expect(screen.getByText(/Rangliste nur mit Konto/)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('zeigt Einträge und markiert den eigenen', async () => {
    authZustand.user = { email: 'a@b.de' };
    api.get.mockResolvedValue({
      profil: { optIn: true, anzeigename: 'Anna' },
      teilnehmer: 2,
      eintraege: [
        { rang: 1, anzeigename: 'Ben', punkte: 30, xp: 300, istIch: false },
        { rang: 2, anzeigename: 'Anna', punkte: 12, xp: 90, istIch: true },
      ],
      ich: { rang: 2, anzeigename: 'Anna', punkte: 12, xp: 90, istIch: true },
    });
    renderPage();
    expect(await screen.findByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('du')).toBeInTheDocument();
    expect(screen.getByText('sichtbar')).toBeInTheDocument();
  });

  it('meldet sich mit Anzeigenamen an', async () => {
    authZustand.user = { email: 'a@b.de' };
    api.get.mockResolvedValue({ profil: { optIn: false, anzeigename: '' }, teilnehmer: 0, eintraege: [], ich: null });
    api.setProfil.mockResolvedValue({ profil: { optIn: true, anzeigename: 'fisi_42' } });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Noch niemand dabei/);
    await user.type(screen.getByPlaceholderText(/fisi_42/), 'fisi_42');
    await user.click(screen.getByRole('button', { name: 'Teilnehmen' }));
    expect(api.setProfil).toHaveBeenCalledWith(true, 'fisi_42');
  });
});
