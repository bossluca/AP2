import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClozeFrage from './ClozeFrage';

describe('ClozeFrage', () => {
  it('prüft eine korrekte Eingabe und meldet das Ergebnis', async () => {
    const user = userEvent.setup();
    let ergebnis = null;
    render(
      <ClozeFrage text="Ein {{Router}} verbindet Netze." onErgebnis={(r) => (ergebnis = r)} />
    );
    await user.type(screen.getByLabelText('Lücke 1'), 'router');
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(screen.getByText(/1\/1 richtig/)).toBeInTheDocument();
    expect(ergebnis.alleRichtig).toBe(true);
  });

  it('zeigt bei falscher Eingabe die Musterlösung', async () => {
    const user = userEvent.setup();
    render(<ClozeFrage text="Ein {{Switch}} arbeitet auf Schicht 2." />);
    await user.type(screen.getByLabelText('Lücke 1'), 'Router');
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    expect(screen.getByText('→ Switch')).toBeInTheDocument();
  });
});
