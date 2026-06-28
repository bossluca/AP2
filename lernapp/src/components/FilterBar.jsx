/* eslint-disable react-refresh/only-export-components -- Re-Export von Filter-Helpern für Abwärtskompatibilität. */
import { getAllTags, getAllExams } from '../data/useExamData';
import {
  applyFilters,
  defaultFilters,
  examKey,
  hasActiveFilters,
} from '../lib/filters';

// Re-Export, damit bestehende Importe `import FilterBar, { applyFilters, defaultFilters }`
// weiter funktionieren. Die Logik selbst lebt jetzt in ../lib/filters.js (rein/testbar).
export { applyFilters, defaultFilters };

/**
 * Filterleiste für Themen-Tags, Prüfungstermine und Lernfortschritt.
 *
 * Kontrollierte Komponente: hält keinen eigenen State, sondern meldet
 * Änderungen über `onChange` an die übergeordnete Seite (Quiz/Karteikarten).
 *
 * @param {Object} props
 * @param {import('../lib/filters').Filters} props.filters  Aktueller Filterzustand.
 * @param {(next: import('../lib/filters').Filters) => void} props.onChange  Callback bei Änderung.
 */
export default function FilterBar({ filters, onChange }) {
  const tags = getAllTags();
  const exams = getAllExams();

  const toggleTag = (tag) => {
    const next = filters.tags.includes(tag)
      ? filters.tags.filter((t) => t !== tag)
      : [...filters.tags, tag];
    onChange({ ...filters, tags: next });
  };

  const toggleExam = (key) => {
    const next = filters.exams.includes(key)
      ? filters.exams.filter((e) => e !== key)
      : [...filters.exams, key];
    onChange({ ...filters, exams: next });
  };

  const setStatus = (status) => onChange({ ...filters, status });

  const clearAll = () => onChange(defaultFilters);

  const chipClass = (active) =>
    `px-2.5 py-1.5 rounded-full border text-xs transition-colors ${
      active
        ? 'bg-accent text-[var(--accent-contrast)] border-accent'
        : 'border-gray-300 dark:border-[#2a3326] hover:border-accent'
    }`;

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 space-y-3 text-sm">
      <div>
        <div className="font-semibold mb-1">Prüfungstermin</div>
        <div className="flex flex-wrap gap-1.5">
          {exams.map((e) => {
            const key = examKey(e);
            return (
              <button
                key={key}
                onClick={() => toggleExam(key)}
                className={chipClass(filters.exams.includes(key))}
              >
                {e.saison} {e.jahr}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-1">Thema</div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={chipClass(filters.tags.includes(tag))}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="font-semibold mb-1">Fortschritt</div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all', label: 'Alle' },
            { key: 'neu', label: 'Noch nicht bearbeitet' },
            { key: 'ueben', label: 'Muss ich üben' },
            { key: 'gelernt', label: 'Gelernt' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setStatus(opt.key)}
              className={chipClass(filters.status === opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {hasActiveFilters(filters) && (
        <button
          onClick={clearAll}
          className="text-xs underline text-gray-500 hover:text-accent"
        >
          Filter zurücksetzen
        </button>
      )}
    </div>
  );
}
