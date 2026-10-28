import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Plan-Berechnung wirft: Home darf nicht abstürzen, Einstufung wird verworfen (C4).
const einstufung = vi.hoisted(() => ({ geloescht: false }));
vi.mock('../lib/einstufung', async (orig) => {
  const m = await orig();
  return {
    ...m,
    ladeEinstufung: () => ({ datum: '2026-10-20T10:00:00.000Z', auswertung: { themen: [], quote: 0 } }),
    planAusErgebnis: () => {
      throw new RangeError('Invalid array length');
    },
    loescheEinstufung: () => {
      einstufung.geloescht = true;
    },
  };
});

import Home from './Home';
import { AuthProvider } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import { ThemeProvider } from '../context/ThemeContext';

describe('Home – kaputte Einstufung (C4)', () => {
  it('zeigt einen freundlichen Hinweis statt abzustürzen', () => {
    render(
      <ThemeProvider>
        <AuthProvider>
          <ProgressProvider>
            <MemoryRouter>
              <Home />
            </MemoryRouter>
          </ProgressProvider>
        </AuthProvider>
      </ThemeProvider>
    );
    expect(screen.getByText(/Lernplan konnte nicht geladen werden/i)).toBeInTheDocument();
    expect(einstufung.geloescht).toBe(true);
  });
});
