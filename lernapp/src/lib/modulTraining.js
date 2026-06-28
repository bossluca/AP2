/**
 * Modul-Training – baut aus **einem Lernpfad-Modul** (= einer Lerneinheit) eine
 * kurze, gemischte Übungs-Session aus drei Schritt-Typen:
 *
 *   1. `lernzettel` – die Lerneinheit selbst als Flip-Karte (Lesen + Verstehen),
 *   2. `cloze`      – Lückentexte, automatisch aus dem Lernzettel (`lib/glossar`),
 *   3. `frage`      – passende Prüfungsfragen (über gemeinsame `thema_tags`).
 *
 * So wird aus „Lernzettel aufklappen" ein echter abschließbarer Lern-Loop: der
 * Nutzer arbeitet N Schritte durch und bekommt am Ende ein Ergebnis. Die Naht
 * ist klein (`baueModulTraining(...) → Schritt[]`), die Logik (Quellen finden,
 * mischen, begrenzen, deduplizieren) liegt dahinter.
 *
 * Rein + React-frei: alle Quellen und der RNG werden injiziert → testbar. Der
 * Lernzettel-Schritt steht **immer zuerst** (erst lesen, dann abrufen); Cloze
 * und Fragen werden gemischt dahinter eingereiht.
 */

import { clozeAusText } from './glossar';
import { shuffle } from './shuffle';

/** Standard-Obergrenzen je Quelle (zusammen ≈ 8–10 Schritte). */
export const STANDARD_TRAINING = {
  maxCloze: 4,
  maxFragen: 5,
};

/**
 * @typedef {Object} TrainingSchritt
 * @property {'lernzettel'|'cloze'|'frage'} typ
 * @property {string} id     Stabile Schritt-ID (für React-Key + Fortschritt).
 * @property {string[]} tags Themen-Tags (Anzeige).
 */

/**
 * Findet Prüfungsfragen, die thematisch zum Modul passen: gemeinsame
 * `thema_tags` mit der Lerneinheit. Kontextblöcke und Fragen ohne Lösung
 * fließen nicht ein (ein Training soll auswertbar sein).
 *
 * @param {string[]} modulTags
 * @param {import('../data/useExamData').Question[]} alleFragen
 * @returns {import('../data/useExamData').Question[]}
 */
function passendeFragen(modulTags, alleFragen) {
  const tagSet = new Set(modulTags || []);
  if (tagSet.size === 0) return [];
  return (alleFragen || []).filter(
    (f) =>
      !f.ist_kontext_block &&
      f.hat_antwort &&
      (f.thema_tags || []).some((t) => tagSet.has(t))
  );
}

/**
 * Baut die Trainings-Schritte für ein Modul.
 *
 * @param {import('../data/useExamData').Lerneinheit} lerneinheit  Das Modul.
 * @param {Object} quellen
 * @param {import('../data/useExamData').Question[]} quellen.alleFragen  Alle (lernbaren) Prüfungsfragen.
 * @param {Object} [optionen]
 * @param {number} [optionen.maxCloze]
 * @param {number} [optionen.maxFragen]
 * @param {() => number} [optionen.rng]  Zufallsquelle (für Mischen) – injizierbar.
 * @returns {TrainingSchritt[]}
 */
export function baueModulTraining(lerneinheit, { alleFragen } = {}, optionen = {}) {
  const { maxCloze = STANDARD_TRAINING.maxCloze, maxFragen = STANDARD_TRAINING.maxFragen, rng } =
    optionen;
  if (!lerneinheit) return [];

  const tags = lerneinheit.thema_tags || [];

  // 1) Lernzettel-Karte (immer zuerst) -------------------------------------
  const lernzettelSchritt = {
    typ: 'lernzettel',
    id: `mt_lz_${lerneinheit.id}`,
    tags,
    titel: lerneinheit.titel,
    front: `**${lerneinheit.titel}**`,
    back: lerneinheit.inhalt_text,
  };

  // 2) Cloze aus dem Lernzettel --------------------------------------------
  const clozeItems = clozeAusText(lerneinheit.inhalt_text, {
    tags,
    quelle: lerneinheit.titel,
  });
  const clozeSchritte = shuffle(clozeItems, rng)
    .slice(0, maxCloze)
    .map((c, i) => ({
      typ: 'cloze',
      id: `mt_cl_${lerneinheit.id}_${i}`,
      tags: c.tags,
      text: c.text,
      quelle: c.quelle,
    }));

  // 3) Prüfungsfragen über gemeinsame Tags ---------------------------------
  const frageSchritte = shuffle(passendeFragen(tags, alleFragen), rng)
    .slice(0, maxFragen)
    .map((f) => ({
      typ: 'frage',
      id: f.id, // echte Frage-ID → SRS-Fortschritt landet am richtigen Objekt
      tags: f.thema_tags || [],
      frage: f,
    }));

  // Abruf-Schritte mischen, Lernzettel bleibt vorne.
  const abruf = shuffle([...clozeSchritte, ...frageSchritte], rng);
  return [lernzettelSchritt, ...abruf];
}

/**
 * Verdichtet die je-Schritt-Ergebnisse zu einer Modul-Auswertung.
 *
 * @param {('richtig'|'teilweise'|'falsch')[]} ergebnisse
 * @returns {{anzahl:number, richtig:number, teilweise:number, falsch:number,
 *            prozent:number, bestanden:boolean}}
 */
export function werteTrainingAus(ergebnisse, schwelle = 0.8) {
  const anzahl = ergebnisse.length;
  let punkte = 0;
  let richtig = 0;
  let teilweise = 0;
  for (const e of ergebnisse) {
    if (e === 'richtig') {
      punkte += 1;
      richtig += 1;
    } else if (e === 'teilweise') {
      punkte += 0.5;
      teilweise += 1;
    }
  }
  const prozent = anzahl > 0 ? Math.round((punkte / anzahl) * 100) : 0;
  return {
    anzahl,
    richtig,
    teilweise,
    falsch: anzahl - richtig - teilweise,
    prozent,
    bestanden: anzahl > 0 && prozent >= schwelle * 100,
  };
}
