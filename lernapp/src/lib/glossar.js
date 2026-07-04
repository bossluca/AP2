/**
 * Glossar-Cloze-Generator: erzeugt Lückentext-Übungen **aus den vorhandenen
 * Lernzetteln**, ohne neue Inhalte zu schreiben. Heuristik: nimm Zeilen mit genau
 * EINEM fettgedruckten Begriff (`**Begriff**`) und genug Kontext und ersetze den
 * Begriff durch eine Lücke (`{{Begriff}}`). So entsteht aus dem Lernmaterial viel
 * aktives Abrufen (statt nur Lesen) – Hebel #2/#4 der Produkt-Strategie.
 *
 * Reine, React-freie Funktionen (testbar). Der Lückentext-Modus (`pages/Luecken`)
 * rendert die Ergebnisse mit `components/ClozeFrage` + `lib/cloze`.
 */

const BOLD_RE = /\*\*(.+?)\*\*/g;

/**
 * Entfernt führende Markdown-Marker (Listenpunkt/Zitat/Überschrift) und trimmt –
 * aber nur als eigenständiges Präfix mit Folge-Leerzeichen, damit ein fett-
 * gedruckter Begriff am Zeilenanfang (`**Begriff** …`) erhalten bleibt.
 */
function bereinigeZeile(zeile) {
  return zeile.replace(/^\s+/, '').replace(/^([-*•]|#{1,6}|>)\s+/, '').trim();
}

/** Kontextlänge ohne den Begriff (alphanumerisch) – misst „Satz drumherum". */
function kontextLaenge(text) {
  return text
    .replace(/\{\{.+?\}\}/, ' ')
    .replace(/[^a-zA-ZäöüÄÖÜß0-9]+/g, ' ')
    .trim().length;
}

/** Ist `b` ein brauchbarer Lücken-Begriff (Länge, keine reine Zahl)? */
function gueltigerBegriff(b) {
  return b.length >= 2 && b.length <= 40 && !/^\d+$/.test(b);
}

/** „Begriff: Erklärung"-Glossarzeile (Begriff beginnt groß, kurze Phrase). */
const GLOSSAR_RE = /^([A-ZÄÖÜ][^:]{1,39}):\s+(.+)$/;

/**
 * Wandelt eine (bereinigte) Zeile in ein Cloze-Item – oder `null`. Zwei Muster:
 *   1. genau ein **Fettbegriff**  → `{{Begriff}}`,
 *   2. „Begriff: Erklärung" (Glossar) → `{{Begriff}}: Erklärung`.
 * @returns {{text:string, begriff:string}|null}
 */
function clozeAusZeile(zeile) {
  const bolds = [...zeile.matchAll(BOLD_RE)];
  if (bolds.length === 1) {
    const begriff = bolds[0][1].trim();
    if (!gueltigerBegriff(begriff)) return null;
    const text = zeile.replace(BOLD_RE, (_m, g) => (g.trim() === begriff ? `{{${begriff}}}` : g.trim()));
    if (text.length <= 200 && kontextLaenge(text) >= 10) return { text, begriff };
    return null;
  }
  if (bolds.length > 1) return null;

  const m = zeile.match(GLOSSAR_RE);
  if (m) {
    const begriff = m[1].trim();
    const def = m[2].trim();
    if (gueltigerBegriff(begriff) && begriff.split(/\s+/).length <= 5 && kontextLaenge(def) >= 15) {
      const text = `{{${begriff}}}: ${def}`;
      if (text.length <= 220) return { text, begriff };
    }
  }
  return null;
}

/**
 * Extrahiert Cloze-Items aus einem Markdown-Text (eines je passender Zeile).
 * @param {string} inhalt
 * @param {{tags?:string[], quelle?:string}} [meta]
 * @returns {{text:string, begriff:string, tags:string[], quelle:string}[]}
 */
export function clozeAusText(inhalt, { tags = [], quelle = '' } = {}) {
  const items = [];
  for (const roh of (inhalt || '').split(/\r?\n/)) {
    const item = clozeAusZeile(bereinigeZeile(roh));
    if (item) items.push({ ...item, tags, quelle });
  }
  return items;
}

/**
 * Baut aus mehreren Lernzettel-Einheiten eine deduplizierte Cloze-Sammlung.
 * @param {{id:string, inhalt_text?:string, titel?:string, thema_tags?:string[]}[]} einheiten
 * @param {{maxProEinheit?:number}} [optionen]
 * @returns {{id:string, einheitId:string, text:string, begriff:string, tags:string[], quelle:string}[]}
 */
export function baueGlossarCloze(einheiten, { maxProEinheit = 3 } = {}) {
  const alle = [];
  const gesehen = new Set();
  for (const e of einheiten || []) {
    const items = clozeAusText(e.inhalt_text, { tags: e.thema_tags || [], quelle: e.titel || '' });
    let n = 0;
    for (const it of items) {
      const key = it.begriff.toLowerCase();
      if (gesehen.has(key)) continue;
      gesehen.add(key);
      // einheitId: Quell-Lerneinheit – erlaubt es Drill/Lücken, Ergebnisse als
      // FSRS-Review auf die Einheit zu buchen (Lernschleife schließen).
      alle.push({ ...it, id: `cloze_${e.id}_${n}`, einheitId: e.id });
      n += 1;
      if (n >= maxProEinheit) break;
    }
  }
  return alle;
}
