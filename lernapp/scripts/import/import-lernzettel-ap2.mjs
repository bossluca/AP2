#!/usr/bin/env node
/**
 * Import: AP2-Lernzettel (DOCX-Sammlung, 28 Themen) → exam_data.json `lerneinheiten`.
 *
 * Quelle: Pruefungen_Rohdaten/AP2/Lernzettel/DOCX/*.docx – je Datei ein Thema mit
 * nummerierten Abschnitten ("N. Titel"). Jeder Abschnitt wird zu EINER
 * feingranularen Lerneinheit (konsistent zum AP1-Import). Dateien ohne
 * nummerierte Abschnitte werden als eine Einheit übernommen.
 *
 * DOCX-Parsing ohne externe Lib: word/document.xml via `unzip -p` lesen, Absätze
 * (<w:p>) extrahieren, Listenabsätze (<w:numPr>) als Markdown-Listen ausgeben.
 *
 * Idempotent: ersetzt bei erneutem Lauf alle Einheiten mit id-Präfix "lz_ap2_".
 * Aufruf (in einer Shell mit unzip im PATH):
 *   node scripts/import/import-lernzettel-ap2.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { korrigiereEinheit } from './lib/lernzettel-korrektur.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const DOCX_DIR = join(ROOT, 'Pruefungen_Rohdaten', 'AP2', 'Lernzettel', 'DOCX');
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const ID_PREFIX = 'lz_ap2_';

/** Thema (Dateiname ohne Endung) → Tag aus dem bestehenden Vokabular. */
const TAG = {
  'IPv4-IPv6 Subnetting': 'Netzwerk/IP-Adressierung',
  'NAT % PAT': 'Netzwerk/IP-Adressierung',
  VLAN: 'Netzwerk/IP-Adressierung',
  VPN: 'Netzwerk/IP-Adressierung',
  WLAN: 'Netzwerk/IP-Adressierung',
  DNS: 'Netzwerk/IP-Adressierung',
  'Netzwerkplan Lesen': 'Netzwerk/IP-Adressierung',
  Protokolle: 'Netzwerk/IP-Adressierung',
  'E-Mail & Protokolle': 'Netzwerk/IP-Adressierung',
  Firewall: 'Datenschutz/IT-Sicherheit',
  'IT-Sicherheit': 'Datenschutz/IT-Sicherheit',
  'Datenschutz & Compliance': 'Datenschutz/IT-Sicherheit',
  Datenbanken: 'Datenbank/SQL/ER-Modell',
  'Relationales Datenbankmodell': 'Datenbank/SQL/ER-Modell',
  'UML & Dokumentation': 'UML/Diagramme',
  'Array & Pseudocode': 'Algorithmen/Pseudocode',
  'RAID Backup': 'Datensicherung/Storage',
  'USV & Stromversorgung': 'Hardware/Komponenten',
  'Server allgemein': 'Hardware/Komponenten',
  'Projektmanagement ++': 'Projektmanagement',
  Berechnungen: 'Hardware/Speicher-Berechnung',
};

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[c])
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const niceTopic = (name) => name.replace(/\s*%\s*/g, ' & ').trim();

/** Liest die Absätze einer DOCX als {text, isList}-Liste in Dokumentreihenfolge. */
function readParagraphs(docxPath) {
  const xml = execFileSync('unzip', ['-p', docxPath, 'word/document.xml'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const chunks = xml.split(/<w:p[ >]/).slice(1);
  const paras = [];
  for (const chunk of chunks) {
    const isList = /<w:numPr[\s>]/.test(chunk);
    // <w:t> (mit optionalen Attributen) – aber NICHT <w:tab>.
    const texts = [...chunk.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) =>
      unescapeXml(m[1])
    );
    const text = texts.join('').replace(/\s+/g, ' ').trim();
    if (text) paras.push({ text, isList });
  }
  return paras;
}

/** Baut Markdown aus einer Absatzliste (Listenabsätze als "- "-Items). */
function toMarkdown(paras) {
  const out = [];
  for (const p of paras) out.push(p.isList ? `- ${p.text}` : p.text);
  // Aufeinanderfolgende Items zusammenhalten, sonst Leerzeile zwischen Blöcken.
  let md = '';
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    const prev = out[i - 1];
    if (i === 0) md = cur;
    else if (cur.startsWith('- ') && prev.startsWith('- ')) md += `\n${cur}`;
    else md += `\n\n${cur}`;
  }
  return md.trim();
}

const isSectionHeader = (p) => {
  if (p.isList) return null;
  const m = p.text.match(/^(\d+)\.\s+(.+)$/);
  return m ? { num: Number(m[1]), titel: m[2].trim() } : null;
};

function unitsFromFile(docxPath) {
  const file = basename(docxPath, '.docx');
  const topic = niceTopic(file);
  const tag = TAG[file];
  const baseId = `${ID_PREFIX}${slug(file)}`;
  const paras = readParagraphs(docxPath);

  // Abschnittsgrenzen finden.
  const headerIdx = [];
  paras.forEach((p, i) => {
    if (isSectionHeader(p)) headerIdx.push(i);
  });

  const mkUnit = (id, titel, slice) => ({
    id,
    titel,
    inhalt_text: toMarkdown(slice),
    kategorie: topic,
    thema_tags: tag ? [tag] : [],
    quelle: `AP2-Lernzettel (${file})`,
    pruefungsteil: 'AP2',
  });

  // Weniger als 2 nummerierte Abschnitte → ganze Datei als eine Einheit.
  if (headerIdx.length < 2) {
    const md = toMarkdown(paras);
    return md ? [mkUnit(baseId, topic, paras)] : [];
  }

  const units = [];
  for (let h = 0; h < headerIdx.length; h++) {
    const start = headerIdx[h];
    const end = h + 1 < headerIdx.length ? headerIdx[h + 1] : paras.length;
    const header = isSectionHeader(paras[start]);
    const body = paras.slice(start + 1, end);
    if (body.length === 0) continue;
    units.push(mkUnit(`${baseId}_${header.num}`, header.titel, body));
  }
  return units;
}

function main() {
  let files;
  try {
    files = readdirSync(DOCX_DIR).filter((f) => f.toLowerCase().endsWith('.docx'));
  } catch (e) {
    console.error(`FEHLER: DOCX-Verzeichnis nicht lesbar: ${DOCX_DIR}\n${e.message}`);
    process.exit(1);
  }
  files.sort((a, b) => a.localeCompare(b, 'de'));

  const einheiten = [];
  const usedIds = new Set();
  for (const f of files) {
    let us;
    try {
      us = unitsFromFile(join(DOCX_DIR, f));
    } catch (e) {
      console.error(`FEHLER beim Parsen von ${f}: ${e.message}`);
      process.exit(1);
    }
    for (const u of us) {
      while (usedIds.has(u.id)) u.id += 'b';
      usedIds.add(u.id);
      einheiten.push(korrigiereEinheit(u));
    }
  }

  if (einheiten.length < 28) {
    console.error(`FEHLER: nur ${einheiten.length} Einheiten – Parser/Quelle prüfen.`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(data.lerneinheiten)) data.lerneinheiten = [];
  data.lerneinheiten = data.lerneinheiten.filter((l) => !String(l.id).startsWith(ID_PREFIX));
  data.lerneinheiten.push(...einheiten);

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(
    `Import OK: ${einheiten.length} AP2-Lerneinheiten aus ${files.length} Dateien ` +
      `(gesamt jetzt ${data.lerneinheiten.length} Lerneinheiten).`
  );
}

main();
