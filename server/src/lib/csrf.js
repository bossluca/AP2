/**
 * CSRF-Härtung (rein, testbar): Herkunftsprüfung schreibender Requests und
 * zentrale Ableitung des Sitzungs-Cookie-Namens. Siehe SECURITY.md (S18).
 */

const SICHERE_METHODEN = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Effektiver Cookie-Name: im Produktivbetrieb (`secure`) mit `__Host-`-Präfix.
 * @param {string|undefined} basis  konfigurierter Name (Default `ap_session`)
 * @param {boolean} secure
 */
export function sitzungsCookieName(basis, secure) {
  const name = basis || 'ap_session';
  if (!secure) return name;
  return name.startsWith('__Host-') ? name : `__Host-${name}`;
}

/** Hostname ohne Port (IPv6 in eckigen Klammern bleibt erhalten), klein geschrieben. */
function hostOhnePort(host) {
  const h = String(host || '').trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(0, h.indexOf(']') + 1);
  return h.replace(/:\d+$/, '');
}

/**
 * Prüft, ob ein (schreibender) Request von der eigenen Seite kommt.
 *
 * - GET/HEAD/OPTIONS: immer ok.
 * - `Sec-Fetch-Site` gesetzt: nur `same-origin` und `none` (direkte Eingabe) erlaubt.
 *   Ausnahme: `Origin` entspricht exakt dem konfigurierten CORS-Origin (Dev).
 * - Sonst, wenn `Origin` vorhanden: Hostname muss zum `Host`-Header passen (Port
 *   ignoriert; hinter dem Proxy ist `Host` der öffentliche Name). Ist
 *   `X-Forwarded-Proto` gesetzt, muss auch das Schema des Origin passen.
 * - Weder `Sec-Fetch-Site` noch `Origin` (curl, Server-Tests, alte Clients): erlaubt.
 * - Hat der Request einen Body, muss `Content-Type: application/json` sein (415).
 *
 * @returns {{ok:true}|{ok:false,status:number,fehler:string}}
 */
export function pruefeAnfrageHerkunft(req, { erlaubterOrigin = null } = {}) {
  if (SICHERE_METHODEN.has(req.method)) return { ok: true };
  const h = req.headers;
  const verboten = { ok: false, status: 403, fehler: 'Anfrage von fremder Herkunft abgelehnt.' };
  const origin = typeof h.origin === 'string' ? h.origin : null;
  const erlaubtPerCors = Boolean(erlaubterOrigin) && origin === erlaubterOrigin;

  if (!erlaubtPerCors) {
    const site = h['sec-fetch-site'];
    if (site !== undefined) {
      if (site !== 'same-origin' && site !== 'none') return verboten;
    } else if (origin !== null) {
      let url;
      try {
        url = new URL(origin);
      } catch {
        return verboten; // z. B. Origin: null
      }
      if (hostOhnePort(url.host) !== hostOhnePort(h.host)) return verboten;
      const proto =
        typeof h['x-forwarded-proto'] === 'string' ? h['x-forwarded-proto'].split(',')[0].trim() : null;
      if (proto && url.protocol !== `${proto}:`) return verboten;
    }
  }

  const hatBody =
    (h['content-length'] !== undefined && h['content-length'] !== '0') || h['transfer-encoding'] !== undefined;
  if (hatBody && !/^application\/json\s*(;|$)/i.test(String(h['content-type'] || ''))) {
    return { ok: false, status: 415, fehler: 'Nur application/json wird akzeptiert.' };
  }
  return { ok: true };
}
