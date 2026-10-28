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
  register: (email, password, inviteCode) =>
    request('/auth/register', { method: 'POST', body: { email, password, inviteCode } }),
  config: () => request('/auth/config'),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  // Beide sensiblen Aktionen verlangen das aktuelle Passwort (C2/S18).
  deleteAccount: (password) => request('/auth/account', { method: 'DELETE', body: { password } }),
  recover: (email, recoveryCode, newPassword) =>
    request('/auth/recover', { method: 'POST', body: { email, recoveryCode, newPassword } }),
  neuerRecoveryCode: (password) => request('/auth/recovery-code', { method: 'POST', body: { password } }),
};

export const progressApi = {
  getAll: () => request('/progress'),
  put: (itemId, entry) =>
    request(`/progress/${encodeURIComponent(itemId)}`, { method: 'PUT', body: entry }),
  merge: (progress) => request('/progress/merge', { method: 'POST', body: { progress } }),
  reset: () => request('/progress', { method: 'DELETE' }),
};

export const gamificationApi = {
  get: () => request('/gamification'),
  put: (gamification) => request('/gamification', { method: 'PUT', body: gamification }),
};

export const ranglisteApi = {
  get: (gruppeId) => request(gruppeId ? `/rangliste?gruppe=${gruppeId}` : '/rangliste'),
  setProfil: (optIn, anzeigename) =>
    request('/rangliste/profil', { method: 'PUT', body: { optIn, anzeigename } }),
};

export const adminApi = {
  uebersicht: () => request('/admin/uebersicht'),
  sperren: (id, gesperrt) => request(`/admin/users/${id}`, { method: 'PATCH', body: { gesperrt } }),
  loeschen: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  einladen: (maxUses, gueltigTage, notiz) =>
    request('/admin/invites', { method: 'POST', body: { maxUses, gueltigTage, notiz } }),
  einladungLoeschen: (id) => request(`/admin/invites/${id}`, { method: 'DELETE' }),
  // Sicherheitsprotokoll (C6): neueste zuerst, limit max 500, optional ein Ereignis.
  audit: (limit = 100, ereignis = '') =>
    request(`/admin/audit?limit=${Number(limit)}${ereignis ? `&ereignis=${encodeURIComponent(ereignis)}` : ''}`),
};

export const datenApi = {
  get: () => request('/daten'),
  put: (schluessel, wert) => request(`/daten/${schluessel}`, { method: 'PUT', body: { wert } }),
};

export const gruppenApi = {
  liste: () => request('/gruppen'),
  anlegen: (name) => request('/gruppen', { method: 'POST', body: { name } }),
  beitreten: (code) => request('/gruppen/beitreten', { method: 'POST', body: { code } }),
  verlassen: (id) => request(`/gruppen/${id}/mitgliedschaft`, { method: 'DELETE' }),
};
