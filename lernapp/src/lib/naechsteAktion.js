/**
 * „Was ist jetzt dran?" – wählt aus dem Lernstand **eine** beste nächste Aktion
 * für den Primär-CTA der Startseite. Reine Funktion (keine React-/Storage-/Zeit-
 * Abhängigkeit), damit die Home die Priorisierung nicht über verstreute
 * `&&`-Blöcke selbst würfeln muss und andere Stellen dieselbe Logik nutzen können.
 *
 * Priorität (oben gewinnt):
 *   1. resume      – eine angefangene Session fortsetzen (geringste Reibung)
 *   2. faellig      – fällige Wiederholungen (SRS first – das hält Wissen)
 *   3. schwaechen   – gezielt an schwachen Themen üben (wenn welche da sind)
 *   4. lernen       – Standard-Smart-Session „Heute lernen" (immer möglich)
 *
 * @param {Object} eingabe
 * @param {{to:string, titel:string}|null} [eingabe.resume]
 * @param {number} [eingabe.faellig]            Anzahl fälliger Objekte.
 * @param {{tag:string}[]} [eingabe.schwachstellen]
 * @param {number} [eingabe.heuteAktivitaet]
 * @param {number} [eingabe.tagesziel]
 * @returns {{art:'resume'|'faellig'|'schwaechen'|'lernen', titel:string, text:string, cta:string, to:string, icon:string}}
 */
export function naechsteAktion({
  resume = null,
  faellig = 0,
  schwachstellen = [],
  heuteAktivitaet = 0,
  tagesziel = 0,
} = {}) {
  if (resume && typeof resume.to === 'string') {
    return {
      art: 'resume',
      titel: 'Weiterlernen',
      text: resume.titel ? `Dort weiter: ${resume.titel}` : 'Dort weiter, wo du warst.',
      cta: 'Fortsetzen',
      to: resume.to,
      icon: 'Play',
    };
  }

  if (faellig > 0) {
    return {
      art: 'faellig',
      titel: 'Wiederholen',
      text: `${faellig} ${faellig === 1 ? 'Objekt ist' : 'Objekte sind'} fällig – jetzt festigen.`,
      cta: 'Wiederholen',
      to: '/wiederholen',
      icon: 'RotateCcw',
    };
  }

  // Schwächen nur vorschlagen, wenn das Tagesziel noch nicht erreicht ist –
  // sonst lieber eine entspannte Standard-Runde anbieten.
  const tagesszielOffen = tagesziel <= 0 || heuteAktivitaet < tagesziel;
  if (schwachstellen.length > 0 && tagesszielOffen) {
    const themen = schwachstellen
      .slice(0, 3)
      .map((s) => s.tag)
      .filter(Boolean)
      .join(' · ');
    return {
      art: 'schwaechen',
      titel: 'Schwächen-Training',
      text: themen ? `Gezielt üben: ${themen}` : 'Gezielt an schwachen Themen üben.',
      cta: 'Schwächen üben',
      to: '/lernen?modus=schwaechen',
      icon: 'Target',
    };
  }

  return {
    art: 'lernen',
    titel: 'Heute lernen',
    text: 'Kurze, fertige Lern-Session – ohne Auswahl, einfach loslegen.',
    cta: 'Heute lernen',
    to: '/lernen',
    icon: 'Play',
  };
}
