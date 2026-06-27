/**
 * Selbsteinschätzung einer Antwort – die drei Stufen mit Punktanteil und
 * einheitlichen Style-Klassen. Single Source of Truth für Quiz und Klausur,
 * damit Reihenfolge, Punktewertung und Optik garantiert konsistent sind.
 */

/**
 * @typedef {Object} Bewertungsstufe
 * @property {'richtig'|'teilweise'|'falsch'} key
 * @property {string}  label
 * @property {string}  symbol   Farb-unabhängiges Zeichen (A11y: nicht nur rot/grün).
 * @property {number}  anteil   Punktanteil (richtig = 1, teilweise = 0,5, falsch = 0).
 * @property {string}  classes  Tailwind-Klassen für den Button (Hintergrund/Text/Hover).
 * @property {string}  ring     Tailwind-Ring-Klasse für den aktiven Zustand.
 */

/** @type {Bewertungsstufe[]} */
export const BEWERTUNGEN = [
  {
    key: 'richtig',
    label: 'Richtig',
    symbol: '✓',
    anteil: 1,
    classes:
      'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60',
    ring: 'ring-green-500',
  },
  {
    key: 'teilweise',
    label: 'Teilweise',
    symbol: '≈',
    anteil: 0.5,
    classes:
      'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60',
    ring: 'ring-amber-500',
  },
  {
    key: 'falsch',
    label: 'Falsch',
    symbol: '✗',
    anteil: 0,
    classes:
      'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60',
    ring: 'ring-red-500',
  },
];

/** Schneller Lookup `key → Punktanteil` (z. B. für die Auswertung). */
export const ANTEIL = Object.fromEntries(BEWERTUNGEN.map((b) => [b.key, b.anteil]));
