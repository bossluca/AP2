#!/usr/bin/env node
/**
 * Migration 003 — `schwierigkeit` (1 leicht · 2 mittel · 3 schwer) für alle
 * Prüfungsfragen befüllen, abgeleitet aus der offiziellen Punktzahl:
 *
 *     punkte ≤ 2 → 1 (leicht)   ·   3–4 → 2 (mittel)   ·   ≥ 5 → 3 (schwer)
 *
 * Begründung: In IHK-Klausuren korreliert die Punktzahl eng mit Umfang und
 * Anspruch einer Teilaufgabe (kurze Nennen-Fragen 1–2 P., Erklären 3–4 P.,
 * Rechnen/Konzipieren 5+ P.). Die Heuristik ist eine ehrliche Erstbelegung –
 * manuell gepflegte Werte werden **nie überschrieben** (idempotent, additiv).
 * Fragen ohne Punktzahl bleiben ohne Schwierigkeit. Kontext-Blöcke ausgenommen.
 *
 * Genutzt von FSRS (Initial-Schwierigkeit), Reife-Prognose und Filtern.
 *
 * Aufruf:  node scripts/migrations/003-schwierigkeit-aus-punkten.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

/** Punkte → Schwierigkeit (1–3); null, wenn keine sinnvolle Punktzahl. */
function schwierigkeitAusPunkten(punkte) {
  const p = Number(punkte);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (p <= 2) return 1;
  if (p <= 4) return 2;
  return 3;
}

const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

let gesetzt = 0;
const verteilung = { 1: 0, 2: 0, 3: 0 };
for (const exam of data.exams || []) {
  for (const f of exam.fragen || []) {
    if (f.ist_kontext_block) continue;
    if (f.schwierigkeit != null) continue; // manuell gepflegte Werte nie anfassen
    const s = schwierigkeitAusPunkten(f.punkte);
    if (s == null) continue;
    f.schwierigkeit = s;
    verteilung[s] += 1;
    gesetzt += 1;
  }
}

if (gesetzt === 0) {
  console.log('Migration 003: nichts zu tun (schwierigkeit bereits gesetzt).');
  process.exit(0);
}

writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
console.log(
  `Migration 003 angewendet: ${gesetzt} Fragen (leicht ${verteilung[1]} · mittel ${verteilung[2]} · schwer ${verteilung[3]}).`
);
