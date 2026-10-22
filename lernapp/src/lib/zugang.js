/**
 * Zugangs-Entscheidung für die Login-Pflicht (C9), rein und getestet.
 *
 * Ergebnis:
 * - `'laedt'`: Sitzung/Server-Konfiguration noch unbekannt → kurz Lade-Anzeige.
 * - `'gate'`:  nur die Konto-Seite (Login, Registrierung, Recovery) – keine
 *              Lerninhalte, keine Navigation zu Lernseiten, Daten werden nicht geladen.
 * - `'app'`:   volle App (Daten werden geladen).
 *
 * Regeln:
 * 1. Angemeldet → `app`.
 * 2. Server erreichbar → `gate`, wenn er `loginPflicht` meldet, sonst `app`
 *    (Instanz ohne Login-Pflicht, lokale Entwicklung).
 * 3. Server **nicht** erreichbar (offline, statisches Deployment ohne Backend):
 *    - Besitzer-Marker aus C1 gesetzt (früher angemeldet, nicht abgemeldet) →
 *      `app`, offline mit den lokalen Daten weiterlernen (PWA).
 *    - sonst, wenn dieses Gerät die Instanz schon als login-pflichtig kennt
 *      (Merker aus einer früheren erreichbaren Konfiguration) → `gate`:
 *      ein abgemeldeter Zustand zeigt immer das Gate.
 *    - sonst → `app`: rein lokales Verhalten wie bisher (z. B. Vercel-Preview).
 */

/**
 * Geräte-Merker „diese Instanz verlangt Login“. Kein Nutzerdatum: bleibt beim
 * Aufräumen nach Logout bestehen (siehe `GERAETE_SCHLUESSEL` in `besitzer.js`).
 */
export const LOGINPFLICHT_KEY = 'ap2_lernapp_loginpflicht_v1';

/**
 * @param {Object} p
 * @param {boolean} p.bereit   initialer `me()`-Check abgeschlossen
 * @param {undefined|null|{loginPflicht?:boolean}} p.konfig
 *        `undefined` = lädt noch, `null` = Server nicht erreichbar, Objekt = `/api/auth/config`
 * @param {Object|null} p.user
 * @param {{userId:any}|null} p.besitzer  Besitzer-Marker (C1)
 * @param {boolean} p.loginPflichtBekannt Geräte-Merker aus früherer Konfiguration
 * @returns {'laedt'|'gate'|'app'}
 */
export function bestimmeZugang({ bereit, konfig, user, besitzer, loginPflichtBekannt }) {
  if (user) return 'app';
  if (!bereit || konfig === undefined) return 'laedt';
  if (konfig) return konfig.loginPflicht === true ? 'gate' : 'app';
  if (besitzer) return 'app';
  return loginPflichtBekannt ? 'gate' : 'app';
}

/** Liest den Geräte-Merker (defensiv). */
export function ladeLoginPflichtBekannt() {
  try {
    return localStorage.getItem(LOGINPFLICHT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Merkt sich, ob die erreichbare Instanz Login verlangt. */
export function merkeLoginPflicht(pflicht) {
  try {
    if (pflicht) localStorage.setItem(LOGINPFLICHT_KEY, '1');
    else localStorage.removeItem(LOGINPFLICHT_KEY);
  } catch {
    /* Storage gesperrt */
  }
}
