import { normalisiere } from './antwortpruefung';

/**
 * Befehls-/Sprungliste für die Command-Palette (Cmd/K). Reine Datenfunktion:
 * baut aus den Navigationszielen + ein paar Schnellaktionen eine flache
 * Befehlsliste und filtert sie tolerant. Keine React-/DOM-Abhängigkeit → testbar.
 *
 * Schnittstelle:
 *   baueBefehle({ navItems, resume, theme }) -> Befehl[]
 *   filterBefehle(befehle, query)            -> Befehl[]  (gerankt, leere Query = alle)
 *
 * @typedef {Object} Befehl
 * @property {string} id
 * @property {string} label       Anzeigename.
 * @property {string} [hinweis]   kleiner Zusatz (z. B. Tastenkürzel-Idee, Modus).
 * @property {string} gruppe      'Navigation' | 'Aktion'.
 * @property {string} [to]        Ziel-Route (Navigations-/Sprungbefehl).
 * @property {string} [aktion]    Aktions-Schlüssel (z. B. 'theme') statt Route.
 * @property {string} [icon]      Lucide-Icon-Name (UI löst auf).
 * @property {string} schluessel  vorberechneter Normaltext fürs Matching.
 */

/** Erzeugt einen Befehl mit vorberechnetem Suchschlüssel. */
function befehl(b) {
  return { ...b, schluessel: normalisiere(`${b.label} ${b.hinweis || ''}`) };
}

/**
 * Baut die vollständige Befehlsliste.
 * @param {Object} opt
 * @param {{to:string, label:string, icon?:any}[]} [opt.navItems]  NAV aus App.jsx.
 * @param {{to:string, titel:string}|null} [opt.resume]
 * @param {'light'|'dark'} [opt.theme]
 * @returns {Befehl[]}
 */
export function baueBefehle({ navItems = [], resume = null, theme = 'light' } = {}) {
  const liste = [];

  // Schnellaktionen zuerst (häufigste Absichten).
  if (resume && typeof resume.to === 'string') {
    liste.push(
      befehl({
        id: 'resume',
        label: 'Weiterlernen',
        hinweis: resume.titel || 'dort weiter, wo du warst',
        gruppe: 'Aktion',
        to: resume.to,
        icon: 'Play',
      })
    );
  }
  liste.push(
    befehl({ id: 'akt-heute', label: 'Heute lernen', hinweis: 'Smart-Session', gruppe: 'Aktion', to: '/lernen', icon: 'Play' }),
    befehl({ id: 'akt-wdh', label: 'Wiederholen', hinweis: 'fällige Karten', gruppe: 'Aktion', to: '/wiederholen', icon: 'RotateCcw' }),
    befehl({ id: 'akt-klausur', label: 'Klausur starten', hinweis: 'Prüfung simulieren', gruppe: 'Aktion', to: '/klausur', icon: 'GraduationCap' }),
    befehl({
      id: 'akt-theme',
      label: theme === 'dark' ? 'Hellmodus' : 'Dunkelmodus',
      hinweis: 'Theme wechseln',
      gruppe: 'Aktion',
      aktion: 'theme',
      icon: theme === 'dark' ? 'Sun' : 'Moon',
    })
  );

  // Alle Navigationsziele.
  for (const n of navItems) {
    liste.push(
      befehl({
        id: `nav-${n.to}`,
        label: n.label,
        hinweis: 'öffnen',
        gruppe: 'Navigation',
        to: n.to,
        icon: n.iconName,
      })
    );
  }
  return liste;
}

/**
 * Toleranter Match: trifft, wenn alle Zeichen der (normalisierten) Query als
 * **Teilfolge** im Schlüssel vorkommen (z. B. „klr" → „klausur"). Liefert einen
 * Score (kleiner = besser): zusammenhängende Treffer und früher Start ranken vor.
 * @returns {number|null} Score oder null bei kein Match.
 */
export function fuzzyScore(schluessel, queryNorm) {
  if (!queryNorm) return 0;
  let si = 0;
  let score = 0;
  let letzte = -1;
  for (const qc of queryNorm) {
    if (qc === ' ') continue;
    const idx = schluessel.indexOf(qc, si);
    if (idx === -1) return null;
    if (letzte >= 0) score += idx - letzte; // Lücke zwischen Treffern bestrafen
    else score += idx; // früher Start ist besser
    letzte = idx;
    si = idx + 1;
  }
  return score;
}

/**
 * Filtert + rankt die Befehle nach der Eingabe. Leere Query → alle (Originalreihenfolge).
 * @param {Befehl[]} befehle
 * @param {string} query
 * @returns {Befehl[]}
 */
export function filterBefehle(befehle, query) {
  const q = normalisiere(query || '');
  if (!q) return befehle;
  const bewertet = [];
  for (const b of befehle) {
    const score = fuzzyScore(b.schluessel, q);
    if (score != null) bewertet.push({ b, score });
  }
  bewertet.sort((a, z) => a.score - z.score);
  return bewertet.map((x) => x.b);
}
