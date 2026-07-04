import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLernobjekte } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { baueLernsession, baueSchwaechenSession, STANDARD_UMFANG } from '../lib/lernsession';
import { berechneStatistik } from '../lib/statistik';
import { shuffle } from '../lib/shuffle';
import { xpFuerErgebnis } from '../lib/level';
import { noteAusConfidence, istFehlSicherheit } from '../lib/confidence';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';
import MarkdownContent from '../components/MarkdownContent';

/**
 * „Heute lernen" – eine kurze, fertige Lern-Session ohne Filterauswahl. Genau ein
 * Objekt im Fokus, aufdecken (Flip), „Gewusst/Nicht" bewerten; am Ende eine
 * motivierende Auswertung. Nutzt SRS (Leitner), Aktivität und XP wie die anderen
 * Modi – nur mit minimaler Reibung.
 */
export default function Lernen() {
  const objekte = useMemo(() => getLernobjekte(), []);
  const {
    getStatus,
    isDue,
    getEntry,
    progress,
    recordReview,
    setResume,
    clearResume,
  } = useProgress();
  const { recordActivity, recordXp, gami } = useGamification();
  const [searchParams] = useSearchParams();

  const [sessionKey, setSessionKey] = useState(0);
  // Modus: 'heute' (Smart-Session) | 'schwaechen' (gezielt) | 'frei' (lockere Runde).
  const [modus, setModus] = useState(() =>
    searchParams.get('modus') === 'schwaechen' ? 'schwaechen' : 'heute'
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [verlauf, setVerlauf] = useState([]); // bool[] – gewusst je Karte
  const [xpGesammelt, setXpGesammelt] = useState(0);
  // Confidence: beim Aufdecken gesetzt (true = „weiß ich", false = „unsicher",
  // null = ohne Angabe aufgedeckt, z. B. per Leertaste).
  const [sicherheit, setSicherheit] = useState(null);
  const [fehlSicher, setFehlSicher] = useState(0); // sicher geglaubt, aber falsch

  // Schwache Themen-Tags aus der Statistik (für den Schwächen-Modus).
  const schwachTags = useMemo(
    () => berechneStatistik(objekte, progress).schwachstellen.map((x) => x.tag),
    [objekte, progress]
  );

  // Session-Snapshot: hängt bewusst nicht am Fortschritt (Helfer sind refstabil),
  // damit die Reihe während des Lernens stabil bleibt. Neu nur bei „Neu starten".
  const session = useMemo(() => {
    const helfer = { getStatus, isDue, getEntry };
    if (modus === 'frei') return shuffle(objekte).slice(0, STANDARD_UMFANG);
    if (modus === 'schwaechen') return baueSchwaechenSession(objekte, helfer, { schwachTags });
    return baueLernsession(objekte, helfer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objekte, sessionKey, modus]);

  const current = index < session.length ? session[index] : null;
  const fertig = session.length > 0 && index >= session.length;
  const gewusstAnzahl = verlauf.filter(Boolean).length;

  const neustart = (neuModus = modus) => {
    setModus(neuModus);
    setSessionKey((k) => k + 1);
    setIndex(0);
    setRevealed(false);
    setVerlauf([]);
    setXpGesammelt(0);
    setSicherheit(null);
    setFehlSicher(0);
  };

  const titel =
    modus === 'schwaechen' ? '🎯 Schwächen-Training' : modus === 'frei' ? '🎲 Lockere Runde' : '📚 Heute lernen';

  // Resume-Ziel je Modus (für „Weiterlernen" auf der Startseite).
  const resumeZiel = () => {
    const q = modus === 'schwaechen' ? '?modus=schwaechen' : modus === 'frei' ? '?modus=frei' : '';
    return { to: `/lernen${q}`, titel, modus };
  };

  const bewerten = (gewusst) => {
    if (!current) return;
    // Mit Confidence-Angabe wird die FSRS-Note feiner (Leicht/Gut/Nochmal);
    // ohne Angabe (Leertaste) bleibt das bisherige boolean-Mapping.
    recordReview(current.id, sicherheit === null ? gewusst : noteAusConfidence(sicherheit, gewusst));
    if (istFehlSicherheit(sicherheit === null ? false : sicherheit, gewusst)) {
      setFehlSicher((n) => n + 1);
    }
    recordActivity(1);
    const x = xpFuerErgebnis(gewusst ? 'gewusst' : 'nicht');
    recordXp(x);
    setXpGesammelt((v) => v + x);
    setVerlauf((v) => [...v, gewusst]);
    setRevealed(false);
    setSicherheit(null);
    const letzte = index + 1 >= session.length;
    // Mitten in der Session „Weiterlernen" merken, am Ende wieder löschen.
    if (letzte) clearResume();
    else setResume(resumeZiel());
    setIndex((i) => i + 1);
  };

  useTastenkuerzel({
    ' ': () => current && setRevealed((r) => !r),
    1: () => current && revealed && bewerten(false),
    2: () => current && revealed && bewerten(true),
  });

  // --- Leer: nichts fällig --------------------------------------------------
  if (session.length === 0 && !fertig) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-8">
        <div className="text-5xl">🎉</div>
        <h1 className="text-xl font-bold">Alles erledigt für heute!</h1>
        <p className="text-sm text-gray-500">
          Nichts Fälliges offen – stark. Wenn du magst, leg eine lockere Übungsrunde ein.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button onClick={() => neustart('frei')} className="btn-primary px-5 py-2.5">
            🎲 Locker 10 üben
          </button>
          {schwachTags.length > 0 && (
            <button onClick={() => neustart('schwaechen')} className="btn-soft-amber px-5 py-2.5">
              🎯 Schwächen üben
            </button>
          )}
        </div>
        <div>
          <Link to="/" className="text-sm text-accent hover:underline">
            Zur Startseite
          </Link>
        </div>
      </div>
    );
  }

  // --- Auswertung -----------------------------------------------------------
  if (fertig) {
    const quote = session.length > 0 ? Math.round((gewusstAnzahl / verlauf.length) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-6">
        <div className="text-5xl">{quote >= 80 ? '🌟' : quote >= 50 ? '💪' : '🌱'}</div>
        <h1 className="text-xl font-bold">Geschafft!</h1>
        <div className="card p-5 space-y-1">
          <div className="text-3xl font-bold text-accent">
            {gewusstAnzahl} / {verlauf.length}
          </div>
          <div className="text-sm text-gray-500">gewusst ({quote}%)</div>
          <div className="text-sm font-medium text-accent pt-1">+{xpGesammelt} XP</div>
          <div className="text-xs text-gray-400">
            🔥 {gami.streak} Tage Streak · Level {gami.level.level}
          </div>
        </div>
        <p className="text-sm text-gray-500">
          {quote >= 80
            ? 'Klasse Lauf – so bleibt es leicht und es sitzt.'
            : 'Dranbleiben lohnt sich – jede Runde festigt mehr.'}
        </p>
        {fehlSicher > 0 && (
          <p className="text-xs text-amber-600">
            ⚠️ Bei {fehlSicher} {fehlSicher === 1 ? 'Karte' : 'Karten'} warst du sicher – und lagst
            daneben. Genau diese Fehl-Sicherheit kostet in der Prüfung Punkte; sie kommen bald
            zur Wiederholung.
          </p>
        )}
        <div className="flex gap-2 justify-center">
          <Link to="/" className="btn-ghost px-4 py-2.5">
            Startseite
          </Link>
          <button onClick={() => neustart()} className="btn-primary px-4 py-2.5">
            Noch eine Runde
          </button>
        </div>
      </div>
    );
  }

  // --- Laufende Session -----------------------------------------------------
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{titel}</h1>
        <span className="text-sm text-gray-500">
          {index + 1} / {session.length}
        </span>
      </div>

      {/* Fortschritts-Punkte */}
      <div className="flex gap-1.5">
        {session.map((_, i) => {
          const cls =
            i < index
              ? verlauf[i]
                ? 'bg-green-500'
                : 'bg-amber-500'
              : i === index
                ? 'bg-accent'
                : 'bg-gray-200 dark:bg-[#2a3326]';
          return <div key={i} className={`h-1.5 flex-1 rounded-full ${cls}`} />;
        })}
      </div>

      {current && (
        <div className="card p-5 space-y-4">
          <div className="text-xs text-gray-500 flex flex-wrap gap-2">
            <span className="chip">{current.art === 'frage' ? '📄 Frage' : '📝 Lernzettel'}</span>
            <span className="chip">{current.pruefungsteil}</span>
            <span className="chip">{current.kategorie}</span>
          </div>

          {/* Flip: Vorderseite ↔ Lösung */}
          <div className="flip">
            <div className={`flip-inner ${revealed ? 'is-flipped' : ''}`}>
              <div className="flip-face space-y-4">
                <MarkdownContent>{current.front}</MarkdownContent>
                {/* Aufdecken mit Confidence-Angabe: ein Tipp, gleiche Reibung. */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSicherheit(false);
                      setRevealed(true);
                    }}
                    className="btn-soft-amber flex-1 py-2.5"
                  >
                    🤔 Bin unsicher
                  </button>
                  <button
                    onClick={() => {
                      setSicherheit(true);
                      setRevealed(true);
                    }}
                    className="btn-primary flex-1 py-2.5"
                  >
                    💡 Weiß ich
                  </button>
                </div>
              </div>
              <div className="flip-face flip-back border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
                {current.back ? (
                  <>
                    <MarkdownContent>{current.back}</MarkdownContent>
                    {current.unverifiziert && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Diese Lösung ist unverifiziert / nicht offiziell.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    Keine Lösung hinterlegt – selbst einschätzen.
                  </p>
                )}
              </div>
            </div>
          </div>

          {revealed && (
            <div className="space-y-2">
              {sicherheit === true && (
                <p className="text-[11px] text-gray-400 text-center">
                  Du warst sicher – sei ehrlich, hat es wirklich gesessen?
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => bewerten(false)} className="btn-soft-red flex-1 py-2.5">
                  Nicht gewusst <span className="opacity-60" aria-hidden="true">(1)</span>
                </button>
                <button onClick={() => bewerten(true)} className="btn-soft-green flex-1 py-2.5">
                  Gewusst <span className="opacity-60" aria-hidden="true">(2)</span>
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            Tipp: Leertaste aufdecken · 1 = nicht gewusst · 2 = gewusst
          </p>
        </div>
      )}
    </div>
  );
}
