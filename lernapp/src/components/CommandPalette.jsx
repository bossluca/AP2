import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, GraduationCap, Sun, Moon, ChevronRight } from 'lucide-react';
import { NAV, NAV_SEKUNDAER } from '../navigation';
import { useTheme } from '../context/ThemeContext';
import { useProgress } from '../context/ProgressContext';
import { baueBefehle, filterBefehle } from '../lib/befehle';

/** Lucide-Icon per Name, mit neutralem Fallback. */
// Explizite Icon-Map statt `import * as Icons` – sonst landet das komplette
// Lucide-Set (~1 MB) im vendor-Chunk. Nav-Icons kommen aus navigation.js.
const ICONS = {
  Play,
  RotateCcw,
  GraduationCap,
  Sun,
  Moon,
  ...Object.fromEntries([...NAV, ...NAV_SEKUNDAER].map((n) => [n.iconName, n.icon])),
};

function CmdIcon({ name, ...props }) {
  const Cmp = ICONS[name] || ChevronRight;
  return <Cmp {...props} />;
}

/**
 * Command-Palette (Cmd/Ctrl+K): Schnell-Navigation + Aktionen über die Tastatur.
 * Terminal-Anmutung (`>_`-Prompt, mono). Sichtbarkeit besitzt der Parent
 * (`offen`/`onClose`); die Palette togglet global per Cmd/K über `onToggle`.
 * Schließt mit ESC, Klick außerhalb, oder nach Auswahl. ↑/↓ navigieren, Enter wählt.
 *
 * Eigener Key-Listener (nicht `useTastenkuerzel`, das Modifier bewusst ignoriert).
 *
 * @param {{ offen: boolean, onClose: () => void, onToggle: () => void }} props
 */
export default function CommandPalette({ offen, onClose, onToggle }) {
  const [query, setQuery] = useState('');
  const [aktivRaw, setAktiv] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { resume } = useProgress();

  const schliessen = useCallback(() => {
    setQuery('');
    setAktiv(0);
    onClose();
  }, [onClose]);

  // Globales Cmd/Ctrl+K (auch in Eingabefeldern erlaubt – bewusste Ausnahme).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggle]);

  // Fokus aufs Eingabefeld beim Öffnen.
  useEffect(() => {
    if (offen) inputRef.current?.focus();
  }, [offen]);

  const befehle = useMemo(
    () => baueBefehle({ navItems: [...NAV, ...NAV_SEKUNDAER], resume, theme }),
    [resume, theme]
  );
  const treffer = useMemo(() => filterBefehle(befehle, query), [befehle, query]);
  // Index beim Lesen klemmen (kein setState-im-Effect nötig).
  const aktiv = Math.min(aktivRaw, Math.max(0, treffer.length - 1));

  const ausfuehren = useCallback(
    (b) => {
      if (!b) return;
      schliessen();
      if (b.aktion === 'theme') toggleTheme();
      else if (b.to) navigate(b.to);
    },
    [navigate, schliessen, toggleTheme]
  );

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAktiv((i) => Math.min(i + 1, treffer.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAktiv((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      ausfuehren(treffer[aktiv]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      schliessen();
    }
  };

  // Aktives Element in den sichtbaren Bereich scrollen.
  useEffect(() => {
    if (!offen) return;
    const el = listRef.current?.querySelector('[data-aktiv="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [aktiv, offen]);

  if (!offen) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Befehle">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={schliessen} />
      <div className="absolute left-1/2 top-[12vh] -translate-x-1/2 w-[min(92vw,40rem)] card shadow-2xl overflow-hidden animate-in">
        {/* Eingabezeile mit Terminal-Prompt */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <span className="font-mono text-accent shrink-0" aria-hidden="true">
            &gt;_
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setAktiv(0);
            }}
            onKeyDown={onListKey}
            placeholder="Suchen oder springen … (Befehl, Bereich)"
            className="flex-1 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground"
            aria-label="Befehl suchen"
          />
          <kbd className="hidden sm:block text-[10px] text-muted-foreground border border-zinc-300 dark:border-input rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Trefferliste */}
        <ul ref={listRef} className="max-h-[55vh] overflow-y-auto py-1">
          {treffer.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              Keine Treffer für „{query}".
            </li>
          ) : (
            treffer.map((b, i) => (
              <li key={b.id}>
                <button
                  data-aktiv={i === aktiv}
                  onClick={() => ausfuehren(b)}
                  onMouseEnter={() => setAktiv(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    i === aktiv
                      ? 'bg-green-100 dark:bg-green-900/30 text-accent'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <CmdIcon name={b.icon} size={16} aria-hidden="true" className="shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{b.label}</span>
                  {b.hinweis && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:block">{b.hinweis}</span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground uppercase shrink-0">
                    {b.gruppe === 'Aktion' ? 'run' : 'go'}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
