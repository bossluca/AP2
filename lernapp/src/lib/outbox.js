/**
 * Offline-Outbox für Server-Writes des Fortschritts: schlägt ein
 * `PUT /api/progress/:id` fehl (offline, Server kurz weg), wird der Eintrag
 * hier gepuffert und beim nächsten Anlass (online-Event, Login, nächster
 * erfolgreicher Write) nachgeschrieben. Vorher gingen solche Writes
 * stillschweigend verloren, bis zum nächsten Login-Merge.
 *
 * Reine Listen-Logik + dünne localStorage-Helfer; der Sende-Kanal wird
 * injiziert (testbar ohne Netz).
 */

const KEY = 'ap2_lernapp_outbox_v1';

/**
 * @typedef {{id:string, entry:Object, userId?:number|string}} OutboxEintrag
 *          `userId` bindet den Eintrag an das Konto, unter dem er entstand (C1):
 *          gesendet wird er nur unter genau diesem Konto.
 */

/** Lädt die Outbox defensiv aus localStorage (kaputt/leer → []). */
export function ladeOutbox() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      return parsed.filter((e) => e && typeof e.id === 'string' && e.entry);
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Persistiert die Outbox (leere Liste räumt den Schlüssel auf). */
export function speichereOutbox(liste) {
  try {
    if (!liste || liste.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(liste));
  } catch {
    /* ignore */
  }
}

/**
 * Merkt einen fehlgeschlagenen Write. Pro Objekt-ID wird koalesziert:
 * der neueste Stand ersetzt einen evtl. schon gepufferten (ein Objekt
 * braucht nur seinen letzten Stand, nicht die Zwischenschritte).
 * @param {OutboxEintrag[]} liste
 * @param {string} id
 * @param {Object} entry
 * @param {number|string} [userId]  Konto, unter dem der Write entstand.
 * @returns {OutboxEintrag[]} neue Liste
 */
export function merkeEintrag(liste, id, entry, userId) {
  const ohne = liste.filter((e) => !(e.id === id && e.userId === userId));
  return [...ohne, userId === undefined ? { id, entry } : { id, entry, userId }];
}

/**
 * HTTP-Status, bei denen ein erneuter Versuch nie hilft: Der Server hat den
 * Eintrag inhaltlich abgelehnt (C3: ungültig 400, zu groß/Obergrenze 413,
 * ID zu lang 414, Konflikt 409, 422). Solche Einträge werden verworfen statt
 * die Outbox dauerhaft zu blockieren. 401/5xx/Netzfehler bleiben liegen.
 */
export const ENDGUELTIG_ABGELEHNT = Object.freeze([400, 409, 413, 414, 422]);

/**
 * Versucht, alle gepufferten Einträge **des angegebenen Kontos** zu senden.
 * Einträge eines anderen Kontos (oder ohne Konto-Bindung aus der Zeit vor C1)
 * werden nie gesendet, sondern verworfen – ihr Stand gehört nicht in dieses
 * Konto. Bricht beim ersten vorübergehenden Fehler ab (Reihenfolge bleibt
 * erhalten, kein Hämmern gegen einen toten Server); endgültig abgelehnte
 * Einträge (s. `ENDGUELTIG_ABGELEHNT`) werden übersprungen und gezählt.
 * @param {OutboxEintrag[]} liste
 * @param {(id:string, entry:Object) => Promise} sende
 * @param {number|string} [userId]  aktuelles Konto
 * @returns {Promise<{rest:OutboxEintrag[], gesendet:number, verworfen:number, abgelehnt:number}>}
 */
export async function flusheOutbox(liste, sende, userId) {
  const eigene = liste.filter((e) => e.userId === userId);
  const verworfen = liste.length - eigene.length;
  let gesendet = 0;
  let abgelehnt = 0;
  for (let i = 0; i < eigene.length; i++) {
    const e = eigene[i];
    try {
      await sende(e.id, e.entry);
      gesendet += 1;
    } catch (err) {
      if (ENDGUELTIG_ABGELEHNT.includes(err?.status)) {
        abgelehnt += 1;
        continue;
      }
      return { rest: eigene.slice(i), gesendet, verworfen, abgelehnt };
    }
  }
  return { rest: [], gesendet, verworfen, abgelehnt };
}
