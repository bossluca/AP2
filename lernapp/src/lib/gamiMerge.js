/**
 * Mischt zwei Gamification-Stände (lokal ↔ Konto) zusammen. **Max-basiert** und
 * damit kommutativ & idempotent: kein Stand geht verloren, mehrfaches Mergen
 * ändert nichts mehr. Genutzt beim Login, um den lokalen Stand ins Konto zu
 * übernehmen, ohne den Server-Stand zu unterbieten.
 *
 * @param {{activity?:Object<string,number>, xp?:number, klausurBest?:number}|null} a
 * @param {{activity?:Object<string,number>, xp?:number, klausurBest?:number}|null} b
 * @returns {{activity:Object<string,number>, xp:number, klausurBest:number}}
 */
export function mergeGamification(a, b) {
  const x = a || {};
  const y = b || {};
  const activity = {};
  const keys = new Set([...Object.keys(x.activity || {}), ...Object.keys(y.activity || {})]);
  for (const k of keys) {
    activity[k] = Math.max(Number(x.activity?.[k]) || 0, Number(y.activity?.[k]) || 0);
  }
  return {
    activity,
    xp: Math.max(Number(x.xp) || 0, Number(y.xp) || 0),
    klausurBest: Math.max(Number(x.klausurBest) || 0, Number(y.klausurBest) || 0),
  };
}
