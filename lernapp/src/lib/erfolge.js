/**
 * Erfolge / Badges – rein regelbasiert, damit gut testbar und ohne Seiteneffekte.
 *
 * Jeder Erfolg hat eine Bedingung `erfuellt(ctx)`, ausgewertet gegen einen
 * Kontext aus bereits vorhandenen Kennzahlen (gelernt, Prozent, Streak …).
 * So entstehen keine neuen Speicherstrukturen – die Badges sind eine Sicht auf
 * den ohnehin vorhandenen Fortschritt.
 */

/**
 * @typedef {Object} ErfolgKontext
 * @property {number} gelernt        Anzahl als „gelernt" markierter Objekte.
 * @property {number} prozentGelernt Anteil gelernt (0–100).
 * @property {number} streak         Aktuelle Lern-Streak in Tagen.
 * @property {number} aktiveTage     Anzahl Tage mit Lernaktivität insgesamt.
 * @property {number} klausurBesteProzent Bestes Klausur-Ergebnis in % (0, wenn keins).
 */

/**
 * @typedef {Object} Erfolg
 * @property {string} id
 * @property {string} icon
 * @property {string} titel
 * @property {string} beschreibung  Wie der Erfolg erreicht wird.
 * @property {(ctx: ErfolgKontext) => boolean} erfuellt
 */

/** @type {Erfolg[]} */
export const ERFOLGE = [
  {
    id: 'erste-schritte',
    icon: '🌱',
    titel: 'Erste Schritte',
    beschreibung: 'Markiere dein erstes Lernobjekt als gelernt.',
    erfuellt: (c) => c.gelernt >= 1,
  },
  {
    id: 'fleissig',
    icon: '📚',
    titel: 'Fleißig',
    beschreibung: '50 Lernobjekte gelernt.',
    erfuellt: (c) => c.gelernt >= 50,
  },
  {
    id: 'profi',
    icon: '🧠',
    titel: 'Profi',
    beschreibung: '150 Lernobjekte gelernt.',
    erfuellt: (c) => c.gelernt >= 150,
  },
  {
    id: 'halbzeit',
    icon: '⏳',
    titel: 'Halbzeit',
    beschreibung: 'Die Hälfte aller Inhalte gelernt.',
    erfuellt: (c) => c.prozentGelernt >= 50,
  },
  {
    id: 'komplett',
    icon: '🏆',
    titel: 'Alles gelernt',
    beschreibung: '100 % aller Inhalte gelernt.',
    erfuellt: (c) => c.prozentGelernt >= 100,
  },
  {
    id: 'durchstarter',
    icon: '🔥',
    titel: 'Durchstarter',
    beschreibung: '3 Tage in Folge gelernt.',
    erfuellt: (c) => c.streak >= 3,
  },
  {
    id: 'dranbleiber',
    icon: '🚀',
    titel: 'Dranbleiber',
    beschreibung: '7 Tage in Folge gelernt.',
    erfuellt: (c) => c.streak >= 7,
  },
  {
    id: 'marathon',
    icon: '🏅',
    titel: 'Marathon',
    beschreibung: '30 Tage in Folge gelernt.',
    erfuellt: (c) => c.streak >= 30,
  },
  {
    id: 'ausdauer',
    icon: '📅',
    titel: 'Ausdauer',
    beschreibung: 'An 10 verschiedenen Tagen gelernt.',
    erfuellt: (c) => c.aktiveTage >= 10,
  },
  {
    id: 'klausur-held',
    icon: '🎓',
    titel: 'Klausur-Held',
    beschreibung: 'Eine Klausur mit mindestens 80 % bestanden.',
    erfuellt: (c) => c.klausurBesteProzent >= 80,
  },
];

/**
 * Wertet alle Erfolge gegen den Kontext aus.
 * @param {Partial<ErfolgKontext>} kontext
 * @returns {(Erfolg & { freigeschaltet: boolean })[]}
 */
export function bewerteErfolge(kontext) {
  const ctx = {
    gelernt: 0,
    prozentGelernt: 0,
    streak: 0,
    aktiveTage: 0,
    klausurBesteProzent: 0,
    ...kontext,
  };
  return ERFOLGE.map((e) => ({ ...e, freigeschaltet: e.erfuellt(ctx) }));
}

/** Anzahl freigeschalteter Erfolge. */
export function anzahlFreigeschaltet(kontext) {
  return bewerteErfolge(kontext).filter((e) => e.freigeschaltet).length;
}
