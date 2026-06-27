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

  it('startet eine kurze Session und zeigt die erste Karte', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Heute lernen/i })).toBeInTheDocument();
    expect(screen.getByText(/^1 \/ \d+$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aufdecken' })).toBeInTheDocument();
  });

  it('aufdecken und bewerten rückt zur nächsten Karte vor', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Aufdecken' }));
    await user.click(screen.getByRole('button', { name: 'Gewusst' }));
    expect(screen.getByText(/^2 \/ \d+$/)).toBeInTheDocument();
  });
});
