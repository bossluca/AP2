import { useRef, useState } from 'react';
import { Calculator, Check, X } from 'lucide-react';
import { AUFGABEN_TYPEN, erzeugeAufgabe, pruefeRechenantwort } from '../lib/rechentrainer';
import { useGamification } from '../context/GamificationContext';
import { xpFuerErgebnis } from '../lib/level';
import MarkdownContent from '../components/MarkdownContent';

/**
 * Rechen-Trainer: unbegrenzt generierte AP2-Rechenaufgaben (`lib/rechentrainer`)
 * mit sofortiger Prüfung und Lösungsweg. Typen frei kombinierbar; Aktivität +
 * XP zählen wie in den anderen Modi (kein FSRS – die Aufgaben sind jedes Mal neu).
 */
export default function Rechnen() {
  const { recordActivity, recordXp } = useGamification();
  const [typen, setTypen] = useState([]); // leer = Mix
  const [aufgabe, setAufgabe] = useState(() => erzeugeAufgabe());
  const [eingabe, setEingabe] = useState('');
  const [ergebnis, setErgebnis] = useState(null); // null | true | false
  const [serie, setSerie] = useState({ richtig: 0, gesamt: 0, folge: 0 });
  const eingabeRef = useRef(null);

  const neueAufgabe = (auswahl = typen) => {
    setAufgabe(erzeugeAufgabe(auswahl));
    setEingabe('');
    setErgebnis(null);
    setTimeout(() => eingabeRef.current?.focus(), 0);
  };

  const umschalten = (id) => {
    const neu = typen.includes(id) ? typen.filter((t) => t !== id) : [...typen, id];
    setTypen(neu);
    neueAufgabe(neu);
  };

  const pruefen = (e) => {
    e.preventDefault();
    if (ergebnis !== null) return neueAufgabe();
    if (!eingabe.trim()) return;
    const ok = pruefeRechenantwort(aufgabe, eingabe);
    setErgebnis(ok);
    setSerie((s) => ({ richtig: s.richtig + (ok ? 1 : 0), gesamt: s.gesamt + 1, folge: ok ? s.folge + 1 : 0 }));
    recordActivity(1);
    recordXp(xpFuerErgebnis(ok ? 'richtig' : 'falsch'));
  };

  const titelVon = (id) => AUFGABEN_TYPEN.find((t) => t.id === id)?.titel;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Calculator size={22} className="text-accent" aria-hidden="true" /> Rechen-Trainer
          </h1>
          <p className="text-sm text-muted-foreground">
            Unbegrenzt neue Rechenaufgaben – mit Lösungsweg.
          </p>
        </div>
        <div className="text-right text-sm" aria-live="polite">
          <div className="font-mono">
            {serie.richtig}/{serie.gesamt} richtig
          </div>
          {serie.folge >= 3 && <div className="text-xs text-accent">🔥 {serie.folge} in Folge</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Aufgabentypen">
        <button
          onClick={() => {
            setTypen([]);
            neueAufgabe([]);
          }}
          aria-pressed={typen.length === 0}
          className={`chip cursor-pointer ${typen.length === 0 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Mix
        </button>
        {AUFGABEN_TYPEN.map((t) => (
          <button
            key={t.id}
            onClick={() => umschalten(t.id)}
            aria-pressed={typen.includes(t.id)}
            className={`chip cursor-pointer ${typen.includes(t.id) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {t.titel}
          </button>
        ))}
      </div>

      <form onSubmit={pruefen} className="card p-5 space-y-4">
        <span className="chip">{titelVon(aufgabe.typ)}</span>
        <div className="font-medium">
          <MarkdownContent>{aufgabe.frage}</MarkdownContent>
        </div>
        <div className="flex gap-2 items-center">
          <input
            ref={eingabeRef}
            className="input flex-1 font-mono"
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            readOnly={ergebnis !== null}
            inputMode={aufgabe.art === 'zahl' ? 'decimal' : 'text'}
            autoComplete="off"
            spellCheck={false}
            aria-label="Deine Antwort"
            placeholder="Antwort"
          />
          {aufgabe.einheit && <span className="text-sm text-muted-foreground">{aufgabe.einheit}</span>}
          <button type="submit" className="btn-primary">
            {ergebnis === null ? 'Prüfen' : 'Nächste'}
          </button>
        </div>

        {ergebnis !== null && (
          <div
            className={`rounded-lg border p-4 space-y-2 ${
              ergebnis ? 'border-green-500/50 bg-green-50 dark:bg-green-500/10' : 'border-red-400/50 bg-red-50 dark:bg-red-500/10'
            }`}
          >
            <div className="font-medium flex items-center gap-2">
              {ergebnis ? <Check size={18} aria-hidden="true" /> : <X size={18} aria-hidden="true" />}
              {ergebnis ? 'Richtig!' : `Nicht ganz – Lösung: ${String(aufgabe.loesung)}${aufgabe.einheit && aufgabe.einheit !== '/' ? ` ${aufgabe.einheit}` : ''}`}
            </div>
            <div className="text-sm text-muted-foreground">
              <MarkdownContent>{aufgabe.loesungsweg}</MarkdownContent>
            </div>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground text-center">
          Enter = prüfen / nächste Aufgabe · Komma oder Punkt als Dezimaltrenner
        </p>
      </form>
    </div>
  );
}
