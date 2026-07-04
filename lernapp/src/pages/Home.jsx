import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, RotateCcw, Target } from 'lucide-react';
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
import ProgressRing from '../components/ProgressRing';

/** Icon-Auflösung für den Primär-CTA (aus `naechsteAktion`). */
const CTA_ICONS = { Play, RotateCcw, Target };

const KACHELN = [
  { to: '/lernpfade', titel: '🧭 Lernpfade', text: 'Geführter Lernweg je Thema – Modul-Training mit Karten, Lücken & Fragen.' },
  { to: '/karteikarten', titel: '📇 Karteikarten', text: 'Durch Prüfungsfragen blättern, Lösung aufdecken, markieren.' },
  { to: '/lernzettel', titel: '📝 Lernzettel', text: 'Themen-Spickzettel (AP1 + AP2) lesen, suchen, filtern.' },
  { to: '/wiederholen', titel: '🔁 Wiederholen', text: 'Spaced-Repetition-Sitzung über fällige Fragen & Lernzettel.' },
  { to: '/quiz', titel: '🎯 Quiz', text: 'Fragenrunde mit Selbsteinschätzung und Auswertung.' },
  { to: '/luecken', titel: '✍️ Lückentext', text: 'Begriffe aktiv abrufen – automatisch aus den Lernzetteln, sofort geprüft.' },
  { to: '/drill', titel: '⚡ Drill', text: 'Schnelle Multiple-Choice-Runde – objektiv bewertet, perfekt für zwischendurch.' },
  { to: '/klausur', titel: '🎓 Klausur', text: 'Ganze Prüfung simulieren – Freitext + Schlagwort-Check, optional mit Timer.' },
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
  const aktion = useMemo(
    () =>
      naechsteAktion({
        resume,
        faellig: s.faellig,
        schwachstellen: s.schwachstellen,
        heuteAktivitaet: gami.heuteAktivitaet,
        tagesziel: gami.tagesziel,
      }),
    [resume, s.faellig, s.schwachstellen, gami.heuteAktivitaet, gami.tagesziel]
  );
  const AktionIcon = CTA_ICONS[aktion.icon] || Play;
  const [confirmReset, setConfirmReset] = useState(false);
  const [termin, setTermin] = useState(() => ladePruefungstermin());
  const tage = useMemo(() => tageBisTermin(termin), [termin]);
  // Ehrliches Tagespensum rückwärts vom Termin (Wiederholungen + neue Objekte).
  const plan = useMemo(() => baueTagesplan(objekte, progress, termin), [objekte, progress, termin]);
  const updateTermin = (v) => {
    setzePruefungstermin(v);
    setTermin(v || null);
  };
  const quests = useMemo(
    () => baueTagesquests({ heute: gami.heuteAktivitaet, tagesziel: gami.tagesziel, faellig: s.faellig }),
    [gami.heuteAktivitaet, gami.tagesziel, s.faellig]
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
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-green-500/10 to-teal-400/10" />
        <div className="relative p-5 sm:p-6 flex items-center justify-between gap-5 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[13rem]">
            <div className="font-mono text-xs text-accent">// Fachinformatiker Systemintegration</div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <span className="font-mono text-accent" aria-hidden="true">&gt;_</span>
              <span className="text-gradient">FiSi.dev</span>
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">{aktion.text}</p>
            </div>
          </div>
          <ProgressRing value={pctGelernt} size={120}>
            <div className="text-2xl font-bold">{pctGelernt}%</div>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">gelernt</div>
          </ProgressRing>
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
            <div className="text-xs text-gray-500">Tage&nbsp;Streak</div>
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
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tagesziel</span>
            <span>
              {Math.min(gami.heuteAktivitaet, gami.tagesziel)} / {gami.tagesziel}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-[#1d271a] overflow-hidden">
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
            <p className="text-xs text-gray-400 mt-1">
              Noch {gami.tagesziel - gami.heuteAktivitaet} bis zum Tagesziel.
            </p>
          )}
        </div>
      </section>

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
              <div className="text-sm text-gray-500">
                Prüfungsreife {reife.prognoseProzent}%
                {plan &&
                  ` · heute: ${plan.wiederholungenHeute} Wiederholungen + ${Math.min(plan.neu, plan.neuProTag)} neue`}
              </div>
              {plan && (
                <div className="text-xs text-gray-400 mt-0.5">
                  {plan.einschaetzung === 'locker' && 'Entspanntes Pensum – du bist gut in der Zeit. 🌱'}
                  {plan.einschaetzung === 'gut' && 'Machbares Pensum – dranbleiben. 💪'}
                  {plan.einschaetzung === 'sportlich' &&
                    (plan.schaffbarBisTermin
                      ? 'Sportliches Pensum – kürzere, häufigere Sessions helfen. 🔥'
                      : `Sportlich: ${plan.neu} Objekte sind noch neu – priorisiere Schwächen statt Vollständigkeit. 🔥`)}
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
              <div className="text-xs text-gray-500">
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
          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100 dark:border-[#1d271a]">
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
        <details className="group pt-1 border-t border-gray-100 dark:border-[#1d271a]">
          <summary className="flex items-center justify-between cursor-pointer select-none text-sm font-medium list-none">
            <span>🗒️ Tages-Quests</span>
            <span className="text-xs text-gray-500">
              {questFortschritt(quests).erfuellt}/{quests.length}
              {questFortschritt(quests).alleErfuellt && ' 🎉'}
            </span>
          </summary>
          <ul className="space-y-1.5 pt-2">
            {quests.map((q) => (
              <li key={q.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true" className={q.erfuellt ? 'text-green-600' : 'text-gray-400'}>
                  {q.erfuellt ? '✓' : '○'}
                </span>
                <span className={`flex-1 min-w-0 ${q.erfuellt ? 'text-gray-400 line-through' : ''}`}>
                  {q.label}
                </span>
                {q.ziel > 1 && (
                  <span className="text-xs text-gray-400 tabular-nums">
                    {q.wert}/{q.ziel}
                  </span>
                )}
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
          <div className="text-xs text-gray-500">Gelernt</div>
        </div>
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="text-2xl font-bold text-amber-600">{s.status.ueben}</div>
          <div className="text-xs text-gray-500">Muss ich üben</div>
        </div>
        <div className="card p-3 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gray-300 dark:bg-gray-600" />
          <div className="text-2xl font-bold text-gray-500">{s.status.offen}</div>
          <div className="text-xs text-gray-500">Noch offen</div>
        </div>
      </div>
      <Link to="/statistik" className="text-sm text-accent hover:underline">
        Detaillierte Statistik ansehen →
      </Link>

      {/* Einstiegskacheln – sekundär: alle Lernmodi zum Stöbern. */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-gray-400 dark:text-[#6B7A66]">
          // alle Lernmodi
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {KACHELN.map((k) => (
            <Link key={k.to} to={k.to} className="card-interactive group block p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold mb-1">{k.titel}</h3>
                <span className="text-accent transition-transform duration-200 group-hover:translate-x-1">
                  →
                </span>
              </div>
              <p className="text-sm text-gray-500">{k.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="text-xs text-gray-500 border-t border-gray-200 dark:border-gray-800 pt-3 space-y-3">
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
                : 'border-gray-300 dark:border-gray-600 hover:border-red-400'
            }`}
          >
            {confirmReset ? 'Wirklich? Alles löschen' : 'Fortschritt zurücksetzen'}
          </button>
          {confirmReset && (
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-xs"
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
