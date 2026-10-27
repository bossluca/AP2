/**
 * Reine Eingabe-Validierung für die Sync-Routen (C3 / Befund S19).
 *
 * Die erlaubten Werte sind aus dem Frontend abgeleitet:
 *  - `lernapp/src/context/ProgressContext.jsx` (status 'gelernt'|'ueben',
 *    lastResult, history mit max. 20 Einträgen `{ts, result}`, updatedAt)
 *  - `lernapp/src/lib/fsrs.js` (stability 0,1–36500, difficulty 1–10,
 *    reps/lapses ganzzahlig, box 1–5, due/last_review als ISO-Zeitstempel)
 *  - `lernapp/src/lib/srs.js` (Leitner: box 1–5, due)
 *  - `lernapp/src/lib/aktivitaet.js` (activity-Schlüssel `YYYY-MM-DD`)
 *
 * Alle Funktionen sind seiteneffektfrei und liefern entweder den bereinigten
 * Wert oder eine deutsche Fehlermeldung – nie eine Exception.
 */

/** Erlaubte Lernstatus (s. `setStatus` im ProgressContext). */
export const PROGRESS_STATUS = Object.freeze(['gelernt', 'ueben']);

/** Grenzen für Fortschritts-Einträge. */
export const PROGRESS_REGELN = Object.freeze({
  itemIdMaxLaenge: 100,
  historyMax: 20,
  textMaxLaenge: 40, // lastResult, history[].result
  boxMin: 1,
  boxMax: 5,
  stabilityMin: 0.01,
  stabilityMax: 36500,
  difficultyMin: 1,
  difficultyMax: 10,
  zaehlerMax: 100000, // reps, lapses
});

/** Grenzen für den Gamification-Stand. */
export const GAMI_REGELN = Object.freeze({
  activityMaxTage: 400,
  activityMaxWert: 100000,
  xpMax: 10_000_000,
  klausurBestMax: 100000,
});

// Buchstaben inkl. Umlaute (echte IDs wie „2022_Frühjahr_1a“), Ziffern, _ . : -
const ITEM_ID_MUSTER = /^[\p{L}\p{N}_.:-]+$/u;
// ISO-8601: Datum, optional mit Uhrzeit, Sekundenbruchteil und Zeitzone.
const ISO_MUSTER = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const TAG_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

const leer = (v) => v === undefined || v === null;
const istObjekt = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Ist `v` ein gültiger ISO-Zeitstempel (String, max. 40 Zeichen, parsebar)?
 * @param {unknown} v
 * @returns {boolean}
 */
export function istIsoDatum(v) {
  return typeof v === 'string' && v.length <= 40 && ISO_MUSTER.test(v) && Number.isFinite(Date.parse(v));
}

/**
 * Prüft eine Fortschritts-ID (`:itemId` bzw. Schlüssel der Merge-Map).
 * @param {unknown} itemId
 * @returns {string|null} Fehlermeldung oder null (gültig).
 */
export function pruefeItemId(itemId) {
  if (typeof itemId !== 'string' || itemId.length === 0) return 'itemId fehlt.';
  if (itemId.length > PROGRESS_REGELN.itemIdMaxLaenge) {
    return `itemId zu lang (max. ${PROGRESS_REGELN.itemIdMaxLaenge} Zeichen).`;
  }
  if (!ITEM_ID_MUSTER.test(itemId)) return 'itemId enthält unzulässige Zeichen.';
  return null;
}

function pruefeZahl(name, v, min, max, { ganz = false } = {}) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return `${name} muss eine Zahl sein.`;
  if (ganz && !Number.isInteger(v)) return `${name} muss eine ganze Zahl sein.`;
  if (v < min || v > max) return `${name} muss zwischen ${min} und ${max} liegen.`;
  return null;
}

function pruefeText(name, v, max) {
  if (typeof v !== 'string') return `${name} muss ein Text sein.`;
  if (v.length === 0 || v.length > max) return `${name} muss 1–${max} Zeichen lang sein.`;
  return null;
}

/**
 * Prüft einen Fortschritts-Eintrag aus dem Client und liefert eine bereinigte
 * Kopie, die nur bekannte Felder enthält (unbekannte Felder werden verworfen,
 * nicht abgelehnt – so bleiben ältere/neuere Clients kompatibel). Fehlende oder
 * `null`-Felder sind erlaubt.
 *
 * @param {unknown} entry
 * @returns {{eintrag: Object, fehler?: undefined} | {fehler: string, eintrag?: undefined}}
 */
export function pruefeProgressEintrag(entry) {
  if (!istObjekt(entry)) return { fehler: 'Eintrag muss ein Objekt sein.' };
  const R = PROGRESS_REGELN;
  const e = {};
  let f = null;

  if (!leer(entry.status)) {
    if (!PROGRESS_STATUS.includes(entry.status)) {
      return { fehler: `status muss einer von ${PROGRESS_STATUS.join(', ')} sein.` };
    }
    e.status = entry.status;
  }
  if (!leer(entry.box)) {
    if ((f = pruefeZahl('box', entry.box, R.boxMin, R.boxMax, { ganz: true }))) return { fehler: f };
    e.box = entry.box;
  }
  for (const [feld, name] of [
    ['due', 'due'],
    ['lastSeen', 'lastSeen'],
    ['last_review', 'last_review'],
    ['updatedAt', 'updatedAt'],
  ]) {
    if (leer(entry[feld])) continue;
    if (!istIsoDatum(entry[feld])) return { fehler: `${name} muss ein ISO-Datum sein.` };
    e[feld] = entry[feld];
  }
  if (!leer(entry.lastResult)) {
    if ((f = pruefeText('lastResult', entry.lastResult, R.textMaxLaenge))) return { fehler: f };
    e.lastResult = entry.lastResult;
  }
  if (!leer(entry.stability)) {
    if ((f = pruefeZahl('stability', entry.stability, R.stabilityMin, R.stabilityMax))) return { fehler: f };
    e.stability = entry.stability;
  }
  if (!leer(entry.difficulty)) {
    if ((f = pruefeZahl('difficulty', entry.difficulty, R.difficultyMin, R.difficultyMax))) return { fehler: f };
    e.difficulty = entry.difficulty;
  }
  for (const feld of ['reps', 'lapses']) {
    if (leer(entry[feld])) continue;
    if ((f = pruefeZahl(feld, entry[feld], 0, R.zaehlerMax, { ganz: true }))) return { fehler: f };
    e[feld] = entry[feld];
  }
  if (!leer(entry.history)) {
    if (!Array.isArray(entry.history)) return { fehler: 'history muss eine Liste sein.' };
    if (entry.history.length > R.historyMax) {
      return { fehler: `history darf höchstens ${R.historyMax} Einträge haben.` };
    }
    const history = [];
    for (const h of entry.history) {
      if (!istObjekt(h)) return { fehler: 'history-Einträge müssen Objekte sein.' };
      if (!istIsoDatum(h.ts)) return { fehler: 'history[].ts muss ein ISO-Datum sein.' };
      if ((f = pruefeText('history[].result', h.result, R.textMaxLaenge))) return { fehler: f };
      history.push({ ts: h.ts, result: h.result });
    }
    e.history = history;
  }
  return { eintrag: e };
}

/** Ist `key` ein echtes Kalenderdatum im Format YYYY-MM-DD? */
function istTagesKey(key) {
  if (!TAG_MUSTER.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

/**
 * Prüft den Gamification-Stand (`PUT /api/gamification`).
 *
 * `activity` mit mehr als 400 Tagen wird auf die **jüngsten 400 Tage gekürzt**
 * statt abgelehnt: Der Client kürzt sein Log nicht, ein langjähriger Nutzer
 * würde sonst dauerhaft nicht mehr synchronisieren (Streak/Rangliste brauchen
 * nur die letzten Tage). Fehlende Felder gelten als leer/0.
 *
 * @param {unknown} g
 * @returns {{stand: {activity: Object<string,number>, xp: number, klausurBest: number}, gekuerzt: number}
 *          | {fehler: string}}
 */
export function pruefeGamification(g) {
  if (!istObjekt(g)) return { fehler: 'Gamification-Stand muss ein Objekt sein.' };
  const R = GAMI_REGELN;
  let f = null;

  let activity = {};
  if (!leer(g.activity)) {
    if (!istObjekt(g.activity)) return { fehler: 'activity muss ein Objekt sein.' };
    for (const [tag, wert] of Object.entries(g.activity)) {
      if (!istTagesKey(tag)) return { fehler: `activity-Schlüssel „${tag.slice(0, 20)}“ ist kein Datum (YYYY-MM-DD).` };
      if ((f = pruefeZahl(`activity[${tag}]`, wert, 0, R.activityMaxWert))) return { fehler: f };
      activity[tag] = wert;
    }
  }
  const tage = Object.keys(activity).sort();
  const gekuerzt = Math.max(0, tage.length - R.activityMaxTage);
  if (gekuerzt > 0) {
    const behalten = {};
    for (const tag of tage.slice(-R.activityMaxTage)) behalten[tag] = activity[tag];
    activity = behalten;
  }

  let xp = 0;
  if (!leer(g.xp)) {
    if ((f = pruefeZahl('xp', g.xp, 0, R.xpMax))) return { fehler: f };
    xp = Math.floor(g.xp);
  }
  let klausurBest = 0;
  if (!leer(g.klausurBest)) {
    if ((f = pruefeZahl('klausurBest', g.klausurBest, 0, R.klausurBestMax))) return { fehler: f };
    klausurBest = Math.floor(g.klausurBest);
  }
  return { stand: { activity, xp, klausurBest }, gekuerzt };
}

/**
 * Ist `wert` strukturell ein Objekt oder eine Liste (für `/api/daten`)?
 * `null` bleibt erlaubt (= Wert löschen/leeren, bisheriges Verhalten).
 * @param {unknown} wert
 * @returns {boolean}
 */
export function istObjektOderListe(wert) {
  return wert === null || (typeof wert === 'object');
}
