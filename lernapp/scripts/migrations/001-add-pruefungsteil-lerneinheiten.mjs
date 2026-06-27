#!/usr/bin/env node
/**
 * Migration 001 — Datenmodell additiv erweitern (rückwärtskompatibel).
 *
 * 1. Ergänzt jedes `exam.meta` um `pruefungsteil` (Default "AP1", da alle
 *    bestehenden Prüfungen Teil 1 / GA1 sind). Spätere AP2-Prüfungen tragen "AP2".
 * 2. Ergänzt eine Top-Level-Liste `lerneinheiten` (Lernzettel/Cheatsheets),
 *    getrennt von den Prüfungsfragen.
 *
 * Idempotent: bereits vorhandene Felder werden nicht überschrieben.
 * Format bleibt byte-kompatibel (JSON.stringify mit 2 Spaces, kein Trailing-NL).
 *
 * Aufruf:  node scripts/migrations/001-add-pruefungsteil-lerneinheiten.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const raw = readFileSync(DATA_FILE, 'utf8');
const data = JSON.parse(raw);

let changed = 0;
for (const exam of data.exams) {
  if (exam.meta && exam.meta.pruefungsteil == null) {
    exam.meta.pruefungsteil = 'AP1';
    changed += 1;
  }
}
if (!Array.isArray(data.lerneinheiten)) {
  data.lerneinheiten = [];
  changed += 1;
}

if (changed === 0) {
  console.log('Migration 001: nichts zu tun (bereits angewendet).');
  process.exit(0);
}

// Ohne Trailing-Newline schreiben, um das bestehende Dateiformat exakt zu treffen.
writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`Migration 001 angewendet: ${changed} Änderung(en) geschrieben.`);
