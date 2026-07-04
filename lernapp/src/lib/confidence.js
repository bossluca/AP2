/**
 * Confidence-based Answering: Vor dem Aufdecken sagt der Lernende, ob er
 * sich sicher ist. Kombiniert mit „gewusst/nicht" ergibt das ein ehrlicheres
 * FSRS-Signal als die binäre Selbsteinschätzung – und deckt die gefährliche
 * **Fehl-Sicherheit** auf (sicher geglaubt, aber falsch), die in Prüfungen
 * die meisten Punkte kostet. Rein & getestet.
 */

/**
 * FSRS-Note (1 Nochmal · 2 Schwer · 3 Gut · 4 Leicht) aus Sicherheit + Ergebnis.
 * - sicher + gewusst  → 4 (saß wirklich locker)
 * - unsicher + gewusst → 3 (abgerufen, aber wackelig)
 * - nicht gewusst      → 1 (egal wie sicher man war – neu lernen)
 * @param {boolean} sicher
 * @param {boolean} gewusst
 * @returns {1|3|4}
 */
export function noteAusConfidence(sicher, gewusst) {
  if (!gewusst) return 1;
  return sicher ? 4 : 3;
}

/**
 * Gefährliche Fehl-Sicherheit: sicher geglaubt und trotzdem falsch.
 * @param {boolean} sicher
 * @param {boolean} gewusst
 */
export function istFehlSicherheit(sicher, gewusst) {
  return Boolean(sicher) && !gewusst;
}
