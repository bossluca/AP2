import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  RotateCcw,
  Target,
  ClipboardCheck,
  ArrowRight,
  Route as RouteIcon,
  Layers,
  FileText,
  HelpCircle,
  PencilLine,
  Zap,
  Puzzle,
  GraduationCap,
  FileUp,
  Calculator,
} from 'lucide-react';
import { getAllExams } from '../data/useExamData';
import { getLernobjekte } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { berechneStatistik } from '../lib/statistik';
import { berechneReife } from '../lib/reife';
import { naechsteAktion } from '../lib/naechsteAktion';
import { ladePruefungstermin, setzePruefungstermin, tageBisTermin } from '../lib/pruefungstermin';
import { baueTagesplan } from '../lib/tagesplan';
import { baueTagesquests, questFortschritt } from '../lib/quests';
import { baueWochenChallenges } from '../lib/challenges';
import ProgressRing from '../components/ProgressRing';
import { ladeEinstufung, planAusErgebnis, aktuelleWoche } from '../lib/einstufung';
import { themaPerId } from '../lib/themen';

/** Icon-Auflösung für den Primär-CTA (aus `naechsteAktion`). */
const CTA_ICONS = { Play, RotateCcw, Target, ClipboardCheck };

const KACHELN = [
  { to: '/lernpfade', icon: RouteIcon, titel: 'Lernpfade', text: 'Geführter Lernweg je Thema – Modul-Training mit Karten, Lücken & Fragen.' },
  { to: '/karteikarten', icon: Layers, titel: 'Karteikarten', text: 'Durch Prüfungsfragen blättern, Lösung aufdecken, markieren.' },
  { to: '/lernzettel', icon: FileText, titel: 'Lernzettel', text: 'Themen-Spickzettel (AP1 + AP2) lesen, suchen, filtern.' },
  { to: '/wiederholen', icon: RotateCcw, titel: 'Wiederholen', text: 'Spaced-Repetition-Sitzung über fällige Fragen & Lernzettel.' },
  { to: '/quiz', icon: HelpCircle, titel: 'Quiz', text: 'Fragenrunde mit Selbsteinschätzung und Auswertung.' },
  { to: '/luecken', icon: PencilLine, titel: 'Lückentext', text: 'Begriffe aktiv abrufen – automatisch aus den Lernzetteln, sofort geprüft.' },
  { to: '/drill', icon: Zap, titel: 'Drill', text: 'Schnelle Multiple-Choice-Runde – objektiv bewertet, perfekt für zwischendurch.' },
  { to: '/matching', icon: Puzzle, titel: 'Zuordnen', text: 'Begriffe den passenden Definitionen zuordnen – automatisch aus den Lernzetteln.' },
  { to: '/rechnen', icon: Calculator, titel: 'Rechen-Trainer', text: 'Subnetting, IPv6, RAID, Stromkosten & Co. – unbegrenzt neue Aufgaben mit Lösungsweg.' },
  { to: '/klausur', icon: GraduationCap, titel: 'Klausur', text: 'Ganze Prüfung simulieren – Freitext + Schlagwort-Check, optional mit Timer.' },
  { to: '/eigene-karten', icon: FileUp, titel: 'Eigene Karten', text: 'Eigene Unterlagen als PDF hochladen und daraus Lernkarten erzeugen.' },
];

/**
 * Startseite / Dashboard: Lernstand-Überblick (Fragen + Lernzettel),
 * Fälligkeits-Hinweis, Einstiegskacheln und Fortschritt-Zurücksetzen.
 */
export default function Home() {
  const exams = getAllExams();
  const objekte = useMemo(() => getLernobjekte(), []);
  const { progress, resetProgress, resume } = useProgress();
  const { gami } = useGamification();
  const s = useMemo(() => berechneStatistik(objekte, progress), [objekte, progress]);
  const reife = useMemo(() => berechneReife(objekte, progress), [objekte, progress]);
  // „Was jetzt dran ist" – ein klarer Primär-CTA statt mehrerer gleichrangiger.
  const [einstufung] = useState(() => ladeEinstufung());
  const aktion = useMemo(
    () =>
      naechsteAktion({
        resume,
        faellig: s.faellig,
        schwachstellen: s.schwachstellen,
        heuteAktivitaet: gami.heuteAktivitaet,
        tagesziel: gami.tagesziel,
        einstufungOffen: !einstufung && gami.xp === 0,
      }),
    [resume, s.faellig, s.schwachstellen, gami.heuteAktivitaet, gami.tagesziel, einstufung, gami.xp]
  );
  const AktionIcon = CTA_ICONS[aktion.icon] || Play;
  const [confirmReset, setConfirmReset] = useState(false);
  const [termin, setTermin] = useState(() => ladePruefungstermin());
  const tage = useMemo(() => tageBisTermin(termin), [termin]);
  // Ehrliches Tagespensum rückwärts vom Termin (Wiederholungen + neue Objekte).
  const plan = useMemo(
    () => baueTagesplan(objekte, progress, termin, new Date(), { themenReife: reife.proThema }),
    [objekte, progress, termin, reife.proThema]
  );
  const planLink =
    plan?.prioritaetsThemen?.length > 0
      ? `/lernen?modus=plan&themen=${encodeURIComponent(plan.prioritaetsThemen.join('|'))}`
      : '/lernen';
  const updateTermin = (v) => {
    setzePruefungstermin(v);
    setTermin(v || null);
  };
  const quests = useMemo(
    () => baueTagesquests({ heute: gami.heuteAktivitaet, tagesziel: gami.tagesziel, faellig: s.faellig }),
    [gami.heuteAktivitaet, gami.tagesziel, s.faellig]
  );
  const challenges = useMemo(
    () => baueWochenChallenges({ activity: gami.activity, progress, objekte }),
    [gami.activity, progress, objekte]
  );

  const handleReset = () => {
    if (confirmReset) {
      resetProgress();
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  const pctGelernt = s.total > 0 ? Math.round((s.status.gelernt / s.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="relative p-5 sm:p-6 flex items-center justify-between gap-5 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[13rem]">
            <div className="chip w-fit">Fachinformatiker Systemintegration · AP2</div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <span className="font-mono text-accent" aria-hidden="true">&gt;_</span>
              <span className="text-gradient">FiSi.dev</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Deine AP2-Vorbereitung – {s.art.frage} Prüfungsfragen aus {exams.length} Terminen +{' '}
              {s.art.lernzettel} Lernzettel.
            </p>
            <div className="pt-1">
              <Link
                to={aktion.to}
                className="btn-primary px-5 py-2.5 text-base inline-flex items-center gap-2"
              >
                <AktionIcon size={18} aria-hidden="true" />
                {aktion.cta}
              </Link>
              <p className="text-xs text-muted-foreground mt-1.5">{aktion.text}</p>
            </div>
          </div>
          {/* Ring nur ab sm – mobil zeigen die Kennzahl-Karten den Stand. */}
          <div className="hidden sm:block">
            <ProgressRing value={pctGelernt} size={120}>
              <div className="text-2xl font-bold">{pctGelernt}%</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">gelernt</div>
            </ProgressRing>
          </div>
        </div>
      </section>

      {/* Heute: Streak + Tagesziel */}
      <section className="card p-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-3xl" aria-hidden="true">
            {gami.streak > 0 ? '🔥' : '✨'}
          </span>
          <div className="leading-tight">
            <div className="text-xl font-bold">{gami.streak}</div>
            <div className="text-xs text-muted-foreground">Tage&nbsp;Streak</div>
            <div className="text-[11px] font-medium text-accent mt-0.5">
              ⭐ Level {gami.level.level}
            </div>
            {gami.freezesVerfuegbar > 0 && (
              <div
                className="text-[11px] text-sky-600 mt-0.5"
                title="Schützt deinen Streak bei einem verpassten Tag"
              >
                ❄️ {gami.freezesVerfuegbar} Freeze{gami.freezesVerfuegbar > 1 ? 's' : ''}
                {gami.freezesGenutzt > 0 && ` · ${gami.freezesGenutzt} aktiv`}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-[12rem]">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Tagesziel</span>
            <span>
              {Math.min(gami.heuteAktivitaet, gami.tagesziel)} / {gami.tagesziel}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{
                width: `${Math.min(100, (gami.heuteAktivitaet / gami.tagesziel) * 100)}%`,
              }}
            />
          </div>
          {gami.heuteAktivitaet >= gami.tagesziel ? (
            <p className="text-xs text-green-600 mt-1">Tagesziel erreicht! 🎉</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Noch {gami.tagesziel - gami.heuteAktivitaet} bis zum Tagesziel.
            </p>
          )}
        </div>
      </section>

      <LernplanKarte einstufung={einstufung} termin={termin} />

      {/* „Dein Tag": Countdown/Reife + (bei Bedarf) Fällig & Schwächen + Quests –
          gebündelt in einer ruhigen Sektion statt mehrerer gleichrangiger Karten. */}
      <section className="card p-4 space-y-3">
        {/* Prüfungstermin-Countdown + Reife */}
        {termin && tage != null ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-semibold">
                {tage > 0
                  ? `🎯 Noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'} bis zur Prüfung`
                  : tage === 0
                    ? '🎯 Heute ist Prüfungstag – viel Erfolg!'
                    : '🎯 Prüfung vorbei'}
              </div>
              <div className="text-sm text-muted-foreground">
                Prüfungsreife {reife.prognoseProzent}%
                {plan &&
                  ` · heute: ${plan.wiederholungenHeute} Wiederholungen + ${Math.min(plan.neu, plan.neuProTag)} neue`}
              </div>
              {plan && (
                <div className="space-y-1 mt-0.5">
                  <div className="text-xs text-muted-foreground">
                    {plan.einschaetzung === 'locker' && 'Entspanntes Pensum – du bist gut in der Zeit. 🌱'}
                    {plan.einschaetzung === 'gut' && 'Machbares Pensum – dranbleiben. 💪'}
                    {plan.einschaetzung === 'sportlich' &&
                      (plan.schaffbarBisTermin
                        ? 'Sportliches Pensum – kürzere, häufigere Sessions helfen. 🔥'
                        : `Sportlich: ${plan.neu} Objekte sind noch neu – priorisiere Schwächen statt Vollständigkeit. 🔥`)}
                  </div>
                  {plan.prioritaetsThemen.length > 0 && (
                    <div className="text-xs text-amber-600">
                      Zuerst: {plan.prioritaetsThemen.join(' · ')}
                    </div>
                  )}
                  {plan.pensumHeute > 0 && (
                    <Link to={planLink} className="inline-flex text-xs font-medium text-accent hover:underline">
                      Tagesplan starten →
                    </Link>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={termin}
                onChange={(e) => updateTermin(e.target.value)}
                className="input"
                aria-label="Prüfungstermin"
              />
              <button
                onClick={() => updateTermin('')}
                className="btn-ghost px-2 py-1 text-xs"
                aria-label="Prüfungstermin entfernen"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-medium">🎯 Prüfungstermin setzen</div>
              <div className="text-xs text-muted-foreground">
                Countdown + Tagesziel bis zur AP2 (Reife aktuell {reife.prognoseProzent}%).
              </div>
            </div>
            <input
              type="date"
              onChange={(e) => updateTermin(e.target.value)}
              className="input"
              aria-label="Prüfungstermin setzen"
            />
          </div>
        )}

        {/* Kompakte Schnell-Hinweise (nur wenn relevant; Haupteinstieg ist der Hero-CTA). */}
        {(s.faellig > 0 || s.schwachstellen.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-100 dark:border-border">
            {s.faellig > 0 && (
              <Link
                to="/wiederholen"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                <RotateCcw size={15} aria-hidden="true" /> {s.faellig} fällig wiederholen
              </Link>
            )}
            {s.schwachstellen.length > 0 && (
              <Link
                to="/lernen?modus=schwaechen"
                className="inline-flex items-center gap-1.5 text-sm text-amber-600 hover:underline min-w-0"
              >
                <Target size={15} aria-hidden="true" />
                <span className="truncate">
                  Schwächen: {s.schwachstellen.slice(0, 3).map((x) => x.tag).join(' · ')}
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Tages-Quests – aufklappbar, damit sie die Sektion nicht dominieren. */}
        <details className="group pt-1 border-t border-zinc-100 dark:border-border">
          <summary className="flex items-center justify-between cursor-pointer select-none text-sm font-medium list-none">
            <span>🗒️ Tages-Quests</span>
            <span className="text-xs text-muted-foreground">
              {questFortschritt(quests).erfuellt}/{quests.length}
              {questFortschritt(quests).alleErfuellt && ' 🎉'}
            </span>
          </summary>
          <ul className="space-y-1.5 pt-2">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className={q.erfuellt ? 'text-green-600' : 'text-muted-foreground'}>
                  {q.erfuellt ? '✓' : '○'}
                </span>
                <span className={`flex-1 min-w-0 ${q.erfuellt ? 'text-muted-foreground line-through' : ''}`}>
                  {q.label}
                </span>
                {q.ziel > 1 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {q.wert}/{q.ziel}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>

        {/* Wochen-Challenges – größere Ziele, Fokus-Thema rotiert wöchentlich. */}
        <details className="group pt-1 border-t border-border">
          <summary className="flex items-center justify-between cursor-pointer select-none text-sm font-medium list-none">
            <span>🏁 Wochen-Challenges</span>
            <span className="text-xs text-muted-foreground">
              {challenges.filter((c) => c.erfuellt).length}/{challenges.length}
            </span>
          </summary>
          <ul className="space-y-2.5 pt-2">
            {challenges.map((c) => (
              <li key={c.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  {c.themaId ? (
                    <Link to={`/lernen?modus=thema&thema=${c.themaId}`} className="min-w-0 truncate hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="min-w-0 truncate">{c.label}</span>
                  )}
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {c.erfuellt ? '✓' : `${c.wert}/${c.ziel}`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${c.erfuellt ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${Math.round((c.wert / c.ziel) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* Statusüberblick */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-green-500" />
          <div className="text-2xl font-bold text-green-600">{s.status.gelernt}</div>
          <div className="text-xs text-muted-foreground">Gelernt</div>
        </div>
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="text-2xl font-bold text-amber-600">{s.status.ueben}</div>
          <div className="text-xs text-muted-foreground">Muss ich üben</div>
        </div>
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-zinc-300 dark:bg-zinc-600" />
          <div className="text-2xl font-bold text-muted-foreground">{s.status.offen}</div>
          <div className="text-xs text-muted-foreground">Noch offen</div>
        </div>
      </div>
      <Link to="/statistik" className="text-sm text-accent hover:underline">
        Detaillierte Statistik ansehen →
      </Link>

      {/* Einstiegskacheln – sekundär: alle Lernmodi zum Stöbern. */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Alle Lernmodi</h2>
          <p className="text-sm text-muted-foreground">Zum Stöbern – oder gezielt ein Format üben.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KACHELN.map((k) => (
            <Link key={k.to} to={k.to} className="card-interactive group flex gap-3 p-4">
              <div className="grid place-items-center size-9 shrink-0 rounded-lg border bg-muted/50 text-accent">
                <k.icon size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium flex items-center gap-1">
                  {k.titel}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                  />
                </h3>
                <p className="text-sm text-muted-foreground">{k.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="text-xs text-muted-foreground border-t border-border pt-3 space-y-3">
        <p>
          Hinweis: Nicht für alle Prüfungsfragen liegen offizielle Lösungen vor (besonders 2023 und
          2024 Frühjahr). Diese sind als „unverifiziert" markiert oder haben keine Lösung.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className={`px-2 py-1 rounded-md border text-xs transition-colors ${
              confirmReset
                ? 'bg-red-600 text-white border-red-600'
                : 'border-zinc-300 dark:border-zinc-600 hover:border-red-400'
            }`}
          >
            {confirmReset ? 'Wirklich? Alles löschen' : 'Fortschritt zurücksetzen'}
          </button>
          {confirmReset && (
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2 py-1 rounded-md border border-zinc-300 dark:border-zinc-600 text-xs"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Lernplan aus dem Einstufungstest: Fokus der laufenden Woche – oder Einladung zum Test. */
function LernplanKarte({ einstufung, termin }) {
  const plan = useMemo(() => planAusErgebnis(einstufung, termin), [einstufung, termin]);
  if (!einstufung) {
    return (
      <Link to="/einstufung" className="card-interactive p-4 flex items-center gap-3">
        <div className="grid place-items-center size-10 rounded-lg bg-muted text-accent shrink-0">
          <ClipboardCheck size={20} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">Einstufungstest machen</div>
          <div className="text-sm text-muted-foreground">
            5 Minuten, 16 Themen – danach bekommst du deinen persönlichen Lernplan.
          </div>
        </div>
        <ArrowRight size={18} className="text-muted-foreground shrink-0" aria-hidden="true" />
      </Link>
    );
  }
  const woche = aktuelleWoche(plan);
  const fokus = woche?.fokus || [];
  return (
    <section className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium flex items-center gap-2">
          <ClipboardCheck size={18} className="text-accent" aria-hidden="true" /> Dein Lernplan
        </div>
        <Link to="/einstufung" className="text-sm text-muted-foreground hover:text-foreground">
          {woche ? `Woche ${woche.nr} von ${plan.wochen.length}` : 'Plan ansehen'} →
        </Link>
      </div>
      {woche?.art === 'simulation' ? (
        <Link to="/klausur" className="btn-primary w-full sm:w-auto">
          Endspurt: Prüfungssimulation
        </Link>
      ) : fokus.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fokus.map((id, i) => (
            <Link
              key={id}
              to={`/lernen?modus=thema&thema=${id}`}
              className={i === 0 ? 'btn-primary' : 'btn-ghost'}
            >
              {themaPerId(id)?.titel}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Der Plan ist durch – mach einen neuen Einstufungstest für den nächsten Durchgang.
        </p>
      )}
    </section>
  );
}
