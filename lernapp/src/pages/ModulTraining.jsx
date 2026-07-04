import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, PencilLine, HelpCircle } from 'lucide-react';
import { getLerneinheiten, getLearnableQuestions } from '../data/useExamData';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { baueLernpfade, findePfad } from '../lib/lernpfade';
import { baueModulTraining, werteTrainingAus } from '../lib/modulTraining';
import { BEWERTUNGEN } from '../lib/bewertung';
import { xpFuerErgebnis } from '../lib/level';
import MarkdownContent from '../components/MarkdownContent';
import ClozeFrage from '../components/ClozeFrage';
import HerkunftBadge from '../components/HerkunftBadge';

/** Kleines Typ-Label oben auf jeder Trainings-Karte. */
function SchrittKopf({ typ }) {
  const map = {
    lernzettel: { Icon: BookOpen, label: 'Lernzettel' },
    cloze: { Icon: PencilLine, label: 'Lückentext' },
    frage: { Icon: HelpCircle, label: 'Prüfungsfrage' },
  };
  const { Icon, label } = map[typ] || map.frage;
  return (
    <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-gray-400 dark:text-[#6B7A66]">
      <Icon size={13} aria-hidden="true" />
      {label}
    </div>
  );
}

/* --------------------------- Schritt-Renderer ---------------------------- */

/** Lernzettel-Schritt: lesen, aufdecken, „verstanden?" selbst einschätzen. */
function LernzettelSchritt({ schritt, onErgebnis }) {
  const [aufgedeckt, setAufgedeckt] = useState(false);
  return (
    <div className="space-y-4">
      <MarkdownContent>{schritt.front}</MarkdownContent>
      {!aufgedeckt ? (
        <button onClick={() => setAufgedeckt(true)} className="btn-primary w-full py-2.5">
          Lernzettel öffnen
        </button>
      ) : (
        <>
          <div className="border-t border-gray-200 dark:border-[#1d271a] pt-3">
            <MarkdownContent>{schritt.back}</MarkdownContent>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onErgebnis('teilweise')} className="btn-soft-amber flex-1 py-2.5">
              Nochmal ansehen
            </button>
            <button onClick={() => onErgebnis('richtig')} className="btn-soft-green flex-1 py-2.5">
              Verstanden
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Cloze-Schritt: Lücken füllen, Ergebnis wird in richtig/teilweise/falsch übersetzt. */
function ClozeSchritt({ schritt, onErgebnis }) {
  const [fertig, setFertig] = useState(false);
  const handle = (r) => {
    setFertig(true);
    const bewertung = r.alleRichtig ? 'richtig' : r.anzahl > 0 ? 'teilweise' : 'falsch';
    onErgebnis(bewertung);
  };
  return (
    <div className="space-y-3">
      <ClozeFrage key={schritt.id} text={schritt.text} onErgebnis={handle} />
      {fertig && schritt.quelle && (
        <p className="text-[11px] text-gray-400">Quelle: {schritt.quelle}</p>
      )}
    </div>
  );
}

/** Frage-Schritt: Lösung aufdecken, dann richtig/teilweise/falsch bewerten. */
function FrageSchritt({ schritt, onErgebnis }) {
  const [aufgedeckt, setAufgedeckt] = useState(false);
  const f = schritt.frage;
  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-500 flex flex-wrap gap-2">
        <span>
          {f.saison} {f.jahr} – Aufgabe {f.aufgabe_nr}
          {f.teilfrage ? ` ${f.teilfrage})` : ''}
        </span>
        {f.punkte != null && <span>· {f.punkte} Punkte</span>}
      </div>
      {f.ueberschrift && (
        <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400">{f.ueberschrift}</h3>
      )}
      <MarkdownContent>{f.frage_text}</MarkdownContent>

      {!aufgedeckt ? (
        <button onClick={() => setAufgedeckt(true)} className="btn-primary w-full py-2.5">
          Lösung anzeigen & bewerten
        </button>
      ) : (
        <div className="border-t border-gray-200 dark:border-[#1d271a] pt-3 space-y-3">
          <h4 className="font-semibold text-sm">Lösung</h4>
          <MarkdownContent>{f.loesung_text}</MarkdownContent>
          <HerkunftBadge obj={f} />
          <p className="text-sm font-medium pt-1">Wie war deine Antwort?</p>
          <div className="grid grid-cols-3 gap-2">
            {BEWERTUNGEN.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onErgebnis(opt.key)}
                className={`py-2.5 rounded-md text-sm font-medium transition-colors ${opt.classes}`}
              >
                <span aria-hidden="true">{opt.symbol}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Seite --------------------------------- */

/**
 * Modul-Training: ein abschließbarer Lern-Loop für **ein Lernpfad-Modul**. Baut
 * über `lib/modulTraining` eine gemischte Session (Lernzettel-Karte + Cloze +
 * passende Prüfungsfragen) und führt Schritt für Schritt durch. Jeder Schritt
 * verbucht Aktivität + XP; Frage-Schritte fließen zusätzlich ins FSRS
 * (`recordReview`). Wird das Modul bestanden (≥ 80 %), markiert es sich als
 * „gelernt" → der Pfad-Fortschritt zieht mit.
 */
export default function ModulTraining() {
  const { pfadId, modulId } = useParams();
  const navigate = useNavigate();
  const einheiten = useMemo(() => getLerneinheiten(), []);
  const alleFragen = useMemo(() => getLearnableQuestions(), []);
  const { progress, setStatus, recordReview, setResume, clearResume } = useProgress();
  const { recordActivity, recordXp } = useGamification();

  // Lerneinheit-Lookup über die ID (Map memoisiert, Cache-stabil).
  const einheitenById = useMemo(() => {
    const map = new Map();
    for (const e of einheiten) map.set(e.id, e);
    return map;
  }, [einheiten]);

  const pfade = useMemo(() => baueLernpfade(einheiten, progress), [einheiten, progress]);
  const pfad = findePfad(pfade, pfadId);
  const modul = pfad?.module.find((m) => m.id === modulId) || null;
  const einheitId = modul?.einheitId || null;
  const lerneinheit = einheitId ? einheitenById.get(einheitId) || null : null;

  const [sessionKey, setSessionKey] = useState(0);
  const [index, setIndex] = useState(0);
  const [ergebnisse, setErgebnisse] = useState([]);

  // Session bewusst stabil halten – nur bei „Neu starten" (sessionKey) oder
  // Modulwechsel (einheitId) neu würfeln. Hängt an stabilen Primitiven, nicht am
  // abgeleiteten Objekt.
  const session = useMemo(
    () => {
      const le = einheitId ? einheitenById.get(einheitId) : null;
      return le ? baueModulTraining(le, { alleFragen }) : [];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [einheitId, einheitenById, alleFragen, sessionKey]
  );

  if (!pfad || !modul || !lerneinheit) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Dieses Modul existiert nicht.</p>
        <button onClick={() => navigate('/lernpfade')} className="btn-ghost px-3 py-2">
          Zur Übersicht
        </button>
      </div>
    );
  }

  const current = index < session.length ? session[index] : null;
  const fertig = session.length > 0 && index >= session.length;
  const zurueckZumPfad = `/lernpfade/${pfad.id}`;

  const onErgebnis = (bewertung) => {
    if (!current) return;
    recordActivity(1);
    recordXp(xpFuerErgebnis(bewertung));
    // Frage-Schritte zählen ins FSRS (richtig/teilweise = gewusst, falsch = nicht).
    if (current.typ === 'frage') {
      recordReview(current.id, bewertung !== 'falsch', {
        schwierigkeit: current.frage?.schwierigkeit ?? undefined,
      });
      setStatus(current.id, bewertung === 'falsch' ? 'ueben' : 'gelernt');
    }
    const naechste = [...ergebnisse, bewertung];
    setErgebnisse(naechste);
    // Am Ende: Modul als gelernt markieren, wenn bestanden; Resume löschen.
    if (index + 1 >= session.length) {
      const aus = werteTrainingAus(naechste);
      if (aus.bestanden) setStatus(lerneinheit.id, 'gelernt');
      else setStatus(lerneinheit.id, 'ueben');
      clearResume();
    } else {
      setResume({
        to: `/lernpfade/${pfad.id}/${modul.id}`,
        titel: `Modul: ${lerneinheit.titel}`,
        modus: 'modul',
      });
    }
    setIndex((i) => i + 1);
  };

  const neustart = () => {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setErgebnisse([]);
  };

  // --- Auswertung ---------------------------------------------------------
  if (fertig) {
    const aus = werteTrainingAus(ergebnisse);
    const naechstesModul = pfad.module.find((m) => m.id !== modul.id && m.status !== 'fertig');
    // Reines Lese-Modul (nur die Lernzettel-Karte, keine Abruf-Schritte): kein
    // Prozent-Theater, sondern schlichter „durchgearbeitet"-Abschluss.
    const nurLesen = aus.anzahl <= 1;
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-6">
        <div className="text-5xl">{aus.bestanden ? '🌟' : '💪'}</div>
        <h1 className="text-xl font-bold">
          {nurLesen
            ? 'Durchgearbeitet!'
            : aus.bestanden
              ? 'Modul geschafft!'
              : 'Fast – nochmal lohnt sich'}
        </h1>
        <div className="card p-5 space-y-1">
          {nurLesen ? (
            <div className="text-lg font-semibold text-accent">✓ erledigt</div>
          ) : (
            <>
              <div className="text-3xl font-bold text-accent">{aus.prozent}%</div>
              <div className="text-sm text-gray-500">
                {aus.richtig} richtig · {aus.teilweise} teilweise · {aus.falsch} offen von{' '}
                {aus.anzahl}
              </div>
            </>
          )}
          <div className="text-xs text-gray-400 pt-1">{lerneinheit.titel}</div>
        </div>
        <p className="text-sm text-gray-500">
          {nurLesen
            ? 'Dieses Modul ist kurz – durchgelesen reicht. Weiter im Pfad!'
            : aus.bestanden
            ? 'Das Modul ist als abgeschlossen markiert. Weiter im Pfad!'
            : 'Ab 80 % gilt das Modul als abgeschlossen – probier die Runde gleich nochmal.'}
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          {!nurLesen && (
            <button onClick={neustart} className="btn-ghost px-4 py-2.5">
              Nochmal
            </button>
          )}
          {naechstesModul ? (
            <Link
              to={`/lernpfade/${pfad.id}/${naechstesModul.id}`}
              className="btn-primary px-4 py-2.5"
            >
              Nächstes Modul →
            </Link>
          ) : (
            <Link to={zurueckZumPfad} className="btn-primary px-4 py-2.5">
              Zurück zum Pfad
            </Link>
          )}
        </div>
      </div>
    );
  }

  // --- Laufendes Training -------------------------------------------------
  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div>
        <Link
          to={zurueckZumPfad}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent"
        >
          <ArrowLeft size={15} /> {pfad.titel}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold truncate">{lerneinheit.titel}</h1>
        <span className="text-sm text-gray-500 shrink-0">
          {Math.min(index + 1, session.length)} / {session.length}
        </span>
      </div>

      {/* Fortschritts-Punkte */}
      <div className="flex gap-1.5">
        {session.map((_, i) => {
          const e = ergebnisse[i];
          const cls =
            i < index
              ? e === 'richtig'
                ? 'bg-green-500'
                : e === 'teilweise'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              : i === index
                ? 'bg-accent'
                : 'bg-gray-200 dark:bg-[#2a3326]';
          return <div key={i} className={`h-1.5 flex-1 rounded-full ${cls}`} />;
        })}
      </div>

      {current && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <SchrittKopf typ={current.typ} />
            <span className="flex flex-wrap gap-1 justify-end">
              {(current.tags || []).slice(0, 2).map((t) => (
                <span key={t} className="chip text-xs">
                  {t}
                </span>
              ))}
            </span>
          </div>

          {current.typ === 'lernzettel' && (
            <LernzettelSchritt key={current.id} schritt={current} onErgebnis={onErgebnis} />
          )}
          {current.typ === 'cloze' && (
            <ClozeSchritt key={current.id} schritt={current} onErgebnis={onErgebnis} />
          )}
          {current.typ === 'frage' && (
            <FrageSchritt key={current.id} schritt={current} onErgebnis={onErgebnis} />
          )}
        </div>
      )}
    </div>
  );
}
