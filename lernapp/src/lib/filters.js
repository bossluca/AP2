/**
 * Reine, React-freie Filterlogik für den Fragen-Datensatz.
 * Ausgelagert aus der FilterBar, damit sie unit-testbar und überall
 * wiederverwendbar ist (Quiz, Karteikarten, Statistik).
 */

/**
 * @typedef {Object} Filters
 * @property {string[]} tags    Aktive Themen-Tags (OR-Verknüpfung).
 * @property {string[]} exams   Aktive Prüfungs-Keys im Format "<jahr>_<saison>".
 * @property {'all'|'neu'|'ueben'|'gelernt'} status  Fortschritts-Filter.
 */

/** @type {Filters} Standard: kein Filter aktiv. */
export const defaultFilters = { tags: [], exams: [], status: 'all' };

/**
 * Eindeutiger Schlüssel eines Prüfungstermins.
 * @param {{jahr:number, saison:string}} examLike
 * @returns {string} z. B. "2022_Frühjahr"
 */
export function examKey(examLike) {
  return `${examLike.jahr}_${examLike.saison}`;
}

/**
 * Filtert eine Fragenliste anhand der aktiven Filter.
 *
 * @param {import('../data/useExamData').Question[]} questions  Zu filternde Fragen.
 * @param {Filters} filters                                     Aktive Filter.
 * @param {(id:string) => (string|null)} getStatus             Liefert den gespeicherten
 *        Status einer Frage ("gelernt" | "ueben" | null). Wird injiziert, damit die
 *        Funktion rein bleibt und nicht selbst auf den Progress-Context zugreift.
 * @returns {import('../data/useExamData').Question[]}
 */
export function applyFilters(questions, filters, getStatus) {
  return questions.filter((q) => {
    // Prüfungstermin (OR)
    if (filters.exams.length > 0 && !filters.exams.includes(examKey(q))) {
      return false;
    }
    // Thema (OR über die Tags der Frage)
    if (
      filters.tags.length > 0 &&
      !q.thema_tags.some((t) => filters.tags.includes(t))
    ) {
      return false;
    }
    // Fortschritt
    if (filters.status !== 'all') {
      const status = getStatus(q.id);
      if (filters.status === 'neu' && status) return false;
      if (filters.status !== 'neu' && status !== filters.status) return false;
    }
    return true;
  });
}

/**
 * Prüft, ob überhaupt ein Filter aktiv ist (für „Zurücksetzen"-Button etc.).
 * @param {Filters} filters
 * @returns {boolean}
 */
export function hasActiveFilters(filters) {
  return (
    filters.tags.length > 0 ||
    filters.exams.length > 0 ||
    filters.status !== 'all'
  );
}
