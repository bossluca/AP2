import { useMemo, useState } from 'react';
import { getLernobjekte, filterLernobjekte, defaultLernfilter } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import { MAX_BOX } from '../lib/srs';
import { shuffle } from '../lib/shuffle';
import { xpFuerErgebnis } from '../lib/level';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';
import MarkdownContent from '../components/MarkdownContent';

/**
 * Wiederholen-Modus: Spaced-Repetition-Sitzung (Leitner) über Lernobjekte
 * (Prüfungsfragen + Lernzettel), gefiltert nach Art/Teil/Kategorie/Tag und
 * optional nur fällige. Bewertung „Gewusst/Nicht" steuert die Leitner-Box.
 */
export default function Wiederholen() {
  const objekte = useMemo(() => getLernobjekte(), []);
  const { recordReview, recordActivity, recordXp, getStatus, getEntry, isDue } = useProgress();

  const [filter, setFilter] = useState({ ...defaultLernfilter, nurFaellig: true });
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0); // in dieser Sitzung bewertete Objekte

  const kategorien = useMemo(() => {
    const set = new Set();
    for (const o of objekte) {
      if (filter.pruefungsteil !== 'alle' && o.pruefungsteil !== filter.pruefungsteil) continue;
      set.add(o.kategorie);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  }, [objekte, filter.pruefungsteil]);

  const tags = useMemo(() => {
    const set = new Set();
    for (const o of objekte) for (const t of o.tags) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [objekte]);

  // Sitzungs-Snapshot: hängt bewusst NICHT vom Fortschritt ab (getStatus/isDue
  // sind refstabil), damit die Liste während des Bewertens nicht verrutscht.
  // Neu aufgebaut nur bei Filterwechsel oder „Neu starten" (sessionKey).
  const session = useMemo(() => {
    const pool = filterLernobjekte(objekte, filter, { getStatus, isDue });
    return shuffle(pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    objekte,
    filter.art,
    filter.pruefungsteil,
    filter.kategorie,
    filter.tag,
    filter.status,
    filter.nurFaellig,
    sessionKey,
  ]);

  const current = index < session.length ? session[index] : null;
  const finished = session.length > 0 && index >= session.length;

  const setF = (patch) => {
    setFilter((f) => ({ ...f, ...patch }));
    setIndex(0);
    setRevealed(false);
    setDone(0);
  };

  const restart = () => {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setRevealed(false);
    setDone(0);
  };

  const handleReview = (gewusst) => {
    if (!current) return;
    recordReview(current.id, gewusst);
    recordActivity(1);
    recordXp(xpFuerErgebnis(gewusst ? 'gewusst' : 'nicht'));
    setDone((d) => d + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  // Tastatur: Leertaste deckt auf, danach 1 = nicht gewusst, 2 = gewusst.
  useTastenkuerzel({
    ' ': () => current && !revealed && setRevealed(true),
    1: () => current && revealed && handleReview(false),
    2: () => current && revealed && handleReview(true),
  });

  const selectClass =
    'input';

  const box = current ? getEntry(current.id)?.box : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">🔁 Wiederholen</h1>
        <button
          onClick={restart}
          className="btn-ghost px-2 py-1"
        >
          Neu starten
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filter.art}
          onChange={(e) => setF({ art: e.target.value })}
          className={selectClass}
          aria-label="Art filtern"
        >
          <option value="alle">Fragen + Lernzettel</option>
          <option value="frage">Nur Prüfungsfragen</option>
          <option value="lernzettel">Nur Lernzettel</option>
        </select>
        <select
          value={filter.pruefungsteil}
          onChange={(e) => setF({ pruefungsteil: e.target.value, kategorie: 'alle' })}
          className={selectClass}
          aria-label="Prüfungsteil filtern"
        >
          <option value="alle">AP1 + AP2</option>
          <option value="AP1">AP1</option>
          <option value="AP2">AP2</option>
        </select>
        <select
          value={filter.kategorie}
          onChange={(e) => setF({ kategorie: e.target.value })}
          className={selectClass}
          aria-label="Kategorie filtern"
        >
          <option value="alle">Alle Kategorien</option>
          {kategorien.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={filter.tag}
          onChange={(e) => setF({ tag: e.target.value })}
          className={selectClass}
          aria-label="Thema filtern"
        >
          <option value="alle">Alle Themen</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm cursor-pointer px-1">
          <input
            type="checkbox"
            checked={filter.nurFaellig}
            onChange={(e) => setF({ nurFaellig: e.target.checked })}
          />
          nur fällige
        </label>
      </div>

      {session.length === 0 ? (
        <p className="text-sm text-gray-500">
          {filter.nurFaellig
            ? 'Nichts fällig für diese Auswahl – alles wiederholt! 🎉 (Filter „nur fällige" abwählen, um trotzdem zu üben.)'
            : 'Keine Lernobjekte für diese Filter.'}
        </p>
      ) : finished ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-lg font-semibold">Sitzung abgeschlossen 🎉</p>
          <p className="text-sm text-gray-500">{done} Objekte bewertet.</p>
          <button
            onClick={restart}
            className="btn-primary px-4 py-2"
          >
            Neue Sitzung
          </button>
        </div>
      ) : (
        current && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {index + 1} von {session.length}
              </span>
              <span className="flex items-center gap-2">
                <span className="chip text-xs">
                  {current.art === 'frage' ? '📄 Frage' : '📝 Lernzettel'}
                </span>
                <span className="text-xs">{box ? `Box ${box}/${MAX_BOX}` : 'neu'}</span>
              </span>
            </div>

            <div className="card p-4 space-y-4">
              <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                <span className="chip">
                  {current.pruefungsteil}
                </span>
                <span className="chip">
                  {current.kategorie}
                </span>
                {current.tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>

              <MarkdownContent>{current.front}</MarkdownContent>

              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full py-2.5 btn-primary"
                >
                  {current.art === 'frage' ? 'Lösung anzeigen' : 'Inhalt anzeigen'}
                </button>
              ) : (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-2">
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
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleReview(false)}
                      className="btn-soft-red flex-1 py-2.5"
                    >
                      Nicht gewusst <span className="opacity-60" aria-hidden="true">(1)</span>
                    </button>
                    <button
                      onClick={() => handleReview(true)}
                      className="btn-soft-green flex-1 py-2.5"
                    >
                      Gewusst <span className="opacity-60" aria-hidden="true">(2)</span>
                    </button>
                  </div>
                </>
              )}
              <p className="text-[11px] text-gray-400 text-center pt-1">
                Tipp: Leertaste zum Aufdecken · 1 = nicht gewusst · 2 = gewusst
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
