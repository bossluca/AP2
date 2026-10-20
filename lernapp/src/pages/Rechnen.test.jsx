import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Rechnen from './Rechnen';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProgressProvider>
        <Rechnen />
      </ProgressProvider>
    </MemoryRouter>
  );

describe('Rechnen', () => {
  beforeEach(() => localStorage.clear());

  it('prüft eine falsche Antwort, zeigt den Lösungsweg und geht weiter', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('Deine Antwort'), 'quatsch{enter}');
    expect(screen.getByText(/Nicht ganz – Lösung:/)).toBeInTheDocument();
    expect(screen.getByText('0/1 richtig')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nächste' }));
    expect(screen.getByLabelText('Deine Antwort')).toHaveValue('');
    expect(JSON.parse(localStorage.getItem('ap2_lernapp_gamification_v1')).xp).toBeGreaterThan(0);
  });

  it('filtert auf einen Aufgabentyp', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'RAID-Kapazität' }));
    expect(screen.getByText(/nutzbare Kapazität/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'RAID-Kapazität' })).toHaveAttribute('aria-pressed', 'true');
  });
});
