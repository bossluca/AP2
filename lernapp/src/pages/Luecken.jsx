import { useMemo, useState } from 'react';
import { getLerneinheiten } from '../data/useExamData';
import { baueGlossarCloze } from '../lib/glossar';
import { useProgress } from '../context/ProgressContext';
import { shuffle } from '../lib/shuffle';
import { xpFuerErgebnis } from '../lib/level';
import ClozeFrage from '../components/ClozeFrage';
import LeerZustand from '../components/LeerZustand';

const UMFANG = 10;

/**
 * Lückentext-Modus: aktives Abrufen statt Lesen. Erzeugt Cloze-Übungen
 * **automatisch aus den Lernzetteln** (`lib/glossar`) und prüft die Eingaben
 * tolerant (`lib/cloze`, deutsche Normalisierung). Eine Sitzung umfasst bis zu
 * zehn Begriffe; jede Bewertung zählt als Aktivität und gibt XP.
 */
export default function Luecken() {
  const { recordActivity, recordXp } = useProgress();
  const [teil, setTeil] = useState('alle');
  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [ergebnisse, setErgebnisse] = useState([]); // 'richtig'|'teilweise'|'falsch'

  const pool = useMemo(() => {
    const einheiten = getLerneinheiten().filter(
      (e) => teil === 'alle' || (e.pruefungsteil || 'AP1') === teil
    );
    return baueGlossarCloze(einheiten, { maxProEinheit: 3 });
  }, [teil]);

  // Sitzung bewusst stabil halten (nur bei Filter-/Neustart neu mischen).
  const session = useMemo(
    () => shuffle(pool).slice(0, UMFANG),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, sessionKey]
  );

  const current = index < session.length ? session[index] : null;
  const finished = session.length > 0 && index >= session.length;
  const beantwortet = ergebnisse.length > index;

  const setF = (t) => {
    setTeil(t);
    setIndex(0);
    setErgebnisse([]);
  };

  const neu = () => {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setErgebnisse([]);
  };

  const onErgebnis = (r) => {
    recordActivity(1);
    recordXp(xpFuerErgebnis(r.bewertung));
    setErgebnisse((e) => [...e, r.bewertung]);
  };

  const richtig = ergebnisse.filter((e) => e === 'richtig').length;
  const teilweise = ergebnisse.filter((e) => e === 'teilweise').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">✍️ Lückentext</h1>
        <button onClick={neu} className="btn-ghost px-2 py-1">
          Neu mischen
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Fülle die Lücken – Begriffe aus den Lernzetteln, automatisch erzeugt. Umlaute und
        Groß-/Kleinschreibung sind egal.
      </p>

      <div className="flex flex-wrap gap-2">
        <select
          value={teil}
          onChange={(e) => setF(e.target.value)}
          className="input"
          aria-label="Prüfungsteil filtern"
        >
          <option value="alle">AP1 + AP2</option>
          <option value="AP1">AP1</option>
          <option value="AP2">AP2</option>
        </select>
        <span className="text-sm text-gray-500 self-center">{pool.length} Begriffe verfügbar</span>
      </div>

      {session.length === 0 ? (
        <LeerZustand
          emoji="✍️"
          titel="Keine Begriffe für diese Auswahl"
          text="Wähle einen anderen Prüfungsteil oder lies zuerst ein paar Lernzettel."
          cta={{ label: 'Zu den Lernzetteln', to: '/lernzettel' }}
        />
      ) : finished ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-lg font-semibold">Sitzung abgeschlossen 🎉</p>
          <p className="text-sm text-gray-500">
            {richtig} richtig · {teilweise} teilweise · {ergebnisse.length - richtig - teilweise}{' '}
            offen von {ergebnisse.length}.
          </p>
          <button onClick={neu} className="btn-primary px-4 py-2">
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
              <span className="flex flex-wrap gap-1 justify-end">
                {current.tags.slice(0, 2).map((t) => (
                  <span key={t} className="chip text-xs">
                    {t}
                  </span>
                ))}
              </span>
            </div>

            <div className="card p-4 space-y-4">
              <ClozeFrage key={current.id} text={current.text} onErgebnis={onErgebnis} />
              {current.quelle && (
                <p className="text-[11px] text-gray-400">Quelle: {current.quelle}</p>
              )}
              {beantwortet && (
                <button
                  onClick={() => setIndex((i) => i + 1)}
                  className="btn-primary w-full py-2.5"
                >
                  {index + 1 < session.length ? 'Weiter →' : 'Auswertung'}
                </button>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
