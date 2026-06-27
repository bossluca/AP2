/**
 * Flexible Antwort-Prüfung per Schlagwörtern.
 *
 * Idee: Eine Prüfungsantwort ist selten wörtlich „richtig". Stattdessen prüfen
 * wir, ob die Freitext-Antwort der/des Lernenden die erwarteten *Schlagwörter*
 * (oder gleichwertige Synonyme) enthält. So darf die Formulierung abweichen.
 *
 * Beispiel „Was ist ein Server?":
 *   schluesselwoerter: [
 *     { begriff: 'Dienste bereitstellen', synonyme: ['stellt Dienste bereit', 'Service'] },
 *     { begriff: 'zentral', synonyme: ['Zentralrechner'] },
 *     { begriff: 'virtuelle Maschine', synonyme: ['VM', 'Hardware'], pflicht: false },
 *   ]
 *   → Sowohl „Hardware für große Rechenleistung" als auch „eine VM, die Dienste
 *     bereitstellt" treffen jeweils Schlagwörter und gelten als (teilweise) richtig.
 *
 * Das Modul ist bewusst frei von React/DOM, damit es rein und gut testbar bleibt.
 */

/**
 * @typedef {Object} SchluesselwortObjekt
 * @property {string}   begriff    Haupt-Schlagwort (oder Phrase).
 * @property {string[]} [synonyme] Gleichwertige Alternativ-Formulierungen.
 * @property {boolean}  [pflicht]  true = muss vorkommen, sonst nie „richtig".
 * @property {string}   [label]    Anzeigename (Default: begriff).
 */

/**
 * @typedef {string|SchluesselwortObjekt} Schluesselwort
 */

/**
 * Normalisiert deutschen Text für robustes, formulierungs-tolerantes Matching:
 * kleinschreiben, Umlaute/ß falten (ä→ae, ö→oe, ü→ue, ß→ss), restliche
 * diakritische Zeichen entfernen, alles Nicht-Alphanumerische zu Leerzeichen,
 * Mehrfach-Leerzeichen zusammenfassen.
 *
 * Durch die Umlaut-Faltung treffen „ue" und „ü" denselben Normalwert – Lernende
 * dürfen also auch ohne Sonderzeichen tippen.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalisiere(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // verbliebene Akzente (é, à, …) strippen
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Escaped Regex-Sonderzeichen in einem String. */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Prüft, ob ein einzelnes (normalisiertes) Schlagwort im (normalisierten) Text
 * vorkommt. Kurze Begriffe (≤ 3 Zeichen, z. B. „vm", „ip", „os") werden an
 * Wortgrenzen geprüft, um Fehltreffer in längeren Wörtern zu vermeiden; längere
 * Begriffe per Teilstring (toleranter, gut für Komposita).
 *
 * @param {string} textNorm  bereits normalisierter Antworttext
 * @param {string} kwNorm    bereits normalisiertes Schlagwort
 * @returns {boolean}
 */
function begriffTrifft(textNorm, kwNorm) {
  if (!kwNorm) return false;
  if (kwNorm.length <= 3) {
    return new RegExp(`(^| )${escapeRegExp(kwNorm)}( |$)`).test(textNorm);
  }
  return textNorm.includes(kwNorm);
}

/**
 * Bringt einen Schlagwort-Eintrag (String oder Objekt) auf eine einheitliche
 * Form mit normalisierten Begriff-/Synonym-Varianten.
 * @param {Schluesselwort} eintrag
 */
function normalisiereEintrag(eintrag) {
  const obj = typeof eintrag === 'string' ? { begriff: eintrag } : eintrag || {};
  const begriff = obj.begriff ?? '';
  const synonyme = Array.isArray(obj.synonyme) ? obj.synonyme : [];
  const varianten = [begriff, ...synonyme].map(normalisiere).filter(Boolean);
  return {
    label: obj.label ?? begriff,
    begriff,
    synonyme,
    pflicht: obj.pflicht === true,
    varianten,
  };
}

/**
 * @typedef {Object} SchlagwortTreffer
 * @property {string}  label    Anzeigename des Schlagworts.
 * @property {string}  begriff  Haupt-Schlagwort.
 * @property {boolean} pflicht  Pflicht-Schlagwort?
 * @property {boolean} getroffen
 */

/**
 * @typedef {Object} AntwortErgebnis
 * @property {SchlagwortTreffer[]} treffer    Gefundene Schlagwörter.
 * @property {SchlagwortTreffer[]} fehlend    Nicht gefundene Schlagwörter.
 * @property {SchlagwortTreffer[]} alle       Alle, in Eingabereihenfolge, mit `getroffen`.
 * @property {number}  anzahl       Anzahl getroffener Schlagwörter.
 * @property {number}  gesamt       Gesamtanzahl Schlagwörter.
 * @property {number}  quote        anzahl/gesamt (0..1), 0 wenn keine Schlagwörter.
 * @property {number|null} erforderlich  Im „Nennen Sie N …"-Modus die Zielanzahl
 *           an Treffern (sonst null → Anteils-Bewertung).
 * @property {boolean} pflichtErfuellt  Alle Pflicht-Schlagwörter getroffen?
 * @property {boolean} hatSchluesselwoerter  Gibt es überhaupt Schlagwörter zum Prüfen?
 * @property {'richtig'|'teilweise'|'falsch'|null} bewertung
 *           Automatische Einschätzung; null, wenn keine Schlagwörter hinterlegt
 *           sind (dann muss der/die Lernende selbst einschätzen).
 */

/**
 * Prüft eine Freitext-Antwort gegen eine Liste von Schlagwörtern.
 *
 * @param {string} antwortText  Freitext der/des Lernenden.
 * @param {Schluesselwort[]} schluesselwoerter
 * @param {Object} [optionen]
 * @param {number} [optionen.schwelleRichtig=0.8]   Ab dieser Quote „richtig" (wenn Pflicht erfüllt).
 * @param {number} [optionen.schwelleTeilweise=0.4] Ab dieser Quote „teilweise".
 * @param {number} [optionen.erforderlich]  „Nennen Sie N …": Bei gesetztem Wert
 *        zählt die *Trefferzahl* (≥ N = richtig), nicht der Anteil aller Optionen.
 *        Dann ist die Schlagwortliste eine Auswahl gleichwertiger Antworten, von
 *        denen N genügen. Wird auf die Listenlänge begrenzt.
 * @returns {AntwortErgebnis}
 */
export function pruefeAntwort(antwortText, schluesselwoerter, optionen = {}) {
  const { schwelleRichtig = 0.8, schwelleTeilweise = 0.4, erforderlich } = optionen;
  const textNorm = normalisiere(antwortText);
  const eintraege = Array.isArray(schluesselwoerter)
    ? schluesselwoerter.map(normalisiereEintrag).filter((e) => e.varianten.length > 0)
    : [];

  const alle = eintraege.map((e) => ({
    label: e.label,
    begriff: e.begriff,
    pflicht: e.pflicht,
    getroffen: textNorm.length > 0 && e.varianten.some((v) => begriffTrifft(textNorm, v)),
  }));

  const treffer = alle.filter((t) => t.getroffen);
  const fehlend = alle.filter((t) => !t.getroffen);
  const gesamt = alle.length;
  const anzahl = treffer.length;
  const quote = gesamt > 0 ? anzahl / gesamt : 0;
  const pflichtErfuellt = alle.every((t) => !t.pflicht || t.getroffen);
  const hatSchluesselwoerter = gesamt > 0;

  // „Nennen Sie N …"-Modus: Zielanzahl an Treffern (auf Listenlänge begrenzt).
  const ziel =
    Number.isFinite(erforderlich) && erforderlich > 0 ? Math.min(erforderlich, gesamt) : null;

  /** @type {'richtig'|'teilweise'|'falsch'|null} */
  let bewertung = null;
  if (hatSchluesselwoerter) {
    if (ziel != null) {
      // Anzahl gleichwertiger Treffer zählt – nicht der Anteil aller Optionen.
      if (anzahl >= ziel && pflichtErfuellt) bewertung = 'richtig';
      else if (anzahl >= 1) bewertung = 'teilweise';
      else bewertung = 'falsch';
    } else if (quote >= schwelleRichtig && pflichtErfuellt) {
      bewertung = 'richtig';
    } else if (quote >= schwelleTeilweise) {
      bewertung = 'teilweise';
    } else {
      bewertung = 'falsch';
    }
  }

  return {
    treffer,
    fehlend,
    alle,
    anzahl,
    gesamt,
    quote,
    erforderlich: ziel,
    pflichtErfuellt,
    hatSchluesselwoerter,
    bewertung,
  };
}
