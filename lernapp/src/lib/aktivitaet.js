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

/** Maximale gleichzeitig wirksame Streak-Freezes. */
export const MAX_FREEZES = 2;

/**
 * Verfügbare Streak-Freezes aus der Gesamt-Aktivität: einer je voller Lern-Woche
 * (7 aktive Tage), gedeckelt. „Gesund" gedacht – schützt den Streak, statt mit
 * Verlust-Angst zu spielen.
 * @param {number} aktiveTage
 * @returns {number}
 */
export function verfuegbareFreezes(aktiveTage) {
  return Math.min(MAX_FREEZES, Math.floor((aktiveTage || 0) / 7));
}

/**
 * Streak inkl. **Streak-Freeze**: bis zu `freezes` verpasste Tage werden über-
 * brückt (ein Freeze je Lücke), ohne den Streak zu brechen. Überbrückte Tage
 * zählen nicht zur Länge, halten den Streak aber am Leben. Liefert Länge **und**
 * verbrauchte Freezes (für die Anzeige). Mit `freezes = 0` exakt das alte Verhalten.
 * @param {Object<string, number>} log
 * @param {Date} [today]
 * @param {number} [freezes]
 * @returns {{streak:number, genutzt:number}}
 */
export function streakDetail(log, today = new Date(), freezes = 0) {
  if (!log) return { streak: 0, genutzt: 0 };
  const aktiv = (d) => (log[tagesKey(d)] || 0) > 0;

  // Anker: heute (wenn aktiv) – sonst ab gestern (heute hat noch Zeit, „lebendig").
  const start = aktiv(today) ? 0 : 1;

  let streak = 0;
  let genutzt = 0; // bestätigte (von einem weiteren aktiven Tag gedeckte) Freezes
  let pending = 0; // noch nicht bestätigte Lücken
  for (let i = start; i < 1000; i++) {
    if (aktiv(plusTage(today, -i))) {
      streak += 1;
      genutzt += pending; // Lücken davor sind jetzt bestätigt überbrückt
      pending = 0;
    } else if (genutzt + pending + 1 <= freezes) {
      pending += 1; // Lücke vorerst mit einem Freeze überbrücken
    } else {
      break; // kein Budget mehr → Streak endet
    }
  }
  return { streak, genutzt };
}

/**
 * Aktuelle Streak: aufeinanderfolgende Tage mit ≥ 1 Aktivität, endend heute
 * (oder gestern, solange heute noch Zeit ist). Mit `freezes > 0` überstehen
 * einzelne verpasste Tage den Streak (siehe {@link streakDetail}).
 * @param {Object<string, number>} log
 * @param {Date} [today]
 * @param {number} [freezes]
 * @returns {number}
 */
export function berechneStreak(log, today = new Date(), freezes = 0) {
  return streakDetail(log, today, freezes).streak;
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
