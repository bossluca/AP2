#!/usr/bin/env node
/**
 * Spielt die **eigen-neu-formulierten** AP1-Aufgaben (`<slug>.json`) in
 * `exam_data.json` ein – idempotent. Vorher `npm run backup`.
 *
 * Hintergrund (DECISIONS.md ADR-007): Die Original-IHK/AKA-Aufgaben sind
 * urheberrechtlich geschützt. Die `<slug>.json`-Dateien enthalten **neu
 * formulierte** Aufgaben (gleiche Kompetenz/Thema, eigenes Szenario, eigener
 * Wortlaut) – KEINE Wort-für-Wort-Abwandlung. Beim Einspielen wird die Prüfung
 * als **paraphrasiert/KI-überarbeitet** markiert.
 *
 * Override je Eintrag-id (alle Felder optional):
 *   { frage_text, loesung_text, ueberschrift, thema_tags,
 *     schluesselwoerter, mindest_treffer }
 *
 * Aufruf:  node scripts/import/paraphrasen/apply-paraphrasen.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { examSlug } from './extrahiere-quelle.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', '..', 'src', 'data', 'exam_data.json');
const QUELLE_HINWEIS = 'KI-überarbeitet (neu formuliert, an Original-Prüfungsthema angelehnt)';

/** Lädt alle Paraphrase-Dateien (außer _quelle/) als { slug → {id → override} }. */
function ladeParaphrasen() {
  const dateien = readdirSync(__dirname).filter(
    (f) => f.endsWith('.json') && !f.startsWith('_')
  );
  const bySlug = {};
  for (const f of dateien) {
    const inhalt = JSON.parse(readFileSync(join(__dirname, f), 'utf8'));
    const slug = inhalt.slug || f.replace(/\.json$/, '');
    bySlug[slug] = inhalt.eintraege || {};
  }
  return bySlug;
}

const istLeer = (v) => v == null || (typeof v === 'string' && v.trim() === '');

function main() {
  if (!existsSync(DATA_FILE)) {
    console.error(`FEHLER: ${DATA_FILE} fehlt.`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const bySlug = ladeParaphrasen();
  if (Object.keys(bySlug).length === 0) {
    console.error('FEHLER: keine Paraphrase-Dateien gefunden (paraphrasen/<slug>.json).');
    process.exit(1);
  }

  let geaendert = 0;
  let pruefungen = 0;
  for (const e of data.exams) {
    if (e?.meta?.pruefungsteil !== 'AP1') continue;
    const slug = examSlug(e.meta);
    const overrides = bySlug[slug];
    if (!overrides) continue;
    pruefungen++;

    let inPruefung = 0;
    for (const f of e.fragen) {
      const o = overrides[f.id];
      if (!o) continue;
      if (!istLeer(o.frage_text)) f.frage_text = o.frage_text;
      if (!istLeer(o.loesung_text)) {
        f.loesung_text = o.loesung_text;
        f.hat_antwort = true;
      }
      if (o.ueberschrift != null) f.ueberschrift = o.ueberschrift;
      if (Array.isArray(o.thema_tags) && o.thema_tags.length) f.thema_tags = o.thema_tags;
      if (Array.isArray(o.schluesselwoerter) && o.schluesselwoerter.length) {
        f.schluesselwoerter = o.schluesselwoerter;
      }
      if (Number.isFinite(o.mindest_treffer) && o.mindest_treffer > 0) {
        f.mindest_treffer = o.mindest_treffer;
      }
      // Original war offizielle IHK-Aufgabe → jetzt eigene Formulierung.
      f.hat_offizielle_loesung = false;
      f.unverifiziert_markiert = false;
      geaendert++;
      inPruefung++;
    }

    if (inPruefung > 0) {
      e.meta.paraphrasiert = true;
      e.meta.quelle = QUELLE_HINWEIS;
      e.meta.status = 'KI-überarbeitet – neu formuliert, nicht die offizielle IHK-Aufgabe';
    }
    console.log(`  ${slug}: ${inPruefung}/${e.fragen.length} Einträge eingespielt`);
  }

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Paraphrasen eingespielt: ${geaendert} Einträge in ${pruefungen} Prüfungen.`);
}

main();
