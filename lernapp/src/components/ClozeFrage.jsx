import { useMemo, useState } from 'react';
import { parseCloze, pruefeCloze } from '../lib/cloze';

/**
 * Rendert einen Lückentext (Cloze): Klartext mit Eingabefeldern an den Lücken,
 * prüft auf Knopfdruck (oder Enter) und zeigt je Lücke richtig/falsch + die
 * Musterlösung. Meldet das Ergebnis über `onErgebnis`. Reine Anzeige-Komponente –
 * die Logik liegt in `lib/cloze.js`.
 *
 * @param {{text:string, onErgebnis?:(e:import('../lib/cloze').ClozeErgebnis)=>void, autoFocus?:boolean}} props
 */
export default function ClozeFrage({ text, onErgebnis, autoFocus = true }) {
  const { segmente, luecken } = useMemo(() => parseCloze(text), [text]);
  const [werte, setWerte] = useState({});
  const [geprueft, setGeprueft] = useState(false);

  const ergebnis = useMemo(
    () => (geprueft ? pruefeCloze(luecken, luecken.map((_, i) => werte[i] || '')) : null),
    [geprueft, luecken, werte]
  );

  const pruefen = () => {
    if (geprueft) return;
    const r = pruefeCloze(luecken, luecken.map((_, i) => werte[i] || ''));
    setGeprueft(true);
    onErgebnis?.(r);
  };

  const setVal = (i, v) => setWerte((w) => ({ ...w, [i]: v }));

  return (
    <div className="space-y-3">
      <p className="leading-9 text-[15px]">
        {segmente.map((s, i) => {
          if (s.typ === 'text') return <span key={i}>{s.text}</span>;
          const richtig = ergebnis?.treffer[s.index];
          const rand = !geprueft
            ? ''
            : richtig
              ? 'border-green-500 text-green-800 dark:text-green-300'
              : 'border-red-500 text-red-800 dark:text-red-300';
          return (
            <span key={i} className="inline-flex items-center align-baseline mx-0.5">
              <input
                value={werte[s.index] || ''}
                onChange={(e) => setVal(s.index, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && pruefen()}
                disabled={geprueft}
                autoFocus={autoFocus && s.index === 0}
                aria-label={`Lücke ${s.index + 1}`}
                className={`input px-2 py-0.5 w-36 text-center ${rand}`}
              />
              {geprueft && !richtig && (
                <span className="ml-1 text-xs font-medium text-green-700 dark:text-green-300">
                  → {s.loesung}
                </span>
              )}
            </span>
          );
        })}
      </p>

      {!geprueft ? (
        <button onClick={pruefen} className="btn-primary w-full py-2.5">
          Prüfen
        </button>
      ) : (
        <p className="text-sm font-medium">
          <span aria-hidden="true">
            {ergebnis.alleRichtig ? '✓' : ergebnis.anzahl ? '≈' : '✗'}
          </span>{' '}
          {ergebnis.anzahl}/{ergebnis.gesamt} richtig
        </p>
      )}
    </div>
  );
}
