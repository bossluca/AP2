import { useAuth } from '../context/AuthContext';

/**
 * Rückfrage beim ersten Login mit lokalen, anonymen Lerndaten (C1):
 * „Lokalen Fortschritt in dieses Konto übernehmen?“ Ja übernimmt (Merge ins
 * Konto), Nein verwirft den lokalen Stand und lädt nur den Kontostand. Erst
 * nach der Antwort gilt die Sitzung als angemeldet.
 */
export default function UebernahmeDialog() {
  const { uebernahmeFrage, beantworteUebernahme } = useAuth();
  if (!uebernahmeFrage) return null;
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="uebernahme-titel"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative card p-5 max-w-sm w-full space-y-3 bg-popover text-popover-foreground">
        <h2 id="uebernahme-titel" className="font-semibold">
          Lokalen Fortschritt in dieses Konto übernehmen?
        </h2>
        <p className="text-sm text-muted-foreground">
          In diesem Browser liegt Lernstand, der noch keinem Konto gehört. Übernimm ihn nur, wenn
          es dein eigener ist. Bei „Nein“ wird er hier gelöscht und nur der Stand deines Kontos
          geladen.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => beantworteUebernahme(true)} className="btn-primary px-4 py-2">
            Ja, übernehmen
          </button>
          <button onClick={() => beantworteUebernahme(false)} className="btn-ghost px-4 py-2">
            Nein, verwerfen
          </button>
        </div>
      </div>
    </div>
  );
}
