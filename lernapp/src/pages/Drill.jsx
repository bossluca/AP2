import { useMemo, useState } from 'react';
import { getLerneinheiten } from '../data/useExamData';
import { baueGlossarCloze } from '../lib/glossar';
import { baueMcFragen } from '../lib/mcDrill';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { xpFuerErgebnis } from '../lib/level';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';
import LeerZustand from '../components/LeerZustand';

const UMFANG = 10;

/**
 * Drill-Modus: schnelle Multiple-Choice-Runde mit sofortiger, objektiver
 * Bewertung – ideal mobil und zwischendurch. Fragen + Distraktoren entstehen
 * **automatisch aus den Lernzetteln** (`lib/glossar` → `lib/mcDrill`), die
 * Distraktoren kommen aus demselben Themenfeld. Jede Antwort zählt als
 * Aktivität und gibt XP.
 */
export default function Drill() {
  const { recordReview } = useProgress();
  const { recordActivity, recordXp } = useGamification();
  const [teil, setTeil] = useState('alle');
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [gewaehlt, setGewaehlt] = useState(null); // Index der getippten Option
  const [richtige, setRichtige] = useState(0);
  const [beantwortet, setBeantwortet] = useState(0);

  const fragen = useMemo(() => {
    const einheiten = getLerneinheiten().filter(
      (e) => teil === 'alle' || (e.pruefungsteil || 'AP1') === teil
    );
    const cloze = baueGlossarCloze(einheiten, { maxProEinheit: 3 });
    return baueMcFragen(cloze, { anzahl: UMFANG });
    // sessionKey erzwingt eine frische Mischung bei „Neue Runde".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teil, sessionKey]);

  const frage = index < fragen.length ? fragen[index] : null;
  const fertig = fragen.length > 0 && index >= fragen.length;

  const neustart = () => {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setGewaehlt(null);
    setRichtige(0);
    setBeantwortet(0);
  };

  const antworte = (i) => {
    if (!frage || gewaehlt !== null) return; // nur eine Antwort pro Frage
    setGewaehlt(i);
    const richtig = i === frage.loesungIndex;
    if (richtig) setRichtige((n) => n + 1);
    setBeantwortet((n) => n + 1);
    recordActivity(1);
    recordXp(xpFuerErgebnis(richtig ? 'richtig' : 'falsch'));
    // Objektives Signal ins Gedächtnismodell: das MC-Ergebnis zählt als
    // FSRS-Review der Quell-Lerneinheit (Wiedererkennen = „Gut", nicht „Leicht").
    if (frage.einheitId) recordReview(frage.einheitId, richtig ? 3 : 1);
  };

  const weiter = () => {
    if (gewaehlt === null) return;
    setGewaehlt(null);
    setIndex((i) => i + 1);
  };

  useTastenkuerzel({
    1: () => antworte(0),
    2: () => antworte(1),
    3: () => antworte(2),
    4: () => antworte(3),
    ' ': weiter,
  });

  if (fragen.length === 0 && !fertig) {
    return (
      <LeerZustand
        emoji="⚡"
        titel="Kein Drill-Material gefunden"
        text={'Für diese Auswahl gibt es zu wenige Glossar-Begriffe. Probiere „Alle" statt eines einzelnen Prüfungsteils.'}
        cta={{ label: 'Alle Teile üben', onClick: () => setTeil('alle') }}
      />
    );
  }

  if (fertig) {
    const quote = beantwortet > 0 ? Math.round((richtige / beantwortet) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-6">
        <div className="text-5xl">{quote >= 80 ? '⚡' : quote >= 50 ? '💪' : '🌱'}</div>
        <h1 className="text-xl font-bold">Drill geschafft!</h1>
        <div className="card p-5 space-y-1">
          <div className="text-3xl font-bold text-accent">
            {richtige} / {beantwortet}
          </div>
          <div className="text-sm text-gray-500">richtig ({quote}%)</div>
        </div>
        <button onClick={neustart} className="btn-primary px-5 py-2.5">
          ⚡ Neue Runde
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-bold">⚡ Drill</h1>
        <div className="flex items-center gap-2">
          <select
            value={teil}
            onChange={(e) => {
              setTeil(e.target.value);
              neustart();
            }}
            className="input text-sm"
            aria-label="Prüfungsteil"
          >
            <option value="alle">AP1 + AP2</option>
            <option value="AP1">Nur AP1</option>
            <option value="AP2">Nur AP2</option>
          </select>
          <span className="text-sm text-gray-500">
            {index + 1} / {fragen.length}
          </span>
        </div>
      </div>

      {frage && (
        <div className="card p-5 space-y-4">
          <div className="text-xs text-gray-500">Welcher Begriff gehört in die Lücke?</div>
          <p className="font-medium">{frage.frage}</p>

          <div className="grid gap-2">
            {frage.optionen.map((opt, i) => {
              const aufgedeckt = gewaehlt !== null;
              const korrekt = i === frage.loesungIndex;
              const getippt = i === gewaehlt;
              const cls = !aufgedeckt
                ? 'border-gray-200 dark:border-[#1d271a] hover:border-accent'
                : korrekt
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : getippt
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-[#1d271a] opacity-60';
              return (
                <button
                  key={opt}
                  onClick={() => antworte(i)}
                  disabled={gewaehlt !== null}
                  className={`text-left rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${cls}`}
                >
                  <span className="font-mono text-xs text-gray-400 mr-2" aria-hidden="true">
                    {i + 1}
                  </span>
                  {opt}
                  {gewaehlt !== null && korrekt && ' ✓'}
                  {gewaehlt !== null && getippt && !korrekt && ' ✗'}
                </button>
              );
            })}
          </div>

          {gewaehlt !== null && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs text-gray-500">
                {gewaehlt === frage.loesungIndex ? 'Richtig! 🎉' : `Richtig wäre: ${frage.begriff}.`}
                {frage.quelle && ` Nachlesen: „${frage.quelle}"`}
              </p>
              <button onClick={weiter} className="btn-primary px-4 py-2">
                Weiter
              </button>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            Tipp: 1–4 = Antwort wählen · Leertaste = weiter
          </p>
        </div>
      )}
    </div>
  );
}
