import { useSyncExternalStore } from 'react';

/**
 * Lade-Store für die Prüfungs-/Lernzettel-Daten (C9).
 *
 * `exam_data.json` ist urheberrechtlich heikel und wird deshalb **nicht** mehr
 * statisch ins Bundle importiert, sondern erst nach erfolgreichem Login (bzw.
 * im rein lokalen Betrieb ohne Backend) per dynamischem `import()` geladen.
 * Der Chunk `examdata` liefert nginx nur mit gültiger Sitzung aus.
 *
 * Die Selektoren in `useExamData.js` lesen synchron über {@link holeExamDaten};
 * solange nichts geladen ist, liefern sie leere Listen. Tests stellen die Daten
 * per {@link setzeExamDaten} direkt bereit (siehe `src/test/setup.js`).
 */

let daten = null;
let ladeVersprechen = null;
const hoerer = new Set();

/** Aktuelle Daten oder `null`, solange nicht geladen. */
export function holeExamDaten() {
  return daten;
}

/** Sind die Daten geladen? */
export function examDatenGeladen() {
  return daten !== null;
}

/**
 * Setzt die Daten direkt (Loader, Tests) und benachrichtigt Abonnenten.
 * @param {Object|null} neu
 */
export function setzeExamDaten(neu) {
  daten = neu ?? null;
  if (!daten) ladeVersprechen = null;
  for (const f of hoerer) f();
}

/**
 * Lädt die Daten einmalig per dynamischem Import. Parallele Aufrufe teilen sich
 * ein Versprechen; nach einem Fehler ist ein neuer Versuch möglich.
 * @param {() => Promise<{default:Object}|Object>} [importer]  injizierbar (Tests)
 * @returns {Promise<Object>}
 */
export function ladeExamDaten(importer = () => import('./exam_data.json')) {
  if (daten) return Promise.resolve(daten);
  if (!ladeVersprechen) {
    ladeVersprechen = Promise.resolve()
      .then(importer)
      .then((m) => {
        setzeExamDaten(m?.default ?? m);
        return daten;
      })
      .catch((err) => {
        ladeVersprechen = null;
        throw err;
      });
  }
  return ladeVersprechen;
}

/** Abonniert Änderungen (für `useSyncExternalStore`). */
export function abonniereExamDaten(f) {
  hoerer.add(f);
  return () => hoerer.delete(f);
}

/** React-Hook: true, sobald die Daten geladen sind (rendert bei Änderung neu). */
export function useExamDatenGeladen() {
  return useSyncExternalStore(abonniereExamDaten, examDatenGeladen, examDatenGeladen);
}
