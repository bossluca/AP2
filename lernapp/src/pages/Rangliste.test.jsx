import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const authZustand = { user: null, ready: true };
vi.mock('../context/AuthContext', () => ({ useAuth: () => authZustand }));
const api = vi.hoisted(() => ({ get: vi.fn(), setProfil: vi.fn() }));
const gruppen = vi.hoisted(() => ({ liste: vi.fn(), anlegen: vi.fn(), beitreten: vi.fn(), verlassen: vi.fn() }));
vi.mock('../lib/api', () => ({ ranglisteApi: api, gruppenApi: gruppen }));

import Rangliste from './Rangliste';

const renderPage = () =>
  render(
    <MemoryRouter>
      <Rangliste />
    </MemoryRouter>
  );

const GLOBAL = {
  profil: { optIn: true, anzeigename: 'Anna' },
  teilnehmer: 2,
  eintraege: [
    { rang: 1, anzeigename: 'Ben', punkte: 30, xp: 300, istIch: false },
    { rang: 2, anzeigename: 'Anna', punkte: 12, xp: 90, istIch: true },
  ],
  ich: { rang: 2, anzeigename: 'Anna', punkte: 12, xp: 90, istIch: true },
};

describe('Rangliste', () => {
  beforeEach(() => {
    [...Object.values(api), ...Object.values(gruppen)].forEach((f) => f.mockReset());
    gruppen.liste.mockResolvedValue({ gruppen: [] });
  });

  it('verweist ohne Login aufs Konto', () => {
    authZustand.user = null;
    renderPage();
    expect(screen.getByText(/Rangliste nur mit Konto/)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('zeigt Einträge und markiert den eigenen', async () => {
    authZustand.user = { email: 'a@b.de' };
    api.get.mockResolvedValue(GLOBAL);
    renderPage();
    expect(await screen.findByText('Ben')).toBeInTheDocument();
    expect(screen.getByText('du')).toBeInTheDocument();
    expect(screen.getByText('öffentlich sichtbar')).toBeInTheDocument();
  });

  it('speichert das Profil mit Opt-in-Häkchen', async () => {
    authZustand.user = { email: 'a@b.de' };
    api.get.mockResolvedValue({ profil: { optIn: false, anzeigename: '' }, teilnehmer: 0, eintraege: [], ich: null });
    api.setProfil.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/Noch niemand dabei/);
    await user.type(screen.getByPlaceholderText(/fisi_42/), 'fisi_42');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Profil speichern' }));
    expect(api.setProfil).toHaveBeenCalledWith(true, 'fisi_42');
  });

  it('tritt einer Gruppe bei und wechselt auf deren Rangliste', async () => {
    authZustand.user = { email: 'a@b.de' };
    api.get.mockImplementation((gruppeId) =>
      Promise.resolve(
        gruppeId
          ? { ...GLOBAL, eintraege: [{ rang: 1, anzeigename: 'Tom', punkte: 9, xp: 9, istIch: false }] }
          : GLOBAL
      )
    );
    gruppen.beitreten.mockResolvedValue({ gruppe: { id: 7, name: 'FISI 24a' } });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ben');

    gruppen.liste.mockResolvedValue({ gruppen: [{ id: 7, name: 'FISI 24a', code: 'ABCD-EFGH', mitglieder: 2, erstellt: false }] });
    await user.type(screen.getByLabelText('Beitrittscode'), 'abcd-efgh');
    await user.click(screen.getByRole('button', { name: 'Beitreten' }));
    expect(gruppen.beitreten).toHaveBeenCalledWith('abcd-efgh');
    expect(await screen.findByText(/Du bist jetzt in „FISI 24a"/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /FISI 24a/ }));
    expect(await screen.findByText('Tom')).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith(7);
    expect(screen.getByText('ABCD-EFGH')).toBeInTheDocument();
  });
});
