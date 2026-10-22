/**
 * Boolesche Umgebungsvariable lesen (z. B. `REQUIRE_LOGIN`). Akzeptiert
 * `true/1/yes/ja/on` bzw. `false/0/no/nein/off` (Groß/klein egal). Unset,
 * leer oder unbekannt → `standard`.
 * @param {string|undefined} wert
 * @param {boolean} [standard=false]
 * @returns {boolean}
 */
export function schalterAusEnv(wert, standard = false) {
  const w = String(wert ?? '').trim().toLowerCase();
  if (['true', '1', 'yes', 'ja', 'on'].includes(w)) return true;
  if (['false', '0', 'no', 'nein', 'off'].includes(w)) return false;
  return standard;
}
