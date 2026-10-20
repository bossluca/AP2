import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Einstufung from './Einstufung';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <Einstufung />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe('Einstufung', () => {
  beforeEach(() => localStorage.clear());

  it('führt durch den Kurztest und zeigt danach Themenprofil + Lernplan', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Kurz/ }));
    // Alles mit „Weiß ich nicht" beantworten → alle Themen gelten als Lücke.
    for (let i = 0; i < 40; i += 1) {
      const weissNicht = screen.queryByRole('button', { name: 'Weiß ich nicht' });
      if (!weissNicht) break;
      await user.click(weissNicht);
      await user.click(screen.getByRole('button', { name: /^(Weiter|Auswerten)$/ }));
    }
    expect(screen.getByRole('heading', { name: 'Dein Lernplan' })).toBeInTheDocument();
    expect(screen.getByText('Themenprofil')).toBeInTheDocument();
    expect(screen.getAllByText('Lücke').length).toBeGreaterThanOrEqual(14);
    expect(screen.getByText(/Prüfungssimulation & Wiederholen/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Jetzt lernen/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/lernen\?modus=thema&thema=/)
    );
    expect(JSON.parse(localStorage.getItem('ap2_lernapp_einstufung_v1')).auswertung.gesamt).toBeGreaterThan(0);
  });

  it('„Test wiederholen" kehrt zum Start zurück', async () => {
    localStorage.setItem(
      'ap2_lernapp_einstufung_v1',
      JSON.stringify({
        datum: new Date().toISOString(),
        auswertung: { themen: [{ id: 'vpn', titel: 'VPN', richtig: 1, gesamt: 1, quote: 1, niveau: 'stark' }], richtig: 1, gesamt: 1, quote: 1 },
      })
    );
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText('sicher')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Test wiederholen/ }));
    expect(screen.getByRole('heading', { name: 'Wo stehst du?' })).toBeInTheDocument();
  });
});
