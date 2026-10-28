import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ user: null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock('../lib/api', () => ({ datenApi: api }));

import KontoDatenSync from './KontoDatenSync';
import { ladeStapel, speichereStapel } from '../lib/eigeneKarten';
import { ladeEinstufung } from '../lib/einstufung';

const stapel = (id) => ({ id, name: id, erstellt: '2026-10-01', karten: [] });

describe('KontoDatenSync', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.put.mockReset().mockResolvedValue({ ok: true });
  });

  it('tut ohne Login nichts', () => {
    auth.user = null;
    render(<KontoDatenSync />);
    speichereStapel([stapel('a')]);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('merged beim Login und schreibt danach Änderungen durch', async () => {
    speichereStapel([stapel('lokal')], { melden: false });
    api.get.mockResolvedValue({
      daten: {
        eigeneKarten: { wert: [stapel('server')] },
        einstufung: { wert: { datum: '2026-10-10T00:00:00.000Z', auswertung: { themen: [] } } },
      },
    });
    auth.user = { id: 1, email: 'a@b.de' };
    render(<KontoDatenSync />);

    // Lokal: Vereinigung + Server-Einstufung übernommen.
    await waitFor(() => expect(ladeStapel().map((s) => s.id)).toEqual(['lokal', 'server']));
    expect(ladeEinstufung().datum).toBe('2026-10-10T00:00:00.000Z');
    // Server bekommt den gemergten Stand (lokaler Stapel fehlte dort).
    await waitFor(() =>
      expect(api.put).toHaveBeenCalledWith('eigeneKarten', expect.arrayContaining([expect.objectContaining({ id: 'lokal' })]))
    );

    api.put.mockClear();
    speichereStapel([stapel('neu')]);
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('eigeneKarten', [stapel('neu')]));
  });
});

describe('KontoDatenSync – kaputte Serverwerte (C4)', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.put.mockReset().mockResolvedValue({ ok: true });
  });

  it('übernimmt gültige Stapel, verwirft Karte null/kaputte Einstufung', async () => {
    auth.user = { id: 1 };
    api.get.mockResolvedValue({
      daten: {
        eigeneKarten: { wert: [{ id: 'a', name: { x: 1 }, karten: [null, { id: 'eigen_a_0', front: 'f', back: 'b' }] }, null] },
        einstufung: { wert: { datum: 'x', auswertung: { themen: 5 } } },
      },
    });
    render(<KontoDatenSync />);
    await waitFor(() => expect(ladeStapel()).toHaveLength(1));
    expect(ladeStapel()[0].karten).toHaveLength(1);
    expect(ladeEinstufung()).toBeNull();
  });
});
