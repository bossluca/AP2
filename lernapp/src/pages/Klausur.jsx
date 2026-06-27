import { useEffect, useMemo, useRef, useState } from 'react';
import { getKlausuren } from '../data/useExamData';
import { useProgress } from '../context/ProgressContext';
import { pruefeAntwort } from '../lib/antwortpruefung';
import { feiern } from '../lib/konfetti';
import { useCountUp } from '../hooks/useCountUp';
import { BEWERTUNGEN, ANTEIL } from '../lib/bewertung';
import { xpFuerErgebnis } from '../lib/level';
import MarkdownContent from '../components/MarkdownContent';

/** Sekunden → "mm:ss". */
function formatZeit(sekunden) {
  const s = Math.max(0, Math.floor(sekunden));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Versucht, aus "90 Minuten"/"90 min" eine Minutenzahl zu lesen. */
function dauerInMinuten(dauerText, fallback = 90) {
  if (typeof dauerText !== 'string') return fallback;
  const m = dauerText.match(/(\d{2,3})\s*min/i) || dauerText.match(/(\d{2,3})/);
  return m ? Number(m[1]) : fallback;
}

/**
 * Klausur-Modus: simuliert eine komplette Prüfung mit echten Fragen.
 *
 * Ablauf: Prüfung wählen (optional mit Timer) → Fragen der Reihe nach im Freitext
 * beantworten → „Antwort prüfen" gibt Schlagwort-Feedback (sofern Schlagwörter
 * hinterlegt sind) und zeigt die Musterlösung → selbst einschätzen → am Ende
 * Auswertung (Note in %, Schwächen nach Thema). Ergebnisse fließen optional in den
 * Lernfortschritt (Wiederholen/Statistik).
 */
export default function Klausur() {
  const klausuren = useMemo(() => getKlausuren(), []);
  const {
    recordQuizResult,
    recordReview,
    setStatus,
    recordActivity,
    recordKlausurErgebnis,
    recordXp,
  } = useProgress();

  // Default-Auswahl: erste AP2-Klausur, sonst die erste verfügbare.
  const defaultIndex = useMemo(() => {
    const i = klausuren.findIndex((k) => k.pruefungsteil === 'AP2');
    return i >= 0 ? i : 0;
  }, [klausuren]);

  const [auswahl, setAuswahl] = useState(defaultIndex);
  const [timerAn, setTimerAn] = useState(false);
  const [phase, setPhase] = useState('setup'); // 'setup' | 'running' | 'result'
  const [index, setIndex] = useState(0);
  const [antworten, setAntworten] = useState({}); // {qid: {text, geprueft, bewertung}}
  const [uebernehmen, setUebernehmen] = useState(true);
  const [endeZeit, setEndeZeit] = useState(null); // timestamp ms
  const [jetzt, setJetzt] = useState(() => Date.now());
  const uebernommen = useRef(false);

  const klausur = klausuren[auswahl] || null;
  const fragen = useMemo(() => klausur?.fragen || [], [klausur]);

  // Ref auf die jeweils aktuelle Auswerten-Funktion, damit der Timer-Callback
  // bei Zeitablauf eine frische Version aufruft (kein veralteter Closure-Stand).
  const auswertenRef = useRef(() => {});

  // Timer-Tick (nur während laufender Klausur mit aktivem Timer). Bei Zeitablauf
  // wird im Callback (nicht synchron im Effekt-Body) automatisch ausgewertet.
  useEffect(() => {
    if (phase !== 'running' || !endeZeit) return;
    const id = setInterval(() => {
      if (Date.now() >= endeZeit) auswertenRef.current();
      else setJetzt(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [phase, endeZeit]);

  const restSek = endeZeit ? (endeZeit - jetzt) / 1000 : null;

  const setAntwort = (qid, patch) =>
    setAntworten((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...patch } }));

  const starten = () => {
    setIndex(0);
    setAntworten({});
    uebernommen.current = false;
    if (timerAn) {
      const min = dauerInMinuten(klausur?.meta?.dauer);
      setEndeZeit(Date.now() + min * 60 * 1000);
      setJetzt(Date.now());
    } else {
      setEndeZeit(null);
    }
    setPhase('running');
  };

  const zurueckZumStart = () => {
    setPhase('setup');
    setEndeZeit(null);
  };

  // --- Auswertung berechnen + (einmalig) in den Fortschritt übernehmen ---
  const ergebnisse = useMemo(() => {
    return fragen.map((f) => {
      const a = antworten[f.id] || {};
      const bewertung = a.bewertung || 'falsch'; // nicht eingeschätzt = falsch
      const gewicht = f.punkte || 1;
      return {
        id: f.id,
        bewertung,
        gewicht,
        punkte: gewicht * (ANTEIL[bewertung] ?? 0),
        tags: f.thema_tags || [],
      };
    });
  }, [fragen, antworten]);

  const auswerten = () => {
    const erreicht = ergebnisse.reduce((s, e) => s + e.punkte, 0);
    const max = ergebnisse.reduce((s, e) => s + e.gewicht, 0);
    const proz = max > 0 ? Math.round((erreicht / max) * 100) : 0;

    if (uebernehmen && !uebernommen.current) {
      for (const e of ergebnisse) {
        recordQuizResult(e.id, e.bewertung);
        setStatus(e.id, e.bewertung === 'richtig' ? 'gelernt' : 'ueben');
        recordReview(e.id, e.bewertung === 'richtig');
      }
      recordActivity(ergebnisse.length);
      recordKlausurErgebnis(proz);
      recordXp(ergebnisse.reduce((s, e) => s + xpFuerErgebnis(e.bewertung), 0));
      uebernommen.current = true;
    }
    if (proz >= 50) feiern(); // bestanden → kleiner Feier-Moment
    setEndeZeit(null);
    setPhase('result');
  };
  // `auswerten` hängt von aktuellem State ab und wird je Render neu erzeugt –
  // die Ref nachführen, damit der Timer-Callback immer die frische Version nutzt.
  useEffect(() => {
    auswertenRef.current = auswerten;
  });

  const punkteErreicht = ergebnisse.reduce((s, e) => s + e.punkte, 0);
  const punkteMax = ergebnisse.reduce((s, e) => s + e.gewicht, 0);
  const prozent = punkteMax > 0 ? Math.round((punkteErreicht / punkteMax) * 100) : 0;

  const tagStats = useMemo(() => {
    const stats = {};
    for (const e of ergebnisse) {
      for (const tag of e.tags) {
        if (!stats[tag]) stats[tag] = { gewicht: 0, punkte: 0 };
        stats[tag].gewicht += e.gewicht;
        stats[tag].punkte += e.punkte;
      }
    }
    return Object.entries(stats)
      .map(([tag, v]) => ({ tag, percent: Math.round((v.punkte / v.gewicht) * 100) }))
      .sort((a, b) => a.percent - b.percent);
  }, [ergebnisse]);

  // Zahlen erst beim Betreten der Auswertung hochzählen (lebendiges Ergebnis).
  const animProzent = useCountUp(phase === 'result' ? prozent : 0);
  const animPunkte = useCountUp(phase === 'result' ? punkteErreicht : 0);

  // ---------------------------------------------------------------- Setup ---
  if (phase === 'setup') {
    const hatAP2 = klausuren.some((k) => k.pruefungsteil === 'AP2');
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">🎓 Klausur-Simulation</h1>
        <p className="text-sm text-gray-500">
          Übe wie in der echten Prüfung: ganze Klausur, Fragen im Freitext beantworten,
          danach selbst einschätzen. Wo Schlagwörter hinterlegt sind, prüft die App deine
          Antwort automatisch mit – auch abweichende Formulierungen zählen.
        </p>

        {klausuren.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Prüfungen mit Fragen vorhanden.</p>
        ) : (
          <>
            <div className="space-y-2">
              <label className="block text-xs text-gray-500" htmlFor="klausur-select">
                Prüfung wählen
              </label>
              <select
                id="klausur-select"
                value={auswahl}
                onChange={(e) => setAuswahl(Number(e.target.value))}
                className="input w-full"
              >
                {klausuren.map((k, i) => (
                  <option key={i} value={i}>
                    [{k.pruefungsteil}] {k.meta.saison} {k.meta.jahr} – {k.fragen.length} Fragen
                    {k.punkteGesamt > 0 ? ` · ${k.punkteGesamt} Punkte` : ''}
                  </option>
                ))}
              </select>
            </div>

            {!hatAP2 && (
              <p className="text-xs text-amber-600">
                ⚠️ Aktuell sind nur AP1-Prüfungen mit Fragen vorhanden. Sobald AP2-Prüfungsfragen
                eingepflegt sind, erscheinen sie hier automatisch.
              </p>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={timerAn} onChange={(e) => setTimerAn(e.target.checked)} />
              Timer ({dauerInMinuten(klausur?.meta?.dauer)} Min.) – wie unter Prüfungsbedingungen
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={uebernehmen}
                onChange={(e) => setUebernehmen(e.target.checked)}
              />
              Ergebnis in Lernfortschritt übernehmen (Statistik & Wiederholen)
            </label>

            <button onClick={starten} className="btn-primary w-full py-2.5">
              Klausur starten
            </button>
          </>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------ Auswertung ---
  if (phase === 'result') {
    const note = prozent >= 92 ? 1 : prozent >= 81 ? 2 : prozent >= 67 ? 3 : prozent >= 50 ? 4 : prozent >= 30 ? 5 : 6;
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Auswertung</h1>
        <div className="card p-4 text-center space-y-1 animate-in">
          <div className="text-3xl font-bold text-indigo-600 tabular-nums">{animProzent}%</div>
          <div className="text-sm text-gray-500">
            {animPunkte.toLocaleString('de')} von {punkteMax} Punkten · Tendenz Note {note}
          </div>
          <div className="text-xs text-gray-400">
            (richtig = voll, teilweise = halb, falsch/nicht eingeschätzt = 0)
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

        {uebernehmen && (
          <p className="text-xs text-gray-500">
            ✓ Ergebnisse wurden in deinen Lernfortschritt übernommen.
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={zurueckZumStart} className="btn-ghost flex-1 py-2.5">
            Andere Klausur
          </button>
          <button onClick={starten} className="btn-primary flex-1 py-2.5">
            Nochmal
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------- Running ---
  const frage = fragen[index];
  const eintrag = antworten[frage?.id] || {};
  const pruefung =
    eintrag.geprueft && frage
      ? pruefeAntwort(eintrag.text || '', frage.schluesselwoerter, {
          erforderlich: frage.mindest_treffer,
        })
      : null;
  const beantwortet = fragen.filter((f) => (antworten[f.id]?.bewertung)).length;

  const pruefen = () => {
    if (!frage) return;
    const r = pruefeAntwort(eintrag.text || '', frage.schluesselwoerter, {
      erforderlich: frage.mindest_treffer,
    });
    // Automatischer Bewertungs-Vorschlag, falls Schlagwörter vorhanden und noch
    // nichts manuell eingeschätzt wurde.
    setAntwort(frage.id, {
      geprueft: true,
      bewertung: eintrag.bewertung || r.bewertung || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">
          🎓 {klausur.meta.saison} {klausur.meta.jahr}
        </h1>
        <div className="flex items-center gap-3 text-sm">
          {restSek != null && (
            <span className={`font-mono font-medium ${restSek < 300 ? 'text-red-600' : 'text-gray-500'}`}>
              ⏱ {formatZeit(restSek)}
            </span>
          )}
          <span className="text-gray-500">
            {index + 1} / {fragen.length}
          </span>
        </div>
      </div>

      {/* Fortschrittsbalken */}
      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
          style={{ width: `${(beantwortet / fragen.length) * 100}%` }}
        />
      </div>

      {frage && (
        <div className="card p-4 space-y-4">
          <div className="text-xs text-gray-500 flex flex-wrap gap-2">
            <span>
              Aufgabe {frage.aufgabe_nr}
              {frage.teilfrage ? ` ${frage.teilfrage})` : ''}
            </span>
            {frage.punkte != null && <span>· {frage.punkte} Punkte</span>}
            {(frage.thema_tags || []).map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>

          {frage.kontextText && (
            <details className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-sm">
              <summary className="text-xs text-gray-500 font-medium">Situation / Kontext</summary>
              <div className="mt-2">
                <MarkdownContent>{frage.kontextText}</MarkdownContent>
              </div>
            </details>
          )}

          {frage.aufgabe_titel && <h2 className="font-semibold text-base">{frage.aufgabe_titel}</h2>}
          {frage.ueberschrift && (
            <h3 className="font-medium text-sm text-gray-600 dark:text-gray-400">
              {frage.ueberschrift}
            </h3>
          )}

          <MarkdownContent>{frage.frage_text}</MarkdownContent>

          <textarea
            value={eintrag.text || ''}
            onChange={(e) =>
              setAntwort(frage.id, { text: e.target.value, geprueft: false })
            }
            rows={4}
            placeholder="Deine Antwort …"
            className="input w-full resize-y font-normal"
          />

          {!pruefung ? (
            <button onClick={pruefen} className="btn-primary w-full py-2.5">
              Antwort prüfen & Lösung zeigen
            </button>
          ) : (
            <div className="border-t border-gray-200 dark:border-gray-800 pt-3 space-y-3">
              {/* Schlagwort-Feedback (nur wenn Schlagwörter hinterlegt) */}
              {pruefung.hatSchluesselwoerter && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {pruefung.erforderlich != null
                      ? `Schlagwörter erkannt: ${pruefung.anzahl} (mind. ${pruefung.erforderlich} nötig)`
                      : `Schlagwörter erkannt: ${pruefung.anzahl}/${pruefung.gesamt}`}
                    {pruefung.bewertung && (
                      <span className="text-gray-500 font-normal"> · Vorschlag: {pruefung.bewertung}</span>
                    )}
                  </p>
                  {pruefung.erforderlich != null && (
                    <p className="text-xs text-gray-500">
                      ○ = weitere gültige Stichwörter – nicht alle nötig.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {pruefung.alle.map((t, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs ${
                          t.getroffen
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 treffer-pop'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                        title={t.pflicht ? 'Pflicht-Schlagwort' : undefined}
                      >
                        {t.getroffen ? '✓' : '○'} {t.label}
                        {t.pflicht && ' *'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Musterlösung</h4>
                {frage.hat_antwort ? (
                  <>
                    <MarkdownContent>{frage.loesung_text}</MarkdownContent>
                    {frage.unverifiziert_markiert && (
                      <p className="text-xs text-amber-600">
                        ⚠️ Diese Lösung ist unverifiziert / nicht offiziell.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Keine Musterlösung hinterlegt.</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium pb-1">Wie war deine Antwort?</p>
                <div className="grid grid-cols-3 gap-2">
                  {BEWERTUNGEN.map((opt) => {
                    const aktiv = eintrag.bewertung === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setAntwort(frage.id, { bewertung: opt.key })}
                        className={`py-2.5 rounded-md text-sm font-medium transition ${opt.classes} ${
                          aktiv ? `ring-2 ${opt.ring}` : ''
                        }`}
                      >
                        <span aria-hidden="true">{opt.symbol}</span> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="btn-ghost px-3 py-2 disabled:opacity-40"
        >
          ← Zurück
        </button>
        <span className="text-xs text-gray-400">{beantwortet} eingeschätzt</span>
        {index + 1 < fragen.length ? (
          <button onClick={() => setIndex((i) => i + 1)} className="btn-ghost px-3 py-2">
            Weiter →
          </button>
        ) : (
          <button onClick={auswerten} className="btn-primary px-4 py-2">
            Klausur auswerten
          </button>
        )}
      </div>

      <button onClick={zurueckZumStart} className="text-xs text-gray-400 hover:underline">
        Abbrechen
      </button>
    </div>
  );
}
