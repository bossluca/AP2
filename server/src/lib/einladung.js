import { createHash, randomBytes } from 'node:crypto';

/**
 * Reine Helfer für Einladungs-Codes und den Registrierungsmodus.
 */

/** Alphabet ohne verwechselbare Zeichen (kein I/O/0/1). */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Erlaubte Registrierungsmodi; Default „open" (abwärtskompatibel). */
export const REGISTRIERUNG = ['open', 'invite', 'closed'];

/** Liest den Modus aus der Umgebung, Unbekanntes fällt auf „open" zurück. */
export function registrierungsModus(wert) {
  const v = String(wert || '').trim().toLowerCase();
  return REGISTRIERUNG.includes(v) ? v : 'open';
}

/** Admin-E-Mails aus `ADMIN_EMAILS` (Komma-/Leerzeichen-getrennt, klein). */
export function adminEmails(wert) {
  return new Set(
    String(wert || '')
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Neuer Einladungs-Code `XXXX-XXXX-XXXX` (~60 Bit). */
export function erzeugeEinladungsCode() {
  const bytes = randomBytes(12);
  let code = '';
  for (let i = 0; i < 12; i += 1) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

/** Normalisiert Nutzereingabe (Groß/klein, Bindestriche, Leerzeichen). */
export function normalisiereEinladung(code) {
  return typeof code === 'string' ? code.toUpperCase().replace(/[^A-Z2-9]/g, '') : '';
}

/** SHA-256 des normalisierten Codes (Codes sind zufällig → kein langsamer Hash nötig). */
export function hashEinladung(code) {
  return createHash('sha256').update(normalisiereEinladung(code)).digest('hex');
}

/**
 * Ist eine Einladung (DB-Zeile) noch einlösbar?
 * @param {{uses:number, max_uses:number, expires_at?:string|null}|undefined} row
 * @param {Date} [jetzt]
 */
export function einladungGueltig(row, jetzt = new Date()) {
  if (!row) return false;
  if (row.uses >= row.max_uses) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() < jetzt.getTime()) return false;
  return true;
}
