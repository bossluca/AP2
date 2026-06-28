/**
 * „Weiterlernen" / Resume: merkt sich die zuletzt begonnene Lern-Aktion, damit
 * die App „dort weiter, wo du warst" anbieten kann. Bewusst **gerätelokal** und
 * best-effort (kein Server-Sync): wo man stehengeblieben ist, ist Komfort, kein
 * kontogebundener Fortschritt – und ein abgebrochener Stand auf Gerät A soll
 * Gerät B nicht steuern.
 *
 * Kleine Schnittstelle, Storage-/Defensiv-/TTL-Logik gekapselt (gleiche Naht wie
 * `loadProgress` im ProgressContext). Zeit injizierbar → testbar.
 *
 *   ladeResume(jetzt?)        -> ResumeEintrag | null   (null wenn fehlt/abgelaufen/kaputt)
 *   speichereResume(eintrag)  -> ResumeEintrag          (setzt ts, persistiert)
 *   loescheResume()           -> void
 *
 * @typedef {Object} ResumeEintrag
 * @property {string} to        Ziel-Route (z. B. "/lernen?modus=heute").
 * @property {string} titel     Anzeigename ("Heute lernen", Modul-Titel …).
 * @property {string} [modus]   optionaler Modus-Hinweis.
 * @property {string} ts        ISO-Zeitstempel des letzten Kontakts.
 */

const RESUME_KEY = 'ap2_lernapp_resume_v1';

/** Resume verfällt nach dieser Zeit (alte, vergessene Sitzung nicht aufdrängen). */
export const RESUME_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 Tage

/** Plausibilitätscheck eines geladenen Eintrags. */
function istGueltig(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.to === 'string' &&
    e.to.length > 0 &&
    typeof e.titel === 'string' &&
    typeof e.ts === 'string'
  );
}

/**
 * Lädt den Resume-Eintrag. Gibt `null` zurück, wenn keiner existiert, er
 * unbrauchbar ist oder älter als {@link RESUME_TTL_MS}.
 * @param {Date} [jetzt]
 * @returns {ResumeEintrag|null}
 */
export function ladeResume(jetzt = new Date()) {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const e = JSON.parse(raw);
    if (!istGueltig(e)) return null;
    const alter = jetzt.getTime() - new Date(e.ts).getTime();
    if (!(alter >= 0) || alter > RESUME_TTL_MS) return null;
    return e;
  } catch {
    return null;
  }
}

/**
 * Persistiert einen Resume-Eintrag (setzt `ts` auf jetzt, falls nicht gesetzt).
 * Fehler (Quota/Privatmodus) werden geschluckt. Gibt den geschriebenen Eintrag
 * zurück (für direkte State-Übernahme).
 * @param {{to:string, titel:string, modus?:string, ts?:string}} eintrag
 * @returns {ResumeEintrag|null}
 */
export function speichereResume(eintrag) {
  if (!eintrag || typeof eintrag.to !== 'string' || typeof eintrag.titel !== 'string') {
    return null;
  }
  const voll = { ...eintrag, ts: eintrag.ts || new Date().toISOString() };
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify(voll));
  } catch {
    /* ignore */
  }
  return voll;
}

/** Entfernt den Resume-Eintrag (z. B. nach sauberem Abschluss einer Session). */
export function loescheResume() {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}
