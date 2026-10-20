import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, CalendarDays, ArrowRight, RotateCcw, GraduationCap } from 'lucide-react';
import { getLerneinheiten } from '../data/useExamData';
import {
  ANTWORT,
  baueEinstufungstest,
  werteEinstufungAus,
  planAusErgebnis,
  aktuelleWoche,
  ladeEinstufung,
  speichereEinstufung,
  loescheEinstufung,
} from '../lib/einstufung';
import { themaPerId } from '../lib/themen';
import { ladePruefungstermin, setzePruefungstermin } from '../lib/pruefungstermin';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { xpFuerErgebnis } from '../lib/level';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';

const NIVEAU_STIL = {
  stark: { label: 'sicher', balken: 'bg-green-500', text: 'text-green-700 dark:text-green-400' },
  mittel: { label: 'teils', balken: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  schwach: { label: 'Lücke', balken: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
};

const datumKurz = (d) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

/**
 * Einstufungstest + individueller Lernplan. Kurzer MC-Test je AP2-Thema
 * (`lib/einstufung`), danach Themenprofil und Wochenplan bis zur Prüfung.
 * Antworten fließen als FSRS-Signal in den Lernstand (falsch/„weiß nicht" →
 * die Einheit wird bald fällig). Ergebnis gerätelokal gespeichert.
 */
export default function Einstufung() {
  const { recordReview } = useProgress();
  const { recordActivity, recordXp } = useGamification();
  const [gespeichert, setGespeichert] = useState(() => ladeEinstufung());
  const [termin, setTermin] = useState(() => ladePruefungstermin());
  const [fragen, setFragen] = useState(null); // null = Intro, [] … = Test läuft
  const [index, setIndex] = useState(0);
  const [antworten, setAntworten] = useState({});

  const plan = useMemo(() => planAusErgebnis(gespeichert, termin), [gespeichert, termin]);

  const starte = (proThema) => {
    setFragen(baueEinstufungstest(getLerneinheiten(), { proThema }));
    setIndex(0);
    setAntworten({});
  };

  const frage = fragen && index < fragen.length ? fragen[index] : null;
  const antwort = frage ? antworten[frage.id] : undefined;

  const beantworte = (wert) => {
    if (!frage || antwort) return;
    setAntworten((a) => ({ ...a, [frage.id]: wert }));
  };
  const waehle = (i) => {
    if (!frage) return;
    beantworte(i === frage.loesungIndex ? ANTWORT.RICHTIG : ANTWORT.FALSCH);
  };

  const abschliessen = (alle) => {
    const auswertung = werteEinstufungAus(fragen, alle);
    let xp = 0;
    for (const f of fragen) {
      const richtig = alle[f.id] === ANTWORT.RICHTIG;
      if (f.einheitId) recordReview(f.einheitId, richtig ? 3 : 1);
      xp += xpFuerErgebnis(richtig ? 'richtig' : 'falsch');
    }
    recordXp(xp);
    recordActivity(fragen.length);
    setGespeichert(speichereEinstufung(auswertung));
    setFragen(null);
  };

  const weiter = () => {
    if (!antwort) return;
    if (index + 1 >= fragen.length) abschliessen(antworten);
    else setIndex((i) => i + 1);
  };

  useTastenkuerzel({
    1: () => waehle(0),
    2: () => waehle(1),
    3: () => waehle(2),
    4: () => waehle(3),
    0: () => beantworte(ANTWORT.WEISS_NICHT),
    ' ': weiter,
  });

  // --- Test läuft ----------------------------------------------------------
  if (frage) {
    const thema = themaPerId(frage.themaId);
    const pct = Math.round((index / fragen.length) * 100);
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold tracking-tight">Einstufungstest</span>
            <span className="text-muted-foreground font-mono">
              {index + 1} / {fragen.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <span className="chip">{thema?.titel}</span>
          <p className="font-medium">{frage.frage}</p>
          <div className="grid gap-2">
            {frage.optionen.map((opt, i) => {
              const korrekt = i === frage.loesungIndex;
              const cls = !antwort
                ? 'hover:bg-muted/60'
                : korrekt
                  ? 'border-green-500 bg-green-50 dark:bg-green-500/10'
                  : 'opacity-60';
              return (
                <button
                  key={opt}
                  onClick={() => waehle(i)}
                  disabled={Boolean(antwort)}
                  className={`text-left rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${cls}`}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2" aria-hidden="true">
                    {i + 1}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {!antwort ? (
            <button onClick={() => beantworte(ANTWORT.WEISS_NICHT)} className="btn-ghost w-full">
              Weiß ich nicht
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {antwort === ANTWORT.RICHTIG
                  ? 'Richtig.'
                  : `Lösung: ${frage.begriff}.`}
              </p>
              <button onClick={weiter} className="btn-primary">
                {index + 1 >= fragen.length ? 'Auswerten' : 'Weiter'}
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            Ehrlich bleiben: lieber „Weiß ich nicht" als raten – dann passt dein Plan besser.
          </p>
        </div>
      </div>
    );
  }

  // --- Intro (noch kein Ergebnis oder Test wiederholen) --------------------
  if (!gespeichert || fragen) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-10 rounded-lg bg-muted text-accent">
              <ClipboardCheck size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Wo stehst du?</h1>
              <p className="text-sm text-muted-foreground">Einstufungstest über alle 16 AP2-Themen</p>
            </div>
          </div>
          <p className="text-sm">
            Beantworte kurze Fragen zu jedem Prüfungsthema. Danach siehst du dein Themenprofil
            und bekommst einen <strong>Lernplan bis zur Prüfung</strong> – schwache und
            prüfungsrelevante Themen zuerst.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => starte(1)} className="btn-primary">
              Kurz · ca. 16 Fragen
            </button>
            <button onClick={() => starte(2)} className="btn-ghost">
              Gründlich · ca. 32 Fragen
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dauer ca. 5 bzw. 10 Minuten. Die Antworten fließen in deinen Lernstand ein.
          </p>
        </div>
      </div>
    );
  }

  // --- Ergebnis + Lernplan -------------------------------------------------
  const { auswertung } = gespeichert;
  const jetzt = aktuelleWoche(plan);
  const sortiert = [...auswertung.themen].sort((a, b) => a.quote - b.quote);
  const fokusHeute = jetzt?.fokus?.[0];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dein Lernplan</h1>
          <p className="text-sm text-muted-foreground">
            Einstufung vom {new Date(gespeichert.datum).toLocaleDateString('de-DE')} ·{' '}
            {auswertung.richtig}/{auswertung.gesamt} richtig ({Math.round(auswertung.quote * 100)} %)
          </p>
        </div>
        <button
          onClick={() => {
            loescheEinstufung();
            setGespeichert(null);
          }}
          className="btn-ghost"
        >
          <RotateCcw size={16} aria-hidden="true" /> Test wiederholen
        </button>
      </div>

      {fokusHeute && (
        <div className="card p-5 flex items-center justify-between gap-4 flex-wrap border-accent">
          <div>
            <div className="text-xs text-muted-foreground">Woche {jetzt.nr} · heute dran</div>
            <div className="text-lg font-semibold tracking-tight">{themaPerId(fokusHeute)?.titel}</div>
          </div>
          <Link to={`/lernen?modus=thema&thema=${fokusHeute}`} className="btn-primary">
            Jetzt lernen <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
      {jetzt?.art === 'simulation' && (
        <div className="card p-5 flex items-center justify-between gap-4 flex-wrap border-accent">
          <div>
            <div className="text-xs text-muted-foreground">Endspurt</div>
            <div className="text-lg font-semibold tracking-tight">Prüfungssimulation</div>
          </div>
          <Link to="/klausur" className="btn-primary">
            <GraduationCap size={16} aria-hidden="true" /> Klausur starten
          </Link>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 space-y-3">
          <h2 className="font-semibold">Themenprofil</h2>
          <ul className="space-y-2.5">
            {sortiert.map((t) => {
              const stil = NIVEAU_STIL[t.niveau];
              return (
                <li key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <Link to={`/lernen?modus=thema&thema=${t.id}`} className="truncate hover:underline">
                      {t.titel}
                    </Link>
                    <span className={`text-xs font-medium shrink-0 ${stil.text}`}>{stil.label}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                    <div
                      className={`h-full ${stil.balken}`}
                      style={{ width: `${Math.max(4, Math.round(t.quote * 100))}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold flex items-center gap-2">
              <CalendarDays size={18} aria-hidden="true" /> {plan.wochen.length} Wochen
            </h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Prüfung
              <input
                type="date"
                className="input"
                value={termin || ''}
                onChange={(e) => {
                  setzePruefungstermin(e.target.value);
                  setTermin(e.target.value || null);
                }}
                aria-label="Prüfungstermin"
              />
            </label>
          </div>
          {!termin && (
            <p className="text-xs text-muted-foreground">
              Ohne Prüfungstermin plane ich 8 Wochen. Setz den Termin für einen passenden Plan.
            </p>
          )}
          <ol className="relative space-y-3 border-l pl-4 ml-1">
            {plan.wochen.map((w) => {
              const aktiv = jetzt?.nr === w.nr;
              return (
                <li key={w.nr} className="relative">
                  <span
                    className={`absolute -left-[1.3rem] top-1.5 size-2.5 rounded-full ${
                      aktiv ? 'bg-primary ring-4 ring-ring/20' : 'bg-border'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="text-xs text-muted-foreground font-mono">
                    W{w.nr} · {datumKurz(w.von)}–{datumKurz(w.bis)}
                    {aktiv && <span className="chip ml-2">jetzt</span>}
                  </div>
                  {w.art === 'simulation' ? (
                    <div className="text-sm font-medium">Prüfungssimulation & Wiederholen</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {w.fokus.map((id) => (
                        <Link
                          key={id}
                          to={`/lernen?modus=thema&thema=${id}`}
                          className="chip hover:bg-muted"
                        >
                          {themaPerId(id)?.titel}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
