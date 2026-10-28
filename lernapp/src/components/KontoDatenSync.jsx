import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { datenApi } from '../lib/api';
import { KONTODATEN_EVENT, mergeKontoDaten } from '../lib/kontoDaten';
import { ladeStapel, speichereStapel } from '../lib/eigeneKarten';
import { ladeEinstufung, speichereEinstufung } from '../lib/einstufung';
import { bereinigeEinstufung } from '../lib/validiere';

/** Aktueller lokaler Wert je synchronisiertem Schlüssel. */
const LOKAL = {
  einstufung: () => ladeEinstufung(),
  eigeneKarten: () => ladeStapel(),
};

/**
 * Unsichtbare Komponente: synchronisiert Lernplan (Einstufung) und eigene
 * Kartenstapel mit dem Konto (`/api/daten`). Beim Login wird gemergt
 * (`lib/kontoDaten`), danach schreibt jede lokale Änderung best-effort durch.
 * Ohne Login/Backend passiert nichts – alles bleibt lokal.
 */
export default function KontoDatenSync() {
  const { user, syncModus } = useAuth();
  const bereit = useRef(false); // erst nach dem Login-Merge durchschreiben

  useEffect(() => {
    bereit.current = false;
    if (!user) return undefined;
    let aktiv = true;
    (async () => {
      try {
        const { daten } = await datenApi.get();
        if (!aktiv) return;
        // C1: Im Modus 'laden' gehören lokale Reste nicht zu diesem Konto → nicht mergen.
        const lokal =
          syncModus === 'laden'
            ? { einstufung: null, eigeneKarten: [] }
            : { einstufung: ladeEinstufung(), eigeneKarten: ladeStapel() };
        // mergeKontoDaten bereinigt die Serverwerte (C4); zusätzlich hier nur
        // die Einstufung zum Vergleichen mit dem lokalen Wert normalisieren.
        const m = mergeKontoDaten(lokal, daten || {});
        if (m.aenderungLokal) {
          // Ohne Meldung speichern, sonst löst die Übernahme selbst einen PUT aus.
          const gespeichert = speichereStapel(m.eigeneKarten, { melden: false });
          if (!gespeichert) {
            window.dispatchEvent(new CustomEvent('fisidev:speicherfehler', { detail: { schluessel: 'eigeneKarten' } }));
          }
          const einstufung = bereinigeEinstufung(m.einstufung);
          if (einstufung && einstufung !== lokal.einstufung) {
            speichereEinstufung(einstufung.auswertung, new Date(einstufung.datum), { melden: false });
          }
        }
        if (m.aenderungServer) {
          await Promise.all([
            datenApi.put('einstufung', m.einstufung),
            datenApi.put('eigeneKarten', m.eigeneKarten),
          ]);
        }
      } catch {
        /* offline/kein Backend: lokal weiterarbeiten */
      }
      if (aktiv) bereit.current = true;
    })();
    return () => {
      aktiv = false;
    };
  }, [user, syncModus]);

  useEffect(() => {
    const onAenderung = (e) => {
      const schluessel = e.detail?.schluessel;
      if (!user || !bereit.current || !LOKAL[schluessel]) return;
      datenApi.put(schluessel, LOKAL[schluessel]()).catch(() => {});
    };
    window.addEventListener(KONTODATEN_EVENT, onAenderung);
    return () => window.removeEventListener(KONTODATEN_EVENT, onAenderung);
  }, [user]);

  return null;
}

