/**
 * Prüfungstermin – kleiner, rein lokaler Speicher (localStorage) plus eine reine
 * Countdown-Funktion. Damit lässt sich „noch N Tage bis zur AP2" anzeigen und ein
 * Tagesziel ableiten. Bewusst minimal & best-effort (Fehler werden geschluckt).
 */

const KEY = 'ap2_lernapp_pruefungstermin_v1';

/** Liest den gespeicherten Termin (ISO-Datum `YYYY-MM-DD`) oder `null`. */
export function ladePruefungstermin() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

/** Speichert den Termin (`YYYY-MM-DD`) oder löscht ihn (leerer/falsy Wert). */
export function setzePruefungstermin(datum) {
  try {
    if (datum) localStorage.setItem(KEY, datum);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Ganze Tage von heute (Tagesbeginn) bis zum Termin. Negativ = Termin vorbei,
 * 0 = heute. `null` bei fehlendem/ungültigem Datum.
 * @param {string|null|undefined} datum  ISO-Datum `YYYY-MM-DD`.
 * @param {Date} [now]
 * @returns {number|null}
 */
export function tageBisTermin(datum, now = new Date()) {
  if (!datum) return null;
  const ziel = new Date(`${datum}T00:00:00`);
  if (Number.isNaN(ziel.getTime())) return null;
  const heute = new Date(now);
  heute.setHours(0, 0, 0, 0);
  return Math.round((ziel.getTime() - heute.getTime()) / 86400000);
}
