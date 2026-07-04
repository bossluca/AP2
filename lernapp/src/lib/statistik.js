import { istFaellig, MAX_BOX } from './srs';

/**
 * Reine Auswertungs-Logik über Lernobjekte + Fortschritt. React-frei und
 * testbar; bekommt die Objektliste und die Progress-Map injiziert.
 */

/** Lokaler Tagesschlüssel (YYYY-MM-DD) eines ISO-Zeitstempels. */
function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Ist ein Eintrag eine „Schwachstelle"? (markiert üben / niedrige Box / zuletzt falsch) */
function istSchwach(entry) {
  if (!entry) return false;
  if (entry.status === 'ueben') return true;
  if (entry.box != null && entry.box <= 2 && entry.lastSeen) return true;
  const last = entry.history?.[entry.history.length - 1]?.result;
  if (last === 'nicht' || last === 'falsch' || last === 'sicher-falsch') return true;
  if (entry.lastResult === 'falsch') return true;
  return false;
}

/**
 * Berechnet alle Kennzahlen.
 * @param {import('../data/lernobjekte').Lernobjekt[]} objekte
 * @param {Object.<string, any>} progress  Progress-Map (id → Eintrag).
 * @param {Date} [now]
 */
export function berechneStatistik(objekte, progress, now = new Date()) {
  const status = { gelernt: 0, ueben: 0, offen: 0 };
  const art = { frage: 0, lernzettel: 0 };
  const boxen = { neu: 0 };
  for (let b = 1; b <= MAX_BOX; b++) boxen[b] = 0;
  const proTeil = {};
  const schwachByTag = new Map();
  const verlaufMap = new Map();
  let faellig = 0;

  for (const o of objekte) {
    const e = progress[o.id];
    art[o.art] = (art[o.art] || 0) + 1;

    // Status
    const s = e?.status;
    if (s === 'gelernt') status.gelernt += 1;
    else if (s === 'ueben') status.ueben += 1;
    else status.offen += 1;

    // Box-Verteilung
    if (e?.box != null) boxen[Math.min(e.box, MAX_BOX)] += 1;
    else boxen.neu += 1;

    // Fälligkeit
    if (istFaellig(e, now)) faellig += 1;

    // pro Prüfungsteil
    const teil = o.pruefungsteil || 'AP1';
    if (!proTeil[teil]) proTeil[teil] = { total: 0, gelernt: 0, ueben: 0, offen: 0, faellig: 0 };
    proTeil[teil].total += 1;
    proTeil[teil][s === 'gelernt' ? 'gelernt' : s === 'ueben' ? 'ueben' : 'offen'] += 1;
    if (istFaellig(e, now)) proTeil[teil].faellig += 1;

    // Schwachstellen nach Tag
    if (istSchwach(e)) {
      for (const t of o.tags) schwachByTag.set(t, (schwachByTag.get(t) || 0) + 1);
    }
  }

  // Lernverlauf: Reviews pro Tag aus allen Historien. Nebenbei Fehl-Sicherheit
  // zählen (sicher geglaubt, aber falsch – aus dem Confidence-Rating).
  let fehlSicherEreignisse = 0;
  const fehlSicherIds = new Set();
  for (const id in progress) {
    for (const h of progress[id]?.history || []) {
      const k = dayKey(h.ts);
      if (k) verlaufMap.set(k, (verlaufMap.get(k) || 0) + 1);
      if (h.result === 'sicher-falsch') {
        fehlSicherEreignisse += 1;
        fehlSicherIds.add(id);
      }
    }
  }

  const schwachstellen = [...schwachByTag.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const verlauf = [...verlaufMap.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total: objekte.length,
    status,
    art,
    boxen,
    faellig,
    proTeil,
    schwachstellen,
    verlauf,
    // Fehl-Sicherheit: „gefährliche" Karten (sicher geglaubt, aber falsch).
    fehlSicher: { ereignisse: fehlSicherEreignisse, objekte: fehlSicherIds.size },
  };
}
