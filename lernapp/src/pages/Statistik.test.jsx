import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Statistik from './Statistik';

describe('Statistik-Seite', () => {
  beforeEach(() => localStorage.clear());

  it('rendert die Kernabschnitte', () => {
    render(
      <MemoryRouter>
        <ProgressProvider>
          <Statistik />
        </ProgressProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Statistik/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Prüfungsreife/i })).toBeInTheDocument();
    expect(screen.getByText(/Karten-Stärke/i)).toBeInTheDocument();
    expect(screen.getByText(/Schwachstellen nach Thema/i)).toBeInTheDocument();
    expect(screen.getByText(/Aktivität/i)).toBeInTheDocument();
    expect(screen.getByText(/^Erfolge/i)).toBeInTheDocument();
    // Ohne Fortschritt sind alle Objekte "neu" und damit fällig.
    expect(screen.getByText(/fällig zum Wiederholen/i)).toBeInTheDocument();
  });
});
