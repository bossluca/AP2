import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProgressProvider } from '../context/ProgressContext';
import Lernzettel from './Lernzettel';

// MemoryRouter wegen useSearchParams (Deeplink ?einheit=<id>).
function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressProvider>
        <Lernzettel />
      </ProgressProvider>
    </MemoryRouter>
  );
}

describe('Lernzettel-Seite', () => {
  it('rendert die Überschrift und listet importierte Einheiten', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Lernzettel/i })).toBeInTheDocument();
    // Mindestens eine bekannte Einheit aus dem AP1-Lernzettel-Import.
    expect(screen.getByText('Künstliche Intelligenz')).toBeInTheDocument();
  });

  it('filtert per Suche', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Suche/i), 'Verschlüsselung');
    expect(screen.getByText('Verschlüsselungstechniken')).toBeInTheDocument();
    expect(screen.queryByText('Künstliche Intelligenz')).not.toBeInTheDocument();
  });

  it('klappt eine Einheit auf und zeigt den Inhalt', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Künstliche Intelligenz/i }));
    // Markdown-Inhalt der Einheit wird sichtbar (Markier-Buttons erscheinen).
    expect(screen.getByRole('button', { name: 'Gelernt' })).toBeInTheDocument();
  });

  it('filtert nach Prüfungsteil (AP2 zeigt nur AP2-Einheiten)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(screen.getByLabelText('Prüfungsteil filtern'), 'AP2');
    // AP1-Einheit verschwindet, AP2-Thema erscheint.
    expect(screen.queryByText('Künstliche Intelligenz')).not.toBeInTheDocument();
    expect(screen.getByText('IPv4-Grundlagen und Adressierung')).toBeInTheDocument();
  });
});
