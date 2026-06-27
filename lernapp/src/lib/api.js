/**
 * Schlanker API-Client für das Backend. Basis-URL aus `VITE_API_URL`
 * (Default `/api` – funktioniert same-origin in Produktion und über den
 * Vite-Dev-Proxy). Alle Anfragen senden Cookies (`credentials: 'include'`).
 *
 * Die App funktioniert auch ohne erreichbares Backend: Aufrufe werfen dann,
 * werden von den Aufrufern abgefangen und auf „offline/abgemeldet" zurückgesetzt.
 */
const BASE = import.meta.env.VITE_API_URL ?? '/api';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authApi = {
  register: (email, password) =>
    request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
};

export const progressApi = {
  getAll: () => request('/progress'),
  put: (itemId, entry) =>
    request(`/progress/${encodeURIComponent(itemId)}`, { method: 'PUT', body: entry }),
  merge: (progress) => request('/progress/merge', { method: 'POST', body: { progress } }),
  reset: () => request('/progress', { method: 'DELETE' }),
};
