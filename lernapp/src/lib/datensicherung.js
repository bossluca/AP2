/**
 * Fortschritts-Backup als JSON: bauen (Export) und tolerant, aber streng
 * genug einlesen (Import). Rein & getestet – Datei-/Browser-Handling
 * (Download, FileReader) liegt in der UI-Komponente.
 *
 * Format: { format: 'fisidev-backup', version: 1, exportiertAm,
 *           progress: ProgressMap, gamification: {activity,xp,klausurBest} }
 */

export const BACKUP_FORMAT = 'fisidev-backup';
export const BACKUP_VERSION = 1;

/**
 * Baut das Export-Objekt aus den rohen Ständen.
 * @param {Object} progress      ProgressMap (Frage-ID → Eintrag).
 * @param {Object} gamification  Roher Gamification-Stand.
 * @param {Date}   [jetzt]       Injizierbar für Tests.
 */
export function baueExport(progress, gamification, jetzt = new Date()) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportiertAm: jetzt.toISOString(),
    progress: progress && typeof progress === 'object' ? progress : {},
    gamification: gamification && typeof gamification === 'object' ? gamification : {},
  };
}

/**
 * Dateiname für den Download, z. B. `fisidev-backup-2026-07-04.json`.
 * @param {Date} [jetzt]
 */
export function exportDateiname(jetzt = new Date()) {
  return `fisidev-backup-${jetzt.toISOString().slice(0, 10)}.json`;
}

/**
 * Liest einen Backup-Text ein und validiert ihn defensiv.
 * @param {string} text  Roh-Inhalt der Datei.
 * @returns {{ok:true, progress:Object, gamification:Object, anzahl:number}
 *          |{ok:false, fehler:string}}
 */
export function parseImport(text) {
  let daten;
  try {
    daten = JSON.parse(text);
  } catch {
    return { ok: false, fehler: 'Die Datei ist kein gültiges JSON.' };
  }
  if (!daten || typeof daten !== 'object') {
    return { ok: false, fehler: 'Die Datei enthält kein Backup-Objekt.' };
  }
  if (daten.format !== BACKUP_FORMAT) {
    return { ok: false, fehler: 'Das ist kein FiSi.dev-Backup (Format-Kennung fehlt).' };
  }
  if (Number(daten.version) > BACKUP_VERSION) {
    return {
      ok: false,
      fehler: 'Das Backup stammt aus einer neueren App-Version. Bitte App aktualisieren.',
    };
  }
  const progress = daten.progress && typeof daten.progress === 'object' ? daten.progress : {};
  // Nur objektförmige Einträge übernehmen (defekte Zeilen still verwerfen).
  const sauber = {};
  for (const [id, entry] of Object.entries(progress)) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) sauber[id] = entry;
  }
  const gamification =
    daten.gamification && typeof daten.gamification === 'object' ? daten.gamification : {};
  return { ok: true, progress: sauber, gamification, anzahl: Object.keys(sauber).length };
}
