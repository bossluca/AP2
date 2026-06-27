import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressProvider } from '../context/ProgressContext';
import Wiederholen from './Wiederholen';

function renderPage() {
  return render(
    <ProgressProvider>
      <Wiederholen />
    </ProgressProvider>
  );
}

describe('Wiederholen-Modus', () => {
  beforeEach(() => localStorage.clear());

  it('startet eine Sitzung (neue Objekte sind fällig)', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Wiederholen/i })).toBeInTheDocument();
    // Es gibt einen Fortschritt "X von N".
    expect(screen.getByText(/^1 von \d+$/)).toBeInTheDocument();
  });

  it('aufdecken und bewerten rückt zur nächsten Karte vor', async () => {
    const user = userEvent.setup();
    renderPage();
    // Vorderseite aufdecken (Frage- oder Lernzettel-Karte).
    await user.click(screen.getByRole('button', { name: /anzeigen/i }));
    // Bewerten mit FSRS-Note „Gut" (Name enthält die Intervall-Vorschau).
    await user.click(screen.getByRole('button', { name: /^Gut/ }));
    expect(screen.getByText(/^2 von \d+$/)).toBeInTheDocument();
  });

  it('Filter "nur Lernzettel" beschränkt die Sitzung', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByLabelText('Art filtern'), 'lernzettel');
    expect(screen.getByText('📝 Lernzettel')).toBeInTheDocument();
    expect(screen.queryByText('📄 Frage')).not.toBeInTheDocument();
  });
});
