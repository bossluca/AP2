/**
 * Lückentext (Cloze) – reine, getestete Parse- & Bewertungslogik für aktives
 * Abrufen. Ein Cloze-Text markiert Lücken mit `{{lösung}}`; mehrere gleichwertige
 * Antworten werden mit `|` getrennt: `{{Router|Layer-3-Switch}}`.
 *
 * Die Bewertung nutzt dieselbe deutsche Normalisierung wie die Schlagwort-Engine
 * (Umlaut-Faltung ä→ae/ö→oe/ü→ue/ß→ss, Groß/Klein egal) – Lernende dürfen also
 * ohne Sonderzeichen tippen. Verglichen wird der **gesamte** normalisierte
 * Lückentext (exakt), nicht als Teilstring: eine Lücke ist genau ein Begriff.
 *
 * React-frei → unit-testbar; der Renderer (`components/ClozeFrage`) ist davon getrennt.
 */

import { normalisiere } from './antwortpruefung';

/** Markup einer Lücke: `{{lösung|synonym|…}}` (nicht gierig). */
const LUECKE_RE = /\{\{(.+?)\}\}/g;

/**
 * @typedef {Object} ClozeSegment
 * @property {'text'|'luecke'} typ
 * @property {string} [text]     Nur `typ:'text'`: der Klartext-Abschnitt.
 * @property {number} [index]    Nur `typ:'luecke'`: 0-basierter Lücken-Index.
 * @property {string} [loesung]  Nur `typ:'luecke'`: anzuzeigende Musterlösung.
 */

/**
 * @typedef {Object} ClozeLuecke
 * @property {string}   loesung   Erste (anzuzeigende) Lösung.
 * @property {string[]} varianten Normalisierte gültige Antworten (loesung + Synonyme).
 */

/**
 * Zerlegt einen Cloze-Text in Segmente (Text + Lücken) und die Lücken-Spezifikation.
 * @param {string} text
 * @returns {{segmente: ClozeSegment[], luecken: ClozeLuecke[], anzahl: number}}
 */
export function parseCloze(text) {
  const s = typeof text === 'string' ? text : '';
  const segmente = [];
  const luecken = [];
  let last = 0;
  let idx = 0;
  let m;
  LUECKE_RE.lastIndex = 0;
  while ((m = LUECKE_RE.exec(s))) {
    if (m.index > last) segmente.push({ typ: 'text', text: s.slice(last, m.index) });
    const teile = m[1]
      .split('|')
      .map((t) => t.trim())
      .filter(Boolean);
    const loesung = teile[0] || '';
    luecken.push({ loesung, varianten: teile.map(normalisiere).filter(Boolean) });
    segmente.push({ typ: 'luecke', index: idx, loesung });
    idx += 1;
    last = LUECKE_RE.lastIndex;
  }
  if (last < s.length) segmente.push({ typ: 'text', text: s.slice(last) });
  return { segmente, luecken, anzahl: luecken.length };
}

/**
 * Ist die Eingabe für eine Lücke korrekt? (exakter, normalisierter Vergleich)
 * @param {ClozeLuecke} luecke
 * @param {string} eingabe
 * @returns {boolean}
 */
export function pruefeLuecke(luecke, eingabe) {
  const e = normalisiere(eingabe);
  if (!e) return false;
  return (luecke?.varianten || []).some((v) => v === e);
}

/**
 * @typedef {Object} ClozeErgebnis
 * @property {boolean[]} treffer    Pro Lücke richtig?
 * @property {number}    anzahl     Anzahl richtiger Lücken.
 * @property {number}    gesamt     Anzahl Lücken.
 * @property {number}    quote      anzahl/gesamt (0..1).
 * @property {boolean}   alleRichtig Alle Lücken korrekt (und ≥ 1 Lücke).
 * @property {'richtig'|'teilweise'|'falsch'} bewertung  Auf die 3 Stufen gemappt.
 */

/**
 * Bewertet alle Lücken gegen die Eingaben.
 * @param {ClozeLuecke[]} luecken
 * @param {string[]} eingaben  Index-parallel zu `luecken`.
 * @returns {ClozeErgebnis}
 */
export function pruefeCloze(luecken, eingaben = []) {
  const liste = Array.isArray(luecken) ? luecken : [];
  const treffer = liste.map((l, i) => pruefeLuecke(l, eingaben[i] || ''));
  const gesamt = liste.length;
  const anzahl = treffer.filter(Boolean).length;
  const quote = gesamt ? anzahl / gesamt : 0;
  const alleRichtig = gesamt > 0 && anzahl === gesamt;
  const bewertung = alleRichtig ? 'richtig' : anzahl > 0 ? 'teilweise' : 'falsch';
  return { treffer, anzahl, gesamt, quote, alleRichtig, bewertung };
}
