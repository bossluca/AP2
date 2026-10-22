/**
 * Besitzer-Bindung der lokalen Nutzerdaten (Ticket C1).
 *
 * Alles, was die App im localStorage über den Lernenden ablegt (Fortschritt,
 * Gamification, Outbox, Einstufung, eigene Karten, Resume …), gehört genau
 * **einem** Besitzer: einem Konto (`{ userId }`) oder „anonym“ (`null`). Beim
 * Login entscheidet {@link entscheideNachLogin}, ob der lokale Stand ins Konto
 * übernommen, behalten oder verworfen wird – Daten eines Kontos landen so nie
 * in einem anderen Konto. Logout und Konto löschen räumen über
 * {@link loescheLokaleNutzerdaten} auf (das Theme bleibt).
 *
 * Reine Entscheidungslogik + dünne, defensive localStorage-Helfer.
 */

/** Schlüssel des Besitzer-Markers. */
export const BESITZER_KEY = 'ap2_lernapp_owner_v1';

/** Gemeinsames Präfix aller App-Schlüssel im localStorage. */
export const PRAEFIX = 'ap2_lernapp_';

/** Schlüssel, die **kein** Nutzerdatum sind und beim Aufräumen bleiben. */
export const GERAETE_SCHLUESSEL = ['ap2_lernapp_theme_v1'];

/**
 * Bekannte Nutzerdaten-Schlüssel (dokumentarisch + für die Inhaltsprüfung).
 * Aufgeräumt werden darüber hinaus **alle** Schlüssel mit {@link PRAEFIX}
 * außer {@link GERAETE_SCHLUESSEL} – so fällt ein später ergänzter Schlüssel
 * nicht durchs Raster.
 */
export const NUTZERDATEN_SCHLUESSEL = [
  'ap2_lernapp_progress_v1',
  'ap2_lernapp_gamification_v1',
  'ap2_lernapp_outbox_v1',
  'ap2_lernapp_einstufung_v1',
  'ap2_lernapp_eigene_karten_v1',
  'ap2_lernapp_resume_v1',
  'ap2_lernapp_pruefungstermin_v1',
  'ap2_lernapp_session_umfang_v1',
];

/** Ereignis nach dem Aufräumen – Provider setzen sich darauf hin auf „leer“. */
export const NUTZERDATEN_GELOESCHT_EVENT = 'fisidev:nutzerdaten-geloescht';

/**
 * Liest den Besitzer der lokalen Daten.
 * @returns {{userId:number|string}|null} Konto oder `null` (= anonym / kein Marker).
 */
export function ladeBesitzer() {
  try {
    const roh = localStorage.getItem(BESITZER_KEY);
    const wert = roh ? JSON.parse(roh) : null;
    if (wert && (typeof wert.userId === 'number' || typeof wert.userId === 'string')) {
      return { userId: wert.userId };
    }
  } catch {
    /* kaputt/gesperrt → anonym */
  }
  return null;
}

/**
 * Setzt den Besitzer (`null` entfernt den Marker → anonym).
 * @param {number|string|null} userId
 */
export function setzeBesitzer(userId) {
  try {
    if (userId === null || userId === undefined) localStorage.removeItem(BESITZER_KEY);
    else localStorage.setItem(BESITZER_KEY, JSON.stringify({ userId }));
  } catch {
    /* Storage gesperrt: Marker gilt nur für diese Sitzung nicht */
  }
}

/** Alle aktuell vorhandenen App-Schlüssel, die Nutzerdaten sind (inkl. Besitzer-Marker). */
export function lokaleNutzerdatenSchluessel() {
  const schluessel = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PRAEFIX) && !GERAETE_SCHLUESSEL.includes(k)) schluessel.push(k);
    }
  } catch {
    /* ignorieren */
  }
  return schluessel;
}

/**
 * Entfernt alle lokalen Nutzerdaten (alle `ap2_lernapp_*`-Schlüssel außer dem
 * Theme, inkl. Besitzer-Marker) und meldet das per
 * {@link NUTZERDATEN_GELOESCHT_EVENT}, damit laufende Provider ihren State leeren.
 * @returns {string[]} entfernte Schlüssel
 */
export function loescheLokaleNutzerdaten() {
  const entfernt = lokaleNutzerdatenSchluessel();
  for (const k of entfernt) {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignorieren */
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(NUTZERDATEN_GELOESCHT_EVENT));
  } catch {
    /* kein Browser-Kontext */
  }
  return entfernt;
}

/** JSON aus localStorage defensiv lesen. */
function lies(key) {
  try {
    const roh = localStorage.getItem(key);
    return roh ? JSON.parse(roh) : null;
  } catch {
    return null;
  }
}

/**
 * Gibt es lokal Lernstand, der eine Übernahme-Rückfrage wert ist? Leere
 * Ausgangszustände (z. B. `{}` oder XP 0) zählen nicht.
 */
export function hatLokaleNutzerdaten() {
  const progress = lies('ap2_lernapp_progress_v1');
  if (progress && typeof progress === 'object' && Object.keys(progress).length > 0) return true;
  const gami = lies('ap2_lernapp_gamification_v1');
  if (
    gami &&
    (Number(gami.xp) > 0 ||
      Number(gami.klausurBest) > 0 ||
      (gami.activity && typeof gami.activity === 'object' && Object.keys(gami.activity).length > 0))
  ) {
    return true;
  }
  const outbox = lies('ap2_lernapp_outbox_v1');
  if (Array.isArray(outbox) && outbox.length > 0) return true;
  if (lies('ap2_lernapp_einstufung_v1')) return true;
  const karten = lies('ap2_lernapp_eigene_karten_v1');
  if (Array.isArray(karten) && karten.length > 0) return true;
  return false;
}

/**
 * Was passiert beim Login mit den lokalen Daten?
 * - `'uebernehmen'`: lokale Daten sind anonym → ins Konto übernehmen (UI fragt nach).
 * - `'behalten'`: lokale Daten gehören schon diesem Konto.
 * - `'verwerfen'`: lokale Daten gehören einem **anderen** Konto → löschen, nur
 *   den Server-Stand laden, nichts mergen.
 * @param {{userId:number|string}|null} besitzer
 * @param {number|string} userId
 * @returns {'uebernehmen'|'behalten'|'verwerfen'}
 */
export function entscheideNachLogin(besitzer, userId) {
  if (!besitzer) return 'uebernehmen';
  return String(besitzer.userId) === String(userId) ? 'behalten' : 'verwerfen';
}
