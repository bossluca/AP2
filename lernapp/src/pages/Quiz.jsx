import { useMemo, useState } from 'react';
import { getLearnableQuestions } from '../data/useExamData';
import { useProgress } from '../context/ProgressContext';
import { applyFilters, defaultFilters } from '../lib/filters';
import { shuffle } from '../lib/shuffle';
import { BEWERTUNGEN } from '../lib/bewertung';
import { xpFuerErgebnis } from '../lib/level';
import FilterBar from '../components/FilterBar';
import MarkdownContent from '../components/MarkdownContent';

/**
 * Quiz-Seite: gefilterte Fragenrunde mit Selbsteinschätzung.
 * Ablauf: Filter wählen → Quiz starten → je Frage Lösung aufdecken und
 * richtig/teilweise/falsch bewerten → Auswertung (Score + Themenübersicht).
 * Bewertungen fließen in den zentralen Fortschritt (richtig → "gelernt", sonst "ueben").
 */
export default function Quiz() {
  const allQuestions = useMemo(() => getLearnableQuestions(), []);
  const { setStatus, getStatus, recordQuizResult, recordActivity, recordXp } = useProgress();

  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]); // [{id, result, score, tags}]
  const [finished, setFinished] = useState(false);

  const filtered = useMemo(
    () => applyFilters(allQuestions, filters, getStatus),
    [allQuestions, filters, getStatus]
  );

  const startQuiz = () => {
    setQuestions(shuffle(filtered));
    setIndex(0);
    setRevealed(false);
    setResults([]);
    setFinished(false);
    setStarted(true);
  };

  const current = questions[index];

  const handleAnswer = (opt) => {
    if (!current) return;
    recordQuizResult(current.id, opt.key);
    recordActivity(1);
    recordXp(xpFuerErgebnis(opt.key));
    setStatus(current.id, opt.key === 'richtig' ? 'gelernt' : 'ueben');

    setResults((prev) => [
      ...prev,
      { id: current.id, result: opt.key, score: opt.anteil, tags: current.thema_tags },
    ]);

    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    setStarted(false);
    setFinished(false);
    setQuestions([]);
    setResults([]);
  };

  // --- Auswertung ---
  const totalScore = results.reduce((s, r) => s + r.score, 0);
  const maxScore = results.length;
  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const tagStats = useMemo(() => {
    const stats = {};
    for (const r of results) {
      for (const tag of r.tags) {
        if (!stats[tag]) stats[tag] = { total: 0, score: 0 };
        stats[tag].total += 1;
        stats[tag].score += r.score;
      }
    }
    return Object.entries(stats)
      .map(([tag, v]) => ({ tag, ...v, percent: Math.round((v.score / v.total) * 100) }))
      .sort((a, b) => a.percent - b.percent);
  }, [results]);

  // --- Ansicht: Start ---
  if (!started) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">📝 Quiz</h1>
        <p className="text-sm text-gray-500">
          Beantworte die Fragen selbst, schätze danach ein, ob deine Antwort richtig, teilweise
          richtig oder falsch war. Am Ende gibt es eine Auswertung mit Score und Themenübersicht.
        </p>

        <button
          onClick={() => setShowFilters((s) => !s)}
          className="btn-ghost"
        >
          {showFilters ? 'Filter ausblenden' : 'Filter anzeigen'}
        </button>

        {showFilters && <FilterBar filters={filters} onChange={setFilters} />}

        <p className="text-sm text-gray-500">{filtered.length} Fragen für diese Filter verfügbar.</p>

        <button
          onClick={startQuiz}
          disabled={filtered.length === 0}
          className="w-full py-2.5 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Quiz starten
        </button>
      </div>
    );
  }

  // --- Ansicht: Auswertung ---
  if (finished) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Auswertung</h1>

        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-accent">{percent}%</div>
          <div className="text-sm text-gray-500">
            {totalScore} von {maxScore} Punkten (richtig = 1, teilweise = 0,5, falsch = 0)
          </div>
        </div>

        {tagStats.length > 0 && (
          <div className="card p-4 space-y-2">
            <h2 className="font-semibold text-sm mb-2">Ergebnis nach Thema</h2>
            {tagStats.map((t) => (
              <div key={t.tag} className="flex items-center gap-2 text-sm">
                <span className="w-32 sm:w-48 truncate">{t.tag}</span>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
                  <div
                    className={`h-full ${t.percent < 50 ? 'bg-red-500' : t.percent < 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${t.percent}%` }}
                  />
                </div>
                <span className="w-12 text-right text-gray-500">{t.percent}%</span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={restart}
          className="w-full py-2.5 btn-primary"
        >
          Neues Quiz
        </button>
      </div>
    );
  }

  // --- Ansicht: laufende Frage ---
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">📝 Quiz</h1>
        <span className="text-sm text-gray-500">
          Frage {index + 1} von {questions.length}
        </span>
      </div>

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

          <MarkdownContent>{current.frage_text}</MarkdownContent>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-2.5 btn-primary"
            >
              Lösung anzeigen & bewerten
            </button>
          ) : (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-3">
              <h4 className="font-semibold text-sm">Lösung</h4>
              {current.hat_antwort ? (
                <>
                  <MarkdownContent>{current.loesung_text}</MarkdownContent>
                  {current.unverifiziert_markiert && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Diese Lösung ist unverifiziert / nicht offiziell.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 italic">Keine Lösung verfügbar.</p>
              )}

              <p className="text-sm font-medium pt-1">Wie war deine Antwort?</p>
              <div className="grid grid-cols-3 gap-2">
                {BEWERTUNGEN.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(opt)}
                    className={`py-2.5 rounded-md text-sm font-medium transition-colors ${opt.classes}`}
                  >
                    <span aria-hidden="true">{opt.symbol}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
