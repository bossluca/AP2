/**
 * Herkunfts-Kennzeichnung von Lerninhalten – an EINER Stelle. Leitet aus den
 * vorhandenen Datenfeldern einen einzigen, konsistenten Hinweis ab, statt in
 * jeder Seite verstreut `paraphrasiert`/`quelle`/`unverifiziert_markiert` zu prüfen.
 *
 * Hintergrund (Transparenz/Urheberrecht, s. Info-Seite + ADR-007):
 * - AP1-Übungsprüfungen sind **KI-überarbeitet (paraphrasiert)** – eigener Wortlaut,
 *   keine wortgetreuen Originalaufgaben (`examMeta.paraphrasiert === true`).
 * - AP2-Übungsklausuren sind **KI-generiert** (`quelle` beginnt mit "KI-generiert"
 *   bzw. `examMeta.quelle_dateiname` beginnt mit "ki_").
 * - Manche Lösungen sind **unverifiziert** (`unverifiziert_markiert === true`).
 *
 * @typedef {Object} Herkunft
 * @property {'paraphrasiert'|'ki'|'unverifiziert'} art
 * @property {string} label    kurzer Anzeigetext.
 * @property {string} emoji
 * @property {'info'|'warnung'} ton  steuert die Farbe des Badges.
 */

/** Trägt das Objekt einen „KI-generiert"-Quellenhinweis? */
function istKiQuelle(obj) {
  const q = String(obj?.quelle || '').toLowerCase();
  const datei = String(obj?.examMeta?.quelle_dateiname || '').toLowerCase();
  return q.startsWith('ki-generiert') || q.includes('ki-generiert') || datei.startsWith('ki_');
}

/**
 * Liefert den passenden Herkunfts-Hinweis für eine Frage / ein Lernobjekt – oder
 * `null`, wenn nichts zu kennzeichnen ist (z. B. interne Cloze-Schritte).
 *
 * Reihenfolge bewusst: Unverifiziert ist die wichtigste Warnung (Lösung evtl.
 * nicht korrekt) und gewinnt; danach die Quelle (KI vs. paraphrasiert).
 *
 * @param {Object} obj  Frage/Lernobjekt (kann `examMeta`, `quelle`,
 *                      `unverifiziert_markiert`, `paraphrasiert` tragen).
 * @returns {Herkunft|null}
 */
export function herkunftsHinweis(obj) {
  if (!obj || typeof obj !== 'object') return null;

  if (obj.unverifiziert_markiert) {
    return {
      art: 'unverifiziert',
      label: 'Unverifizierte Lösung – nicht offiziell bestätigt',
      emoji: '⚠️',
      ton: 'warnung',
    };
  }

  if (istKiQuelle(obj)) {
    return {
      art: 'ki',
      label: 'KI-generiert · keine offizielle IHK-Aufgabe',
      emoji: '🤖',
      ton: 'info',
    };
  }

  if (obj.paraphrasiert === true || obj.examMeta?.paraphrasiert === true) {
    return {
      art: 'paraphrasiert',
      label: 'KI-überarbeitet (paraphrasiert) · nicht wortgetreu',
      emoji: '✍️',
      ton: 'info',
    };
  }

  return null;
}
