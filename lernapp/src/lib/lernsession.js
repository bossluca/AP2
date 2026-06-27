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
  const { getStatus, isDue, getEntry } = helfer;
  const { umfang = STANDARD_UMFANG, rng } = optionen;

  const ueben = [];
  const faellig = [];
  const neu = [];

  for (const o of objekte) {
    const status = getStatus(o.id);
    const eintrag = getEntry ? getEntry(o.id) : null;
    const hatBox = !!eintrag && eintrag.box != null;
    const due = isDue(o.id);

    if (status === 'gelernt' && !due) continue; // sitzt schon, nicht fällig
    if (status === 'ueben') ueben.push(o);
    else if (hatBox && due) faellig.push(o); // echte fällige Wiederholung
    else if (!status && !hatBox) neu.push(o); // noch nie gesehen
    else if (due) faellig.push(o); // sonstige Fällige
  }

  const reihenfolge = [
    ...shuffle(ueben, rng),
    ...shuffle(faellig, rng),
    ...shuffle(neu, rng),
  ];
  return reihenfolge.slice(0, umfang);
}
