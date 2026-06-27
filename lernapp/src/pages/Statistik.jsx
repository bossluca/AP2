import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getLernobjekte } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import { berechneStatistik } from '../lib/statistik';
import { MAX_BOX } from '../lib/srs';
import { baueHeatmap } from '../lib/aktivitaet';
import { bewerteErfolge } from '../lib/erfolge';
import Heatmap from '../components/Heatmap';

/** Horizontaler Anteils-Balken. */
function Bar({ value, total, className }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
      <div className={`h-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Statistik-/Fortschrittsseite: Lernstand (gelernt/üben/offen), Leitner-Box-
 * Verteilung, Fälligkeit, Aufschlüsselung nach Prüfungsteil, Schwachstellen
 * nach Thema und Lernverlauf über die letzten Tage.
 */
export default function Statistik() {
  const objekte = useMemo(() => getLernobjekte(), []);
  const { progress, gami } = useProgress();
  const s = useMemo(() => berechneStatistik(objekte, progress), [objekte, progress]);

  const pct = (n) => (s.total > 0 ? Math.round((n / s.total) * 100) : 0);
  const maxVerlauf = Math.max(1, ...s.verlauf.map((v) => v.count));
  const letzteTage = s.verlauf.slice(-14);
  const maxBox = Math.max(1, s.boxen.neu, ...Array.from({ length: MAX_BOX }, (_, i) => s.boxen[i + 1]));

  const heatmap = useMemo(() => baueHeatmap(gami.activity), [gami.activity]);
  const erfolge = useMemo(
    () =>
      bewerteErfolge({
        gelernt: s.status.gelernt,
        prozentGelernt: pct(s.status.gelernt),
        streak: gami.streak,
        aktiveTage: gami.aktiveTage,
        klausurBesteProzent: gami.klausurBest,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s, gami]
  );
  const erfolgeOffen = erfolge.filter((e) => e.freigeschaltet).length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">📊 Statistik</h1>

      {/* Überblick */}
      <section className="space-y-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="card p-3">
            <div className="text-2xl font-bold text-green-600">{s.status.gelernt}</div>
            <div className="text-xs text-gray-500">Gelernt ({pct(s.status.gelernt)}%)</div>
          </div>
          <div className="card p-3">
            <div className="text-2xl font-bold text-amber-600">{s.status.ueben}</div>
            <div className="text-xs text-gray-500">Üben ({pct(s.status.ueben)}%)</div>
          </div>
          <div className="card p-3">
            <div className="text-2xl font-bold text-gray-500">{s.status.offen}</div>
            <div className="text-xs text-gray-500">Offen ({pct(s.status.offen)}%)</div>
          </div>
        </div>
        <Bar value={s.status.gelernt} total={s.total} className="bg-green-500" />
        <p className="text-xs text-gray-500">
          {s.total} Lernobjekte gesamt ({s.art.frage} Fragen + {s.art.lernzettel} Lernzettel).
        </p>
      </section>

      {/* Fällig */}
      <section className="rounded-lg border border-indigo-300 dark:border-indigo-700 p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-2xl font-bold text-indigo-600">{s.faellig}</div>
          <div className="text-xs text-gray-500">jetzt fällig zum Wiederholen</div>
        </div>
        <Link
          to="/wiederholen"
          className="btn-primary px-4 py-2"
        >
          Jetzt wiederholen →
        </Link>
      </section>

      {/* Level & XP */}
      <section className="card p-4 flex items-center gap-4">
        <div className="grid place-items-center w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white font-bold text-lg shrink-0 shadow-sm shadow-fuchsia-500/30">
          {gami.level.level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Level {gami.level.level}</span>
            <span className="text-gray-500">
              {gami.level.xpImLevel} / {gami.level.xpFuerLevel} XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${Math.round(gami.level.fortschritt * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Noch {gami.level.xpBisNaechstes} XP bis Level {gami.level.level + 1} ·{' '}
            {gami.level.xpGesamt} XP gesamt
          </p>
        </div>
      </section>

      {/* Aktivität / Streak */}
      <section className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold text-sm">Aktivität</h2>
          <span className="text-xs text-gray-500">
            🔥 {gami.streak} Tage Streak · {gami.aktiveTage} aktive Tage
          </span>
        </div>
        <Heatmap weeks={heatmap.weeks} />
      </section>

      {/* Erfolge */}
      <section className="space-y-2">
        <h2 className="font-semibold text-sm">
          Erfolge ({erfolgeOffen}/{erfolge.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {erfolge.map((e) => (
            <div
              key={e.id}
              title={e.beschreibung}
              className={`card p-3 flex items-center gap-2 transition ${
                e.freigeschaltet ? '' : 'opacity-50 grayscale'
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {e.icon}
              </span>
              <div className="leading-tight min-w-0">
                <div className="text-sm font-medium truncate">{e.titel}</div>
                <div className="text-[11px] text-gray-500">
                  {e.freigeschaltet ? '✓ freigeschaltet' : e.beschreibung}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leitner-Boxen */}
      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Leitner-Boxen</h2>
        <div className="space-y-1.5">
          {[
            ['neu', s.boxen.neu, 'bg-gray-400'],
            ...Array.from({ length: MAX_BOX }, (_, i) => [
              `Box ${i + 1}`,
              s.boxen[i + 1],
              'bg-indigo-500',
            ]),
          ].map(([label, val, color]) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className="w-12 text-gray-500">{label}</span>
              <div className="flex-1 h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full ${color}`}
                  style={{ width: `${Math.round((val / maxBox) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right tabular-nums">{val}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          Höhere Box = längeres Wiederholungsintervall. „Neu" wurde noch nie bewertet.
        </p>
      </section>

      {/* Pro Prüfungsteil */}
      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Nach Prüfungsteil</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {Object.entries(s.proTeil)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([teil, d]) => (
              <div
                key={teil}
                className="card p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{teil}</span>
                  <span className="text-xs text-gray-500">
                    {d.gelernt}/{d.total} gelernt · {d.faellig} fällig
                  </span>
                </div>
                <Bar value={d.gelernt} total={d.total} className="bg-green-500" />
              </div>
            ))}
        </div>
      </section>

      {/* Schwachstellen */}
      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Schwachstellen nach Thema</h2>
        {s.schwachstellen.length === 0 ? (
          <p className="text-xs text-gray-500">
            Noch keine Schwachstellen erkannt – markiere Objekte als „üben" oder bewerte sie im
            Wiederholen-Modus.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {s.schwachstellen.slice(0, 8).map((x) => (
              <li key={x.tag} className="flex items-center gap-2 text-xs">
                <span className="w-40 sm:w-52 truncate text-gray-600 dark:text-gray-400">
                  {x.tag}
                </span>
                <div className="flex-1 h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{
                      width: `${Math.round((x.count / s.schwachstellen[0].count) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums">{x.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lernverlauf */}
      <section className="space-y-2">
        <h2 className="font-semibold text-sm">Lernverlauf (Bewertungen pro Tag)</h2>
        {letzteTage.length === 0 ? (
          <p className="text-xs text-gray-500">Noch keine Bewertungen aufgezeichnet.</p>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {letzteTage.map((v) => (
              <div key={v.date} className="flex-1 flex flex-col items-center gap-1" title={`${v.date}: ${v.count}`}>
                <div
                  className="w-full bg-indigo-500 rounded-t"
                  style={{ height: `${Math.max(4, Math.round((v.count / maxVerlauf) * 80))}px` }}
                />
                <span className="text-[10px] text-gray-400">{v.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
