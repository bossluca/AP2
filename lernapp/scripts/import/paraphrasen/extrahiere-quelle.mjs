#!/usr/bin/env node
/**
 * Extrahiert je AP1-Prüfung die paraphrasierbaren Einträge aus `exam_data.json`
 * nach `_quelle/<slug>.json` – die **Arbeitsgrundlage** fürs Paraphrasieren.
 *
 * Diese `_quelle/`-Dateien enthalten den (urheberrechtlich geschützten) Original-
 * text und sind daher **gitignored** – sie sind nur lokales Zwischenmaterial.
 * Das Ergebnis des Paraphrasierens liegt je Prüfung in `<slug>.json` (eigene,
 * neu formulierte Inhalte) und wird via `apply-paraphrasen.mjs` eingespielt.
 *
 * Aufruf:  node scripts/import/paraphrasen/extrahiere-quelle.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', '..', 'src', 'data', 'exam_data.json');

/** Prüfung → stabiler Dateiname-Slug. */
export function examSlug(meta) {
  const saison = String(meta.saison || '')
    .replace(/ü/g, 'ue')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/[^A-Za-z0-9]/g, '');
  return `${meta.jahr}_${saison}`;
}

function main() {
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const ap1 = data.exams.filter((e) => e?.meta?.pruefungsteil === 'AP1');

  for (const e of ap1) {
    const slug = examSlug(e.meta);
    const eintraege = e.fragen.map((f) => ({
      id: f.id,
      ist_kontext_block: !!f.ist_kontext_block,
      aufgabe_nr: f.aufgabe_nr ?? null,
      aufgabe_titel: f.aufgabe_titel ?? null,
      teilfrage: f.teilfrage ?? null,
      ueberschrift: f.ueberschrift ?? '',
      punkte: f.punkte ?? null,
      thema_tags: f.thema_tags ?? [],
      hat_loesung: !!(f.loesung_text && f.loesung_text.trim()),
      frage_text: f.frage_text ?? '',
      loesung_text: f.loesung_text ?? '',
    }));
    const out = {
      slug,
      meta: { jahr: e.meta.jahr, saison: e.meta.saison, titel: e.meta.titel },
      anzahl: eintraege.length,
      eintraege,
    };
    const ziel = join(__dirname, '_quelle', `${slug}.json`);
    writeFileSync(ziel, JSON.stringify(out, null, 2), 'utf8');
    console.log(`  ${slug}.json: ${eintraege.length} Einträge`);
  }
  console.log(`Quelle extrahiert: ${ap1.length} AP1-Prüfungen → _quelle/`);
}

// Nur ausführen, wenn direkt aufgerufen – nicht beim Import von `examSlug`.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
