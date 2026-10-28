import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DatenSicherung from './DatenSicherung';
import { AuthProvider } from '../context/AuthContext';
import { ProgressProvider } from '../context/ProgressContext';
import { MAX_BACKUP_BYTES } from '../lib/datensicherung';

function renderIt() {
  return render(
    <AuthProvider>
      <ProgressProvider>
        <DatenSicherung />
      </ProgressProvider>
    </AuthProvider>
  );
}
const datei = (inhalt, name = 'b.json') => new File([inhalt], name, { type: 'application/json' });
const backup = (teile) => JSON.stringify({ format: 'fisidev-backup', version: 1, ...teile });

describe('DatenSicherung (C4)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('lehnt Dateien über 5 MB ab', async () => {
    renderIt();
    const gross = datei('{}');
    Object.defineProperty(gross, 'size', { value: MAX_BACKUP_BYTES + 1 });
    await userEvent.upload(screen.getByLabelText(/Backup-Datei wählen/i), gross, { applyAccept: false });
    expect(await screen.findByText(/zu groß/i)).toBeInTheDocument();
  });

  it('zeigt übernommene und verworfene Teile', async () => {
    renderIt();
    const inhalt = backup({ progress: { q1: { status: 'ueben' }, 'a b': { status: 'ueben' } } });
    await userEvent.upload(screen.getByLabelText(/Backup-Datei wählen/i), datei(inhalt), { applyAccept: false });
    expect(await screen.findByText(/1 Einträge, 1 ungültige Teile verworfen/i)).toBeInTheDocument();
  });

  it('meldet Speicherfehler (Quota)', async () => {
    renderIt();
    const inhalt = backup({ eigeneKarten: [{ id: 's1', name: 'N', karten: [{ id: 'eigen_s1_0', front: 'a', back: 'b' }] }] });
    const echt = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (k, v) {
      if (k === 'ap2_lernapp_eigene_karten_v1') throw new DOMException('voll', 'QuotaExceededError');
      return echt.call(this, k, v);
    });
    await userEvent.upload(screen.getByLabelText(/Backup-Datei wählen/i), datei(inhalt), { applyAccept: false });
    await waitFor(() => expect(screen.getByText(/konnte nicht gespeichert werden, Speicher voll/i)).toBeInTheDocument());
  });
});
