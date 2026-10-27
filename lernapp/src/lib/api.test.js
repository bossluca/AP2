import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi } from './api';

describe('authApi: sensible Konto-Aktionen senden das Passwort (C2)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) }));
  });
  afterEach(() => vi.unstubAllGlobals());

  const letzterAufruf = () => {
    const [url, init] = fetch.mock.calls.at(-1);
    return { url, init, body: JSON.parse(init.body) };
  };

  it('deleteAccount: DELETE /auth/account mit JSON-Body {password}', async () => {
    await authApi.deleteAccount('geheim1234');
    const { url, init, body } = letzterAufruf();
    expect(url).toBe('/api/auth/account');
    expect(init.method).toBe('DELETE');
    expect(init.credentials).toBe('include');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(body).toEqual({ password: 'geheim1234' });
  });

  it('neuerRecoveryCode: POST /auth/recovery-code mit JSON-Body {password}', async () => {
    await authApi.neuerRecoveryCode('geheim1234');
    const { url, init, body } = letzterAufruf();
    expect(url).toBe('/api/auth/recovery-code');
    expect(init.method).toBe('POST');
    expect(body).toEqual({ password: 'geheim1234' });
  });

  it('reicht den HTTP-Status bei Fehlern durch (401 = falsches Passwort)', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Passwort falsch oder fehlend.' }) });
    await expect(authApi.deleteAccount('x')).rejects.toMatchObject({ status: 401 });
  });
});
