/**
 * Tages-Quests – kleine, machbare Tagesziele als Motivations-Checkliste. Bewusst
 * **abgeleitet** aus vorhandenen Signalen (heutige Aktivität, Tagesziel, fällige
 * Objekte) → kein zusätzlicher Zustand, rein und testbar. Gesund gedacht: Quests
 * sind erfüllbar und ohne Strafe, kein „du verlierst etwas".
 */

/**
 * @typedef {Object} Quest
 * @property {string}  id
 * @property {string}  label
 * @property {number}  ziel        Zielwert.
 * @property {number}  wert        Aktueller Wert (≤ ziel).
 * @property {boolean} erfuellt
 */

/**
 * Baut die heutigen Quests.
 * @param {{heute?:number, tagesziel?:number, faellig?:number}} signale
 * @returns {Quest[]}
 */
export function baueTagesquests({ heute = 0, tagesziel = 20, faellig = 0 } = {}) {
  const quest = (id, label, ziel, wert) => ({
    id,
    label,
    ziel,
    wert: Math.min(wert, ziel),
    erfuellt: wert >= ziel,
  });
  return [
    quest('start', 'Heute lernen', 1, heute),
    quest('ziel', `Tagesziel: ${tagesziel} bewerten`, tagesziel, heute),
    quest('faellig', 'Alle fälligen Wiederholungen erledigen', 1, faellig === 0 ? 1 : 0),
  ];
}

/**
 * Zusammenfassung über eine Quest-Liste.
 * @param {Quest[]} quests
 * @returns {{erfuellt:number, gesamt:number, alleErfuellt:boolean}}
 */
export function questFortschritt(quests) {
  const liste = Array.isArray(quests) ? quests : [];
  const erfuellt = liste.filter((q) => q.erfuellt).length;
  return { erfuellt, gesamt: liste.length, alleErfuellt: liste.length > 0 && erfuellt === liste.length };
}
