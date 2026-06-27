import { shuffle } from './shuffle';

/**
 * Kurze, „fertige" Lern-Session: nimmt dem Lernenden die Auswahl ab und baut
 * eine sinnvolle, **endliche** Reihe – das macht den Einstieg leicht und gibt
 * ein klares Ziel. Priorisierung:
 *
 *   1. Schwaches zuerst (Status „üben")
 *   2. Fällige Wiederholungen (Leitner, bereits einmal bewertet)
 *   3. Neues zum Auffüllen
 *
 * Bereits Gelerntes, das **nicht** fällig ist, wird ausgelassen. Rein & testbar:
 * Fortschritts-Infos kommen über injizierte Helfer herein.
 */

/** Standard-Sessionlänge – kurz genug, dass es sich „leicht" anfühlt. */
export const STANDARD_UMFANG = 10;

/**
 * Sortiert Objekte in Lern-Eimer (interne Naht, von beiden Session-Buildern
 * genutzt). „Gelernt & nicht fällig" landet in `rest` und wird normal ausgelassen.
 * @returns {{ueben: any[], faellig: any[], neu: any[], rest: any[]}}
 */
function eimer(objekte, { getStatus, isDue, getEntry }) {
  const ueben = [];
  const faellig = [];
  const neu = [];
  const rest = [];
  for (const o of objekte) {
    const status = getStatus(o.id);
    const eintrag = getEntry ? getEntry(o.id) : null;
    const hatBox = !!eintrag && eintrag.box != null;
    const due = isDue(o.id);

    if (status === 'gelernt' && !due) rest.push(o); // sitzt schon, nicht fällig
    else if (status === 'ueben') ueben.push(o);
    else if (hatBox && due) faellig.push(o); // echte fällige Wiederholung
    else if (!status && !hatBox) neu.push(o); // noch nie gesehen
    else if (due) faellig.push(o); // sonstige Fällige
    else rest.push(o);
  }
  return { ueben, faellig, neu, rest };
}

/**
 * @param {Array<{id: string}>} objekte  Lernobjekte (Fragen + Lernzettel).
 * @param {Object} helfer
 * @param {(id: string) => (string|null)} helfer.getStatus  Lernstatus oder null.
 * @param {(id: string) => boolean} helfer.isDue             Ist fällig (Leitner)?
 * @param {(id: string) => (object|null)} [helfer.getEntry]  Fortschritts-Eintrag.
 * @param {Object} [optionen]
 * @param {number} [optionen.umfang]     Maximale Anzahl (Default {@link STANDARD_UMFANG}).
 * @param {() => number} [optionen.rng]  Zufallsquelle (für Tests).
 * @returns {Array<{id: string}>} Höchstens `umfang` Objekte in Lernreihenfolge.
 */
export function baueLernsession(objekte, helfer, optionen = {}) {
  const { umfang = STANDARD_UMFANG, rng } = optionen;
  const { ueben, faellig, neu } = eimer(objekte, helfer);
  const reihenfolge = [...shuffle(ueben, rng), ...shuffle(faellig, rng), ...shuffle(neu, rng)];
  return reihenfolge.slice(0, umfang);
}

/**
 * Gezieltes **Schwächen-Training**: priorisiert Objekte aus den schwachen Themen
 * (`schwachTags`) – innerhalb davon „üben" > fällig > neu. Reicht der Pool nicht,
 * wird mit einer normalen Session aufgefüllt, damit die Runde nie leer/zu kurz ist.
 *
 * @param {Array<{id: string, tags?: string[]}>} objekte
 * @param {Object} helfer  Wie {@link baueLernsession}.
 * @param {Object} [optionen]
 * @param {string[]} [optionen.schwachTags]  Schwache Themen-Tags (aus der Statistik).
 * @param {number} [optionen.umfang]
 * @param {() => number} [optionen.rng]
 * @returns {Array<{id: string}>}
 */
export function baueSchwaechenSession(objekte, helfer, optionen = {}) {
  const { schwachTags = [], umfang = STANDARD_UMFANG, rng } = optionen;
  const tagSet = new Set(schwachTags);

  const imThema = tagSet.size
    ? objekte.filter((o) => (o.tags || []).some((t) => tagSet.has(t)))
    : [];
  const { ueben, faellig, neu } = eimer(imThema, helfer);
  let reihe = [...shuffle(ueben, rng), ...shuffle(faellig, rng), ...shuffle(neu, rng)];

  // Auffüllen aus dem Rest (normale Priorisierung), falls zu wenig Schwächen-Stoff.
  if (reihe.length < umfang) {
    const drin = new Set(reihe.map((o) => o.id));
    const auffuellen = baueLernsession(
      objekte.filter((o) => !drin.has(o.id)),
      helfer,
      { umfang: umfang - reihe.length, rng }
    );
    reihe = [...reihe, ...auffuellen];
  }
  return reihe.slice(0, umfang);
}
