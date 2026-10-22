import { useCallback, useEffect, useState } from 'react';
import { ladeExamDaten, useExamDatenGeladen } from '../data/examDaten';

/**
 * Lädt die Prüfungs-/Lernzettel-Daten (C9: erst nach dem Login, per
 * dynamischem Import) und rendert die Kinder erst danach. So rechnen alle
 * Seiten wie bisher synchron mit vollständigen Daten. Fehler (offline ohne
 * Cache, Sitzung abgelaufen) werden mit „Erneut versuchen“ angezeigt.
 */
export default function ExamDatenGrenze({ children }) {
  const geladen = useExamDatenGeladen();
  const [fehler, setFehler] = useState(null);

  const melde = useCallback((err) => setFehler(err || new Error('Laden fehlgeschlagen')), []);

  useEffect(() => {
    if (!geladen) ladeExamDaten().catch(melde);
  }, [geladen, melde]);

  const laden = () => {
    setFehler(null);
    ladeExamDaten().catch(melde);
  };

  if (geladen) return children;
  if (fehler) {
    return (
      <div className="max-w-md mx-auto p-6 space-y-3 text-center" role="alert">
        <h1 className="text-lg font-semibold">Lerninhalte konnten nicht geladen werden</h1>
        <p className="text-sm text-muted-foreground">
          Prüfe deine Verbindung. Ist deine Sitzung abgelaufen, melde dich bitte erneut an.
        </p>
        <button onClick={laden} className="btn-primary px-4 py-2">
          Erneut versuchen
        </button>
      </div>
    );
  }
  return (
    <div className="grid place-items-center py-24" role="status" aria-label="Lerninhalte werden geladen …">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
    </div>
  );
}
