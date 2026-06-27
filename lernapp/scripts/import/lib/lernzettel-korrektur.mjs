/**
 * Bekannte Mängel der Quelldokumente (Lernzettel-PDF/DOCX) zentral korrigieren –
 * angewandt *beim Import*, damit Korrekturen reproduzierbar sind und nicht beim
 * nächsten Re-Import verloren gehen.
 *
 * Kleine Schnittstelle (`korrigiereEinheit`), dahinter zentrale Korrekturtabellen.
 * Beide Importer (AP1 + AP2) sind Adapter an derselben Naht: ändert sich eine
 * Korrektur, lebt sie hier an einer Stelle.
 *
 * Bewusst **nur** Überschriften (Tippfehler/Mehrdeutigkeit). Inhalte werden NICHT
 * editiert – die bleiben getreue Extraktion der Quelle.
 */

/**
 * Eindeutige id → korrigierter Titel.
 *
 * Zwei Klassen von Korrekturen:
 *  - TIPPFEHLER: Schreibfehler in der Quell-Überschrift selbst.
 *  - MEHRDEUTIG: generischer/doppelter Titel, der ohne Dokumentkontext (in einer
 *    flachen Liste/Suche) verwirrt → eindeutiger Kontext ergänzt.
 *
 * id-basiert (nicht titel-basiert), weil ids deterministisch & stabil aus der
 * Quellstruktur erzeugt werden – der fehlerhafte Titel kann mehrfach vorkommen.
 */
const TITEL_NACH_ID = {
  // --- AP1: Tippfehler in der Quelle ---
  lz_ap1_3_4: 'Entwicklungssoftware', // Quelle: "Enwicklungssoftware"
  lz_ap1_4_2: 'Betriebssystem-Installation', // Quelle: "Betriebssystems" (Genitiv-Fragment)
  lz_ap1_6_6: 'Marktformen', // Quelle: "Markformen"
  lz_ap1_7_6: 'Reflexionsmethoden', // Quelle: "Reflektionsmethoden" (Duden: Reflexion)
  lz_ap1_9_1: 'Kommunikation', // Quelle: "Kommuniaktion"

  // --- AP2: gleichlautende Titel eindeutig machen ---
  lz_ap2_server_allgemein_4: 'Cloud-Migration (IaaS/PaaS/SaaS)', // war "Cloud-Servicemodelle" (Dublette)
  lz_ap2_linux_grundlagen_berechtigungen_4: 'Fehleranalyse (Linux-Rechte)', // war "Fehleranalyse und Troubleshooting"
  lz_ap2_nat_pat_5: 'Fehleranalyse (NAT/PAT-Header)', // war "Fehleranalyse und Troubleshooting"
};

/**
 * Korrigiert eine Lerneinheit, falls für ihre id eine Korrektur hinterlegt ist.
 * Gibt dieselbe Referenz zurück, wenn nichts zu tun ist (kein unnötiges Kopieren).
 *
 * @template {{ id: string, titel: string }} T
 * @param {T} einheit
 * @returns {T}
 */
export function korrigiereEinheit(einheit) {
  const titel = TITEL_NACH_ID[einheit.id];
  if (!titel || titel === einheit.titel) return einheit;
  return { ...einheit, titel };
}

/** Anzahl hinterlegter Korrekturen (für Import-Logs / Tests). */
export function anzahlKorrekturen() {
  return Object.keys(TITEL_NACH_ID).length;
}
