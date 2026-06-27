import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressProvider } from '../context/ProgressContext';
import Luecken from './Luecken';

function renderPage() {
  return render(
    <ProgressProvider>
      <Luecken />
    </ProgressProvider>
  );
}

describe('Lückentext-Seite', () => {
  beforeEach(() => localStorage.clear());

  it('rendert die Überschrift und bietet (aus den Lernzetteln) Begriffe an', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Lückentext/i })).toBeInTheDocument();
    // Aus den echten Lernzetteln werden Cloze-Items erzeugt → ein Prüfen-Knopf erscheint.
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeInTheDocument();
    expect(screen.getByText(/Begriffe verfügbar/)).toBeInTheDocument();
  });
});
