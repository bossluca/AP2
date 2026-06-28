import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import { getLernobjekte } from '../data/lernobjekte';
import { berechneStatistik } from '../lib/statistik';
import { bewerteErfolge } from '../lib/erfolge';
import { feiern } from '../lib/konfetti';

/**
 * Beobachtet die Erfolge und feiert, sobald ein neuer freigeschaltet wird:
 * kurzer Konfetti-Moment + Toast. Rendert nichts, solange kein Toast aktiv ist.
 *
 * Kleine Schnittstelle (keine Props) – die ganze „Wann feiern wir?"-Logik
 * (Diff gegen den zuletzt gesehenen Stand, kein Feuern beim ersten Laden) sitzt
 * gekapselt hier drin. Datenbasis identisch zur Statistik-Seite.
 */
export default function ErfolgWatcher() {
  const { progress, gami } = useProgress();
  const objekte = useMemo(() => getLernobjekte(), []);
  const s = useMemo(() => berechneStatistik(objekte, progress), [objekte, progress]);

  const erfolge = useMemo(
    () =>
      bewerteErfolge({
        gelernt: s.status.gelernt,
        prozentGelernt: s.total > 0 ? Math.round((s.status.gelernt / s.total) * 100) : 0,
        streak: gami.streak,
        aktiveTage: gami.aktiveTage,
        klausurBesteProzent: gami.klausurBest,
      }),
    [s, gami]
  );

  const signatur = erfolge
    .filter((e) => e.freigeschaltet)
    .map((e) => e.id)
    .join(',');

  const gesehen = useRef(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const ids = new Set(signatur ? signatur.split(',') : []);
    // Erster Lauf: aktuellen Stand merken, ohne zu feiern (Altbestand).
    if (gesehen.current === null) {
      gesehen.current = ids;
      return;
    }
    const neu = [...ids].filter((id) => !gesehen.current.has(id));
    gesehen.current = ids;
    if (neu.length > 0) {
      const letzter = erfolge.find((e) => e.id === neu[neu.length - 1]);
      feiern();
      setToast(letzter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatur]);

  // Toast nach kurzer Zeit ausblenden.
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in flex items-center gap-3 rounded-xl border border-green-200 dark:border-green-800 bg-white dark:bg-[#11160F] shadow-lg shadow-green-500/20 px-4 py-3"
    >
      <span className="text-3xl" aria-hidden="true">
        {toast.icon}
      </span>
      <div className="leading-tight">
        <div className="text-[11px] uppercase tracking-wide text-accent font-semibold">
          Erfolg freigeschaltet!
        </div>
        <div className="font-semibold text-sm">{toast.titel}</div>
      </div>
    </div>
  );
}
