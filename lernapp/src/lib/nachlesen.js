/**
 * „Zum Nachlesen": findet zu einer Prüfungsfrage die passendsten Lernzettel
 * über gemeinsame `thema_tags` – verzahnt Übung und Inhalt (bei einer falschen
 * Antwort ist der direkte Sprung zum Stoff der eigentliche Lerneffekt).
 * Rein & getestet; genutzt von Quiz + Klausur (Deeplink `/lernzettel?einheit=…`).
 */

/**
 * @param {{id:string, titel:string, thema_tags?:string[], pruefungsteil?:string}[]} lerneinheiten
 * @param {{thema_tags?:string[], pruefungsteil?:string}} frage
 * @param {{max?:number}} [opt]
 * @returns {{id:string, titel:string}[]} beste Treffer (leer, wenn nichts passt).
 */
export function findeLernzettel(lerneinheiten, frage, { max = 2 } = {}) {
  const tags = new Set(frage?.thema_tags || []);
  if (tags.size === 0) return [];
  const teil = frage?.pruefungsteil;

  const bewertet = [];
  for (const e of lerneinheiten || []) {
    let punkte = 0;
    for (const t of e.thema_tags || []) if (tags.has(t)) punkte += 1;
    if (punkte === 0) continue;
    // Gleicher Prüfungsteil ist relevanter (bricht Gleichstände).
    if (teil && e.pruefungsteil === teil) punkte += 0.5;
    bewertet.push({ id: e.id, titel: e.titel, punkte });
  }
  return bewertet
    .sort((a, b) => b.punkte - a.punkte)
    .slice(0, max)
    .map(({ id, titel }) => ({ id, titel }));
}
