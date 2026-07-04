import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Lernen from './Lernen';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <Lernen />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe('Heute lernen', () => {
  beforeEach(() => localStorage.clear());

  it('startet eine kurze Session und zeigt die erste Karte mit Confidence-Wahl', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Heute lernen/i })).toBeInTheDocument();
    expect(screen.getByText(/^1 \/ \d+$/)).toBeInTheDocument();
    // Aufdecken passiert über die Confidence-Angabe („ein Tipp, gleiche Reibung").
    expect(screen.getByRole('button', { name: /Weiß ich/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bin unsicher/i })).toBeInTheDocument();
  });

  it('aufdecken (unsicher) und bewerten rückt zur nächsten Karte vor', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Bin unsicher/i }));
    await user.click(screen.getByRole('button', { name: /^Gewusst/i }));
    expect(screen.getByText(/^2 \/ \d+$/)).toBeInTheDocument();
  });

  it('warnt bei Fehl-Sicherheit erst in der Auswertung, nicht während der Karte', async () => {
    const user = userEvent.setup();
    renderPage();
    // Sicher aufdecken, dann „Nicht gewusst" → Fehl-Sicherheit wird gezählt.
    await user.click(screen.getByRole('button', { name: /Weiß ich/i }));
    expect(screen.getByText(/sei ehrlich/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Nicht gewusst/i }));
    expect(screen.getByText(/^2 \/ \d+$/)).toBeInTheDocument();
  });
});
