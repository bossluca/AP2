/**
 * Name des Service-Worker-Laufzeit-Caches für den Prüfungsdaten-Chunk
 * (`assets/examdata-*.js`, C9). Der Chunk ist nicht im Precache, sondern wird
 * erst nach dem Login geladen und dann per CacheFirst offline vorgehalten.
 * Von `vite.config.js` (Workbox) und vom Logout (Löschen) gemeinsam genutzt.
 */
export const EXAMDATEN_CACHE = 'fisidev-examdata-v1';

/**
 * Löscht den Laufzeit-Cache der Prüfungsdaten (Logout/Kontowechsel), damit sie
 * ohne Sitzung nicht mehr aus dem Browser-Cache kommen. Best-effort: ohne
 * Cache-API (alte Browser, Tests, unsicherer Kontext) passiert nichts.
 * @returns {Promise<boolean>}
 */
export async function loescheExamdatenCache() {
  try {
    if (typeof caches === 'undefined' || !caches?.delete) return false;
    return await caches.delete(EXAMDATEN_CACHE);
  } catch {
    return false;
  }
}
