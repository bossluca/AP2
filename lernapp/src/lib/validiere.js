/**
 * Zentrale, reine Bereinigung aller Daten, die von außen in die App kommen
 * (C4 / Befund S20): Backup-Import, Server-Antworten (`/api/progress`,
 * `/api/gamification`, `/api/daten`) und – defensiv – der eigene localStorage.
 *
 * Grundsatz: **bereinigen statt ablehnen.** Ungültige Teile (ein Feld, eine
 * Karte, ein Eintrag) werden verworfen und gezählt, gültige bleiben. Zahlen
 * außerhalb des Wertebereichs werden geklemmt statt verworfen, damit Nutzer
 * durch die Prüfung keinen Fortschritt verlieren.
 *
 * Wertebereiche und erlaubte Werte sind **identisch** zum Server-Modul
 * `server/src/lib/validierung.js` (C3). Gespiegelt statt importiert, weil der
 * Docker-Build des Frontends nur `lernapp/` kennt; `validiere.test.js` prüft
 * beide Module gegeneinander. Ein bereinigter Eintrag besteht damit immer die
 * Server-Validierung.
 *
 * Alle Funktionen werfen nie und verändern ihre Eingaben nicht.
 */

/** Erlaubte Lernstatus (= Server `PROGRESS_STATUS`). */
export const PROGRESS_STATUS = Object.freeze(['gelernt', 'ueben']);

/** Grenzen für Fortschritts-Einträge (= Server `PROGRESS_REGELN`). */
export const PROGRESS_REGELN = Object.freeze({
  itemIdMaxLaenge: 100,
  historyMax: 20,
  textMaxLaenge: 40,
  boxMin: 1,
  boxMax: 5,
  stabilityMin: 0.01,
  stabilityMax: 36500,
  difficultyMin: 1,
  difficultyMax: 10,
  zaehlerMax: 100000,
});

/** Höchstzahl an Fortschritts-Einträgen (= Server `PROGRESS_GRENZEN.maxEintraege`). */
export const PROGRESS_MAX_EINTRAEGE = 5000;

/** Grenzen für den Gamification-Stand (= Server `GAMI_REGELN`). */
export const GAMI_REGELN = Object.freeze({
  activityMaxTage: 400,
  activityMaxWert: 100000,
  xpMax: 10_000_000,
  klausurBestMax: 100000,
});

/** Grenzen für eigene Kartenstapel (nur Client; Server deckelt die JSON-Größe). */
export const STAPEL_REGELN = Object.freeze({
  maxStapel: 50,
  maxKartenJeStapel: 2000,
  idMaxLaenge: 60,
  nameMaxLaenge: 200,
  textMaxLaenge: 5000,
});

/** Grenzen für die Einstufung (Lernplan). */
export const EINSTUFUNG_REGELN = Object.freeze({
  maxThemen: 100,
  idMaxLaenge: 100,
  titelMaxLaenge: 200,
  zaehlerMax: 10000,
});

const NIVEAUS = ['stark', 'mittel', 'schwach'];

// Identisch zum Server (`ITEM_ID_MUSTER`, `ISO_MUSTER`, `TAG_MUSTER`).
export const ITEM_ID_MUSTER = /^[\p{L}\p{N}_.:-]+$/u;
const ISO_MUSTER = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const TAG_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

/** Schlüssel, die nie in ein Ergebnisobjekt geschrieben werden (Prototyp-Verschmutzung). */
export const VERBOTENE_SCHLUESSEL = Object.freeze(['__proto__', 'constructor', 'prototype']);

const istObjekt = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Darf `key` als Objekt-Schlüssel übernommen werden? */
export function istSichererSchluessel(key) {
  return typeof key === 'string' && !VERBOTENE_SCHLUESSEL.includes(key);
}

/** Begrenzt `x` auf [lo, hi]. */
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/** Endliche Zahl (Strings wie "3" werden akzeptiert) oder null. */
function alsZahl(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Text aus String/Zahl (gekürzt, getrimmt) – Objekte/Listen ergeben null. */
function alsText(v, max) {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).trim().slice(0, max);
  return s.length > 0 ? s : null;
}

/**
 * Ist `v` ein gültiger ISO-Zeitstempel (wie Server `istIsoDatum`)?
 * @param {unknown} v
 */
export function istIsoDatum(v) {
  return typeof v === 'string' && v.length <= 40 && ISO_MUSTER.test(v) && Number.isFinite(Date.parse(v));
}

/**
 * Normalisiert ein Datum: gültige ISO-Strings bleiben unverändert, andere
 * parsebare Werte werden zu `toISOString()`, alles andere ergibt null.
 * @param {unknown} v
 * @returns {string|null}
 */
export function bereinigeDatum(v) {
  if (istIsoDatum(v)) return v;
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  if (typeof v === 'string' && v.length > 40) return null;
  const t = typeof v === 'number' ? v : Date.parse(v);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  if (!Number.isFinite(d.getTime())) return null;
  const iso = d.toISOString();
  return istIsoDatum(iso) ? iso : null;
}

/**
 * Gültige Fortschritts-/Karten-ID (wie Server `pruefeItemId`, zusätzlich ohne
 * `__proto__`/`constructor`/`prototype`)?
 * @param {unknown} id
 */
export function istGueltigeId(id, max = PROGRESS_REGELN.itemIdMaxLaenge) {
  return (
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= max &&
    ITEM_ID_MUSTER.test(id) &&
    istSichererSchluessel(id)
  );
}

/** Ist `key` ein echtes Kalenderdatum `YYYY-MM-DD` (wie Server `istTagesKey`)? */
export function istTagesKey(key) {
  if (typeof key !== 'string' || !TAG_MUSTER.test(key)) return false;
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === key;
}

// --- Fortschritt -------------------------------------------------------------

/**
 * Bereinigt einen Fortschritts-Eintrag: nur bekannte Felder, jedes Feld
 * einzeln geprüft. Zahlen werden geklemmt, ungültige Felder verworfen.
 *
 * @param {unknown} entry
 * @returns {Object|null} bereinigter Eintrag oder null (kein Objekt / nichts Gültiges).
 */
export function bereinigeProgressEintrag(entry) {
  if (!istObjekt(entry)) return null;
  const R = PROGRESS_REGELN;
  const e = {};

  if (PROGRESS_STATUS.includes(entry.status)) e.status = entry.status;

  const box = alsZahl(entry.box);
  if (box !== null) e.box = clamp(Math.round(box), R.boxMin, R.boxMax);

  for (const feld of ['due', 'lastSeen', 'last_review', 'updatedAt']) {
    const d = bereinigeDatum(entry[feld]);
    if (d) e[feld] = d;
  }

  const lastResult = alsText(entry.lastResult, R.textMaxLaenge);
  if (lastResult) e.lastResult = lastResult;

  const stability = alsZahl(entry.stability);
  const difficulty = alsZahl(entry.difficulty);
  // FSRS braucht beide Größen. Endliche Werte werden geklemmt (z. B.
  // difficulty 0 → 1, damit `fsrs.js` kein NaN rechnet); fehlt eine, entfallen
  // beide und `bewerten` fällt auf die Box-Migration bzw. Startwerte zurück.
  if (stability !== null && difficulty !== null) {
    e.stability = clamp(stability, R.stabilityMin, R.stabilityMax);
    e.difficulty = clamp(difficulty, R.difficultyMin, R.difficultyMax);
  }

  for (const feld of ['reps', 'lapses']) {
    const n = alsZahl(entry[feld]);
    if (n !== null) e[feld] = clamp(Math.round(n), 0, R.zaehlerMax);
  }

  if (Array.isArray(entry.history)) {
    const history = [];
    for (const h of entry.history) {
      if (!istObjekt(h)) continue;
      const ts = bereinigeDatum(h.ts);
      const result = alsText(h.result, R.textMaxLaenge);
      if (ts && result) history.push({ ts, result });
    }
    if (history.length > 0) e.history = history.slice(-R.historyMax);
  }

  return Object.keys(e).length > 0 ? e : null;
}

/**
 * Bereinigt eine komplette Fortschritts-Map (ID → Eintrag). Ungültige IDs und
 * Einträge fallen heraus; höchstens {@link PROGRESS_MAX_EINTRAEGE} (jüngste zuerst).
 *
 * @param {unknown} map
 * @param {{maxEintraege?:number}} [opt]  `maxEintraege: Infinity` beim Lesen des
 *        eigenen localStorage (dort nichts kürzen, nur reparieren).
 * @returns {{progress:Object<string,Object>, uebernommen:number, verworfen:number}}
 */
export function bereinigeProgress(map, { maxEintraege = PROGRESS_MAX_EINTRAEGE } = {}) {
  const progress = {};
  if (!istObjekt(map)) return { progress, uebernommen: 0, verworfen: 0 };
  let verworfen = 0;
  const gueltig = [];
  for (const [id, entry] of Object.entries(map)) {
    const sauber = istGueltigeId(id) ? bereinigeProgressEintrag(entry) : null;
    if (sauber) gueltig.push([id, sauber]);
    else verworfen += 1;
  }
  if (gueltig.length > maxEintraege) {
    const zeit = (e) => Date.parse(e.updatedAt || e.lastSeen || '') || 0;
    gueltig.sort((a, b) => zeit(b[1]) - zeit(a[1]));
    verworfen += gueltig.length - maxEintraege;
    gueltig.length = maxEintraege;
  }
  for (const [id, e] of gueltig) progress[id] = e;
  return { progress, uebernommen: gueltig.length, verworfen };
}

// --- Gamification ------------------------------------------------------------

/**
 * Bereinigt den Gamification-Stand: `activity` nur mit echten Tagen
 * (`YYYY-MM-DD`), Werte geklemmt, die jüngsten 400 Tage; xp/klausurBest
 * ganzzahlig und geklemmt (wie Server `pruefeGamification`).
 *
 * @param {unknown} g
 * @param {{maxTage?:number}} [opt]  `maxTage: Infinity` beim Lesen des eigenen
 *        localStorage (dort nichts kürzen, nur reparieren).
 * @returns {{stand:{activity:Object<string,number>, xp:number, klausurBest:number}, verworfen:number}}
 */
export function bereinigeGamification(g, { maxTage = GAMI_REGELN.activityMaxTage } = {}) {
  const R = GAMI_REGELN;
  const quelle = istObjekt(g) ? g : {};
  let verworfen = 0;
  const tage = [];
  if (istObjekt(quelle.activity)) {
    for (const [tag, wert] of Object.entries(quelle.activity)) {
      const n = alsZahl(wert);
      if (istTagesKey(tag) && n !== null) tage.push([tag, clamp(n, 0, R.activityMaxWert)]);
      else verworfen += 1;
    }
  }
  tage.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (tage.length > maxTage) {
    verworfen += tage.length - maxTage;
    tage.splice(0, tage.length - maxTage);
  }
  const activity = {};
  for (const [tag, n] of tage) activity[tag] = n;
  const zahl = (v, max) => {
    const n = alsZahl(v);
    return n === null ? 0 : Math.floor(clamp(n, 0, max));
  };
  return {
    stand: { activity, xp: zahl(quelle.xp, R.xpMax), klausurBest: zahl(quelle.klausurBest, R.klausurBestMax) },
    verworfen,
  };
}

// --- Eigene Kartenstapel -----------------------------------------------------

/**
 * Bereinigt eine einzelne Karte `{id, front, back}`.
 * @param {unknown} k
 * @returns {{id:string, front:string, back:string}|null}
 */
export function bereinigeKarte(k) {
  if (!istObjekt(k) || !istGueltigeId(k.id)) return null;
  const front = alsText(k.front, STAPEL_REGELN.textMaxLaenge);
  const back = alsText(k.back, STAPEL_REGELN.textMaxLaenge);
  if (!front || !back) return null;
  return { id: k.id, front, back };
}

/**
 * Bereinigt einen Stapel `{id, name, erstellt, karten}`. Ungültige Karten
 * fallen heraus (gezählt); ein Stapel ohne gültige ID oder ohne Kartenliste
 * wird verworfen.
 *
 * @param {unknown} s
 * @returns {{stapel:Object|null, verworfeneKarten:number}}
 */
export function bereinigeStapel(s) {
  const R = STAPEL_REGELN;
  if (!istObjekt(s) || !istGueltigeId(s.id, R.idMaxLaenge) || !Array.isArray(s.karten)) {
    return { stapel: null, verworfeneKarten: 0 };
  }
  const karten = [];
  const ids = new Set();
  let verworfeneKarten = 0;
  for (const k of s.karten) {
    const sauber = karten.length < R.maxKartenJeStapel ? bereinigeKarte(k) : null;
    if (sauber && !ids.has(sauber.id)) {
      ids.add(sauber.id);
      karten.push(sauber);
    } else verworfeneKarten += 1;
  }
  const stapel = {
    id: s.id,
    name: alsText(s.name, R.nameMaxLaenge) || 'Eigener Stapel',
    karten,
  };
  const erstellt = bereinigeDatum(s.erstellt);
  if (erstellt) stapel.erstellt = erstellt;
  return { stapel, verworfeneKarten };
}

/**
 * Bereinigt eine Stapel-Liste (max. {@link STAPEL_REGELN}.maxStapel, IDs eindeutig).
 * @param {unknown} liste
 * @returns {{stapel:Object[], verworfen:number}}  `verworfen` zählt Stapel und Karten.
 */
export function bereinigeStapelListe(liste) {
  const stapel = [];
  if (!Array.isArray(liste)) return { stapel, verworfen: 0 };
  const ids = new Set();
  let verworfen = 0;
  for (const s of liste) {
    const r = stapel.length < STAPEL_REGELN.maxStapel ? bereinigeStapel(s) : { stapel: null, verworfeneKarten: 0 };
    verworfen += r.verworfeneKarten;
    if (r.stapel && !ids.has(r.stapel.id)) {
      ids.add(r.stapel.id);
      stapel.push(r.stapel);
    } else verworfen += 1;
  }
  return { stapel, verworfen };
}

// --- Einstufung --------------------------------------------------------------

/** Niveau aus der Quote (gleiche Schwellen wie `einstufung.niveauAusQuote`). */
function niveauAusQuote(quote) {
  if (quote >= 0.8) return 'stark';
  if (quote >= 0.5) return 'mittel';
  return 'schwach';
}

/**
 * Bereinigt eine gespeicherte Einstufung `{datum, auswertung:{themen, richtig,
 * gesamt, quote}}`. Ohne gültiges Datum oder ohne Themen-Liste → null (der
 * Lernplan lässt sich daraus nicht berechnen). Einzelne kaputte Themen fallen
 * heraus, Quoten werden auf 0..1 geklemmt.
 *
 * @param {unknown} e
 * @returns {{datum:string, auswertung:{themen:Object[], richtig:number, gesamt:number, quote:number}}|null}
 */
export function bereinigeEinstufung(e) {
  const R = EINSTUFUNG_REGELN;
  if (!istObjekt(e) || !istObjekt(e.auswertung) || !Array.isArray(e.auswertung.themen)) return null;
  const datum = bereinigeDatum(e.datum);
  if (!datum) return null;
  const zaehler = (v) => {
    const n = alsZahl(v);
    return n === null ? 0 : Math.round(clamp(n, 0, R.zaehlerMax));
  };
  const themen = [];
  const ids = new Set();
  for (const t of e.auswertung.themen) {
    if (themen.length >= R.maxThemen) break;
    if (!istObjekt(t)) continue;
    const id = alsText(t.id, R.idMaxLaenge);
    if (!id || !istSichererSchluessel(id) || ids.has(id)) continue;
    const gesamt = zaehler(t.gesamt);
    const richtig = Math.min(zaehler(t.richtig), gesamt);
    const q = alsZahl(t.quote);
    const quote = q === null ? (gesamt > 0 ? richtig / gesamt : 0) : clamp(q, 0, 1);
    ids.add(id);
    themen.push({
      id,
      titel: alsText(t.titel, R.titelMaxLaenge) || id,
      richtig,
      gesamt,
      quote,
      niveau: NIVEAUS.includes(t.niveau) ? t.niveau : niveauAusQuote(quote),
    });
  }
  const gesamt = themen.reduce((s, t) => s + t.gesamt, 0);
  const richtig = themen.reduce((s, t) => s + t.richtig, 0);
  const q = alsZahl(e.auswertung.quote);
  return {
    datum,
    auswertung: {
      themen,
      richtig,
      gesamt,
      quote: q === null ? (gesamt > 0 ? richtig / gesamt : 0) : clamp(q, 0, 1),
    },
  };
}
