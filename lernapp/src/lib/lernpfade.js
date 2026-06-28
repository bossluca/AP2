/**
 * Lernpfade – ein **geführter, fortschrittsbasierter Lernweg** über die
 * Lernzettel. Die AP1-Lernzettel tragen bereits eine saubere, nummerierte
 * Kurs-Struktur in `kategorie` (z. B. „1. Grundlagen" … „11. IT-Sicherheit").
 * Daraus werden geordnete **Pfade** (= Nummern-Kategorie) mit ihren **Modulen**
 * (= einzelne Lerneinheiten) abgeleitet und je Modul/Pfad eine Mastery (0..1)
 * sowie ein Status berechnet (fertig / aktiv / offen).
 *
 * Reine, React-freie Funktion (Mastery-Quelle + `now` injizierbar) → testbar.
 * Mastery je Lerneinheit kommt aus der bestehenden FSRS-Abrufwahrscheinlichkeit
 * (`reife.objektMastery`), die Schwelle „fertig" ist `READY_SCHWELLE` (0.8).
 *
 * Bewusst **keine harten Sperren**: echter Lernstoff bleibt immer zugänglich.
 * Der Status `aktiv` markiert nur das erste noch-nicht-fertige Modul (für den
 * „weiter hier"-Fokus); spätere Module sind `offen` (optisch gedämpft, aber
 * anklickbar).
 */

import { objektMastery, READY_SCHWELLE } from './reife';

/** Ab dieser Mastery (0..1) **oder** Status „gelernt" gilt ein Modul als fertig. */
export { READY_SCHWELLE };

/**
 * Lucide-Icon-Name je Pfad-Nummer (1..11 = AP1-Kurskapitel). Fällt auf ein
 * generisches Icon zurück, damit neue/unerwartete Nummern nicht crashen.
 */
const PFAD_ICONS = {
  1: 'BookOpen', // Grundlagen
  2: 'Cpu', // Hardware
  3: 'AppWindow', // Software
  4: 'Settings', // Installation und Konfiguration
  5: 'FileBadge', // Lizenzen
  6: 'LineChart', // Wirtschaft
  7: 'ClipboardList', // Projektmanagement
  8: 'Code2', // Software-Entwicklung
  9: 'LifeBuoy', // Support
  10: 'BadgeCheck', // Qualitätsmanagement
  11: 'ShieldCheck', // IT-Sicherheit und Datenschutz
};

const STANDARD_ICON = 'GraduationCap';

/** Zerlegt „7. Projektmanagement" → { nummer: 7, titel: 'Projektmanagement' } oder null. */
function parseKategorie(kategorie) {
  const m = /^(\d+)\.\s*(.+)$/.exec(kategorie || '');
  if (!m) return null;
  return { nummer: Number(m[1]), titel: m[2].trim() };
}

/**
 * @typedef {Object} Modul
 * @property {string}  id        Stabile Modul-ID (= Lerneinheit-ID, zugleich Fortschritts-Key).
 * @property {string}  einheitId Lerneinheit-ID (für Navigation zur Lernzettel-Ansicht).
 * @property {string}  titel
 * @property {number}  mastery   0..1.
 * @property {boolean} fertig    mastery ≥ Schwelle oder Status „gelernt".
 * @property {'fertig'|'aktiv'|'offen'} status
 */

/**
 * @typedef {Object} Lernpfad
 * @property {string}  id        Slug (z. B. „pfad-07").
 * @property {number}  nummer    Reihenfolge (Kapitel-Nummer).
 * @property {string}  titel
 * @property {string}  icon      Lucide-Icon-Name.
 * @property {Modul[]} module    In Daten-Reihenfolge.
 * @property {number}  n         Anzahl Module.
 * @property {number}  fertigeModule
 * @property {number}  mastery   0..1 (Mittel über die Module).
 * @property {boolean} erledigt  Alle Module fertig.
 * @property {Modul|null} aktivesModul  Erstes nicht-fertiges Modul (oder null, wenn erledigt).
 */

/** Status „gelernt" zählt – auch ohne FSRS-Beleg – als fertig (Nutzer-Markierung). */
function modulFertig(mastery, entry) {
  return mastery >= READY_SCHWELLE || entry?.status === 'gelernt';
}

/**
 * Baut die geordneten Lernpfade aus den Lerneinheiten + Fortschritt.
 *
 * @param {import('../data/useExamData').Lerneinheit[]} lerneinheiten
 * @param {Object.<string, any>} progress  Map Einheit-ID → Fortschritt.
 * @param {Date} [now]
 * @returns {Lernpfad[]}  Aufsteigend nach Kapitel-Nummer.
 */
export function baueLernpfade(lerneinheiten, progress = {}, now = new Date()) {
  const proNummer = new Map(); // nummer -> { titel, module: Modul[] }

  for (const e of lerneinheiten || []) {
    const k = parseKategorie(e.kategorie);
    if (!k) continue; // nur die nummerierte Kurs-Struktur bildet Pfade
    const entry = progress[e.id];
    const mastery = objektMastery(entry, now);
    const modul = {
      id: e.id,
      einheitId: e.id,
      titel: e.titel,
      mastery,
      fertig: modulFertig(mastery, entry),
      status: 'offen', // wird unten finalisiert
    };
    const bucket = proNummer.get(k.nummer) || { titel: k.titel, module: [] };
    bucket.module.push(modul);
    proNummer.set(k.nummer, bucket);
  }

  const pfade = [...proNummer.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([nummer, bucket]) => {
      const module = bucket.module;
      let aktivGesetzt = false;
      let aktivesModul = null;
      for (const m of module) {
        if (m.fertig) {
          m.status = 'fertig';
        } else if (!aktivGesetzt) {
          m.status = 'aktiv';
          aktivGesetzt = true;
          aktivesModul = m;
        } else {
          m.status = 'offen';
        }
      }
      const fertigeModule = module.filter((m) => m.fertig).length;
      const mastery =
        module.length > 0
          ? module.reduce((s, m) => s + m.mastery, 0) / module.length
          : 0;
      return {
        id: `pfad-${String(nummer).padStart(2, '0')}`,
        nummer,
        titel: bucket.titel,
        icon: PFAD_ICONS[nummer] || STANDARD_ICON,
        module,
        n: module.length,
        fertigeModule,
        mastery,
        erledigt: module.length > 0 && fertigeModule === module.length,
        aktivesModul,
      };
    });

  return pfade;
}

/** Sucht einen Pfad per Slug-ID (für die Detail-Route). */
export function findePfad(pfade, id) {
  return (pfade || []).find((p) => p.id === id) || null;
}
