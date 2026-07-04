import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Drill from './Drill';

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <Drill />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe('Drill (Multiple Choice)', () => {
  beforeEach(() => localStorage.clear());

  it('zeigt eine Frage mit vier Antwortmöglichkeiten', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Drill/i })).toBeInTheDocument();
    expect(screen.getByText(/Welcher Begriff gehört in die Lücke/i)).toBeInTheDocument();
    // 4 Antwort-Buttons (nummeriert 1–4).
    const optionen = screen.getAllByRole('button').filter((b) => /^[1-4]/.test(b.textContent));
    expect(optionen).toHaveLength(4);
  });

  it('bewertet die Antwort sofort und rückt mit „Weiter" vor', async () => {
    const user = userEvent.setup();
    renderPage();
    const optionen = screen.getAllByRole('button').filter((b) => /^[1-4]/.test(b.textContent));
    await user.click(optionen[0]);
    // Sofortiges Feedback: entweder richtig oder Auflösung mit dem korrekten Begriff.
    expect(screen.getByText(/Richtig! 🎉|Richtig wäre:/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Weiter$/ }));
    expect(screen.getByText(/^2 \/ \d+$/)).toBeInTheDocument();
  });
});
