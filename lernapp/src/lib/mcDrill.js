import { shuffle } from './shuffle';

/**
 * Multiple-Choice-Drill aus dem Glossar: baut aus den Cloze-Items der
 * Lernzettel (`lib/glossar`) objektiv bewertbare MC-Fragen – die Definition
 * als Frage, der richtige Begriff plus **automatisch gewählte Distraktoren**
 * als Antworten. Distraktoren kommen bevorzugt aus demselben Themenfeld
 * (gleiche `thema_tags`), damit sie plausibel sind. Rein, RNG injizierbar.
 */

/** Lücken-Platzhalter in der Frage-Anzeige. */
const LUECKE = '____';

/**
 * @typedef {Object} McFrage
 * @property {string}   id
 * @property {string}   frage         Text mit `____` statt des Begriffs.
 * @property {string[]} optionen      Antwortmöglichkeiten (gemischt).
 * @property {number}   loesungIndex  Index der richtigen Option.
 * @property {string}   begriff       Richtige Antwort (Klartext).
 * @property {string[]} tags
 * @property {string}   quelle        Lernzettel-Titel (Nachlesen).
 */

/**
 * Baut MC-Fragen aus Glossar-Cloze-Items.
 * @param {{id:string, text:string, begriff:string, tags?:string[], quelle?:string}[]} clozeItems
 * @param {{anzahl?:number, optionenAnzahl?:number, rng?:() => number}} [opt]
 * @returns {McFrage[]}
 */
export function baueMcFragen(clozeItems, { anzahl = 10, optionenAnzahl = 4, rng = Math.random } = {}) {
  const pool = (clozeItems || []).filter((i) => i && i.begriff && i.text);
  if (pool.length < optionenAnzahl) return []; // zu wenig Material für Distraktoren

  // Begriffs-Kandidaten global + je Tag (für plausible Distraktoren).
  const jeTag = new Map();
  for (const item of pool) {
    for (const tag of item.tags || []) {
      if (!jeTag.has(tag)) jeTag.set(tag, []);
      jeTag.get(tag).push(item.begriff);
    }
  }
  const alleBegriffe = pool.map((i) => i.begriff);

  const fragen = [];
  for (const item of shuffle(pool, rng).slice(0, anzahl)) {
    const korrekt = item.begriff;
    const istAnderer = (b) => b.toLowerCase() !== korrekt.toLowerCase();

    // Bevorzugt Begriffe aus denselben Tags, dann global auffüllen.
    const themen = (item.tags || []).flatMap((t) => jeTag.get(t) || []);
    const kandidaten = [...new Set([...shuffle(themen, rng), ...shuffle(alleBegriffe, rng)])].filter(
      istAnderer
    );
    const distraktoren = kandidaten.slice(0, optionenAnzahl - 1);
    if (distraktoren.length < optionenAnzahl - 1) continue;

    const optionen = shuffle([korrekt, ...distraktoren], rng);
    fragen.push({
      id: `mc_${item.id}`,
      frage: item.text.replace(/\{\{.+?\}\}/, LUECKE),
      optionen,
      loesungIndex: optionen.indexOf(korrekt),
      begriff: korrekt,
      tags: item.tags || [],
      quelle: item.quelle || '',
    });
  }
  return fragen;
}
