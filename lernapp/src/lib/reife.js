/**
 * Prüfungsreife – schätzt **vorausschauend**, wie sitzfest der Stoff ist (im
 * Gegensatz zu den rückblickenden Schwachstellen in `statistik.js`). Grundlage
 * ist die FSRS-Abrufwahrscheinlichkeit je Lernobjekt (`lib/fsrs`): ein lange
 * nicht wiederholtes Objekt verliert an „Mastery", ein frisch gefestigtes hat hohe.
 *
 * Aus den Objekt-Werten werden zwei Sichten aggregiert:
 *   • **Mastery je Thema** (Mittel über die Objekte eines Tags) → was als Nächstes,
 *   • **prognostizierte Punktzahl** (mit den Prüfungspunkten der Fragen gewichtet)
 *     → ein einzelner „bin ich bereit?"-Wert.
 *
 * Reine, React-freie Funktion (testbar). Schwellen bewusst konservativ: ein Thema
 * gilt erst als „bereit", wenn es **ausreichend oft** geübt wurde – nicht nach
 * einem einzigen Glückstreffer.
 */

import { abrufwahrscheinlichkeitEintrag } from './fsrs';

/** Ab dieser Mastery (0..1) gilt ein Thema als prüfungsbereit. */
export const READY_SCHWELLE = 0.8;
/** So viele geübte Objekte muss ein Thema mindestens haben, um „bereit" zu sein. */
export const MIN_ITEMS_BEREIT = 3;

/**
 * Mastery (0..1) eines einzelnen Lernobjekts:
 * FSRS-Abrufwahrscheinlichkeit, sonst schwacher Fallback aus dem Status.
 */
export function objektMastery(entry, now = new Date()) {
  const r = abrufwahrscheinlichkeitEintrag(entry, now);
  if (r != null) return r;
  if (entry?.status === 'gelernt') return 0.5; // gesehen, aber kein SRS-Beleg
  return 0; // noch nicht (nachweislich) gelernt
}

/** Wurde ein Objekt überhaupt schon angefasst (für die „geübt"-Zählung)? */
function istGeuebt(entry) {
  return !!entry && (entry.stability != null || entry.box != null || !!entry.status);
}

/**
 * @typedef {Object} ThemaReife
 * @property {string}  tag
 * @property {number}  mastery  0..1 (Mittel über die Objekte des Tags).
 * @property {number}  n        Anzahl Objekte mit diesem Tag.
 * @property {number}  geuebt   Davon schon geübt.
 * @property {boolean} bereit   mastery ≥ Schwelle und genug geübt.
 */

/**
 * @typedef {Object} Reife
 * @property {ThemaReife[]} proThema     Aufsteigend nach Mastery (schwach zuerst).
 * @property {number} gesamtMastery      0..1 – Mittel über alle Objekte.
 * @property {number} prognoseProzent    0..100 – punktgewichtete Reife über die Fragen.
 * @property {number} bereitThemen       Anzahl „bereiter" Themen.
 * @property {number} themenGesamt       Anzahl Themen.
 */

/**
 * Berechnet die Prüfungsreife.
 * @param {import('../data/lernobjekte').Lernobjekt[]} objekte
 * @param {Object.<string, any>} progress
 * @param {Date} [now]
 * @returns {Reife}
 */
export function berechneReife(objekte, progress, now = new Date()) {
  const proTag = new Map(); // tag -> { summe, n, geuebt }
  let masterySumme = 0;
  let punkteSumme = 0;
  let punkteMastery = 0;

  for (const o of objekte || []) {
    const e = progress[o.id];
    const m = objektMastery(e, now);
    masterySumme += m;

    for (const t of o.tags || []) {
      const a = proTag.get(t) || { summe: 0, n: 0, geuebt: 0 };
      a.summe += m;
      a.n += 1;
      if (istGeuebt(e)) a.geuebt += 1;
      proTag.set(t, a);
    }

    // Punktgewichtete Prognose: nur Fragen mit Prüfungspunkten.
    const p = o.art === 'frage' ? o.punkte || 0 : 0;
    if (p > 0) {
      punkteSumme += p;
      punkteMastery += p * m;
    }
  }

  const proThema = [...proTag.entries()]
    .map(([tag, a]) => {
      const mastery = a.n > 0 ? a.summe / a.n : 0;
      return {
        tag,
        mastery,
        n: a.n,
        geuebt: a.geuebt,
        bereit: mastery >= READY_SCHWELLE && a.geuebt >= MIN_ITEMS_BEREIT,
      };
    })
    .sort((x, y) => x.mastery - y.mastery);

  const gesamt = objekte?.length || 0;
  return {
    proThema,
    gesamtMastery: gesamt > 0 ? masterySumme / gesamt : 0,
    prognoseProzent: punkteSumme > 0 ? Math.round((punkteMastery / punkteSumme) * 100) : 0,
    bereitThemen: proThema.filter((t) => t.bereit).length,
    themenGesamt: proThema.length,
  };
}
