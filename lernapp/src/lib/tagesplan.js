import { istFaellig } from './fsrs';

/**
 * Tagesplan rückwärts vom Prüfungstermin: verbindet FSRS-Fälligkeiten,
 * offene (noch nie geübte) Objekte und den Countdown zu einer ehrlichen
 * Tagesempfehlung – „heute X Wiederholungen + Y neue, dann bist du bis zur
 * AP2 einmal durch den Stoff". Rein & getestet; Zeit injizierbar.
 */

/** Ab wie vielen Objekten/Tag der Plan als „sportlich" gilt. */
const SPORTLICH_AB = 40;
/** Bis zu wie vielen Objekten/Tag der Plan als „locker" gilt. */
const LOCKER_BIS = 15;

/**
 * @param {Array<{id:string}>} objekte  Lernbare Objekte (Fragen + Lernzettel).
 * @param {Object.<string, Object>} progress  Fortschritts-Map.
 * @param {string|null} termin  Prüfungstermin `YYYY-MM-DD` (oder null).
 * @param {Date} [jetzt]
 * @returns {null | {
 *   tage:number, wiederholungenHeute:number, neu:number, neuProTag:number,
 *   pensumHeute:number, einschaetzung:'locker'|'gut'|'sportlich',
 *   schaffbarBisTermin:boolean
 * }} null ohne (zukünftigen) Termin.
 */
export function baueTagesplan(objekte, progress, termin, jetzt = new Date()) {
  if (!termin) return null;
  const ziel = new Date(`${termin}T00:00:00`);
  if (Number.isNaN(ziel.getTime())) return null;
  const heute0 = new Date(jetzt);
  heute0.setHours(0, 0, 0, 0);
  const tage = Math.round((ziel.getTime() - heute0.getTime()) / 86400000);
  if (tage <= 0) return null;

  let wiederholungenHeute = 0;
  let neu = 0;
  for (const o of objekte || []) {
    const entry = progress?.[o.id];
    const geuebt = entry && (Number(entry.reps) > 0 || Number(entry.box) > 0 || entry.status);
    if (!geuebt) {
      neu += 1;
    } else if (istFaellig(entry, jetzt)) {
      wiederholungenHeute += 1;
    }
  }

  // Neue Objekte gleichmäßig auf die verbleibenden Tage verteilen; der letzte
  // Tag vor der Prüfung bleibt fürs reine Wiederholen frei (wenn möglich).
  const lernTage = Math.max(1, tage - 1);
  const neuProTag = Math.ceil(neu / lernTage);
  const pensumHeute = wiederholungenHeute + Math.min(neu, neuProTag);

  const einschaetzung =
    pensumHeute <= LOCKER_BIS ? 'locker' : pensumHeute <= SPORTLICH_AB ? 'gut' : 'sportlich';

  return {
    tage,
    wiederholungenHeute,
    neu,
    neuProTag,
    pensumHeute,
    einschaetzung,
    // Ehrliche Ansage: reicht die Zeit, um alle neuen Objekte noch zu sehen?
    schaffbarBisTermin: neuProTag <= SPORTLICH_AB,
  };
}
