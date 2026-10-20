import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { erzeugeEinladungsCode, hashEinladung } from './lib/einladung.js';

/**
 * Legt eine Einladung an und gibt den Klartext-Code zurück (gespeichert wird
 * nur der Hash). Genutzt vom Admin-Bereich und von der Betreiber-CLI.
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{maxUses?:number, gueltigTage?:number, notiz?:string, erstelltVon?:number|null, jetzt?:Date}} [opt]
 * @returns {{code:string, maxUses:number, laeuftAb:string|null}}
 */
export function erstelleEinladung(db, { maxUses = 1, gueltigTage = 14, notiz = '', erstelltVon = null, jetzt = new Date() } = {}) {
  const uses = Math.floor(Number(maxUses));
  const tage = Math.floor(Number(gueltigTage));
  if (!(uses >= 1 && uses <= 100)) throw new RangeError('maxUses: 1–100.');
  if (!(tage >= 0 && tage <= 365)) throw new RangeError('gueltigTage: 0–365 (0 = unbegrenzt).');
  const code = erzeugeEinladungsCode();
  const ablauf = tage > 0 ? new Date(jetzt.getTime() + tage * 86400000).toISOString() : null;
  db.prepare(
    `INSERT INTO invites (code_hash, hinweis, notiz, max_uses, created_by, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(hashEinladung(code), code.slice(0, 4), String(notiz).slice(0, 80), uses, erstelltVon, jetzt.toISOString(), ablauf);
  return { code, maxUses: uses, laeuftAb: ablauf };
}

// CLI für den Betreiber (Erst-Einrichtung bei REGISTRATION=invite):
//   docker compose exec backend node src/einladung-cli.js [notiz]
// Erzeugt eine Einmal-Einladung, 1 Tag gültig. Wer den Befehl ausführen kann,
// hat Serverzugriff – das ist der Nachweis, nicht eine E-Mail-Adresse.
const istCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (istCli) {
  const db = openDb(process.env.DB_PATH || './data/lernapp.sqlite');
  try {
    const notiz = process.argv.slice(2).join(' ') || 'Erst-Einrichtung (CLI)';
    const { code, laeuftAb } = erstelleEinladung(db, { maxUses: 1, gueltigTage: 1, notiz });
    console.log(`Einladungscode: ${code}  (1x nutzbar, gültig bis ${laeuftAb})`);
  } catch (err) {
    console.error(`Fehler: ${err.message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
