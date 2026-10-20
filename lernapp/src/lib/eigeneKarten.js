/**
 * Eigene Kartenstapel (aus hochgeladenem PDF oder eingefügtem Text) –
 * gerätelokal im localStorage. Der Lernstand je Karte läuft über den normalen
 * Fortschritt (FSRS, `recordReview(karte.id)`), Karten-IDs haben das Präfix
 * `eigen_`. Reine Zustands-Funktionen + robuste Persistenz.
 */

import { meldeKontoDatenAenderung } from './kontoDaten';

const KEY = 'ap2_lernapp_eigene_karten_v1';

/** @typedef {{id:string, front:string, back:string}} EigeneKarte */
/** @typedef {{id:string, name:string, erstellt:string, karten:EigeneKarte[]}} Stapel */

/** Kurze, ausreichend eindeutige ID (Zeit + Zufall). */
function neueId(jetzt, rng) {
  return `${jetzt.getTime().toString(36)}${Math.floor(rng() * 1e6).toString(36)}`;
}

/**
 * Legt einen Stapel an (rein).
 * @param {Stapel[]} stapel
 * @param {string} name
 * @param {{front:string, back:string}[]} karten
 * @param {{jetzt?:Date, rng?:() => number}} [opt]
 * @returns {Stapel[]}
 */
export function stapelHinzufuegen(stapel, name, karten, { jetzt = new Date(), rng = Math.random } = {}) {
  const id = neueId(jetzt, rng);
  const sauber = (karten || [])
    .map((k) => ({ front: String(k.front || '').trim(), back: String(k.back || '').trim() }))
    .filter((k) => k.front && k.back);
  return [
    ...(stapel || []),
    {
      id,
      name: String(name || '').trim() || 'Eigener Stapel',
      erstellt: jetzt.toISOString(),
      karten: sauber.map((k, i) => ({ id: `eigen_${id}_${i}`, ...k })),
    },
  ];
}

/** Entfernt einen Stapel (rein). */
export function stapelEntfernen(stapel, id) {
  return (stapel || []).filter((s) => s.id !== id);
}

/** Alle Stapel laden (leer bei fehlendem/kaputtem Storage). */
export function ladeStapel() {
  try {
    const wert = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(wert) ? wert.filter((s) => s && s.id && Array.isArray(s.karten)) : [];
  } catch {
    return [];
  }
}

/**
 * Stapel speichern und (für den Konto-Sync) die Änderung melden.
 * @param {Stapel[]} stapel
 * @param {{melden?:boolean}} [opt]  `melden:false` beim Übernehmen des Server-Stands.
 * @returns {boolean} false, wenn der Speicher voll/gesperrt ist.
 */
export function speichereStapel(stapel, { melden = true } = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stapel || []));
    if (melden) meldeKontoDatenAenderung('eigeneKarten');
    return true;
  } catch {
    return false;
  }
}

/**
 * Lernreihenfolge eines Stapels: erst fällige, dann neue, dann der Rest (nach
 * nächster Fälligkeit). Nutzt die Fortschritts-Helfer (`getEntry`/`isDue`).
 * @param {Stapel} s
 * @param {{getEntry:(id:string)=>Object|undefined, isDue:(id:string)=>boolean}} helfer
 * @returns {{reihe:EigeneKarte[], faellig:number, neu:number}}
 */
export function lernReihe(s, { getEntry, isDue }) {
  const faellig = [];
  const neu = [];
  const rest = [];
  for (const k of s?.karten || []) {
    const e = getEntry(k.id);
    if (!e || !e.last_review) neu.push(k);
    else if (isDue(k.id)) faellig.push(k);
    else rest.push(k);
  }
  rest.sort((a, b) => String(getEntry(a.id)?.due || '').localeCompare(String(getEntry(b.id)?.due || '')));
  return { reihe: [...faellig, ...neu, ...rest], faellig: faellig.length, neu: neu.length };
}
