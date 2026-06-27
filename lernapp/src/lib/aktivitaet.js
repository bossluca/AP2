/**
 * Lern-Aktivität: Streak, Tagesziel und Heatmap.
 *
 * Datenbasis ist ein einfaches Log `{ 'YYYY-MM-DD': anzahl }` (lokale Tage), das
 * bei jeder bewerteten Karte/Frage hochgezählt wird (siehe `ProgressContext`).
 * Alle Funktionen sind rein und arbeiten mit lokalen Datumsangaben (kein UTC-Shift).
 */

/** Standard-Tagesziel (bewertete Lernobjekte pro Tag). */
export const STANDARD_TAGESZIEL = 20;

/** Datum ohne Uhrzeit (lokale Mitternacht). */
function ohneZeit(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Liefert ein neues Datum um `n` Tage verschoben (lokal, ohne Uhrzeit). */
function plusTage(date, n) {
  const d = ohneZeit(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Lokaler Tagesschlüssel im Format `YYYY-MM-DD`. */
export function tagesKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Erhöht den Zähler des angegebenen Tages (Default heute) um `n`.
 * Rein – gibt ein neues Log-Objekt zurück.
 * @param {Object<string, number>} log
 * @param {number} [n]
 * @param {Date} [date]
 */
export function addAktivitaet(log, n = 1, date = new Date()) {
  const key = tagesKey(date);
  const prev = (log && log[key]) || 0;
  return { ...(log || {}), [key]: prev + n };
}

/** Anzahl Aktivitäten an einem Tag (Default heute). */
export function heuteAnzahl(log, date = new Date()) {
  return (log && log[tagesKey(date)]) || 0;
}

/**
 * Aktuelle Streak: aufeinanderfolgende Tage mit ≥ 1 Aktivität, endend heute.
 * „Lebendig" auch, wenn heute noch nichts getan wurde, aber gestern – dann zählt
 * ab gestern (der Streak bricht erst, wenn ein ganzer Tag ohne Aktivität vergeht).
 * @param {Object<string, number>} log
 * @param {Date} [today]
 * @returns {number}
 */
export function berechneStreak(log, today = new Date()) {
  if (!log) return 0;
  const aktiv = (d) => ((log[tagesKey(d)] || 0) > 0);

  let start = 0; // 0 = ab heute zählen
  if (!aktiv(today)) {
    if (aktiv(plusTage(today, -1))) start = 1; // heute offen, aber gestern aktiv
    else return 0;
  }

  let streak = 0;
  let i = start;
  while (aktiv(plusTage(today, -i))) {
    streak += 1;
    i += 1;
  }
  return streak;
}

/** Gesamtzahl aktiver Tage (für Statistik/Badges). */
export function aktiveTage(log) {
  if (!log) return 0;
  return Object.values(log).filter((n) => n > 0).length;
}

/**
 * @typedef {Object} HeatmapTag
 * @property {string} date   `YYYY-MM-DD`.
 * @property {number} count  Aktivitäten an dem Tag.
 * @property {number} level  Intensitätsstufe 0–4 (0 = keine).
 */

/**
 * Baut Daten für eine Kalender-Heatmap (GitHub-Stil): volle Wochen (Mo–So),
 * endend mit der aktuellen Woche. Rückgabe als Wochen-Spalten für einfaches
 * Rendern (7 Zeilen = Wochentage Mo…So; `null` = außerhalb des Zeitraums).
 *
 * @param {Object<string, number>} [log]
 * @param {{ wochen?: number, today?: Date }} [opt]
 * @returns {{ weeks: (HeatmapTag|null)[][], max: number }}
 */
export function baueHeatmap(log = {}, { wochen = 13, today = new Date() } = {}) {
  const ende = ohneZeit(today);
  // Startpunkt: so weit zurück, dass `wochen` volle Wochen entstehen, auf Montag gerundet.
  let start = plusTage(ende, -(wochen * 7 - 1));
  const wochentagStart = (start.getDay() + 6) % 7; // Montag = 0 … Sonntag = 6
  start = plusTage(start, -wochentagStart);

  const tage = Math.round((ende.getTime() - start.getTime()) / 86_400_000) + 1;
  let max = 1;
  const flach = [];
  for (let i = 0; i < tage; i++) {
    const d = plusTage(start, i);
    const count = (log && log[tagesKey(d)]) || 0;
    if (count > max) max = count;
    flach.push({ date: tagesKey(d), count, weekday: (d.getDay() + 6) % 7 });
  }

  const weeks = [];
  for (const tag of flach) {
    if (tag.weekday === 0 || weeks.length === 0) weeks.push(new Array(7).fill(null));
    const level = tag.count === 0 ? 0 : Math.min(4, Math.ceil((tag.count / max) * 4));
    weeks[weeks.length - 1][tag.weekday] = { date: tag.date, count: tag.count, level };
  }
  return { weeks, max };
}
