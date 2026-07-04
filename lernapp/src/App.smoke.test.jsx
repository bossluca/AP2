import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ProgressProvider } from './context/ProgressContext';
import { ThemeProvider } from './context/ThemeContext';

/**
 * Rauchtest über die komplette App mit echten Providern und echten Daten:
 * fängt „weiße Seite"-Regressionen ab, die Unit-Tests einzelner Module
 * nicht sehen (kaputte Imports, Provider-Reihenfolge, defekte Routen).
 */
function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ProgressProvider>
          <App />
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('App-Rauchtest (kritischer Pfad)', () => {
  it('startet auf Home mit Marke und Primär-Aktion', async () => {
    window.location.hash = '#/';
    renderApp();
    expect(await screen.findAllByText(/FiSi\.dev/)).not.toHaveLength(0);
    // Home rendert die „Dein Tag"-Sektion bzw. einen Lern-Einstieg.
    await waitFor(() => {
      expect(document.querySelector('main')).not.toBeEmptyDOMElement();
    });
  });

  it('navigiert über die Bottom-Nav zur Statistik (lazy Chunk lädt)', async () => {
    window.location.hash = '#/';
    renderApp();
    const user = userEvent.setup();
    const links = await screen.findAllByRole('link', { name: /statistik/i });
    await user.click(links[0]);
    expect(
      await screen.findByRole('heading', { name: /statistik/i })
    ).toBeInTheDocument();
  });

  it('rendert den Wiederholen-Modus ohne Fehlerkarte', async () => {
    window.location.hash = '#/wiederholen';
    renderApp();
    await waitFor(() => {
      expect(document.querySelector('main')).not.toBeEmptyDOMElement();
    });
    expect(screen.queryByText(/etwas schiefgelaufen/i)).not.toBeInTheDocument();
  });
});
