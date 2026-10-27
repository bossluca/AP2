import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswortDialog from './PasswortDialog';

function rendere(props = {}) {
  const onBestaetigen = props.onBestaetigen ?? vi.fn().mockResolvedValue();
  const onAbbrechen = props.onAbbrechen ?? vi.fn();
  render(
    <PasswortDialog
      titel="Konto löschen?"
      beschreibung="Bitte bestätigen."
      bestaetigenText="Löschen"
      {...props}
      onBestaetigen={onBestaetigen}
      onAbbrechen={onAbbrechen}
    />
  );
  return { onBestaetigen, onAbbrechen };
}

describe('PasswortDialog', () => {
  it('ist ein beschrifteter modaler Dialog mit fokussiertem Passwortfeld', () => {
    rendere();
    const dialog = screen.getByRole('dialog', { name: 'Konto löschen?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const feld = screen.getByLabelText('Aktuelles Passwort');
    expect(feld).toHaveAttribute('type', 'password');
    expect(feld).toHaveFocus();
  });

  it('übergibt das Passwort an onBestaetigen', async () => {
    const user = userEvent.setup();
    const { onBestaetigen } = rendere();
    await user.type(screen.getByLabelText('Aktuelles Passwort'), 'geheim1234');
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(onBestaetigen).toHaveBeenCalledWith('geheim1234');
  });

  it('verlangt ein Passwort, ohne den Aufruf auszulösen', async () => {
    const user = userEvent.setup();
    const { onBestaetigen } = rendere();
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(onBestaetigen).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Passwort ein/);
  });

  it('zeigt bei 401 und 429 eine Fehlermeldung inline und bleibt offen', async () => {
    const user = userEvent.setup();
    const onBestaetigen = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { status: 401 }))
      .mockRejectedValueOnce(Object.assign(new Error('x'), { status: 429 }));
    rendere({ onBestaetigen });
    const feld = screen.getByLabelText('Aktuelles Passwort');

    await user.type(feld, 'falsch');
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Das Passwort ist falsch.');
    expect(feld).toHaveAttribute('aria-invalid', 'true');
    expect(feld).toHaveValue('');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.type(feld, 'nochmal');
    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Zu viele Versuche/));
  });

  it('bricht mit Button und Escape ab', async () => {
    const user = userEvent.setup();
    const { onAbbrechen } = rendere();
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(onAbbrechen).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onAbbrechen).toHaveBeenCalledTimes(2);
  });
});
