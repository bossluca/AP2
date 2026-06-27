import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressProvider } from '../context/ProgressContext';
import Suche from './Suche';

function renderPage() {
  return render(
    <ProgressProvider>
      <Suche />
    </ProgressProvider>
  );
}

describe('Suche-Seite', () => {
  it('verlangt mindestens 2 Zeichen', () => {
    renderPage();
    expect(screen.getByText(/Mindestens 2 Zeichen/i)).toBeInTheDocument();
  });

  it('findet Treffer über Fragen und Lernzettel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Begriff/i), 'Subnetz');
    expect(screen.getByText(/Treffer für/i)).toBeInTheDocument();
    // Mindestens ein Treffer-Eintrag (Lernzettel oder Frage).
    expect(screen.getAllByText(/Frage|Lernzettel/).length).toBeGreaterThan(0);
  });

  it('filtert Treffer auf AP2', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Begriff/i), 'VLAN');
    await user.selectOptions(screen.getByLabelText('Prüfungsteil filtern'), 'AP2');
    // VLAN ist AP2-Inhalt → es gibt Treffer.
    expect(screen.getByText(/Treffer für/i)).toBeInTheDocument();
  });
});
