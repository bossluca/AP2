import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { baueExport, parseImport, exportDateiname } from '../lib/datensicherung';

/**
 * Fortschritt sichern & wiederherstellen (JSON-Datei) – die Versicherung für
 * Nutzer ohne Konto (localStorage ist die einzige Persistenz) und der einfache
 * Weg für einen Geräte-Umzug. Import ist nicht-destruktiv: je Eintrag gewinnt
 * der jüngere Stand (`lib/progressMerge`), Gamification wird max-gemergt.
 */
export default function DatenSicherung() {
  const { getProgressRoh, importProgress } = useProgress();
  const { getGamificationRoh, importGamification } = useGamification();
  const dateiRef = useRef(null);
  const [meldung, setMeldung] = useState(null); // {typ:'ok'|'fehler', text}

  const exportieren = () => {
    const daten = baueExport(getProgressRoh(), getGamificationRoh());
    const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportDateiname();
    a.click();
    URL.revokeObjectURL(url);
    setMeldung({ typ: 'ok', text: 'Backup heruntergeladen.' });
  };

  const importieren = async (e) => {
    const datei = e.target.files?.[0];
    e.target.value = ''; // gleiche Datei erneut wählbar
    if (!datei) return;
    try {
      const text = await datei.text();
      const r = parseImport(text);
      if (!r.ok) {
        setMeldung({ typ: 'fehler', text: r.fehler });
        return;
      }
      importProgress(r.progress);
      importGamification(r.gamification);
      setMeldung({
        typ: 'ok',
        text: `Backup übernommen (${r.anzahl} Einträge, nicht-destruktiv gemergt).`,
      });
    } catch {
      setMeldung({ typ: 'fehler', text: 'Die Datei konnte nicht gelesen werden.' });
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-[#1d271a] pt-4 space-y-2">
      <h2 className="text-sm font-semibold">Fortschritt sichern &amp; übertragen</h2>
      <p className="text-xs text-gray-500">
        Lädt deinen kompletten Lernstand (Fortschritt, XP, Streak) als JSON-Datei herunter –
        als Backup oder für den Umzug auf ein anderes Gerät. Der Import ergänzt den
        vorhandenen Stand, ohne Neueres zu überschreiben.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={exportieren} className="btn-ghost px-4 py-2 inline-flex items-center gap-1.5">
          <Download size={15} aria-hidden="true" /> Backup herunterladen
        </button>
        <button
          onClick={() => dateiRef.current?.click()}
          className="btn-ghost px-4 py-2 inline-flex items-center gap-1.5"
        >
          <Upload size={15} aria-hidden="true" /> Backup einspielen
        </button>
        <input
          ref={dateiRef}
          type="file"
          accept="application/json,.json"
          onChange={importieren}
          className="hidden"
          aria-label="Backup-Datei wählen"
        />
      </div>
      {meldung && (
        <p
          role="status"
          className={`text-xs ${meldung.typ === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600'}`}
        >
          {meldung.text}
        </p>
      )}
    </div>
  );
}
