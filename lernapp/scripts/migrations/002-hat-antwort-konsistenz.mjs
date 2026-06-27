#!/usr/bin/env node
/**
 * Migration 002 — Konsistenz `hat_antwort` ⇔ vorhandene Lösung.
 *
 * Einige Fragen trugen `hat_antwort: true`, hatten aber einen **leeren**
 * `loesung_text`. In Quiz/Klausur erschien dann eine leere „Musterlösung"-Box
 * (sah aus wie ein Bug). Diese Migration erzwingt die Invariante:
 *
 *     hat_antwort === (loesung_text ist nicht leer)
 *
 * So zeigt die UI ehrlich „Keine Lösung hinterlegt" statt einer leeren Box –
 * und umgekehrt wird eine vorhandene (auch unverifizierte/KI-)Lösung angezeigt.
 * Kontext-Blöcke (`ist_kontext_block`) bleiben unangetastet.
 *
 * Idempotent. Format byte-kompatibel (JSON.stringify, 2 Spaces, kein Trailing-NL).
 *
 * Aufruf:  node scripts/migrations/002-hat-antwort-konsistenz.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

let changed = 0;
for (const exam of data.exams || []) {
  for (const f of exam.fragen || []) {
    if (f.ist_kontext_block) continue;
    const hatLoesung = !!(f.loesung_text && String(f.loesung_text).trim());
    if (Boolean(f.hat_antwort) !== hatLoesung) {
      f.hat_antwort = hatLoesung;
      changed += 1;
    }
  }
}

if (changed === 0) {
  console.log('Migration 002: nichts zu tun (bereits konsistent).');
  process.exit(0);
}

writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(`Migration 002 angewendet: ${changed} Frage(n) auf hat_antwort-Konsistenz korrigiert.`);
