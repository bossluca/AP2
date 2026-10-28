import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import {
  baueExport,
  parseImport,
  exportDateiname,
  mergeStapel,
  neuereEinstufung,
  pruefeDateiGroesse,
} from '../lib/datensicherung';
import { ladeStapel, speichereStapel } from '../lib/eigeneKarten';
import { ladeEinstufung, speichereEinstufung } from '../lib/einstufung';

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
    const daten = baueExport(getProgressRoh(), getGamificationRoh(), new Date(), {
      eigeneKarten: ladeStapel(),
      einstufung: ladeEinstufung(),
    });
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
    // C4: Größe vor dem Einlesen prüfen.
    const zuGross = pruefeDateiGroesse(datei.size);
    if (zuGross) {
      setMeldung({ typ: 'fehler', text: zuGross });
      return;
    }
    try {
      const text = await datei.text();
      const r = parseImport(text);
      if (!r.ok) {
        setMeldung({ typ: 'fehler', text: r.fehler });
        return;
      }
      importProgress(r.progress);
      importGamification(r.gamification);
      let speicherOk = true;
      // Nur schreiben, wenn es etwas Neues gibt (leerer Import überschreibt nichts).
      if (r.eigeneKarten.length > 0) {
        speicherOk = speichereStapel(mergeStapel(ladeStapel(), r.eigeneKarten)) && speicherOk;
      }
      const lokal = ladeEinstufung();
      const gewinner = neuereEinstufung(lokal, r.einstufung);
      if (gewinner && gewinner !== lokal) {
        speichereEinstufung(gewinner.auswertung, new Date(gewinner.datum));
        speicherOk = Date.parse(ladeEinstufung()?.datum) === Date.parse(gewinner.datum) && speicherOk;
      }
      if (!speicherOk) {
        setMeldung({
          typ: 'fehler',
          text: 'Backup konnte nicht gespeichert werden, Speicher voll. Bitte Platz schaffen und erneut versuchen.',
        });
        return;
      }
      const verworfen = r.verworfen > 0 ? `, ${r.verworfen} ungültige Teile verworfen` : '';
      setMeldung({
        typ: 'ok',
        text: `Backup übernommen (${r.anzahl} Einträge${verworfen}; nicht-destruktiv gemergt).`,
      });
    } catch {
      setMeldung({ typ: 'fehler', text: 'Die Datei konnte nicht gelesen werden.' });
    }
  };

  return (
    <div className="border-t border-border pt-4 space-y-2">
      <h2 className="text-sm font-semibold">Fortschritt sichern &amp; übertragen</h2>
      <p className="text-xs text-muted-foreground">
        Lädt deinen kompletten Lernstand (Fortschritt, XP, Streak, Lernplan, eigene Karten) als JSON-Datei herunter –
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
