/**
 * FSRS (Free Spaced Repetition Scheduler) – modernes Gedächtnismodell für
 * Spaced Repetition. Ersetzt das pauschale Leitner-System: statt fixer
 * Box-Intervalle modelliert FSRS je Lernobjekt drei Größen
 *
 *   • Stabilität (S)        – wie viele Tage, bis die Abruf­wahrscheinlichkeit
 *                             von 100 % auf die Ziel-Retention fällt,
 *   • Schwierigkeit (D, 1–10) – wie schwer die Stabilität wächst,
 *   • Abrufwahrscheinlichkeit (R) – aktuelle Erinnerungs­chance,
 *
 * und plant die Wiederholung genau dann, wenn R auf die gewünschte Retention
 * (Default 90 %) gefallen ist. Bewertet wird 4-stufig (Nochmal/Schwer/Gut/Leicht).
 *
 * Reine, React-freie Mathematik (analog `lib/level.js`) → unit-testbar. Hält
 * dieselbe kleine Schnittstelle wie der Leitner-Adapter (`bewerten`/`istFaellig`),
 * sodass `ProgressContext` nur den Import tauscht. Alt-Daten aus dem Leitner-
 * System (`box`/`due`) werden beim ersten Review transparent migriert
 * (`box`-Intervall → Initial-Stabilität), daher importieren wir die Leitner-
 * Intervalle als zweiten Adapter an derselben Naht.
 *
 * Formeln & Default-Gewichte: FSRS-4.5/5 (Anki-Standard seit v23.10).
 */

import { LEITNER_INTERVALS_TAGE } from './srs';

/** Default-Gewichte w0…w18 (FSRS-4.5/5). */
export const FSRS_WEIGHTS = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

/** Abfall-Exponent der Vergessenskurve. */
export const DECAY = -0.5;
/** Kurven-Faktor: `0.9^(1/DECAY) - 1` = 19/81 → bei 90 % Retention gilt Intervall ≈ Stabilität. */
export const FACTOR = 19 / 81;
/** Standard-Ziel-Retention (Anteil, der beim Wiederholen noch erinnert werden soll). */
export const STANDARD_RETENTION = 0.9;
/** Obergrenze der Stabilität (≈ 100 Jahre) – verhindert Überlauf. */
export const MAX_STABILITY = 36500;
/** Anzahl der Stärke-Stufen (für die abgeleitete, abwärtskompatible „Box"-Anzeige). */
export const MAX_BOX = 5;

/** Bewertungsstufen (FSRS-Noten 1–4). */
export const NOTEN = { NOCHMAL: 1, SCHWER: 2, GUT: 3, LEICHT: 4 };

/** Mappt eine binäre „gewusst?"-Bewertung auf eine FSRS-Note (Gut bzw. Nochmal). */
export function noteAusGewusst(gewusst) {
  return gewusst ? NOTEN.GUT : NOTEN.NOCHMAL;
}

/** Begrenzt `x` auf [lo, hi]. */
function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

/** Normalisiert eine Note: boolean → FSRS-Note, sonst auf 1–4 begrenzte Ganzzahl. */
function alsNote(note) {
  if (typeof note === 'boolean') return noteAusGewusst(note);
  const n = Math.round(Number(note));
  return clamp(Number.isFinite(n) ? n : NOTEN.GUT, NOTEN.NOCHMAL, NOTEN.LEICHT);
}

/** Mitternacht (lokale Zeit) des Datums als neue Date-Instanz. */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Ganze Tage zwischen `lastIso` und `jetzt` (>= 0; 0 wenn unbekannt). */
function tageSeit(lastIso, jetzt) {
  if (!lastIso) return 0;
  const last = new Date(lastIso);
  if (Number.isNaN(last.getTime())) return 0;
  const ms = startOfDay(jetzt).getTime() - startOfDay(last).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Initiale Stabilität nach der ersten Bewertung: w[note-1]. */
function initStabilitaet(note, w) {
  return clamp(w[note - 1], 0.1, MAX_STABILITY);
}

/** Initiale Schwierigkeit nach der ersten Bewertung: w4 − e^(w5·(note−1)) + 1. */
function initSchwierigkeit(note, w) {
  return clamp(w[4] - Math.exp(w[5] * (note - 1)) + 1, 1, 10);
}

/**
 * Abrufwahrscheinlichkeit R nach `tage` Tagen bei Stabilität `stability`:
 * R = (1 + FACTOR · t/S)^DECAY. Bei t = 0 ist R = 1.
 * @returns {number} 0…1
 */
export function abrufwahrscheinlichkeit(stability, tage) {
  const S = Math.max(0.1, stability);
  const t = Math.max(0, tage);
  return Math.pow(1 + FACTOR * (t / S), DECAY);
}

/** Abrufwahrscheinlichkeit eines Fortschritts-Eintrags zum Zeitpunkt `jetzt` (oder null). */
export function abrufwahrscheinlichkeitEintrag(entry, jetzt = new Date()) {
  if (!Number.isFinite(entry?.stability)) return null;
  return abrufwahrscheinlichkeit(entry.stability, tageSeit(entry.last_review, jetzt));
}

/** Wiederholungs-Intervall (Tage) für eine Ziel-Retention; mind. 1 Tag. */
export function intervallTage(stability, retention = STANDARD_RETENTION) {
  const r = clamp(retention, 0.5, 0.99);
  const tage = (stability / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
  return clamp(Math.round(tage), 1, MAX_STABILITY);
}

/** Nächste Schwierigkeit nach Bewertung (mit Mittelwert-Rückkehr Richtung „Leicht"-Start). */
function naechsteSchwierigkeit(D, note, w) {
  const next = D - w[6] * (note - 3);
  const ziel = initSchwierigkeit(NOTEN.LEICHT, w); // Mittelwert-Anker
  return clamp(w[7] * ziel + (1 - w[7]) * next, 1, 10);
}

/** Neue Stabilität nach erfolgreichem Abruf (Note ≥ Schwer). */
function stabilitaetErfolg(D, S, R, note, w) {
  const hard = note === NOTEN.SCHWER ? w[15] : 1;
  const easy = note === NOTEN.LEICHT ? w[16] : 1;
  const wachstum =
    Math.exp(w[8]) *
    (11 - D) *
    Math.pow(S, -w[9]) *
    (Math.exp(w[10] * (1 - R)) - 1) *
    hard *
    easy;
  return clamp(S * (1 + wachstum), 0.1, MAX_STABILITY);
}

/** Neue (kleinere) Stabilität nach Vergessen (Note „Nochmal"). */
function stabilitaetMisserfolg(D, S, R, w) {
  const sNeu = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - R));
  // Ein Lapse darf die Stabilität nicht erhöhen.
  return clamp(Math.min(sNeu, S), 0.1, MAX_STABILITY);
}

/**
 * Leitet aus einem Fortschritts-Eintrag den FSRS-Vorzustand ab – oder `null`
 * für ein neues Objekt. Migriert Leitner-Altdaten (`box`) idempotent.
 */
function vorzustand(entry) {
  if (Number.isFinite(entry?.stability) && Number.isFinite(entry?.difficulty)) {
    return {
      S: entry.stability,
      D: entry.difficulty,
      reps: entry.reps || 0,
      lapses: entry.lapses || 0,
      last: entry.last_review || entry.lastSeen || null,
    };
  }
  if (Number.isInteger(entry?.box)) {
    // Migration: Box-Intervall ≈ Initial-Stabilität, mittlere Schwierigkeit.
    const idx = clamp(entry.box, 1, MAX_BOX) - 1;
    return {
      S: clamp(LEITNER_INTERVALS_TAGE[idx], 0.1, MAX_STABILITY),
      D: 5,
      reps: 0,
      lapses: 0,
      last: entry.last_review || entry.lastSeen || null,
    };
  }
  return null;
}

/** Stärke-Bucket (1–5) aus der Stabilität – nur für die abwärtskompatible Anzeige/Statistik. */
export function boxAusStabilitaet(S) {
  if (S < 1) return 1;
  if (S < 4) return 2;
  if (S < 16) return 3;
  if (S < 60) return 4;
  return 5;
}

/**
 * Ist ein Eintrag aktuell fällig? Neue Einträge (ohne `due`) sind fällig.
 * Identisch zum Leitner-Adapter (beide speichern `due`), daher abwärtskompatibel.
 */
export function istFaellig(entry, jetzt = new Date()) {
  if (!entry || !entry.due) return true;
  return new Date(entry.due).getTime() <= jetzt.getTime();
}

/**
 * Berechnet den neuen FSRS-Zustand nach einer Bewertung.
 *
 * @param {{stability?:number, difficulty?:number, reps?:number, lapses?:number,
 *          last_review?:string, box?:number, lastSeen?:string}|null|undefined} entry
 * @param {boolean|1|2|3|4} note  Bewertung (boolean → Gut/Nochmal; sonst FSRS-Note 1–4).
 * @param {Date} [jetzt]
 * @param {Object} [optionen]
 * @param {number}   [optionen.retention=0.9]  Ziel-Retention.
 * @param {number[]} [optionen.weights]        Eigene Gewichte (Default FSRS_WEIGHTS).
 * @param {1|2|3}    [optionen.objektSchwierigkeit]  Inhaltliche Schwierigkeit des
 *        Lernobjekts (Datenfeld `schwierigkeit`: 1 leicht · 2 mittel · 3 schwer).
 *        Fließt nur in die **Erstbewertung** ein (Prior für die FSRS-Schwierigkeit
 *        D: leicht −1 / schwer +1); danach lernt FSRS aus den Antworten selbst.
 * @returns {{stability:number, difficulty:number, due:string, reps:number,
 *            lapses:number, last_review:string, box:number}}
 */
export function bewerten(entry, note, jetzt = new Date(), optionen = {}) {
  const w = Array.isArray(optionen.weights) ? optionen.weights : FSRS_WEIGHTS;
  const retention = optionen.retention ?? STANDARD_RETENTION;
  const n = alsNote(note);
  const vor = vorzustand(entry);

  let S;
  let D;
  let reps;
  let lapses;

  if (!vor) {
    // Erstbewertung
    S = initStabilitaet(n, w);
    D = initSchwierigkeit(n, w);
    const os = optionen.objektSchwierigkeit;
    if (os === 1 || os === 2 || os === 3) {
      D = clamp(D + (os - 2), 1, 10);
    }
    reps = 1;
    lapses = n === NOTEN.NOCHMAL ? 1 : 0;
  } else {
    const R = abrufwahrscheinlichkeit(vor.S, tageSeit(vor.last, jetzt));
    S =
      n === NOTEN.NOCHMAL
        ? stabilitaetMisserfolg(vor.D, vor.S, R, w)
        : stabilitaetErfolg(vor.D, vor.S, R, n, w);
    D = naechsteSchwierigkeit(vor.D, n, w); // nutzt die alte Schwierigkeit
    reps = vor.reps + 1;
    lapses = vor.lapses + (n === NOTEN.NOCHMAL ? 1 : 0);
  }

  const tage = intervallTage(S, retention);
  const due = startOfDay(jetzt);
  due.setDate(due.getDate() + tage);

  return {
    stability: S,
    difficulty: D,
    due: due.toISOString(),
    reps,
    lapses,
    last_review: new Date(jetzt).toISOString(),
    box: boxAusStabilitaet(S),
  };
}
