/**
 * Fortschritts-Backup als JSON: bauen (Export) und tolerant, aber streng
 * genug einlesen (Import). Rein & getestet – Datei-/Browser-Handling
 * (Download, FileReader) liegt in der UI-Komponente.
 *
 * Format: { format: 'fisidev-backup', version: 1, exportiertAm,
 *           progress: ProgressMap, gamification: {activity,xp,klausurBest},
 *           eigeneKarten?: Stapel[], einstufung?: {datum, auswertung} }
 * Die beiden letzten Felder sind optional (additiv in v1 – ältere Backups
 * ohne sie bleiben gültig).
 */

import {
  bereinigeProgress,
  bereinigeGamification,
  bereinigeStapelListe,
  bereinigeEinstufung,
  istSichererSchluessel,
} from './validiere';

export const BACKUP_FORMAT = 'fisidev-backup';
/** Maximale Größe einer Backup-Datei (C4). */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const BACKUP_VERSION = 1;

/**
 * Baut das Export-Objekt aus den rohen Ständen.
 * @param {Object} progress      ProgressMap (Frage-ID → Eintrag).
 * @param {Object} gamification  Roher Gamification-Stand.
 * @param {Date}   [jetzt]       Injizierbar für Tests.
 */
export function baueExport(progress, gamification, jetzt = new Date(), extras = {}) {
  const { eigeneKarten = [], einstufung = null } = extras;
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportiertAm: jetzt.toISOString(),
    progress: progress && typeof progress === 'object' ? progress : {},
    gamification: gamification && typeof gamification === 'object' ? gamification : {},
    eigeneKarten: Array.isArray(eigeneKarten) ? eigeneKarten : [],
    einstufung: einstufung && einstufung.datum ? einstufung : null,
  };
}

/**
 * Eigene Kartenstapel zusammenführen: importierte Stapel mit neuer ID kommen
 * hinzu, vorhandene (gleiche ID) bleiben unverändert.
 * @param {Object[]} lokal
 * @param {Object[]} importiert
 */
export function mergeStapel(lokal, importiert) {
  const gueltig = (s) => s && istSichererSchluessel(s.id) && s.id && Array.isArray(s.karten);
  const basis = (Array.isArray(lokal) ? lokal : []).filter(gueltig);
  const ids = new Set(basis.map((s) => s.id));
  const neu = [];
  for (const s of Array.isArray(importiert) ? importiert : []) {
    if (gueltig(s) && !ids.has(s.id)) {
      ids.add(s.id);
      neu.push(s);
    }
  }
  return [...basis, ...neu];
}

/** Von zwei Einstufungen die jüngere (nach `datum`), null-sicher. */
export function neuereEinstufung(a, b) {
  const zeit = (e) => (e?.datum ? Date.parse(e.datum) : NaN);
  if (!Number.isFinite(zeit(a))) return Number.isFinite(zeit(b)) ? b : null;
  if (!Number.isFinite(zeit(b))) return a;
  return zeit(b) > zeit(a) ? b : a;
}

/**
 * Prüft die Dateigröße vor dem Einlesen.
 * @param {number} bytes
 * @returns {string|null} Fehlermeldung oder null.
 */
export function pruefeDateiGroesse(bytes) {
  if (Number.isFinite(bytes) && bytes > MAX_BACKUP_BYTES) {
    return `Die Datei ist zu groß (max. ${MAX_BACKUP_BYTES / 1024 / 1024} MB).`;
  }
  return null;
}

/**
 * Dateiname für den Download, z. B. `fisidev-backup-2026-07-04.json`.
 * @param {Date} [jetzt]
 */
export function exportDateiname(jetzt = new Date()) {
  return `fisidev-backup-${jetzt.toISOString().slice(0, 10)}.json`;
}

/**
 * Liest einen Backup-Text ein und bereinigt ihn (C4, `lib/validiere`):
 * ungültige Einträge, Stapel, Karten und Aktivitätstage werden verworfen und
 * gezählt, gültige übernommen, Zahlen geklemmt.
 * @param {string} text  Roh-Inhalt der Datei.
 * @returns {{ok:true, progress:Object, gamification:Object, eigeneKarten:Object[],
 *            einstufung:Object|null, anzahl:number, verworfen:number}
 *          |{ok:false, fehler:string}}
 */
export function parseImport(text) {
  if (typeof text !== 'string') return { ok: false, fehler: 'Die Datei konnte nicht gelesen werden.' };
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, fehler: pruefeDateiGroesse(text.length) };
  let daten;
  try {
    daten = JSON.parse(text);
  } catch {
    return { ok: false, fehler: 'Die Datei ist kein gültiges JSON.' };
  }
  if (!daten || typeof daten !== 'object' || Array.isArray(daten)) {
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
  const p = bereinigeProgress(daten.progress);
  const g = bereinigeGamification(daten.gamification);
  const k = bereinigeStapelListe(daten.eigeneKarten);
  const einstufung = bereinigeEinstufung(daten.einstufung);
  const einstufungVerworfen = daten.einstufung != null && !einstufung ? 1 : 0;
  return {
    ok: true,
    progress: p.progress,
    gamification: g.stand,
    eigeneKarten: k.stapel,
    einstufung,
    anzahl: p.uebernommen,
    verworfen: p.verworfen + g.verworfen + k.verworfen + einstufungVerworfen,
  };
}
