import { AP2_THEMEN, einheitenImThema, themaPerId } from './themen';
import { baueGlossarCloze } from './glossar';
import { baueMcFragen } from './mcDrill';
import { shuffle } from './shuffle';
import { meldeKontoDatenAenderung } from './kontoDaten';
import { bereinigeEinstufung } from './validiere';

/**
 * Einstufungstest + individueller Lernplan. Ein kurzer Multiple-Choice-Test je
 * AP2-Thema (Fragen automatisch aus den Lernzetteln, wie im Drill) misst den
 * Ausgangsstand; daraus entsteht ein Wochenplan bis zur Prüfung, der schwache
 * und prüfungsrelevante Themen zuerst einplant. Rein (RNG/Zeit injizierbar).
 */

/** Antwort-Werte im Test. `weissnicht` verhindert geratene Zufallstreffer. */
export const ANTWORT = { RICHTIG: 'richtig', FALSCH: 'falsch', WEISS_NICHT: 'weissnicht' };

/** Standard-Lernzeitraum ohne gesetzten Prüfungstermin (8 Wochen). */
export const STANDARD_TAGE = 56;

/**
 * Baut den Test: je Thema `proThema` MC-Fragen. Die Frage stammt aus einem
 * Lernzettel des Themas, die Distraktoren aus dem gesamten Glossar (bevorzugt
 * gleiche Tags, s. `baueMcFragen`). Themen ohne Material fallen weg.
 * @param {Object[]} einheiten  Lernzettel-Einheiten (`exam_data.lerneinheiten`).
 * @param {{proThema?:number, rng?:() => number}} [opt]
 * @returns {(import('./mcDrill').McFrage & {themaId:string})[]}
 */
export function baueEinstufungstest(einheiten, { proThema = 1, rng = Math.random } = {}) {
  const alleCloze = baueGlossarCloze(einheiten, { maxProEinheit: 3 });
  const fragen = [];
  const schonGefragt = new Set();
  for (const thema of AP2_THEMEN) {
    const ids = new Set(einheitenImThema(einheiten, thema.id).map((e) => e.id));
    const themaCloze = alleCloze.filter((c) => ids.has(c.einheitId) && !schonGefragt.has(c.id));
    if (themaCloze.length === 0) continue;
    // Distraktor-Pool: Themen-Items + Stichprobe aus dem Rest.
    const rest = shuffle(
      alleCloze.filter((c) => !ids.has(c.einheitId)),
      rng
    ).slice(0, 40);
    const themaIds = new Set(themaCloze.map((c) => `mc_${c.id}`));
    const mc = baueMcFragen([...themaCloze, ...rest], { anzahl: themaCloze.length + rest.length, rng })
      .filter((f) => themaIds.has(f.id))
      .slice(0, proThema);
    for (const f of mc) {
      schonGefragt.add(f.id.replace(/^mc_/, ''));
      fragen.push({ ...f, themaId: thema.id });
    }
  }
  return fragen;
}

/**
 * Niveau aus der Trefferquote eines Themas.
 * @param {number} quote 0–1
 * @returns {'stark'|'mittel'|'schwach'}
 */
export function niveauAusQuote(quote) {
  if (quote >= 0.8) return 'stark';
  if (quote >= 0.5) return 'mittel';
  return 'schwach';
}

/**
 * Wertet den Test aus.
 * @param {{id:string, themaId:string}[]} fragen
 * @param {Object<string, 'richtig'|'falsch'|'weissnicht'>} antworten  je Frage-ID
 * @returns {{themen:{id:string, titel:string, richtig:number, gesamt:number, quote:number,
 *   niveau:'stark'|'mittel'|'schwach'}[], richtig:number, gesamt:number, quote:number}}
 */
export function werteEinstufungAus(fragen, antworten = {}) {
  const jeThema = new Map();
  for (const f of fragen || []) {
    const t = jeThema.get(f.themaId) || { richtig: 0, gesamt: 0 };
    t.gesamt += 1;
    if (antworten[f.id] === ANTWORT.RICHTIG) t.richtig += 1;
    jeThema.set(f.themaId, t);
  }
  const themen = [...jeThema.entries()].map(([id, t]) => {
    const quote = t.gesamt > 0 ? t.richtig / t.gesamt : 0;
    return { id, titel: themaPerId(id)?.titel || id, ...t, quote, niveau: niveauAusQuote(quote) };
  });
  const richtig = themen.reduce((s, t) => s + t.richtig, 0);
  const gesamt = themen.reduce((s, t) => s + t.gesamt, 0);
  return { themen, richtig, gesamt, quote: gesamt > 0 ? richtig / gesamt : 0 };
}

/** Priorität eines Themas: Prüfungsgewicht × Lernbedarf (+ Sockel fürs Festigen). */
function prioritaet(thema) {
  const gewicht = themaPerId(thema.id)?.gewicht ?? 2;
  return gewicht * (1 - thema.quote) + gewicht * 0.15;
}

/** Datum + n Tage (lokal, ohne Uhrzeit). */
function plusTage(datum, n) {
  const d = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Erstellt den Lernplan bis zur Prüfung.
 *
 * Aufteilung: die letzten ~15 % (mind. 3 Tage ab 14 Tagen Restzeit) sind
 * **Prüfungssimulation**. Die übrigen Tage gehen an die Themen proportional zur
 * Priorität (Gewicht × Lernbedarf); schwache Themen bekommen mind. 2 Tage, jedes
 * Thema mind. 1. Reihenfolge: höchste Priorität zuerst. Danach in Wochen geschnitten.
 *
 * @param {ReturnType<typeof werteEinstufungAus>} auswertung
 * @param {{tage?:number, start?:Date}} [opt]  `tage` = Tage bis zur Prüfung.
 * @returns {{tage:number, reihenfolge:{id:string, titel:string, niveau:string, tage:number}[],
 *   wochen:{nr:number, von:Date, bis:Date, art:'themen'|'simulation', fokus:string[]}[]}}
 */
export function erstelleLernplan(auswertung, { tage = STANDARD_TAGE, start = new Date() } = {}) {
  const gesamtTage = Math.max(1, Math.floor(tage));
  const themen = [...(auswertung?.themen || [])].sort((a, b) => prioritaet(b) - prioritaet(a));
  const simTage = gesamtTage >= 14 ? Math.max(3, Math.round(gesamtTage * 0.15)) : 0;
  const lernTage = gesamtTage - simTage;

  // Tage je Thema: proportional zur Priorität, mit Mindestwerten.
  const summe = themen.reduce((s, t) => s + prioritaet(t), 0) || 1;
  let reihenfolge = themen.map((t) => ({
    id: t.id,
    titel: t.titel,
    niveau: t.niveau,
    tage: Math.max(t.niveau === 'schwach' ? 2 : 1, Math.round((prioritaet(t) / summe) * lernTage)),
  }));
  // Zu wenig Zeit für alle Mindestwerte: Rest (stärkste Themen) fliegt raus.
  let verplant = reihenfolge.reduce((s, t) => s + t.tage, 0);
  while (verplant > lernTage && reihenfolge.length > 1) {
    const letztes = reihenfolge[reihenfolge.length - 1];
    if (letztes.tage > 1) letztes.tage -= 1;
    else reihenfolge = reihenfolge.slice(0, -1);
    verplant = reihenfolge.reduce((s, t) => s + t.tage, 0);
  }
  // Übrige Tage dem wichtigsten Thema geben (Rundungsrest).
  if (reihenfolge.length && verplant < lernTage) reihenfolge[0].tage += lernTage - verplant;

  // Tagesfolge → Wochen.
  const tagesFokus = reihenfolge.flatMap((t) => Array(t.tage).fill(t.id)).slice(0, lernTage);
  const wochen = [];
  for (let i = 0; i < tagesFokus.length; i += 7) {
    const slice = tagesFokus.slice(i, i + 7);
    wochen.push({
      nr: wochen.length + 1,
      von: plusTage(start, i),
      bis: plusTage(start, i + slice.length - 1),
      art: 'themen',
      fokus: [...new Set(slice)],
    });
  }
  if (simTage > 0) {
    wochen.push({
      nr: wochen.length + 1,
      von: plusTage(start, lernTage),
      bis: plusTage(start, gesamtTage - 1),
      art: 'simulation',
      fokus: [],
    });
  }
  return { tage: gesamtTage, reihenfolge, wochen };
}

/**
 * Aktuelle Planwoche (oder null vor Beginn/nach Ende).
 * @param {{wochen:{von:Date, bis:Date}[]}} plan
 * @param {Date} [jetzt]
 */
export function aktuelleWoche(plan, jetzt = new Date()) {
  const heute = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()).getTime();
  return (plan?.wochen || []).find((w) => w.von.getTime() <= heute && heute <= w.bis.getTime()) || null;
}

// --- Persistenz (gerätelokal) -----------------------------------------------

const SPEICHER_KEY = 'ap2_lernapp_einstufung_v1';

/**
 * Gespeichertes Testergebnis `{ datum: ISO, auswertung }` oder null.
 * Robust gegen fehlenden/kaputten Storage; die Struktur wird geprüft
 * (`datum` gültig, `auswertung.themen` Liste, `quote` in 0..1 – C4).
 */
export function ladeEinstufung() {
  try {
    const roh = localStorage.getItem(SPEICHER_KEY);
    return roh ? bereinigeEinstufung(JSON.parse(roh)) : null;
  } catch {
    return null;
  }
}

/** Speichert das Ergebnis (mit Zeitstempel = Planstart). */
export function speichereEinstufung(auswertung, jetzt = new Date(), { melden = true } = {}) {
  const wert = { datum: jetzt.toISOString(), auswertung };
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(wert));
  } catch {
    /* Storage voll/gesperrt: Plan gilt nur für diese Sitzung */
  }
  if (melden) meldeKontoDatenAenderung('einstufung');
  return wert;
}

/** Löscht das gespeicherte Ergebnis (Test wiederholen). */
export function loescheEinstufung() {
  try {
    localStorage.removeItem(SPEICHER_KEY);
  } catch {
    /* ignorieren */
  }
  meldeKontoDatenAenderung('einstufung');
}

/**
 * Plan aus einem gespeicherten Ergebnis + optionalem Prüfungstermin. Start =
 * Testdatum; Dauer = Tage vom Test bis zum Termin, sonst {@link STANDARD_TAGE}.
 * @param {{datum:string, auswertung:Object}|null} gespeichert
 * @param {string|null} termin  ISO-Datum `YYYY-MM-DD`.
 */
export function planAusErgebnis(gespeichert, termin) {
  if (!gespeichert) return null;
  const start = new Date(gespeichert.datum);
  const startTag = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const ziel = termin ? new Date(`${termin}T00:00:00`) : null;
  const tage =
    ziel && !Number.isNaN(ziel.getTime()) && ziel > startTag
      ? Math.round((ziel.getTime() - startTag.getTime()) / 86400000)
      : STANDARD_TAGE;
  return erstelleLernplan(gespeichert.auswertung, { tage, start: startTag });
}
