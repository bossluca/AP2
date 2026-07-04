import { useMemo, useState } from 'react';
import { getLearnableQuestions } from '../data/useExamData';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { applyFilters, defaultFilters } from '../lib/filters';
import { shuffle } from '../lib/shuffle';
import { xpFuerErgebnis } from '../lib/level';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';
import FilterBar from '../components/FilterBar';
import MarkdownContent from '../components/MarkdownContent';
import LeerZustand from '../components/LeerZustand';
import HerkunftBadge from '../components/HerkunftBadge';

/**
 * Karteikarten-Seite: durch (gefilterte) Fragen blättern, Lösung aufdecken,
 * pro Karte „Muss ich üben" oder „Gelernt" markieren. Optionaler Zufalls-Modus.
 * Markierungen fließen in den zentralen Fortschritt.
 */
export default function Flashcards() {
  const allQuestions = useMemo(() => getLearnableQuestions(), []);
  const { setStatus, getStatus } = useProgress();
  const { recordActivity, recordXp } = useGamification();

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [random, setRandom] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  // Zähler, der bei Klick auf „Neu mischen" erhöht wird, um die Reihenfolge
  // neu zu berechnen, ohne dafür einen Effekt zu brauchen.
  const [shuffleKey, setShuffleKey] = useState(0);

  const filtered = useMemo(
    () => applyFilters(allQuestions, filters, getStatus),
    [allQuestions, filters, getStatus]
  );

  // Reihenfolge wird abgeleitet (kein useEffect/setState nötig): bei Änderung
  // von Filter, Modus oder shuffleKey neu berechnet.
  const order = useMemo(() => {
    const base = filtered.map((_, i) => i);
    return random ? shuffle(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, random, shuffleKey]);

  // Index defensiv auf gültigen Bereich begrenzen (z. B. nach Filterwechsel),
  // ohne State zu setzen – verhindert Out-of-Range-Zugriffe beim Render.
  const safeIndex = order.length > 0 ? Math.min(index, order.length - 1) : 0;
  const current = order.length > 0 ? filtered[order[safeIndex]] : null;

  const goNext = () => {
    setRevealed(false);
    setIndex((i) => (i + 1 < order.length ? i + 1 : 0));
  };

  const goPrev = () => {
    setRevealed(false);
    setIndex((i) => (i - 1 >= 0 ? i - 1 : order.length - 1));
  };

  const handleMark = (status) => {
    if (!current) return;
    setStatus(current.id, status);
    recordActivity(1);
    recordXp(xpFuerErgebnis(status === 'gelernt' ? 'richtig' : 'falsch'));
    goNext();
  };

  // Tastatur: ←/→ blättern, Leertaste deckt auf, 1 = üben, 2 = gelernt.
  useTastenkuerzel({
    ArrowLeft: goPrev,
    ArrowRight: goNext,
    ' ': () => setRevealed((r) => !r),
    1: () => handleMark('ueben'),
    2: () => handleMark('gelernt'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">📇 Karteikarten</h1>
        <div className="flex items-center gap-2 text-sm">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={random}
              onChange={(e) => {
                setRandom(e.target.checked);
                setIndex(0);
                setRevealed(false);
              }}
            />
            Zufalls-Modus
          </label>
          {random && (
            <button
              onClick={() => {
                setShuffleKey((k) => k + 1);
                setIndex(0);
                setRevealed(false);
              }}
              className="btn-ghost px-2 py-1"
            >
              Neu mischen
            </button>
          )}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="btn-ghost px-2 py-1"
          >
            {showFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
          </button>
        </div>
      </div>

      {showFilters && <FilterBar filters={filters} onChange={setFilters} />}

      {filtered.length === 0 ? (
        <LeerZustand
          emoji="📇"
          titel="Keine Fragen für diese Filter"
          text="Lockere die Filter oder wechsle den Prüfungsteil, um Karten zu sehen."
        />
      ) : (
        <p className="text-sm text-gray-500">
          Frage {safeIndex + 1} von {filtered.length}
        </p>
      )}

      {current && (
        <div className="card p-4 space-y-4">
          <div className="text-xs text-gray-500 flex flex-wrap gap-2">
            <span>
              {current.saison} {current.jahr} – Aufgabe {current.aufgabe_nr}
              {current.teilfrage ? ` ${current.teilfrage})` : ''}
            </span>
            {current.punkte != null && <span>· {current.punkte} Punkte</span>}
            {current.thema_tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          {current.aufgabe_titel && (
            <h2 className="font-semibold text-base">{current.aufgabe_titel}</h2>
          )}
          {current.ueberschrift && (
            <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400">
              {current.ueberschrift}
            </h3>
          )}

          {/* Karten-Flip: Vorderseite Frage ↔ Rückseite Lösung */}
          <div className="flip">
            <div className={`flip-inner ${revealed ? 'is-flipped' : ''}`}>
              <div className="flip-face space-y-4">
                <MarkdownContent>{current.frage_text}</MarkdownContent>
                <button onClick={() => setRevealed(true)} className="w-full py-2.5 btn-primary">
                  Lösung anzeigen
                </button>
              </div>
              <div className="flip-face flip-back border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
                <h4 className="font-semibold text-sm">Lösung</h4>
                {current.hat_antwort ? (
                  <>
                    <MarkdownContent>{current.loesung_text}</MarkdownContent>
                    <HerkunftBadge obj={current} />
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Keine Lösung verfügbar.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <div className="flex gap-2">
              <button
                onClick={goPrev}
                className="btn-ghost px-3 py-1.5"
              >
                ← Zurück
              </button>
              <button
                onClick={goNext}
                className="btn-ghost px-3 py-1.5"
              >
                Weiter →
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleMark('ueben')}
                className="btn-soft-amber px-3 py-1.5"
              >
                Muss ich üben <span className="opacity-60" aria-hidden="true">(1)</span>
              </button>
              <button
                onClick={() => handleMark('gelernt')}
                className="btn-soft-green px-3 py-1.5"
              >
                Gelernt <span className="opacity-60" aria-hidden="true">(2)</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 text-center pt-2">
            Tipp: ← / → blättern · Leertaste aufdecken · 1 = üben · 2 = gelernt
          </p>
        </div>
      )}
    </div>
  );
}
