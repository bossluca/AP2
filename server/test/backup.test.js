import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../src/db.js';
import { sichereDatenbank, pruefeBackup } from '../src/backup.js';

test('Online-Backup enthält auch WAL-Daten, ist integer und zählt Konten', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fisidev-backup-'));
  try {
    const live = join(dir, 'live.sqlite');
    const db = openDb(live); // WAL-Modus, Verbindung bleibt offen (wie im Betrieb)
    db.prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)').run('a@b.de', 'h', 'x');
    db.prepare(
      'INSERT INTO progress (user_id, item_id, status, updated_at) VALUES (1, ?, ?, ?)'
    ).run('q1', 'gelernt', 'x');

    const ergebnis = sichereDatenbank(live, join(dir, 'sub', 'backup.sqlite'));
    assert.equal(ergebnis.konten, 1);
    assert.equal(ergebnis.eintraege, 1);
    assert.ok(ergebnis.bytes > 0);
    db.close();

    assert.throws(() => sichereDatenbank(live, ergebnis.ziel), /existiert bereits/);
    assert.throws(() => sichereDatenbank(join(dir, 'fehlt.sqlite'), join(dir, 'x.sqlite')), /nicht gefunden/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('pruefeBackup erkennt kaputte Dateien', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fisidev-backup-'));
  try {
    const kaputt = join(dir, 'kaputt.sqlite');
    writeFileSync(kaputt, 'das ist keine datenbank'.repeat(100));
    assert.throws(() => pruefeBackup(kaputt));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
