import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import EigeneKarten from './EigeneKarten';

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProgressProvider>
        <EigeneKarten />
      </ProgressProvider>
    </MemoryRouter>
  );

describe('EigeneKarten', () => {
  beforeEach(() => localStorage.clear());

  it('schlägt Karten aus Text vor, speichert einen Stapel und lernt ihn mit FSRS', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(
      screen.getByLabelText('Text für Lernkarten'),
      'Subnetzmaske: Trennt Netz- und Hostanteil einer Adresse.{enter}Was macht ein Switch?{enter}Leitet Frames weiter.'
    );
    await user.click(screen.getByRole('button', { name: /Karten vorschlagen/ }));
    expect(screen.getByText('2 von 2 ausgewählt')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Name des Stapels'), 'Netz');
    await user.click(screen.getByRole('button', { name: '2 Karten speichern' }));
    expect(screen.getByText('Netz')).toBeInTheDocument();
    expect(screen.getByText(/2 Karten · 0 fällig · 2 neu/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Lernen/ }));
    await user.click(screen.getByRole('button', { name: 'Aufdecken' }));
    await user.click(screen.getByRole('button', { name: 'Gut' }));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    const progress = JSON.parse(localStorage.getItem('ap2_lernapp_progress_v1'));
    const ids = Object.keys(progress).filter((id) => id.startsWith('eigen_'));
    expect(ids).toHaveLength(1);
    expect(progress[ids[0]].last_review).toBeTruthy();
  });
});
