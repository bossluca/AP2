/**
 * Reine, React-freie Spaced-Repetition-Logik (Leitner-System, 5 Boxen).
 *
 * Idee: Jedes Lernobjekt liegt in einer Box 1–5. Richtig beantwortet → eine Box
 * höher (längeres Intervall), falsch → zurück in Box 1. Das nächste Fälligkeits-
 * datum ergibt sich aus dem Box-Intervall. Neue Objekte (ohne Box) gelten als
 * sofort fällig.
 *
 * Bewusst ohne Abhängigkeit vom Progress-Context, damit unit-testbar.
 */

/** Anzahl der Leitner-Boxen. */
export const MAX_BOX = 5;

/**
 * Wiederholungsintervall je Box in Tagen (Box 1 → Index 0 … Box 5 → Index 4).
 * Box 5 gilt als „sicher gelernt" und wird selten wiederholt.
 */
export const LEITNER_INTERVALS_TAGE = [1, 2, 4, 8, 16];

/**
 * Nächste Box nach einer Bewertung.
 * @param {number|undefined} aktuelleBox  bisherige Box (oder undefined = neu).
 * @param {boolean} gewusst               true = richtig beantwortet.
 * @returns {number} neue Box (1..MAX_BOX).
 */
export function naechsteBox(aktuelleBox, gewusst) {
  if (!gewusst) return 1;
  const base = Number.isInteger(aktuelleBox) && aktuelleBox >= 1 ? aktuelleBox : 0;
  return Math.min(base + 1, MAX_BOX);
}

/** Mitternacht des übergebenen Datums (lokale Zeit), als neue Date-Instanz. */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Fälligkeitsdatum (ISO) für eine Box, ausgehend von `ab`.
 * @param {number} box
 * @param {Date} [ab]  Bezugszeitpunkt (Default: jetzt).
 * @returns {string} ISO-Zeitstempel zu Tagesbeginn des Fälligkeitstags.
 */
export function faelligAb(box, ab = new Date()) {
  const idx = Math.min(Math.max(box, 1), MAX_BOX) - 1;
  const tage = LEITNER_INTERVALS_TAGE[idx];
  const d = startOfDay(ab);
  d.setDate(d.getDate() + tage);
  return d.toISOString();
}

/**
 * Ist ein Eintrag aktuell fällig? Neue Einträge (ohne Box/`due`) sind fällig.
 * @param {{box?:number, due?:string}|null|undefined} entry
 * @param {Date} [jetzt]
 * @returns {boolean}
 */
export function istFaellig(entry, jetzt = new Date()) {
  if (!entry || entry.box == null || !entry.due) return true;
  return new Date(entry.due).getTime() <= jetzt.getTime();
}

/**
 * Berechnet den neuen Fortschritts-Eintrag nach einer SRS-Bewertung.
 * @param {{box?:number}|null|undefined} entry  bisheriger Eintrag.
 * @param {boolean} gewusst
 * @param {Date} [jetzt]
 * @returns {{box:number, due:string}} aktualisierte SRS-Felder.
 */
export function bewerten(entry, gewusst, jetzt = new Date()) {
  const box = naechsteBox(entry?.box, gewusst);
  return { box, due: faelligAb(box, jetzt) };
}
