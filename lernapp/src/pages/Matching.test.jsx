import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Matching from './Matching';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <Matching />
      </ProgressProvider>
    </MemoryRouter>
  );
}

const begriffButtons = () => within(screen.getByRole('group', { name: 'Begriffe' })).getAllByRole('button');
const defButtons = () => within(screen.getByRole('group', { name: 'Definitionen' })).getAllByRole('button');

describe('Matching (Zuordnen)', () => {
  beforeEach(() => localStorage.clear());

  it('zeigt fünf Begriffe und fünf Definitionen', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Zuordnen/ })).toBeInTheDocument();
    expect(begriffButtons()).toHaveLength(5);
    expect(defButtons()).toHaveLength(5);
  });

  it('löst alle Paare, bucht XP und zeigt die Auswertung', async () => {
    const user = userEvent.setup();
    renderPage();
    // Lösung ohne Wissen: jeden Begriff mit jeder Definition probieren, bis es passt.
    for (let runde = 0; runde < 5; runde += 1) {
      const b = begriffButtons().find((x) => !x.disabled);
      await user.click(b);
      for (const d of defButtons().filter((x) => !x.disabled)) {
        await user.click(d);
        if (b.disabled) break;
        await user.click(b); // Begriff erneut wählen nach Fehlversuch
      }
    }
    expect(screen.getByText(/Alle Paare gefunden/)).toBeInTheDocument();
    expect(screen.getByText(/beim ersten Versuch richtig/)).toBeInTheDocument();
    const gami = JSON.parse(localStorage.getItem('ap2_lernapp_gamification_v1'));
    expect(gami.xp).toBeGreaterThan(0);
  });
});
