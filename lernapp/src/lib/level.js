/**
 * XP & Level – belohnt Lernaktivität mit Erfahrungspunkten und einem Level.
 *
 * Tiefes Modul: Aufrufer brauchen nur `xpFuerErgebnis` (wie viel gibt eine
 * Bewertung?) und `berechneLevel` (welches Level + Fortschritt bei X XP?). Die
 * Level-Kurve ist Implementierungsdetail.
 *
 * Kurve: Stufe `level` benötigt `50 * level` XP, bis zur nächsten Stufe. Die
 * Gesamtschwelle, um Level `n` zu erreichen, ist damit `25 * n * (n-1)`
 * (0, 50, 150, 300, 500, …).
 */

/** XP je Selbsteinschätzung – auch falsch gibt etwas (Übung zählt). */
const XP_PRO_ERGEBNIS = { richtig: 10, teilweise: 5, falsch: 2 };

/**
 * Erfahrungspunkte für ein Ergebnis.
 * @param {'richtig'|'teilweise'|'falsch'|'gewusst'|'nicht'} ergebnis
 * @returns {number}
 */
export function xpFuerErgebnis(ergebnis) {
  if (ergebnis === 'gewusst') return XP_PRO_ERGEBNIS.richtig;
  if (ergebnis === 'nicht') return XP_PRO_ERGEBNIS.falsch;
  return XP_PRO_ERGEBNIS[ergebnis] ?? 0;
}

/** Gesamt-XP-Schwelle, um Level `n` zu erreichen. */
function schwelle(n) {
  return 25 * n * (n - 1);
}

/**
 * @typedef {Object} LevelStand
 * @property {number} level         Aktuelles Level (≥ 1).
 * @property {number} xpGesamt      Gesamte gesammelte XP.
 * @property {number} xpImLevel     XP innerhalb des aktuellen Levels.
 * @property {number} xpFuerLevel   XP, die das aktuelle Level umfasst.
 * @property {number} xpBisNaechstes XP bis zum nächsten Level.
 * @property {number} fortschritt   Fortschritt im Level (0–1).
 */

/**
 * Ermittelt Level und Fortschritt aus einer XP-Gesamtzahl.
 * @param {number} xp
 * @returns {LevelStand}
 */
export function berechneLevel(xp) {
  const gesamt = Math.max(0, Math.floor(Number(xp) || 0));
  // Größtes n mit schwelle(n) <= gesamt (geschlossene Form der quadratischen Lösung).
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (4 * gesamt) / 25)) / 2));
  const start = schwelle(level);
  const next = schwelle(level + 1);
  const xpFuerLevel = next - start; // = 50 * level
  const xpImLevel = gesamt - start;
  return {
    level,
    xpGesamt: gesamt,
    xpImLevel,
    xpFuerLevel,
    xpBisNaechstes: xpFuerLevel - xpImLevel,
    fortschritt: xpFuerLevel > 0 ? xpImLevel / xpFuerLevel : 0,
  };
}
