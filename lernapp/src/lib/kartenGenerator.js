import { clozeAusText } from './glossar';

/**
 * Lernkarten-Generator für **eigenes Material** (PDF-Text oder eingefügter Text).
 * Regelbasiert, ohne KI und ohne Server: erkennt typische Lernzettel-Muster und
 * schlägt daraus Frage/Antwort-Karten vor. Die Nutzerin/der Nutzer prüft und
 * bearbeitet die Vorschläge vor dem Speichern. Rein und testbar.
 *
 * Erkannte Muster:
 *   1. Glossar „Begriff: Erklärung" (wie `lib/glossar`)
 *   2. „Begriff – Erklärung" / „Begriff = Erklärung"
 *   3. Abkürzung mit Langform „DHCP (Dynamic Host Configuration Protocol)"
 *   4. Frage-Zeile „…?" mit Antwort in den Folgezeilen
 *   5. Kurze Überschrift + mind. 2 Aufzählungspunkte → „Was gehört zu …?"
 */

/** @typedef {{front:string, back:string, art:string}} KartenVorschlag */

const AUFZAEHLUNG_RE = /^\s*(?:[-–•▪◦*·]|\d{1,2}[.)])\s+(.+)$/;
const DASH_RE = /^([A-ZÄÖÜ0-9][^–=]{1,39}?)\s+[–=]\s+(.{15,220})$/;
const ABK_RE = /\b([A-Z][A-Z0-9]{1,7}(?:v\d)?)\s+\(([A-Z][A-Za-zäöüÄÖÜß-]+(?:\s+[A-Za-zäöüÄÖÜß-]+){1,7})\)/g;
const MAX_KARTEN = 200;

/** Zeilen normalisieren: Silbentrennung am Zeilenende zusammenführen, Whitespace. */
function bereiteZeilenVor(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .split('\n')
    .map((z) => z.replace(/\s+/g, ' ').trim());
}

/** Prüft, ob eine Langform zu den Anfangsbuchstaben der Abkürzung passt (grob). */
function passtZuAbkuerzung(abk, lang) {
  const initialen = lang
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .join('');
  const buchstaben = abk.replace(/[^A-Z]/g, '');
  return buchstaben.length >= 2 && initialen.includes(buchstaben[0]) && initialen.startsWith(buchstaben[0]);
}

/**
 * Erzeugt Kartenvorschläge aus Rohtext.
 * @param {string} text
 * @param {{max?:number}} [opt]
 * @returns {KartenVorschlag[]}
 */
export function generiereKarten(text, { max = MAX_KARTEN } = {}) {
  const zeilen = bereiteZeilenVor(text);
  const karten = [];
  const gesehen = new Set();
  const add = (front, back, art) => {
    const f = front.trim();
    const b = back.trim();
    if (f.length < 2 || b.length < 2) return;
    const key = f.toLowerCase();
    if (gesehen.has(key)) return;
    gesehen.add(key);
    karten.push({ front: f, back: b, art });
  };

  for (let i = 0; i < zeilen.length; i += 1) {
    const zeile = zeilen[i];
    if (!zeile) continue;
    const ohneListe = zeile.replace(AUFZAEHLUNG_RE, '$1');

    // 4. Frage + Antwort in den Folgezeilen (bis Leerzeile/nächste Frage, max 6).
    if (/\?$/.test(zeile) && zeile.length >= 8) {
      const antwort = [];
      for (let j = i + 1; j < zeilen.length && antwort.length < 6; j += 1) {
        if (!zeilen[j] || /\?$/.test(zeilen[j])) break;
        antwort.push(zeilen[j]);
      }
      if (antwort.length) add(ohneListe, antwort.join('\n'), 'frage');
      continue;
    }

    // 5. Überschrift + Aufzählung.
    const istUeberschrift =
      zeile.length <= 60 && !AUFZAEHLUNG_RE.test(zeile) && !/[.:;,]$/.test(zeile) && /\p{L}/u.test(zeile);
    if (istUeberschrift || /:$/.test(zeile)) {
      const punkte = [];
      for (let j = i + 1; j < zeilen.length && punkte.length < 10; j += 1) {
        const m = zeilen[j].match(AUFZAEHLUNG_RE);
        if (!m) break;
        punkte.push(m[1]);
      }
      if (punkte.length >= 2) {
        const titel = zeile.replace(/:$/, '');
        add(`Was gehört zu „${titel}"?`, punkte.map((p) => `- ${p}`).join('\n'), 'liste');
        continue;
      }
    }

    // 1. Glossar „Begriff: Erklärung".
    const glossar = clozeAusText(ohneListe)[0];
    if (glossar && glossar.text.startsWith(`{{${glossar.begriff}}}:`)) {
      add(`Was ist/bedeutet „${glossar.begriff}"?`, glossar.text.replace(/^\{\{.+?\}\}:\s*/, ''), 'begriff');
      continue;
    }

    // 2. „Begriff – Erklärung".
    const dash = ohneListe.match(DASH_RE);
    if (dash && dash[1].split(/\s+/).length <= 5) {
      add(`Was ist/bedeutet „${dash[1].trim()}"?`, dash[2], 'begriff');
    }
  }

  // 3. Abkürzungen im gesamten Text.
  const ganz = zeilen.join(' ');
  for (const m of ganz.matchAll(ABK_RE)) {
    if (passtZuAbkuerzung(m[1], m[2])) add(`Wofür steht „${m[1]}"?`, m[2], 'abkuerzung');
  }

  return karten.slice(0, max);
}

/**
 * Text aus einer PDF-Datei lesen (pdf.js, im Browser, lazy geladen). Nichts
 * verlässt das Gerät. Zeilenumbrüche aus `hasEOL`, Seiten durch Leerzeile getrennt.
 * @param {ArrayBuffer} daten
 * @param {{maxSeiten?:number}} [opt]
 * @returns {Promise<{text:string, seiten:number}>}
 */
export async function pdfZuText(daten, { maxSeiten = 80 } = {}) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: daten }).promise;
  const seiten = Math.min(doc.numPages, maxSeiten);
  const teile = [];
  for (let n = 1; n <= seiten; n += 1) {
    const seite = await doc.getPage(n);
    const inhalt = await seite.getTextContent();
    teile.push(inhalt.items.map((it) => (it.str || '') + (it.hasEOL ? '\n' : '')).join(''));
  }
  await doc.destroy();
  return { text: teile.join('\n\n'), seiten: doc.numPages };
}
