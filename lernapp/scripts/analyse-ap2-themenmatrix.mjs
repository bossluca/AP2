#!/usr/bin/env node
/**
 * Erzeugt eine reproduzierbare AP2-Abdeckungsmatrix aus Prüfungsfragen und
 * Lernzetteln. Ein stabiler Themenkatalog bündelt unterschiedliche historische
 * Tags/Kategorien über Suchmuster, ohne die Quelldaten umzuschreiben.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AP2_THEMEN } from '../src/lib/themen.js';

const hier = dirname(fileURLToPath(import.meta.url));
const root = join(hier, '..');
const dataFile = join(root, 'src', 'data', 'exam_data.json');
const outputFile = join(root, 'docs', 'AP2_THEMENMATRIX.md');

// Themenkatalog zentral in src/lib/themen.js (auch Einstufungstest/Lernplan).
const THEMEN = AP2_THEMEN.map((t) => [t.titel, t.muster]);

const norm = (wert) =>
  String(wert || '')
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function textFrage(frage) {
  return norm([
    frage.aufgabe_titel,
    frage.frage_text,
    frage.loesung_text,
    ...(frage.thema_tags || []),
    frage.kategorie,
  ].join(' '));
}

function textEinheit(einheit) {
  return norm([
    einheit.titel,
    einheit.inhalt,
    einheit.kategorie,
    ...(einheit.thema_tags || []),
  ].join(' '));
}

function passt(text, muster) {
  return muster.some((wort) => text.includes(norm(wort)));
}

const data = JSON.parse(readFileSync(dataFile, 'utf8'));
const exams = data.exams.filter((exam) => exam.meta?.pruefungsteil === 'AP2');
const fragen = exams.flatMap((exam) =>
  exam.fragen.filter((frage) => !frage.ist_kontext_block && frage.frage_text)
);
const einheiten = data.lerneinheiten.filter((e) => e.pruefungsteil === 'AP2');

const zeilen = THEMEN.map(([thema, muster]) => {
  const passendeFragen = fragen.filter((frage) => passt(textFrage(frage), muster));
  const passendeEinheiten = einheiten.filter((einheit) => passt(textEinheit(einheit), muster));
  const punkte = passendeFragen.reduce((summe, frage) => summe + Number(frage.punkte || 0), 0);
  const schwierigkeiten = new Set(passendeFragen.map((frage) => frage.schwierigkeit).filter(Boolean));
  const status =
    passendeFragen.length === 0
      ? 'Lücke'
      : passendeFragen.length < 4 || schwierigkeiten.size < 2
        ? 'Dünn'
        : 'Gut';
  return {
    thema,
    lernzettel: passendeEinheiten.length,
    fragen: passendeFragen.length,
    punkte,
    schwierigkeiten: [...schwierigkeiten].sort().join(', ') || '–',
    status,
  };
});

const datum = new Date().toISOString().slice(0, 10);
const markdown = [
  '# AP2-Themenmatrix',
  '',
  `Automatisch erzeugt am ${datum} mit \`npm run analyse-ap2\`.`,
  '',
  `Datenbasis: ${exams.length} AP2-Übungsklausuren, ${fragen.length} Fragen und ${einheiten.length} AP2-Lernzettel-Einheiten.`,
  '',
  '| Thema | Lernzettel | Fragen | Punkte | Schwierigkeit | Status |',
  '|---|---:|---:|---:|---|---|',
  ...zeilen.map(
    (z) =>
      `| ${z.thema} | ${z.lernzettel} | ${z.fragen} | ${z.punkte} | ${z.schwierigkeiten} | ${z.status} |`
  ),
  '',
  '## Interpretation',
  '',
  '- **Gut:** mindestens vier passende Fragen und mindestens zwei Schwierigkeitsstufen.',
  '- **Dünn:** Fragen vorhanden, aber zu wenig Wiederholung oder Schwierigkeitsbreite.',
  '- **Lücke:** keine passende Prüfungsfrage gefunden.',
  '- Suchmuster bündeln abweichende Tags und Kategorien. Treffer können mehrere Themen berühren.',
  '',
  '## Nächste Content-Regel',
  '',
  'Neue Übungssets priorisieren zuerst Lücken, danach dünne Themen. Ein Set gilt als',
  'komplementär, wenn es nicht überwiegend bereits gut abgedeckte Themen wiederholt.',
  '',
].join('\n');

writeFileSync(outputFile, markdown, 'utf8');
console.log(`AP2-Themenmatrix geschrieben: ${outputFile}`);
console.log(
  zeilen
    .filter((z) => z.status !== 'Gut')
    .map((z) => `${z.status}: ${z.thema} (${z.fragen} Fragen)`)
    .join('\n')
);
