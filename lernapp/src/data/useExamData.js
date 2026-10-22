import { holeExamDaten } from './examDaten';

/**
 * @typedef {Object} ExamMeta
 * @property {number} jahr        Prüfungsjahr, z. B. 2022.
 * @property {string} saison      "Frühjahr" oder "Herbst".
 * @property {string} fachrichtung
 * @property {string} teil
 * @property {string} titel
 * @property {string} [datum]
 * @property {string} [dauer]
 * @property {number} [punkte_gesamt]
 * @property {'AP1'|'AP2'} [pruefungsteil]  Prüfungsteil (Default "AP1", s. Migration 001).
 */

/**
 * @typedef {Object} Question
 * @property {string}   id              Eindeutige ID, z. B. "2022_Frühjahr_1a".
 * @property {number}   jahr
 * @property {string}   saison
 * @property {number}   aufgabe_nr
 * @property {string|null} aufgabe_titel
 * @property {string}   teilfrage
 * @property {string}   ueberschrift
 * @property {string}   frage_text      Markdown.
 * @property {number|null} punkte
 * @property {string|null} loesung_text Markdown.
 * @property {boolean}  hat_antwort     true, wenn eine Lösung hinterlegt ist.
 * @property {boolean}  hat_offizielle_loesung
 * @property {boolean}  unverifiziert_markiert
 * @property {string[]} thema_tags
 * @property {boolean}  ist_kontext_block  true = reiner Einleitungs-/Situationstext (keine eigene Frage).
 * @property {ExamMeta} examMeta        Zugehörige Prüfungs-Metadaten (angereichert).
 * @property {'AP1'|'AP2'} pruefungsteil  Aus examMeta gespiegelt (angereichert, für Filter).
 * @property {number}   [schwierigkeit] Optional 1–3 (leicht/mittel/schwer).
 * @property {string}   [kategorie]     Optionale Kategorie (für Lernzettel/Themenbündel).
 * @property {string}   [quelle]        Optionale Herkunft (z. B. Dateiname/Prüfung).
 * @property {import('../lib/antwortpruefung').Schluesselwort[]} [schluesselwoerter]
 *           Optionale Schlagwörter zur flexiblen Freitext-Prüfung im Klausur-Modus.
 *           Siehe `docs/FRAGEN_SCHEMA.md`. Ohne dieses Feld greift reine
 *           Selbsteinschätzung.
 */

/**
 * @typedef {Object} Lerneinheit
 * @property {string}   id            Eindeutige ID, z. B. "lz_netzwerk_osi".
 * @property {string}   titel
 * @property {string}   inhalt_text   Markdown.
 * @property {string}   [kategorie]
 * @property {string[]} [thema_tags]
 * @property {string}   [quelle]
 * @property {'AP1'|'AP2'} [pruefungsteil]
 */

// --- Modul-Level-Cache -------------------------------------------------------
// Die Quelldaten werden seit C9 erst nach dem Login dynamisch geladen
// (`./examDaten.js`). Die abgeleiteten Listen werden je geladener Quelle genau
// einmal berechnet und danach aus dem Cache geliefert. Solange nichts geladen
// ist, liefern die Selektoren leere Listen (ohne zu cachen).

/** Quelle, für die die Caches gelten. */
let _quelle = null;

/**
 * Aktuelle Daten (leerer Stand, solange nicht geladen); setzt die Caches
 * zurück, wenn sich die Quelle geändert hat.
 */
function daten() {
  const d = holeExamDaten();
  if (d !== _quelle) {
    _quelle = d;
    _allQuestions = null;
    _allTags = null;
    _allExams = null;
    _allLerneinheiten = null;
    _klausuren = null;
  }
  return d || { exams: [], lerneinheiten: [] };
}

/** @type {Question[]|null} */
let _allQuestions = null;
/** @type {string[]|null} */
let _allTags = null;
/** @type {ExamMeta[]|null} */
let _allExams = null;
/** @type {Lerneinheit[]|null} */
let _allLerneinheiten = null;

/**
 * Liefert alle Fragen aller Prüfungen als flache Liste, angereichert um `examMeta`.
 * Ergebnis ist memoisiert (Modul-Cache) und sollte nicht mutiert werden.
 * @returns {Question[]}
 */
export function getAllQuestions() {
  const examData = daten();
  if (_allQuestions) return _allQuestions;
  const all = [];
  for (const exam of examData.exams) {
    for (const frage of exam.fragen) {
      all.push({
        ...frage,
        examMeta: exam.meta,
        // pruefungsteil aus den Metadaten spiegeln, damit Filter direkt darauf
        // zugreifen können (Default "AP1" für Altbestand ohne explizites Feld).
        pruefungsteil: frage.pruefungsteil ?? exam.meta.pruefungsteil ?? 'AP1',
      });
    }
  }
  if (_quelle) _allQuestions = all;
  return all;
}

/**
 * Liefert alle echten (lernbaren) Fragen – ohne reine Kontext-/Situationsblöcke.
 * @returns {Question[]}
 */
export function getLearnableQuestions() {
  return getAllQuestions().filter((q) => !q.ist_kontext_block);
}

/**
 * Alle im Datensatz vorkommenden Themen-Tags, alphabetisch sortiert.
 * @returns {string[]}
 */
export function getAllTags() {
  daten();
  if (_allTags) return _allTags;
  const tags = new Set();
  for (const q of getAllQuestions()) {
    for (const t of q.thema_tags) tags.add(t);
  }
  const liste = Array.from(tags).sort((a, b) => a.localeCompare(b, 'de'));
  if (_quelle) _allTags = liste;
  return liste;
}

/**
 * Metadaten aller Prüfungstermine in Datensatz-Reihenfolge.
 * @returns {ExamMeta[]}
 */
export function getAllExams() {
  const examData = daten();
  if (_allExams) return _allExams;
  const liste = examData.exams.map((e) => e.meta);
  if (_quelle) _allExams = liste;
  return liste;
}

/**
 * Alle im Datensatz vorkommenden Prüfungsteile ("AP1", "AP2"), sortiert.
 * @returns {string[]}
 */
export function getAllPruefungsteile() {
  const examData = daten();
  const teile = new Set();
  for (const e of examData.exams) teile.add(e.meta.pruefungsteil ?? 'AP1');
  for (const l of getLerneinheiten()) if (l.pruefungsteil) teile.add(l.pruefungsteil);
  return Array.from(teile).sort();
}

/**
 * @typedef {Object} Klausur
 * @property {ExamMeta} meta
 * @property {'AP1'|'AP2'} pruefungsteil
 * @property {Question[]} fragen   Lernbare Fragen (ohne reine Kontextblöcke), je
 *           angereichert um `kontextText` (Situationstext der zugehörigen Aufgabe).
 * @property {number} punkteGesamt Summe der Fragepunkte (0, wenn keine gepflegt).
 */

/** @type {Klausur[]|null} */
let _klausuren = null;

/**
 * Liefert die Prüfungstermine als „Klausuren": je ein Termin mit seinen lernbaren
 * Fragen in Original-Reihenfolge. Reine Kontext-/Situationsblöcke werden nicht als
 * eigene Frage geführt, sondern als `kontextText` an die Fragen derselben Aufgabe
 * gehängt. Termine ohne lernbare Fragen entfallen.
 * @returns {Klausur[]}
 */
export function getKlausuren() {
  const examData = daten();
  if (_klausuren) return _klausuren;
  const klausuren = examData.exams
    .map((exam) => {
      // Kontextblöcke je Aufgabe sammeln, um sie als Situationstext anzuzeigen.
      const kontextNachAufgabe = new Map();
      for (const f of exam.fragen) {
        if (f.ist_kontext_block) {
          const liste = kontextNachAufgabe.get(f.aufgabe_nr) || [];
          liste.push(f.frage_text);
          kontextNachAufgabe.set(f.aufgabe_nr, liste);
        }
      }
      const teil = exam.meta.pruefungsteil ?? 'AP1';
      const fragen = exam.fragen
        .filter((f) => !f.ist_kontext_block)
        .map((f) => ({
          ...f,
          examMeta: exam.meta,
          pruefungsteil: f.pruefungsteil ?? teil,
          kontextText: (kontextNachAufgabe.get(f.aufgabe_nr) || []).join('\n\n') || null,
        }));
      const punkteGesamt = fragen.reduce((s, f) => s + (f.punkte || 0), 0);
      return { meta: exam.meta, pruefungsteil: teil, fragen, punkteGesamt };
    })
    .filter((k) => k.fragen.length > 0);
  if (_quelle) _klausuren = klausuren;
  return klausuren;
}

/**
 * Lernzettel/Cheatsheets (getrennt von den Prüfungsfragen).
 * Liefert ein leeres Array, solange keine Lerneinheiten gepflegt sind.
 * @returns {Lerneinheit[]}
 */
export function getLerneinheiten() {
  const examData = daten();
  if (_allLerneinheiten) return _allLerneinheiten;
  const liste = Array.isArray(examData.lerneinheiten) ? examData.lerneinheiten : [];
  if (_quelle) _allLerneinheiten = liste;
  return liste;
}
