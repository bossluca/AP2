import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
  audit: vi.fn(),
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
    api.audit.mockResolvedValue({ eintraege: [] });
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

  it('zeigt das Sicherheitsprotokoll als Tabelle und filtert nach Ereignis (C6)', async () => {
    auth.user = { id: 1, email: 'admin@fisi.dev', admin: true };
    api.audit.mockImplementation((limit, ereignis) =>
      Promise.resolve({
        eintraege: [
          { id: 2, zeit: '2026-10-27T10:05:00.000Z', ereignis: 'login_fehlgeschlagen', kontoId: null, email: null, ip: '203.0.113.7', detail: 'Konto unbekannt' },
          { id: 1, zeit: '2026-10-27T10:00:00.000Z', ereignis: 'login_ok', kontoId: 2, email: 'lea@fisi.dev', ip: '198.51.100.2', detail: '' },
        ].filter((z) => !ereignis || z.ereignis === ereignis),
      })
    );
    const user = userEvent.setup();
    renderPage();
    const tabelle = await screen.findByRole('table', { name: /Sicherheitsprotokoll/ });
    for (const spalte of ['Zeit', 'Ereignis', 'Konto', 'IP', 'Detail']) {
      expect(within(tabelle).getByRole('columnheader', { name: spalte })).toBeInTheDocument();
    }
    expect(await within(tabelle).findByText('Login fehlgeschlagen')).toBeInTheDocument();
    expect(within(tabelle).getByText('203.0.113.7')).toBeInTheDocument();
    expect(within(tabelle).getByText('Konto unbekannt')).toBeInTheDocument();
    expect(within(tabelle).getByText('Login erfolgreich')).toBeInTheDocument();
    expect(within(tabelle).getByText('lea@fisi.dev')).toBeInTheDocument();
    expect(api.audit).toHaveBeenCalledWith(100, '');

    await user.selectOptions(screen.getByLabelText('Ereignis'), 'login_ok');
    expect(api.audit).toHaveBeenLastCalledWith(100, 'login_ok');
    expect(await within(tabelle).findByText('Login erfolgreich')).toBeInTheDocument();
    expect(within(tabelle).queryByText('Login fehlgeschlagen')).not.toBeInTheDocument();
  });

  it('Fehler beim Protokoll blockiert die Konten-Verwaltung nicht', async () => {
    auth.user = { id: 1, email: 'admin@fisi.dev', admin: true };
    api.audit.mockRejectedValue(new Error('Protokoll kaputt'));
    renderPage();
    expect(await screen.findByText('lea@fisi.dev')).toBeInTheDocument();
    expect(await screen.findByText('Protokoll kaputt')).toBeInTheDocument();
  });

  it('lädt für Nicht-Admins kein Protokoll', () => {
    auth.user = { id: 2, email: 'lea@fisi.dev', admin: false };
    renderPage();
    expect(api.audit).not.toHaveBeenCalled();
  });
});
