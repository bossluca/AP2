/**
 * Nicht-destruktives Merge zweier Fortschritts-Stände (Backup-Import,
 * Geräte-Wechsel): je Eintrag gewinnt der mit dem jüngeren Zeitstempel
 * (`updatedAt`, Fallback `lastSeen`); ohne vergleichbare Zeitstempel bleibt
 * der vorhandene Eintrag stehen (kein stilles Überschreiben). Rein & getestet.
 *
 * @param {Object.<string, Object>} basis     Aktueller Stand.
 * @param {Object.<string, Object>} eingehend Importierter/entfernter Stand.
 * @returns {Object.<string, Object>} Gemergter Stand (neues Objekt).
 */
export function mergeProgress(basis, eingehend) {
  const ergebnis = { ...(basis && typeof basis === 'object' ? basis : {}) };
  if (!eingehend || typeof eingehend !== 'object') return ergebnis;
  for (const [id, entry] of Object.entries(eingehend)) {
    if (!entry || typeof entry !== 'object') continue;
    const vorhanden = ergebnis[id];
    if (!vorhanden) {
      ergebnis[id] = entry;
      continue;
    }
    const tNeu = Date.parse(entry.updatedAt || entry.lastSeen || '') || 0;
    const tAlt = Date.parse(vorhanden.updatedAt || vorhanden.lastSeen || '') || 0;
    if (tNeu > tAlt) ergebnis[id] = entry;
  }
  return ergebnis;
}
