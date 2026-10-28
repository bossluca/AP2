/**
 * Sicherheitsprotokoll (S8/C6): Wer hat sich wann von welcher IP angemeldet,
 * wer ist gescheitert, was hat ein Admin getan?
 *
 * Grundsätze:
 *  - Nur feste Ereignis-Namen (Whitelist), kurze Details (≤ 120 Zeichen).
 *  - **Niemals** Passwörter, Codes, Tokens, Cookie-Werte oder E-Mail-Adressen
 *    speichern. Details erzeugt nur der Server-Code selbst; zusätzlich werden
 *    E-Mail-artige Zeichenketten und lange Hex-/Code-Folgen hart maskiert.
 *  - Fehlertolerant: Ein Audit-Fehler lässt nie eine Anfrage scheitern.
 *  - Aufbewahrung 90 Tage + Zeilen-Obergrenze (`raeumeAuditAuf`).
 */

/** Erlaubte Ereignisse (Reihenfolge = Anzeige-Reihenfolge im Filter). */
export const AUDIT_EREIGNISSE = Object.freeze([
  'login_ok',
  'login_fehlgeschlagen',
  'login_gebremst',
  'registrierung',
  'registrierung_abgelehnt',
  'registrierung_gebremst',
  'recovery_ok',
  'recovery_fehlgeschlagen',
  'recovery_gebremst',
  'recovery_code_erneuert',
  'passwort_bestaetigung_fehlgeschlagen',
  'passwort_bestaetigung_gebremst',
  'konto_geloescht',
  'konto_gesperrt',
  'konto_entsperrt',
  'einladung_erzeugt',
  'einladung_geloescht',
]);
const EREIGNIS_SET = new Set(AUDIT_EREIGNISSE);

export const AUDIT_DETAIL_MAX = 120;
export const AUDIT_AUFBEWAHRUNG_TAGE = 90;
export const AUDIT_MAX_ZEILEN = 50_000;

/** E-Mail-artige Folgen und lange Hex-/Code-Folgen (Token, Hashes, Codes). */
const EMAIL_RE = /[^\s@]+@[^\s@]+/g;
const HEX_RE = /\b[0-9a-f]{16,}\b/gi;
const CODE_RE = /\b[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,}\b/g;

/**
 * Bereinigt einen Detail-Text: Steuerzeichen raus, Geheimnis-artige Folgen
 * maskieren, auf 120 Zeichen kürzen. Leere Details → null.
 * @param {unknown} detail
 * @returns {string|null}
 */
export function bereinigeDetail(detail) {
  if (detail === undefined || detail === null) return null;
  let s = String(detail)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(EMAIL_RE, '[E-Mail]')
    .replace(CODE_RE, '[Code]')
    .replace(HEX_RE, '[Hex]')
    .trim();
  if (!s) return null;
  if (s.length > AUDIT_DETAIL_MAX) s = `${s.slice(0, AUDIT_DETAIL_MAX - 1)}…`;
  return s;
}

/**
 * Baut eine Audit-Zeile (rein, ohne DB). Wirft bei unbekanntem Ereignis –
 * der Aufrufer `audit()` fängt das ab.
 * @param {{ereignis:string, kontoId?:number|null, ip?:string|null, detail?:string|null}} eintrag
 * @param {Date} [jetzt]
 */
export function baueAuditZeile({ ereignis, kontoId = null, ip = null, detail = null } = {}, jetzt = new Date()) {
  if (!EREIGNIS_SET.has(ereignis)) throw new RangeError(`Unbekanntes Audit-Ereignis: ${ereignis}`);
  const id = Number.isInteger(kontoId) && kontoId > 0 ? kontoId : null;
  const ipText = typeof ip === 'string' && ip ? ip.slice(0, 64) : null;
  return { zeit: jetzt.toISOString(), ereignis, konto_id: id, ip: ipText, detail: bereinigeDetail(detail) };
}

/**
 * Schreibt einen Audit-Eintrag. Fehlertolerant: gibt `false` zurück statt zu
 * werfen (optional mit Warnung im Log), damit nie eine Anfrage scheitert.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {Parameters<typeof baueAuditZeile>[0]} eintrag
 * @param {{log?: {warn: Function}, jetzt?: Date}} [opt]
 * @returns {boolean}
 */
export function audit(db, eintrag, { log, jetzt } = {}) {
  try {
    const z = baueAuditZeile(eintrag, jetzt);
    db.prepare('INSERT INTO audit (zeit, ereignis, konto_id, ip, detail) VALUES (?, ?, ?, ?, ?)').run(
      z.zeit,
      z.ereignis,
      z.konto_id,
      z.ip,
      z.detail
    );
    return true;
  } catch (err) {
    try {
      log?.warn?.({ err: err?.message }, 'Audit-Eintrag konnte nicht geschrieben werden.');
    } catch {
      /* Logger selbst defekt – ignorieren */
    }
    return false;
  }
}

/**
 * Stichtag für die Aufbewahrung (rein).
 * @param {Date} jetzt
 * @param {number} tage
 */
export function auditStichtag(jetzt = new Date(), tage = AUDIT_AUFBEWAHRUNG_TAGE) {
  return new Date(jetzt.getTime() - tage * 24 * 60 * 60 * 1000);
}

/**
 * Entfernt Einträge älter als `tage` und kappt die Tabelle auf die jüngsten
 * `maxZeilen` Einträge (Schutz gegen Fluten durch Fehlversuche).
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{jetzt?: Date, tage?: number, maxZeilen?: number}} [opt]
 * @returns {number} Anzahl entfernter Einträge.
 */
export function raeumeAuditAuf(db, { jetzt = new Date(), tage = AUDIT_AUFBEWAHRUNG_TAGE, maxZeilen = AUDIT_MAX_ZEILEN } = {}) {
  const alt = db.prepare('DELETE FROM audit WHERE zeit < ?').run(auditStichtag(jetzt, tage).toISOString());
  const zuviel = db
    .prepare('DELETE FROM audit WHERE id NOT IN (SELECT id FROM audit ORDER BY zeit DESC, id DESC LIMIT ?)')
    .run(maxZeilen);
  return Number(alt.changes) + Number(zuviel.changes);
}

/**
 * Liest und prüft die Query-Parameter von GET /api/admin/audit (rein).
 * @returns {{ok:true, limit:number, ereignis:string|null} | {ok:false, fehler:string}}
 */
export function auditAbfrage(query = {}) {
  let limit = 100;
  if (query.limit !== undefined && query.limit !== '') {
    const n = Number(query.limit);
    if (!Number.isInteger(n) || n < 1) return { ok: false, fehler: 'limit muss eine ganze Zahl ≥ 1 sein.' };
    limit = Math.min(n, 500);
  }
  const ereignis = typeof query.ereignis === 'string' && query.ereignis !== '' ? query.ereignis : null;
  if (ereignis !== null && !EREIGNIS_SET.has(ereignis)) return { ok: false, fehler: 'Unbekanntes Ereignis.' };
  return { ok: true, limit, ereignis };
}
