#!/usr/bin/env node
/**
 * Sichert und validiert `src/data/exam_data.json`.
 *
 * Zweck (Auftragsvorgabe): vor jeder strukturellen Änderung an den Lerndaten ein
 * zeitgestempeltes Backup anlegen und die Grundstruktur prüfen, damit bestehende
 * Lerninhalte nicht verloren gehen.
 *
 * Aufruf:
 *   node scripts/backup-data.mjs            # validieren + Backup schreiben
 *   node scripts/backup-data.mjs --check    # nur validieren (kein Backup, CI-tauglich)
 *
 * Exit-Code 0 = ok, 1 = Validierung fehlgeschlagen.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', 'src', 'data', 'exam_data.json');
const BACKUP_DIR = join(__dirname, '..', 'data-backups');

const checkOnly = process.argv.includes('--check');

/** Pflichtfelder je Frage (additive Felder bleiben optional → rückwärtskompatibel). */
const REQUIRED_QUESTION_FIELDS = ['id', 'frage_text', 'ist_kontext_block'];

/**
 * Prüft die Grundstruktur und meldet alle gefundenen Probleme.
 * @param {unknown} data
 * @returns {string[]} Liste der Fehlermeldungen (leer = ok).
 */
function validate(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || !Array.isArray(data.exams)) {
    errors.push('Top-Level: "exams" fehlt oder ist kein Array.');
    return errors;
  }

  // Lerneinheiten (optional, additiv): Grundfelder + eindeutige IDs prüfen.
  if (data.lerneinheiten != null) {
    if (!Array.isArray(data.lerneinheiten)) {
      errors.push('"lerneinheiten" ist kein Array.');
    } else {
      const leIds = new Set();
      data.lerneinheiten.forEach((l, li) => {
        for (const field of ['id', 'titel', 'inhalt_text']) {
          if (!l[field]) errors.push(`lerneinheiten[${li}]: Feld "${field}" fehlt/leer.`);
        }
        if (l.id != null) {
          if (leIds.has(l.id)) errors.push(`Doppelte Lerneinheit-ID: "${l.id}".`);
          leIds.add(l.id);
        }
      });
    }
  }

  const seenIds = new Set();
  data.exams.forEach((exam, ei) => {
    if (!exam.meta || typeof exam.meta !== 'object') {
      errors.push(`exams[${ei}]: "meta" fehlt.`);
    }
    if (!Array.isArray(exam.fragen)) {
      errors.push(`exams[${ei}]: "fragen" fehlt oder ist kein Array.`);
      return;
    }
    exam.fragen.forEach((q, qi) => {
      for (const field of REQUIRED_QUESTION_FIELDS) {
        if (!(field in q)) {
          errors.push(`exams[${ei}].fragen[${qi}]: Feld "${field}" fehlt.`);
        }
      }
      if (q.id != null) {
        if (seenIds.has(q.id)) errors.push(`Doppelte Frage-ID: "${q.id}".`);
        seenIds.add(q.id);
      }
    });
  });
  return errors;
}

/** Liefert eine kurze Kennzahl-Übersicht für die Konsole. */
function summarize(data) {
  let total = 0;
  let lernbar = 0;
  let mitLoesung = 0;
  const teile = new Set();
  for (const exam of data.exams) {
    teile.add(exam.meta?.pruefungsteil ?? 'unbekannt');
    for (const q of exam.fragen) {
      total += 1;
      if (!q.ist_kontext_block) lernbar += 1;
      if (q.hat_antwort) mitLoesung += 1;
    }
  }
  const lerneinheiten = Array.isArray(data.lerneinheiten) ? data.lerneinheiten.length : 0;
  return { exams: data.exams.length, total, lernbar, mitLoesung, lerneinheiten, teile: [...teile] };
}

function main() {
  let raw;
  try {
    raw = readFileSync(DATA_FILE, 'utf8');
  } catch (e) {
    console.error(`FEHLER: ${DATA_FILE} nicht lesbar: ${e.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`FEHLER: exam_data.json ist kein gültiges JSON: ${e.message}`);
    process.exit(1);
  }

  const errors = validate(data);
  if (errors.length) {
    console.error(`Validierung fehlgeschlagen (${errors.length} Problem(e)):`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  const s = summarize(data);
  console.log(
    `Validierung OK: ${s.exams} Prüfungen, ${s.total} Einträge ` +
      `(${s.lernbar} lernbar, ${s.mitLoesung} mit Lösung), ` +
      `${s.lerneinheiten} Lerneinheiten · Teile: ${s.teile.join(', ')}`
  );

  if (checkOnly) return;

  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = join(BACKUP_DIR, `exam_data.${stamp}.json`);
  writeFileSync(target, raw, 'utf8');

  const backups = readdirSync(BACKUP_DIR).filter((f) => f.startsWith('exam_data.'));
  console.log(`Backup geschrieben: data-backups/exam_data.${stamp}.json (${backups.length} insgesamt)`);
}

main();
