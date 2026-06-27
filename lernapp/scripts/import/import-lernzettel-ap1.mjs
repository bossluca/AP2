#!/usr/bin/env node
/**
 * Import: AP1-Lernzettel (u/DeFyuseOW, 2025) → exam_data.json `lerneinheiten`.
 *
 * Quelle ist ein nativ-textbasiertes PDF mit klarer Kapitel-/Abschnittsstruktur
 * (11 Kapitel, ~94 Unterabschnitte "N.N"). Jeder Unterabschnitt wird zu EINER
 * feingranularen Lerneinheit (Nutzerwunsch: pro Thema/Begriff).
 *
 * Reproduzierbar: extrahiert den Text via `pdftotext -enc UTF-8 -layout`. Der
 * `-layout`-Modus erhält die *Einrückung* – darüber werden Aufzählungen erkannt
 * (sonst kollabieren Listenpunkte zu Fließtext-Wurst) und über Zeilen
 * umgebrochene Absätze wieder zusammengefügt. Siehe `toMarkdown`.
 *
 * Idempotent: ersetzt bei erneutem Lauf alle Einheiten mit id-Präfix "lz_ap1_".
 * Bekannte Titel-Mängel der Quelle werden zentral via `korrigiereEinheit` geheilt.
 *
 * Aufruf:  node scripts/import/import-lernzettel-ap1.mjs
 * Voraussetzung: poppler-utils (pdftotext) im PATH.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { korrigiereEinheit } from './lib/lernzettel-korrektur.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');
const PDF = join(ROOT, 'Pruefungen_Rohdaten', 'AP1', 'AP1_Lernzettel.pdf');
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const ID_PREFIX = 'lz_ap1_';
const QUELLE = 'AP1-Lernzettel (u/DeFyuseOW, 2025)';

/** Kapitelnummer → Titel (aus dem Inhaltsverzeichnis des Dokuments). */
const KAPITEL = {
  1: 'Grundlagen',
  2: 'Hardware',
  3: 'Software',
  4: 'Installation und Konfiguration',
  5: 'Lizenzen',
  6: 'Wirtschaft',
  7: 'Projektmanagement',
  8: 'Software-Entwicklung',
  9: 'Support',
  10: 'Qualitätsmanagement',
  11: 'IT-Sicherheit und Datenschutz',
};

/** Primär-Tag je Kapitel (Wiederverwendung des bestehenden Tag-Vokabulars). */
const KAPITEL_TAG = {
  2: 'Hardware/Komponenten',
  6: 'Kostenrechnung/Wirtschaft',
  7: 'Projektmanagement',
  8: 'Algorithmen/Pseudocode',
  9: 'Kommunikation/Soft Skills',
  11: 'Datenschutz/IT-Sicherheit',
};

/** Feinere Tag-Overrides für einzelne Abschnitte "kapitel.unter". */
const ABSCHNITT_TAG = {
  '2.4': 'Netzwerk/IP-Adressierung',
  '2.6': 'OSI-Modell',
  '6.9': 'Kaufvertragsrecht',
  '6.10': 'Kaufvertragsrecht',
  '6.11': 'Kaufvertragsrecht',
  '8.8': 'UML/Diagramme',
  '8.11': 'Datenbank/SQL/ER-Modell',
  '8.12': 'Datenbank/SQL/ER-Modell',
};

const isChapterHeader = (line) => {
  const m = line.match(/^(\d+)\. (.+)$/);
  if (!m) return null;
  const num = Number(m[1]);
  return KAPITEL[num] === m[2].trim() ? num : null;
};

const isSubHeader = (line) => {
  const m = line.match(/^(\d+)\.(\d+) (.+)$/);
  return m ? { kapitel: Number(m[1]), unter: Number(m[2]), titel: m[3].trim() } : null;
};

/** Führende Leerzeichen einer Zeile (Einrückung im -layout-Text). */
const indentOf = (s) => s.length - s.replace(/^ +/, '').length;

/**
 * `pdftotext -layout` bricht Fließtext um ~Spalte 64 um. Eine Zeile, die nahe an
 * diese Breite reicht, ist die Fortsetzung des nächsten Stücks – kürzere Zeilen
 * sind echte Absatz-/Listenpunkt-Enden. Schwelle bewusst etwas unter 64.
 */
const WRAP_MIN = 55;

/** Reiner Code-/Pseudocode-Abschnitt → als Code-Block, nicht als Liste. */
const CODE_ABSCHNITTE = new Set(['8.7']); // 8.7 Pseudocode

const istSeitenzahl = (t) => /^\d{1,3}$/.test(t);

/** Pseudocode/Code: Einrückung erhalten, in einen ```-Block fassen. */
function toCodeBlock(lines) {
  const out = [];
  let leerOffen = false;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      if (out.length) leerOffen = true;
      continue;
    }
    if (istSeitenzahl(line.trim())) continue;
    if (leerOffen) out.push('');
    leerOffen = false;
    out.push(line); // Einrückung absichtlich erhalten
  }
  if (!out.length) return '';
  return '```text\n' + out.join('\n') + '\n```';
}

/**
 * Wandelt die Roh-Zeilen eines Abschnitts (aus `pdftotext -layout`) in Markdown.
 *
 * Heuristik – stützt sich auf die im Quell-PDF konsistente Spaltenstruktur:
 *  1. **Zeilenumbruch-Reparatur:** Volle Zeilen (≥ `WRAP_MIN`) sind über die
 *     Seitenbreite umgebrochen → mit der Folgezeile gleicher Einrückung wieder
 *     zu einer Logikzeile zusammenfügen (heilt zerrissene Sätze *und* Listen-
 *     punkte wie „… (z. B. …)").
 *  2. **Klassifikation der Logikzeile:** eingerückt (≥ 3) → Aufzählungspunkt
 *     `- `, sonst Fließtext-Absatz.
 *
 * `\f` (Seitenumbruch) wurde vorab zu einer Leerzeile = harte Absatzgrenze.
 */
function toMarkdown(lines, { code = false } = {}) {
  if (code) return toCodeBlock(lines);

  // 1) Umgebrochene Logikzeilen zusammenfügen.
  const logisch = []; // { indent, text }
  let cur = null;
  const push = () => {
    if (cur) logisch.push({ indent: cur.indent, text: cur.parts.join(' ') });
    cur = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    const text = line.trim();
    if (!text) {
      push(); // Leerzeile → harte Grenze
      continue;
    }
    if (istSeitenzahl(text)) continue;
    const ind = indentOf(line);
    const fortsetzung = cur && cur.lastFull && Math.abs(ind - cur.indent) <= 1;
    if (fortsetzung) {
      cur.parts.push(text);
      cur.lastFull = line.length >= WRAP_MIN;
    } else {
      push();
      cur = { indent: ind, parts: [text], lastFull: line.length >= WRAP_MIN };
    }
  }
  push();

  // 2) Logikzeilen → Markdown.
  let md = '';
  logisch.forEach((b, i) => {
    if (b.indent >= 3) {
      const prevLi = i > 0 && logisch[i - 1].indent >= 3;
      // Quelle hat teils schon ein Listenzeichen ("- …") → kein doppeltes "- -".
      const text = b.text.replace(/^[-–•*]\s+/, '');
      md += (prevLi ? '\n' : md ? '\n\n' : '') + `- ${text}`;
    } else {
      md += (md ? '\n\n' : '') + b.text;
    }
  });
  return md.trim();
}

function main() {
  let text;
  try {
    text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', PDF, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    console.error('FEHLER: pdftotext nicht ausführbar (poppler-utils installiert?).');
    console.error(e.message);
    process.exit(1);
  }

  // Form-Feeds (Seitenumbrüche) als Absatzgrenze behandeln, sonst kleben über
  // Seiten gebrochene Absätze aneinander.
  const lines = text.replace(/\f/g, '\n\n').split(/\r?\n/);

  // Body-Start: das Inhaltsverzeichnis listet "1. Grundlagen" zuerst, der eigent-
  // liche Text wiederholt es darunter. Wir nehmen das LETZTE Vorkommen (= Body).
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isChapterHeader(lines[i].trim()) === 1) start = i;
  }
  if (start === -1) {
    console.error('FEHLER: Body-Start ("1. Grundlagen") nicht gefunden.');
    process.exit(1);
  }

  const einheiten = [];
  const usedIds = new Set();
  let current = null;

  const flush = () => {
    if (!current) return;
    const key = `${current.kapitel}.${current.unter}`;
    const inhalt = toMarkdown(current.lines, { code: CODE_ABSCHNITTE.has(key) });
    if (inhalt) {
      let id = `${ID_PREFIX}${current.kapitel}_${current.unter}`;
      while (usedIds.has(id)) id += 'b';
      usedIds.add(id);
      const tag = ABSCHNITT_TAG[key] || KAPITEL_TAG[current.kapitel];
      einheiten.push(
        korrigiereEinheit({
          id,
          titel: current.titel,
          inhalt_text: inhalt,
          kategorie: `${current.kapitel}. ${KAPITEL[current.kapitel]}`,
          thema_tags: tag ? [tag] : [],
          quelle: QUELLE,
          pruefungsteil: 'AP1',
        })
      );
    }
    current = null;
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isChapterHeader(line) != null) {
      flush();
      continue;
    }
    const sub = isSubHeader(line);
    if (sub) {
      flush();
      current = { ...sub, lines: [] };
      continue;
    }
    if (current) current.lines.push(lines[i]);
  }
  flush();

  if (einheiten.length < 50) {
    console.error(`FEHLER: nur ${einheiten.length} Einheiten geparst – Parser prüfen.`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(data.lerneinheiten)) data.lerneinheiten = [];
  // Idempotent: bestehende AP1-Lernzettel-Einheiten entfernen, dann neu einfügen.
  data.lerneinheiten = data.lerneinheiten.filter((l) => !String(l.id).startsWith(ID_PREFIX));
  data.lerneinheiten.push(...einheiten);

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(
    `Import OK: ${einheiten.length} Lerneinheiten aus AP1-Lernzettel ` +
      `(gesamt jetzt ${data.lerneinheiten.length} Lerneinheiten).`
  );
}

main();
