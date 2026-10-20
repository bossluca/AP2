import { shuffle } from './shuffle';

/**
 * Matching-Spiel („Zuordnen", Quizlet-Match-Stil): Begriffe den passenden
 * Definitionen zuordnen. Paare entstehen **automatisch aus den Lernzetteln**
 * (Glossar-Cloze-Items aus `lib/glossar`) – die Lücke wird zur Definition,
 * der Begriff zur Karte. Rein, RNG injizierbar.
 */

/** Lücken-Platzhalter in der Definitions-Anzeige. */
const LUECKE = '____';

/**
 * @typedef {Object} MatchingPaar
 * @property {string}   id
 * @property {string}   einheitId   Quell-Lerneinheit (FSRS-Review-Ziel).
 * @property {string}   begriff
 * @property {string}   definition  Erklärung (Glossarzeile) bzw. Satz mit `____` statt des Begriffs.
 * @property {string[]} tags
 * @property {string}   quelle      Lernzettel-Titel (Nachlesen).
 */

/**
 * Baut eine Runde mit `anzahl` Paaren. Begriffe sind eindeutig (ohne
 * Groß/Klein), damit jede Zuordnung genau eine richtige Lösung hat; je
 * Lerneinheit höchstens ein Paar, damit eine Runde breit streut.
 * @param {{id:string, einheitId?:string, text:string, begriff:string, tags?:string[], quelle?:string}[]} clozeItems
 * @param {{anzahl?:number, rng?:() => number}} [opt]
 * @returns {{paare: MatchingPaar[], begriffe: string[], definitionen: string[]}}
 *   `begriffe`/`definitionen` = Paar-IDs in getrennt gemischter Anzeigereihenfolge.
 */
export function baueMatchingRunde(clozeItems, { anzahl = 5, rng = Math.random } = {}) {
  const paare = [];
  const begriffeGesehen = new Set();
  const einheitenGesehen = new Set();
  for (const item of shuffle((clozeItems || []).filter((i) => i && i.begriff && i.text), rng)) {
    if (paare.length >= anzahl) break;
    const key = item.begriff.toLowerCase();
    if (begriffeGesehen.has(key)) continue;
    if (item.einheitId && einheitenGesehen.has(item.einheitId)) continue;
    // „{{Begriff}}: Erklärung" → nur die Erklärung; sonst Lücke im Satz.
    const definition = item.text.replace(/^\{\{.+?\}\}:\s*/, '').replace(/\{\{.+?\}\}/, LUECKE);
    // Definition darf den Begriff nicht nochmals verraten.
    if (definition.toLowerCase().includes(key)) continue;
    begriffeGesehen.add(key);
    if (item.einheitId) einheitenGesehen.add(item.einheitId);
    paare.push({
      id: `match_${item.id}`,
      einheitId: item.einheitId || '',
      begriff: item.begriff,
      definition,
      tags: item.tags || [],
      quelle: item.quelle || '',
    });
  }
  const ids = paare.map((p) => p.id);
  return { paare, begriffe: shuffle(ids, rng), definitionen: shuffle(ids, rng) };
}

/** Gehört die gewählte Definition zum gewählten Begriff? */
export function istRichtigeZuordnung(begriffId, definitionId) {
  return Boolean(begriffId) && begriffId === definitionId;
}

/**
 * Auswertung einer Runde.
 * @param {MatchingPaar[]} paare
 * @param {Object<string, number>} fehlerJePaar  Fehlversuche je Paar-ID.
 * @returns {{richtigBeimErsten:number, gesamt:number, fehler:number, quote:number,
 *   noten: {id:string, einheitId:string, note:1|3}[]}}
 *   `note` ist die FSRS-Note je Paar: fehlerfrei = 3 (Gut), sonst 1 (Nochmal).
 *   Wie beim Drill nie „Leicht" – Zuordnen ist Wiedererkennen, nicht Abrufen.
 */
export function werteMatchingAus(paare, fehlerJePaar = {}) {
  const noten = (paare || []).map((p) => ({
    id: p.id,
    einheitId: p.einheitId,
    note: (fehlerJePaar[p.id] || 0) === 0 ? 3 : 1,
  }));
  const gesamt = noten.length;
  const richtigBeimErsten = noten.filter((n) => n.note === 3).length;
  const fehler = Object.values(fehlerJePaar).reduce((s, n) => s + (n || 0), 0);
  return {
    richtigBeimErsten,
    gesamt,
    fehler,
    quote: gesamt > 0 ? Math.round((richtigBeimErsten / gesamt) * 100) : 0,
    noten,
  };
}
