/**
 * Kalender-Heatmap der Lernaktivität (GitHub-Stil) – reines CSS-Grid, keine
 * Chart-Bibliothek. Erwartet die Wochen-Spalten aus `baueHeatmap()`.
 */

/** Farbstufen 0–4 (Akzentfarbe Grün/Terminal), light + dark. */
const LEVELS = [
  'bg-gray-100 dark:bg-[#1d271a]',
  'bg-green-200 dark:bg-green-900',
  'bg-green-300 dark:bg-green-700',
  'bg-green-400 dark:bg-green-500',
  'bg-green-500 dark:bg-[#5be38a]',
];

/**
 * @param {Object} props
 * @param {((import('../lib/aktivitaet').HeatmapTag)|null)[][]} props.weeks
 * @param {boolean} [props.withLegend]
 */
export default function Heatmap({ weeks, withLegend = true }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => (
              <div
                key={di}
                title={cell ? `${cell.date}: ${cell.count} Aktivität(en)` : undefined}
                className={`w-3 h-3 rounded-sm ${cell ? LEVELS[cell.level] : 'bg-transparent'}`}
              />
            ))}
          </div>
        ))}
      </div>
      {withLegend && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <span>weniger</span>
          {LEVELS.map((cls, i) => (
            <span key={i} className={`w-3 h-3 rounded-sm inline-block ${cls}`} />
          ))}
          <span>mehr</span>
        </div>
      )}
    </div>
  );
}
