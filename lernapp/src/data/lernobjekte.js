import { getLearnableQuestions, getLerneinheiten } from './useExamData';

/**
 * Vereinheitlichte Sicht auf alle lernbaren Objekte: Prüfungsfragen UND
 * Lernzettel-Einheiten in einer gemeinsamen „Lernobjekt"-Struktur. Damit können
 * Wiederholen-Modus, Statistik und Suche beide Inhaltsarten gleich behandeln.
 *
 * @typedef {Object} Lernobjekt
 * @property {string}  id            Fortschritts-Schlüssel (Frage- bzw. Einheit-ID).
 * @property {'frage'|'lernzettel'} art
 * @property {'AP1'|'AP2'} pruefungsteil
 * @property {string}  titel         Kurzlabel.
 * @property {string}  kategorie     Frage: "Prüfung <Saison> <Jahr>"; Lernzettel: Kategorie.
 * @property {string[]} tags         Themen-Tags.
 * @property {string}  front         Markdown-Vorderseite (Frage bzw. Titel).
 * @property {string|null} back      Markdown-Rückseite (Lösung bzw. Inhalt) oder null.
 * @property {boolean} hatLoesung    Ob eine Rückseite/Lösung vorhanden ist.
 * @property {boolean} [unverifiziert] Nur Fragen: Lösung unverifiziert.
 */

/** @type {Lernobjekt[]|null} */
let _cache = null;

/** Wandelt eine Prüfungsfrage in ein Lernobjekt. */
function fromFrage(q) {
  const front = q.ueberschrift ? `**${q.ueberschrift}**\n\n${q.frage_text}` : q.frage_text;
  return {
    id: q.id,
    art: 'frage',
    pruefungsteil: q.pruefungsteil || 'AP1',
    titel: q.ueberschrift || `Aufgabe ${q.aufgabe_nr}${q.teilfrage ? ` ${q.teilfrage}` : ''}`,
    kategorie: `Prüfung ${q.saison} ${q.jahr}`,
    tags: q.thema_tags || [],
    front,
    back: q.hat_antwort ? q.loesung_text : null,
    hatLoesung: !!q.hat_antwort,
    unverifiziert: !!q.unverifiziert_markiert,
  };
}

/** Wandelt eine Lernzettel-Einheit in ein Lernobjekt. */
function fromLerneinheit(l) {
  return {
    id: l.id,
    art: 'lernzettel',
    pruefungsteil: l.pruefungsteil || 'AP1',
    titel: l.titel,
    kategorie: l.kategorie || 'Lernzettel',
    tags: l.thema_tags || [],
    front: `**${l.titel}**`,
    back: l.inhalt_text,
    hatLoesung: true,
  };
}

/**
 * Alle Lernobjekte (Fragen + Lernzettel), memoisiert.
 * @returns {Lernobjekt[]}
 */
export function getLernobjekte() {
  if (_cache) return _cache;
  _cache = [
    ...getLearnableQuestions().map(fromFrage),
    ...getLerneinheiten().map(fromLerneinheit),
  ];
  return _cache;
}

/** Standardfilter für Lernobjekte. */
export const defaultLernfilter = {
  art: 'alle', // 'alle' | 'frage' | 'lernzettel'
  pruefungsteil: 'alle', // 'alle' | 'AP1' | 'AP2'
  kategorie: 'alle',
  tag: 'alle',
  status: 'alle', // 'alle' | 'neu' | 'ueben' | 'gelernt'
  nurFaellig: false,
  query: '',
};

/**
 * Reiner Filter über Lernobjekte. `getStatus`/`isDue` werden injiziert, damit
 * die Funktion React-frei und testbar bleibt.
 * @param {Lernobjekt[]} objekte
 * @param {typeof defaultLernfilter} f
 * @param {{getStatus:(id:string)=>string|null, isDue:(id:string)=>boolean}} helpers
 * @returns {Lernobjekt[]}
 */
export function filterLernobjekte(objekte, f, { getStatus, isDue }) {
  const q = (f.query || '').trim().toLowerCase();
  return objekte.filter((o) => {
    if (f.art !== 'alle' && o.art !== f.art) return false;
    if (f.pruefungsteil !== 'alle' && o.pruefungsteil !== f.pruefungsteil) return false;
    if (f.kategorie !== 'alle' && o.kategorie !== f.kategorie) return false;
    if (f.tag !== 'alle' && !o.tags.includes(f.tag)) return false;
    if (f.status !== 'alle') {
      const s = getStatus(o.id);
      if (f.status === 'neu' && s) return false;
      if (f.status !== 'neu' && s !== f.status) return false;
    }
    if (f.nurFaellig && !isDue(o.id)) return false;
    if (q && !`${o.titel} ${o.front} ${o.back || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
