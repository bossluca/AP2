import { mergeStapel, neuereEinstufung } from './datensicherung';
import { bereinigeEinstufung, bereinigeStapelListe } from './validiere';

/**
 * Konto-Sync für gerätelokale Zusatzdaten (Lernplan/Einstufung, eigene
 * Kartenstapel). Rein: Merge-Regeln + Änderungs-Signal. Netzwerk und Storage
 * erledigt `components/KontoDatenSync`.
 */

/** Event-Name, den die Speicher-Funktionen nach jeder lokalen Änderung feuern. */
export const KONTODATEN_EVENT = 'fisidev:kontodaten';

/** Synchronisierte Schlüssel (müssen serverseitig freigegeben sein). */
export const KONTODATEN_SCHLUESSEL = ['einstufung', 'eigeneKarten'];

/**
 * Meldet eine lokale Änderung (best-effort, ohne `window` – z. B. in Node – still).
 * @param {'einstufung'|'eigeneKarten'} schluessel
 */
export function meldeKontoDatenAenderung(schluessel) {
  try {
    window.dispatchEvent(new CustomEvent(KONTODATEN_EVENT, { detail: { schluessel } }));
  } catch {
    /* kein Browser-Kontext */
  }
}

/**
 * Lokalen Stand mit dem Server-Stand zusammenführen (Login).
 * - Einstufung: die jüngere gewinnt (nach `datum`).
 * - Eigene Karten: Vereinigung nach Stapel-ID (lokal gewinnt bei gleicher ID).
 * @param {{einstufung:Object|null, eigeneKarten:Object[]}} lokal
 * @param {{einstufung?:{wert:Object|null}, eigeneKarten?:{wert:Object[]|null}}} server
 * @returns {{einstufung:Object|null, eigeneKarten:Object[], aenderungLokal:boolean, aenderungServer:boolean}}
 */
export function mergeKontoDaten(lokal, server = {}) {
  // C4: Serverwerte nie ungeprüft übernehmen (kaputte Karte/Einstufung legt sonst die App lahm).
  const serverEinstufung = bereinigeEinstufung(server?.einstufung?.wert);
  const serverKarten = bereinigeStapelListe(server?.eigeneKarten?.wert).stapel;
  const lokaleKarten = Array.isArray(lokal?.eigeneKarten) ? lokal.eigeneKarten : [];

  const einstufung = neuereEinstufung(lokal?.einstufung ?? null, serverEinstufung);
  const eigeneKarten = mergeStapel(lokaleKarten, serverKarten);
  const ids = (liste) => liste.map((s) => s.id).sort().join('|');

  return {
    einstufung,
    eigeneKarten,
    aenderungLokal: einstufung !== (lokal?.einstufung ?? null) || ids(eigeneKarten) !== ids(lokaleKarten),
    aenderungServer:
      (einstufung?.datum ?? null) !== (serverEinstufung?.datum ?? null) ||
      ids(eigeneKarten) !== ids(serverKarten),
  };
}
