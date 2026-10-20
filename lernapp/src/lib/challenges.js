import { AP2_THEMEN, objekteImThema } from './themen';
import { tagesKey } from './aktivitaet';

/**
 * Wochen-Challenges: drei Ziele je Kalenderwoche (Mo–So), **abgeleitet** aus
 * vorhandenen Signalen (Aktivitäts-Log, Review-Historie) – kein neuer Zustand,
 * rein und testbar. Das Fokus-Thema rotiert wöchentlich deterministisch durch
 * den AP2-Themenkatalog, damit über die Wochen alle Themen drankommen.
 */

/** Montag 00:00 (lokal) der Woche von `datum`. */
export function wochenStart(datum = new Date()) {
  const d = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  const wochentag = (d.getDay() + 6) % 7; // Mo = 0
  d.setDate(d.getDate() - wochentag);
  return d;
}

/** Fortlaufende Wochennummer seit 1970 (für die Themen-Rotation). */
function wochenIndex(start) {
  // +3 Tage: 1.1.1970 war ein Donnerstag → Montag-Raster.
  return Math.floor((start.getTime() / 86400000 + 3) / 7);
}

/**
 * Baut die Challenges der Woche.
 * @param {{activity:Object<string,number>, progress:Object, objekte:Object[], jetzt?:Date}} eingabe
 * @returns {{id:string, label:string, ziel:number, wert:number, erfuellt:boolean, themaId?:string}[]}
 */
export function baueWochenChallenges({ activity = {}, progress = {}, objekte = [], jetzt = new Date() } = {}) {
  const start = wochenStart(jetzt);
  const tage = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return tagesKey(d);
  });
  const ende = new Date(start);
  ende.setDate(ende.getDate() + 7);

  const aktiveTage = tage.filter((k) => (activity[k] || 0) > 0).length;
  const bewertungen = tage.reduce((s, k) => s + (activity[k] || 0), 0);

  const thema = AP2_THEMEN[wochenIndex(start) % AP2_THEMEN.length];
  const imThema = new Set(objekteImThema(objekte, thema.id).map((o) => o.id));
  let themaReviews = 0;
  for (const id of imThema) {
    for (const h of progress[id]?.history || []) {
      const t = new Date(h.ts).getTime();
      if (t >= start.getTime() && t < ende.getTime()) themaReviews += 1;
    }
  }

  const c = (id, label, ziel, wert, extra = {}) => ({
    id,
    label,
    ziel,
    wert: Math.min(wert, ziel),
    erfuellt: wert >= ziel,
    ...extra,
  });
  return [
    c('tage', 'An 5 Tagen lernen', 5, aktiveTage),
    c('menge', '100 Lernobjekte bewerten', 100, bewertungen),
    c('thema', `Fokus: ${thema.titel} – 15 Wiederholungen`, 15, themaReviews, { themaId: thema.id }),
  ];
}
