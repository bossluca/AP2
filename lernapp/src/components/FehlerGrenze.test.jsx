import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import FehlerGrenze from './FehlerGrenze';

/** Komponente, die beim Rendern wirft – simuliert eine kaputte Seite. */
function Kaputt() {
  throw new Error('Testfehler: defekter Eintrag');
}

describe('FehlerGrenze', () => {
  beforeEach(() => {
    // React loggt gefangene Fehler auf die Konsole – im Test stummschalten.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rendert Kinder, solange kein Fehler auftritt', () => {
    render(
      <FehlerGrenze>
        <p>Alles gut</p>
      </FehlerGrenze>
    );
    expect(screen.getByText('Alles gut')).toBeInTheDocument();
  });

  it('zeigt statt einer weißen Seite eine Fehlerkarte mit Auswegen', () => {
    render(
      <FehlerGrenze>
        <Kaputt />
      </FehlerGrenze>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/etwas schiefgelaufen/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /neu laden/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /startseite/i })).toBeInTheDocument();
    // Die Fehlermeldung selbst hilft beim Melden/Debuggen.
    expect(screen.getByText(/defekter Eintrag/)).toBeInTheDocument();
  });
});
