import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Konsistentes Online-Backup der SQLite-Datenbank – auch während der Server
 * läuft. `VACUUM INTO` schreibt einen transaktionssicheren, kompakten
 * Schnappschuss (inkl. noch nicht ins Hauptfile übernommener WAL-Inhalte).
 * Ein simples Kopieren der .sqlite-Datei kann dagegen im WAL-Modus
 * unvollständig oder inkonsistent sein.
 *
 * Danach wird die Kopie mit `PRAGMA integrity_check` geprüft und eine kurze
 * Statistik (Konten, Fortschritts-Einträge) zurückgegeben.
 *
 * @param {string} quellPfad  Pfad der Live-Datenbank.
 * @param {string} zielPfad   Pfad der Backup-Datei (darf nicht existieren).
 * @returns {{ziel:string, bytes:number, konten:number, eintraege:number}}
 */
export function sichereDatenbank(quellPfad, zielPfad) {
  if (!existsSync(quellPfad)) throw new Error(`Datenbank nicht gefunden: ${quellPfad}`);
  if (existsSync(zielPfad)) throw new Error(`Ziel existiert bereits: ${zielPfad}`);
  mkdirSync(dirname(zielPfad), { recursive: true });

  const quelle = new DatabaseSync(quellPfad, { readOnly: true });
  try {
    // Pfad als Parameter – kein String-Zusammenbau im SQL.
    quelle.prepare('VACUUM INTO ?').run(zielPfad);
  } finally {
    quelle.close();
  }
  return pruefeBackup(zielPfad);
}

/**
 * Prüft eine Backup-Datei (Integrität + Plausibilität). Wirft bei Defekt.
 * @param {string} pfad
 */
export function pruefeBackup(pfad) {
  const db = new DatabaseSync(pfad, { readOnly: true });
  try {
    const ergebnis = db.prepare('PRAGMA integrity_check').get();
    const ok = Object.values(ergebnis)[0];
    if (ok !== 'ok') throw new Error(`Integritätsprüfung fehlgeschlagen: ${ok}`);
    const konten = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const eintraege = db.prepare('SELECT COUNT(*) AS n FROM progress').get().n;
    return { ziel: pfad, bytes: statSync(pfad).size, konten, eintraege };
  } finally {
    db.close();
  }
}

// CLI: node src/backup.js <ziel.sqlite>   |   node src/backup.js --pruefe <datei>
const istCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (istCli) {
  try {
    const [arg1, arg2] = process.argv.slice(2);
    const ergebnis =
      arg1 === '--pruefe'
        ? pruefeBackup(arg2)
        : sichereDatenbank(process.env.DB_PATH || './data/lernapp.sqlite', arg1);
    console.log(JSON.stringify(ergebnis));
  } catch (err) {
    console.error(`Backup-Fehler: ${err.message}`);
    process.exit(1);
  }
}
