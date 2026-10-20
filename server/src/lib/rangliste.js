/**
 * Reine Helfer für die opt-in Wochen-Rangliste (testbar, ohne DB).
 */

/** Anzeigename: 3–20 Zeichen, Buchstaben (inkl. Umlaute), Ziffern, Leerzeichen, `_ . -`. */
const NAME_RE = /^[A-Za-zÄÖÜäöüß0-9 _.-]{3,20}$/;

/**
 * Prüft und normalisiert einen Anzeigenamen.
 * @param {unknown} name
 * @returns {string|null} getrimmter Name oder null, wenn ungültig.
 */
export function pruefeAnzeigename(name) {
  if (typeof name !== 'string') return null;
  const n = name.trim().replace(/\s+/g, ' ');
  return NAME_RE.test(n) ? n : null;
}

/** `YYYY-MM-DD` eines Datums (UTC – Server-Sicht; ±1 Tag Toleranz ist ok). */
function tagesKey(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Lernpunkte der letzten 7 Tage (heute eingeschlossen) aus dem Aktivitäts-Log
 * `{ 'YYYY-MM-DD': anzahl }` des Clients.
 * @param {Object<string, number>} activity
 * @param {Date} [heute]
 * @returns {number}
 */
export function wochenPunkte(activity, heute = new Date()) {
  if (!activity || typeof activity !== 'object') return 0;
  let summe = 0;
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(heute.getTime() - i * 24 * 60 * 60 * 1000);
    const n = Number(activity[tagesKey(d)]);
    if (Number.isFinite(n) && n > 0) summe += Math.floor(n);
  }
  return summe;
}

/**
 * Sortiert Einträge absteigend nach Wochenpunkten (Gleichstand: XP, dann Name)
 * und vergibt Ränge (gleiche Punkte+XP = gleicher Rang).
 * @param {{id:number, anzeigename:string, punkte:number, xp:number}[]} eintraege
 */
export function rangiere(eintraege) {
  const sortiert = [...eintraege].sort(
    (a, b) => b.punkte - a.punkte || b.xp - a.xp || a.anzeigename.localeCompare(b.anzeigename, 'de')
  );
  let rang = 0;
  return sortiert.map((e, i) => {
    const vor = sortiert[i - 1];
    if (!vor || vor.punkte !== e.punkte || vor.xp !== e.xp) rang = i + 1;
    return { ...e, rang };
  });
}
