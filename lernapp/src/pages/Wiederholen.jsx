import { useMemo, useState } from 'react';
import { getLernobjekte, filterLernobjekte, defaultLernfilter } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import { MAX_BOX, bewerten as fsrsBewerten } from '../lib/fsrs';
import { shuffle } from '../lib/shuffle';
import { xpFuerErgebnis } from '../lib/level';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';
import MarkdownContent from '../components/MarkdownContent';

const TAG_MS = 86400000;

/** XP-Ergebnis je FSRS-Note (Übung zählt – auch „Nochmal" gibt etwas). */
const NOTE_XP = { 1: 'nicht', 2: 'teilweise', 3: 'gewusst', 4: 'gewusst' };

/** Die vier Bewertungs-Knöpfe (FSRS-Noten Nochmal/Schwer/Gut/Leicht). */
const NOTE_BUTTONS = [
  { note: 1, label: 'Nochmal', taste: '1', classes: 'btn-soft-red' },
  { note: 2, label: 'Schwer', taste: '2', classes: 'btn-soft-amber' },
  { note: 3, label: 'Gut', taste: '3', classes: 'btn-soft-green' },
  { note: 4, label: 'Leicht', taste: '4', classes: 'btn-soft-green' },
];

/** Ganze Tage von heute (Tagesbeginn) bis zur Fälligkeit – für die Intervall-Vorschau. */
function tageBis(dueIso) {
  const heute0 = new Date();
  heute0.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((new Date(dueIso).getTime() - heute0.getTime()) / TAG_MS));
}

/**
 * Wiederholen-Modus: Spaced-Repetition-Sitzung (FSRS) über Lernobjekte
 * (Prüfungsfragen + Lernzettel), gefiltert nach Art/Teil/Kategorie/Tag und
 * optional nur fällige. 4-stufige Bewertung (Nochmal/Schwer/Gut/Leicht) steuert
 * Stabilität & nächste Fälligkeit; je Knopf wird das nächste Intervall vorab gezeigt.
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

  const handleReview = (note) => {
    if (!current) return;
    recordReview(current.id, note);
    recordActivity(1);
    recordXp(xpFuerErgebnis(NOTE_XP[note] || 'nicht'));
    setDone((d) => d + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  // Tastatur: Leertaste deckt auf, danach 1–4 = Bewertung (Nochmal…Leicht).
  useTastenkuerzel({
    ' ': () => current && !revealed && setRevealed(true),
    1: () => current && revealed && handleReview(1),
    2: () => current && revealed && handleReview(2),
    3: () => current && revealed && handleReview(3),
    4: () => current && revealed && handleReview(4),
  });

  const selectClass = 'input';

  const entry = current ? getEntry(current.id) : null;
  const box = entry?.box ?? null;

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
                <span className="text-xs">{box ? `Stärke ${box}/${MAX_BOX}` : 'neu'}</span>
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {NOTE_BUTTONS.map((b) => (
                      <button
                        key={b.note}
                        onClick={() => handleReview(b.note)}
                        className={`${b.classes} flex-col py-2 leading-tight`}
                      >
                        <span className="font-medium">{b.label}</span>
                        <span className="text-[11px] opacity-70">
                          {tageBis(fsrsBewerten(entry, b.note).due)} T
                          <span aria-hidden="true"> · {b.taste}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="text-[11px] text-gray-400 text-center pt-1">
                Leertaste deckt auf · 1 Nochmal · 2 Schwer · 3 Gut · 4 Leicht · „T" = nächstes Intervall
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
