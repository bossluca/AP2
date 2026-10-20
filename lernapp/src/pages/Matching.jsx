import { useEffect, useMemo, useRef, useState } from 'react';
import { getLerneinheiten } from '../data/useExamData';
import { baueGlossarCloze } from '../lib/glossar';
import { baueMatchingRunde, istRichtigeZuordnung, werteMatchingAus } from '../lib/matching';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { xpFuerErgebnis } from '../lib/level';
import LeerZustand from '../components/LeerZustand';

const PAARE = 5;

/** Vergangene Sekunden seit `start` (Event-Handler, nicht im Render). */
function sekundenSeit(start) {
  return Math.round((Date.now() - start) / 1000);
}

/**
 * Matching-Spiel: Begriffe den Definitionen zuordnen (Quizlet-„Match"). Paare
 * entstehen automatisch aus den Lernzetteln (`lib/glossar` → `lib/matching`).
 * Erst Begriff, dann Definition antippen (oder umgekehrt). Fehlerfreie Paare
 * zählen als FSRS-Review „Gut" der Quell-Lerneinheit, Paare mit Fehlversuch als
 * „Nochmal". Gibt Aktivität und XP wie der Drill.
 */
export default function Matching() {
  const { recordReview } = useProgress();
  const { recordActivity, recordXp } = useGamification();
  const [teil, setTeil] = useState('alle');
  const [rundeKey, setRundeKey] = useState(0);
  const [gewaehltBegriff, setGewaehltBegriff] = useState(null);
  const [gewaehltDef, setGewaehltDef] = useState(null);
  const [geloest, setGeloest] = useState([]); // Paar-IDs
  const [fehler, setFehler] = useState({}); // Paar-ID (Begriff) → Fehlversuche
  const [falschBlink, setFalschBlink] = useState(null); // {b, d} kurz rot
  const [start, setStart] = useState(() => Date.now());
  const [dauer, setDauer] = useState(0);
  const gebucht = useRef(false);

  const runde = useMemo(() => {
    const einheiten = getLerneinheiten().filter(
      (e) => teil === 'alle' || (e.pruefungsteil || 'AP1') === teil
    );
    return baueMatchingRunde(baueGlossarCloze(einheiten, { maxProEinheit: 3 }), { anzahl: PAARE });
    // rundeKey erzwingt eine frische Mischung bei „Neue Runde".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teil, rundeKey]);

  const paarJeId = useMemo(() => new Map(runde.paare.map((p) => [p.id, p])), [runde]);
  const fertig = runde.paare.length > 0 && geloest.length === runde.paare.length;
  const auswertung = useMemo(() => werteMatchingAus(runde.paare, fehler), [runde, fehler]);

  // Am Rundenende einmalig FSRS-Reviews + XP buchen.
  useEffect(() => {
    if (!fertig || gebucht.current) return;
    gebucht.current = true;
    let xp = 0;
    for (const n of auswertung.noten) {
      if (n.einheitId) recordReview(n.einheitId, n.note);
      xp += xpFuerErgebnis(n.note === 3 ? 'richtig' : 'teilweise');
    }
    recordXp(xp);
    recordActivity(auswertung.gesamt);
  }, [fertig, auswertung, recordReview, recordXp, recordActivity]);

  const neustart = () => {
    setRundeKey((k) => k + 1);
    setGewaehltBegriff(null);
    setGewaehltDef(null);
    setGeloest([]);
    setFehler({});
    setFalschBlink(null);
    setStart(Date.now());
    setDauer(0);
    gebucht.current = false;
  };

  const pruefe = (b, d) => {
    if (istRichtigeZuordnung(b, d)) {
      if (geloest.length + 1 === runde.paare.length) setDauer(sekundenSeit(start));
      setGeloest((g) => [...g, b]);
    } else {
      setFehler((f) => ({ ...f, [b]: (f[b] || 0) + 1 }));
      setFalschBlink({ b, d });
      setTimeout(() => setFalschBlink(null), 600);
    }
    setGewaehltBegriff(null);
    setGewaehltDef(null);
  };

  const waehleBegriff = (id) => {
    if (geloest.includes(id)) return;
    if (gewaehltDef) return pruefe(id, gewaehltDef);
    setGewaehltBegriff((alt) => (alt === id ? null : id));
  };
  const waehleDef = (id) => {
    if (geloest.includes(id)) return;
    if (gewaehltBegriff) return pruefe(gewaehltBegriff, id);
    setGewaehltDef((alt) => (alt === id ? null : id));
  };

  const kachel = (id, gewaehlt, seite) => {
    const ok = geloest.includes(id);
    const falsch = falschBlink && falschBlink[seite] === id;
    if (ok) return 'border-green-500/60 bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300 opacity-70';
    if (falsch) return 'border-red-400 bg-red-50 dark:bg-red-500/10';
    if (gewaehlt === id) return 'border-primary ring-[3px] ring-ring/30 bg-muted';
    return 'hover:bg-muted/60';
  };

  if (runde.paare.length < 2) {
    return (
      <LeerZustand
        emoji="🧩"
        titel="Zu wenig Material für eine Zuordnungs-Runde"
        text={'Für diese Auswahl gibt es zu wenige Glossar-Begriffe. Probiere „AP1 + AP2".'}
        cta={{ label: 'Alle Teile üben', onClick: () => setTeil('alle') }}
      />
    );
  }

  if (fertig) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-6">
        <div className="text-5xl">{auswertung.quote >= 80 ? '🧩' : auswertung.quote >= 50 ? '💪' : '🌱'}</div>
        <h1 className="text-2xl font-semibold tracking-tight">Alle Paare gefunden!</h1>
        <div className="card p-5 space-y-1">
          <div className="text-3xl font-bold text-accent">
            {auswertung.richtigBeimErsten} / {auswertung.gesamt}
          </div>
          <div className="text-sm text-muted-foreground">
            beim ersten Versuch richtig · {auswertung.fehler} Fehlversuche · {dauer} s
          </div>
        </div>
        {auswertung.noten.some((n) => n.note === 1) && (
          <div className="card p-4 text-left text-sm space-y-1">
            <div className="font-medium">Wiederholen lohnt sich:</div>
            {auswertung.noten
              .filter((n) => n.note === 1)
              .map((n) => {
                const p = paarJeId.get(n.id);
                return (
                  <div key={n.id} className="text-muted-foreground">
                    <span className="font-medium text-foreground">{p.begriff}</span>
                    {p.quelle && ` – „${p.quelle}"`}
                  </div>
                );
              })}
          </div>
        )}
        <button onClick={neustart} className="btn-primary">
          🧩 Neue Runde
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Zuordnen</h1>
          <p className="text-sm text-muted-foreground">
            Tippe einen Begriff und dann die passende Definition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={teil}
            onChange={(e) => {
              setTeil(e.target.value);
              neustart();
            }}
            className="input"
            aria-label="Prüfungsteil"
          >
            <option value="alle">AP1 + AP2</option>
            <option value="AP1">Nur AP1</option>
            <option value="AP2">Nur AP2</option>
          </select>
          <span className="chip" aria-live="polite">
            {geloest.length} / {runde.paare.length}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="flex flex-wrap md:flex-col gap-2" role="group" aria-label="Begriffe">
          {runde.begriffe.map((id) => (
            <button
              key={id}
              onClick={() => waehleBegriff(id)}
              disabled={geloest.includes(id)}
              aria-pressed={gewaehltBegriff === id}
              className={`card px-3 py-2 text-sm font-medium text-left transition-colors ${kachel(id, gewaehltBegriff, 'b')}`}
            >
              {paarJeId.get(id).begriff}
            </button>
          ))}
        </div>
        <div className="grid gap-2" role="group" aria-label="Definitionen">
          {runde.definitionen.map((id) => (
            <button
              key={id}
              onClick={() => waehleDef(id)}
              disabled={geloest.includes(id)}
              aria-pressed={gewaehltDef === id}
              className={`card px-3 py-2.5 text-sm text-left transition-colors ${kachel(id, gewaehltDef, 'd')}`}
            >
              {paarJeId.get(id).definition}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
