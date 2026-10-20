import { Check, Play, Lock } from 'lucide-react';

/**
 * Eine Station im Lernpfad-Detail: runder Status-Node (✓ fertig · ▶ aktiv ·
 * ⊠ offen) plus anklickbare Karte. Die Stationen werden vertikal über eine
 * durchlaufende Linie verbunden (vom Eltern-Container gezeichnet).
 *
 * Bewusst **keine harte Sperre**: auch `offen`-Module sind klickbar (nur
 * optisch gedämpft) – echter Lernstoff bleibt zugänglich.
 *
 * @param {Object} props
 * @param {import('../lib/lernpfade').Modul} props.modul
 * @param {boolean} props.offen   Ist die zugehörige Lerneinheit aufgeklappt?
 * @param {() => void} props.onToggle
 */
export default function LernpfadNode({ modul, offen, onToggle }) {
  const { status, titel, mastery } = modul;
  const istAktiv = status === 'aktiv';
  const istFertig = status === 'fertig';

  return (
    <div className="relative z-10 flex items-center gap-4 py-1.5">
      {/* Status-Node */}
      <div
        className={[
          'grid place-items-center rounded-full shrink-0 font-mono',
          istFertig
            ? 'w-9 h-9 bg-accent text-[var(--accent-contrast)]'
            : istAktiv
              ? 'w-10 h-10 border-2 border-accent text-accent bg-white dark:bg-background node-pulse'
              : 'w-9 h-9 border border-zinc-300 dark:border-input text-zinc-400 dark:text-muted-foreground bg-zinc-50 dark:bg-card',
        ].join(' ')}
        aria-hidden="true"
      >
        {istFertig ? <Check size={18} /> : istAktiv ? <Play size={16} /> : <Lock size={14} />}
      </div>

      {/* Karte */}
      <button
        onClick={onToggle}
        aria-expanded={offen}
        className={[
          'flex-1 min-w-0 text-left rounded-xl border px-3.5 py-2.5 transition-colors',
          istAktiv
            ? 'border-accent bg-green-50/60 dark:bg-muted'
            : istFertig
              ? 'card-interactive'
              : 'border-dashed border-zinc-300 dark:border-input bg-zinc-50/60 dark:bg-background opacity-80 hover:opacity-100',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium truncate flex-1">{titel}</span>
          <span className="font-mono text-xs text-zinc-400 dark:text-muted-foreground shrink-0">
            {offen ? '▾' : '▸'}
          </span>
        </div>
        <div className="text-[11px] text-zinc-500 dark:text-muted-foreground mt-0.5">
          {istFertig
            ? 'abgeschlossen'
            : istAktiv
              ? `aktiv · ${Math.round(mastery * 100)}%`
              : 'offen'}
        </div>
      </button>
    </div>
  );
}
