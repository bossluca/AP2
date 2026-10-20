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
 * @property {number} level          Aktuelles Level.
 * @property {number} xp             Gesamt-XP.
 * @property {boolean} einstufungGemacht Einstufungstest abgeschlossen.
 * @property {number} eigeneStapel   Anzahl eigener Kartenstapel.
 * @property {boolean} wochenChallengesKomplett Alle Wochen-Challenges dieser Woche erfüllt.
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
  {
    id: 'vermessen',
    icon: '🗺️',
    titel: 'Standort bestimmt',
    beschreibung: 'Den Einstufungstest abgeschlossen.',
    erfuellt: (c) => c.einstufungGemacht,
  },
  {
    id: 'selbstgemacht',
    icon: '📄',
    titel: 'Selbstgemacht',
    beschreibung: 'Einen eigenen Kartenstapel angelegt.',
    erfuellt: (c) => c.eigeneStapel >= 1,
  },
  {
    id: 'wochensieger',
    icon: '🏁',
    titel: 'Wochensieger',
    beschreibung: 'Alle drei Wochen-Challenges einer Woche geschafft.',
    erfuellt: (c) => c.wochenChallengesKomplett,
  },
  {
    id: 'level-5',
    icon: '⭐',
    titel: 'Aufsteiger',
    beschreibung: 'Level 5 erreicht.',
    erfuellt: (c) => c.level >= 5,
  },
  {
    id: 'level-10',
    icon: '🌟',
    titel: 'Fortgeschritten',
    beschreibung: 'Level 10 erreicht.',
    erfuellt: (c) => c.level >= 10,
  },
  {
    id: 'xp-5000',
    icon: '💎',
    titel: 'XP-Sammler',
    beschreibung: '5000 XP gesammelt.',
    erfuellt: (c) => c.xp >= 5000,
  },
];

/**
 * Baut den Erfolgs-Kontext aus den vorhandenen Kennzahlen (eine Stelle für
 * Statistik-Seite und ErfolgWatcher).
 * @param {{status:{gelernt:number}, total:number}} statistik  aus `berechneStatistik`
 * @param {{streak:number, aktiveTage:number, klausurBest:number, xp:number, level:{level:number}}} gami
 * @param {{einstufungGemacht?:boolean, eigeneStapel?:number, challenges?:{erfuellt:boolean}[]}} [extras]
 * @returns {ErfolgKontext}
 */
export function baueErfolgKontext(statistik, gami, extras = {}) {
  const { einstufungGemacht = false, eigeneStapel = 0, challenges = [] } = extras;
  return {
    gelernt: statistik.status.gelernt,
    prozentGelernt: statistik.total > 0 ? Math.round((statistik.status.gelernt / statistik.total) * 100) : 0,
    streak: gami.streak,
    aktiveTage: gami.aktiveTage,
    klausurBesteProzent: gami.klausurBest,
    level: gami.level?.level ?? 1,
    xp: gami.xp ?? 0,
    einstufungGemacht,
    eigeneStapel,
    wochenChallengesKomplett: challenges.length > 0 && challenges.every((c) => c.erfuellt),
  };
}

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
    level: 1,
    xp: 0,
    einstufungGemacht: false,
    eigeneStapel: 0,
    wochenChallengesKomplett: false,
    ...kontext,
  };
  return ERFOLGE.map((e) => ({ ...e, freigeschaltet: e.erfuellt(ctx) }));
}

/** Anzahl freigeschalteter Erfolge. */
export function anzahlFreigeschaltet(kontext) {
  return bewerteErfolge(kontext).filter((e) => e.freigeschaltet).length;
}
