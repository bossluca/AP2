import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Kontrollierte Prüfung mit Schlagwörtern, damit der Auto-Bewertungs-Pfad
// (Schlagwort-Treffer → Vorschlag → Score) deterministisch testbar ist.
vi.mock('../data/useExamData', () => {
  const klausur = {
    meta: { jahr: 2024, saison: 'Frühjahr', pruefungsteil: 'AP2', dauer: '90 Minuten' },
    pruefungsteil: 'AP2',
    punkteGesamt: 5,
    fragen: [
      {
        id: 'test_1',
        aufgabe_nr: 1,
        teilfrage: 'a',
        aufgabe_titel: null,
        ueberschrift: '',
        frage_text: 'Was ist ein Server?',
        punkte: 5,
        loesung_text: 'Ein Rechner, der zentral Dienste bereitstellt.',
        hat_antwort: true,
        hat_offizielle_loesung: true,
        unverifiziert_markiert: false,
        thema_tags: ['Server'],
        kontextText: null,
        schluesselwoerter: [{ begriff: 'Dienst', synonyme: ['Service'] }, { begriff: 'zentral' }],
      },
    ],
  };
  return {
    getKlausuren: () => [klausur],
    getLearnableQuestions: () => [],
    getLerneinheiten: () => [], // für NachlesenLinks (leer → rendert nichts)
  };
});

import Klausur from './Klausur';
import { ProgressProvider } from '../context/ProgressContext';

function renderPage() {
  return render(
    <ProgressProvider>
      <Klausur />
    </ProgressProvider>
  );
}

describe('Klausur-Simulation', () => {
  beforeEach(() => localStorage.clear());

  it('zeigt das Setup mit Prüfungsauswahl', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Klausur-Simulation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Klausur starten' })).toBeInTheDocument();
  });

  it('wertet eine inhaltlich korrekte Freitext-Antwort automatisch als richtig (100%)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Klausur starten' }));

    expect(screen.getByText('Was ist ein Server?')).toBeInTheDocument();

    // Abweichende, aber inhaltlich passende Formulierung (trifft beide Schlagwörter).
    await user.type(
      screen.getByPlaceholderText('Deine Antwort …'),
      'Ein zentraler Rechner, der Dienste im Netzwerk anbietet'
    );
    await user.click(screen.getByRole('button', { name: /Antwort prüfen/i }));

    // Schlagwort-Feedback + Musterlösung erscheinen.
    expect(screen.getByText('Musterlösung')).toBeInTheDocument();
    expect(screen.getByText(/Schlagwörter erkannt/i)).toBeInTheDocument();

    // Ohne manuelles Einschätzen auswerten → Auto-Bewertung "richtig" → 100%.
    await user.click(screen.getByRole('button', { name: 'Klausur auswerten' }));
    expect(screen.getByRole('heading', { name: 'Auswertung' })).toBeInTheDocument();
    expect(screen.getByText('100%', { selector: '.text-3xl' })).toBeInTheDocument();
  });

  it('bewertet eine themenfremde Antwort automatisch als falsch (0%)', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Klausur starten' }));

    await user.type(screen.getByPlaceholderText('Deine Antwort …'), 'keine ahnung');
    await user.click(screen.getByRole('button', { name: /Antwort prüfen/i }));
    await user.click(screen.getByRole('button', { name: 'Klausur auswerten' }));

    expect(screen.getByText('0%', { selector: '.text-3xl' })).toBeInTheDocument();
  });
});
