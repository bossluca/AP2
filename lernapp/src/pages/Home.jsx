import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllExams } from '../data/useExamData';
import { getLernobjekte } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import { berechneStatistik } from '../lib/statistik';
import ProgressRing from '../components/ProgressRing';

const KACHELN = [
  { to: '/karteikarten', titel: '📇 Karteikarten', text: 'Durch Prüfungsfragen blättern, Lösung aufdecken, markieren.' },
  { to: '/lernzettel', titel: '📝 Lernzettel', text: 'Themen-Spickzettel (AP1 + AP2) lesen, suchen, filtern.' },
  { to: '/wiederholen', titel: '🔁 Wiederholen', text: 'Spaced-Repetition-Sitzung über fällige Fragen & Lernzettel.' },
  { to: '/quiz', titel: '🎯 Quiz', text: 'Fragenrunde mit Selbsteinschätzung und Auswertung.' },
  { to: '/luecken', titel: '✍️ Lückentext', text: 'Begriffe aktiv abrufen – automatisch aus den Lernzetteln, sofort geprüft.' },
  { to: '/klausur', titel: '🎓 Klausur', text: 'Ganze Prüfung simulieren – Freitext + Schlagwort-Check, optional mit Timer.' },
];

/**
 * Startseite / Dashboard: Lernstand-Überblick (Fragen + Lernzettel),
 * Fälligkeits-Hinweis, Einstiegskacheln und Fortschritt-Zurücksetzen.
 */
export default function Home() {
  const exams = getAllExams();
  const objekte = useMemo(() => getLernobjekte(), []);
  const { progress, resetProgress, gami } = useProgress();
  const s = useMemo(() => berechneStatistik(objekte, progress), [objekte, progress]);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    if (confirmReset) {
      resetProgress();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  const pctGelernt = s.total > 0 ? Math.round((s.status.gelernt / s.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 via-indigo-500/10 to-fuchsia-500/10" />
        <div className="relative p-5 sm:p-6 flex items-center justify-between gap-5 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[13rem]">
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="text-gradient">AP-Lernapp</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {s.art.frage} Prüfungsfragen aus {exams.length} Terminen + {s.art.lernzettel}{' '}
              Lernzettel (AP1 + AP2).
            </p>
            <Link to="/lernen" className="btn-primary px-5 py-2.5 mt-1 text-base">
              ▶ Heute lernen
            </Link>
          </div>
          <ProgressRing value={pctGelernt} size={120}>
            <div className="text-2xl font-bold">{pctGelernt}%</div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">gelernt</div>
          </ProgressRing>
        </div>
      </section>

      {/* Heute: Streak + Tagesziel */}
      <section className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">
            {gami.streak > 0 ? '🔥' : '✨'}
          </span>
          <div className="leading-tight">
            <div className="text-xl font-bold">{gami.streak}</div>
            <div className="text-xs text-gray-500">Tage&nbsp;Streak</div>
            <div className="text-[11px] font-medium text-indigo-600 mt-0.5">
              ⭐ Level {gami.level.level}
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-[12rem]">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tagesziel</span>
            <span>
              {Math.min(gami.heuteAktivitaet, gami.tagesziel)} / {gami.tagesziel}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, (gami.heuteAktivitaet / gami.tagesziel) * 100)}%`,
              }}
            />
          </div>
          {gami.heuteAktivitaet >= gami.tagesziel ? (
            <p className="text-xs text-green-600 mt-1">Tagesziel erreicht! 🎉</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">
              Noch {gami.tagesziel - gami.heuteAktivitaet} bis zum Tagesziel.
            </p>
          )}
        </div>
      </section>

      {/* Fällig-Hinweis */}
      {s.faellig > 0 && (
        <Link
          to="/wiederholen"
          className="card-interactive flex items-center justify-between gap-3 p-4"
        >
          <div>
            <div className="text-lg font-semibold">🔁 {s.faellig} Objekte fällig</div>
            <div className="text-sm text-gray-500">Jetzt wiederholen, um sie zu festigen.</div>
          </div>
          <span className="text-indigo-600 font-medium text-sm">Los →</span>
        </Link>
      )}

      {/* Schwächen-Training: gezielt an den schwachen Themen arbeiten */}
      {s.schwachstellen.length > 0 && (
        <Link
          to="/lernen?modus=schwaechen"
          className="card-interactive flex items-center justify-between gap-3 p-4"
        >
          <div className="min-w-0">
            <div className="text-lg font-semibold">🎯 Schwächen-Training</div>
            <div className="text-sm text-gray-500 truncate">
              Gezielt üben:{' '}
              {s.schwachstellen
                .slice(0, 3)
                .map((x) => x.tag)
                .join(' · ')}
            </div>
          </div>
          <span className="text-amber-600 font-medium text-sm whitespace-nowrap">Üben →</span>
        </Link>
      )}

      {/* Statusüberblick */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-green-500" />
          <div className="text-2xl font-bold text-green-600">{s.status.gelernt}</div>
          <div className="text-xs text-gray-500">Gelernt</div>
        </div>
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="text-2xl font-bold text-amber-600">{s.status.ueben}</div>
          <div className="text-xs text-gray-500">Muss ich üben</div>
        </div>
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gray-300 dark:bg-gray-600" />
          <div className="text-2xl font-bold text-gray-500">{s.status.offen}</div>
          <div className="text-xs text-gray-500">Noch offen</div>
        </div>
      </div>
      <Link to="/statistik" className="text-sm text-indigo-600 hover:underline">
        Detaillierte Statistik ansehen →
      </Link>

      {/* Einstiegskacheln */}
      <div className="grid sm:grid-cols-2 gap-4">
        {KACHELN.map((k) => (
          <Link key={k.to} to={k.to} className="card-interactive group block p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold mb-1">{k.titel}</h2>
              <span className="text-indigo-400 transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </div>
            <p className="text-sm text-gray-500">{k.text}</p>
          </Link>
        ))}
      </div>

      <div className="text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-3 space-y-3">
        <p>
          Hinweis: Nicht für alle Prüfungsfragen liegen offizielle Lösungen vor (besonders 2023 und
          2024 Frühjahr). Diese sind als „unverifiziert" markiert oder haben keine Lösung.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className={`px-2 py-1 rounded-md border text-xs transition-colors ${
              confirmReset
                ? 'bg-red-600 text-white border-red-600'
                : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
            }`}
          >
            {confirmReset ? 'Wirklich? Alles löschen' : 'Fortschritt zurücksetzen'}
          </button>
          {confirmReset && (
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-xs"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
