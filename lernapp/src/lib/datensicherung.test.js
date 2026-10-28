import { describe, it, expect } from 'vitest';
import {
  baueExport,
  parseImport,
  mergeStapel,
  neuereEinstufung,
  exportDateiname,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAX_BACKUP_BYTES,
  pruefeDateiGroesse,
} from './datensicherung';

const jetzt = new Date('2026-07-04T12:00:00.000Z');

describe('datensicherung', () => {
  it('Export → Import ist verlustfrei (Roundtrip)', () => {
    const progress = { q1: { status: 'gelernt', updatedAt: '2026-07-01T00:00:00.000Z' } };
    const gami = { activity: { '2026-07-04': 3 }, xp: 120, klausurBest: 85 };
    const text = JSON.stringify(baueExport(progress, gami, jetzt));
    const r = parseImport(text);
    expect(r.ok).toBe(true);
    expect(r.progress).toEqual(progress);
    expect(r.gamification).toEqual(gami);
    expect(r.anzahl).toBe(1);
  });

  it('Export trägt Format, Version und Zeitstempel', () => {
    const e = baueExport({}, {}, jetzt);
    expect(e.format).toBe(BACKUP_FORMAT);
    expect(e.version).toBe(BACKUP_VERSION);
    expect(e.exportiertAm).toBe('2026-07-04T12:00:00.000Z');
  });

  it('Dateiname enthält das Datum', () => {
    expect(exportDateiname(jetzt)).toBe('fisidev-backup-2026-07-04.json');
  });

  it('lehnt kaputtes JSON und fremde Dateien verständlich ab', () => {
    expect(parseImport('kein json').ok).toBe(false);
    expect(parseImport('42').ok).toBe(false);
    expect(parseImport('{"foo":1}').fehler).toMatch(/kein FiSi\.dev-Backup/);
  });

  it('lehnt Backups aus neueren App-Versionen ab', () => {
    const text = JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1 });
    expect(parseImport(text).fehler).toMatch(/neueren App-Version/);
  });

  it('verwirft defekte Einträge, behält gültige', () => {
    const text = JSON.stringify({
      format: BACKUP_FORMAT,
      version: 1,
      progress: { ok: { status: 'gelernt' }, kaputt: 'text', auchKaputt: null, liste: [1] },
    });
    const r = parseImport(text);
    expect(r.ok).toBe(true);
    expect(Object.keys(r.progress)).toEqual(['ok']);
    expect(r.anzahl).toBe(1);
  });
});

describe('Backup: eigene Karten + Einstufung', () => {
  const stapel = [{ id: 's1', name: 'Netz', erstellt: '2026-10-01', karten: [{ id: 'eigen_s1_0', front: 'a', back: 'b' }] }];
  const einstufung = { datum: '2026-10-20T10:00:00.000Z', auswertung: { themen: [], quote: 0 } };

  it('exportiert und liest beide Felder wieder ein', () => {
    const text = JSON.stringify(baueExport({}, {}, new Date(), { eigeneKarten: stapel, einstufung }));
    const r = parseImport(text);
    expect(r.eigeneKarten).toEqual(stapel);
    // Bereinigt (C4): fehlende Summen werden aus den Themen ergänzt.
    expect(r.einstufung).toEqual({ ...einstufung, auswertung: { ...einstufung.auswertung, richtig: 0, gesamt: 0 } });
  });

  it('ältere Backups ohne die Felder bleiben gültig', () => {
    const r = parseImport(JSON.stringify({ format: 'fisidev-backup', version: 1, progress: {} }));
    expect(r).toMatchObject({ ok: true, eigeneKarten: [], einstufung: null });
  });

  it('mergeStapel ergänzt nur neue IDs', () => {
    const lokal = [{ id: 's1', name: 'lokal', karten: [] }];
    const m = mergeStapel(lokal, [...stapel, { id: 's2', name: 'neu', karten: [] }, { kaputt: true }]);
    expect(m.map((s) => `${s.id}:${s.name}`)).toEqual(['s1:lokal', 's2:neu']);
  });

  it('neuereEinstufung nimmt die jüngere', () => {
    const alt = { ...einstufung, datum: '2026-09-01T00:00:00.000Z' };
    expect(neuereEinstufung(alt, einstufung)).toBe(einstufung);
    expect(neuereEinstufung(einstufung, alt)).toBe(einstufung);
    expect(neuereEinstufung(null, alt)).toBe(alt);
    expect(neuereEinstufung(null, null)).toBeNull();
  });
});

describe('Bösartige Backups (C4)', () => {
  const backup = (teile) => JSON.stringify({ format: 'fisidev-backup', version: 1, ...teile });

  it('Karte null und name als Objekt: kaputte Teile weg, gültige bleiben', () => {
    const r = parseImport(
      backup({
        eigeneKarten: [
          { id: 's1', name: { boese: 1 }, karten: [null, { id: 'eigen_s1_0', front: 'a', back: 'b' }] },
          null,
        ],
      })
    );
    expect(r.ok).toBe(true);
    expect(r.eigeneKarten).toEqual([{ id: 's1', name: 'Eigener Stapel', karten: [{ id: 'eigen_s1_0', front: 'a', back: 'b' }] }]);
    expect(r.verworfen).toBe(2);
  });

  it('history: 5, difficulty <= 0, due: "kaputt" werden repariert', () => {
    const r = parseImport(
      backup({ progress: { q1: { status: 'gelernt', history: 5, difficulty: 0, stability: 2, due: 'kaputt' } } })
    );
    expect(r.progress.q1).toEqual({ status: 'gelernt', difficulty: 1, stability: 2 });
    expect(r.anzahl).toBe(1);
  });

  it('kaputte Einstufung wird verworfen und gezählt', () => {
    const r = parseImport(backup({ einstufung: { datum: 'x', auswertung: { themen: 5 } } }));
    expect(r.einstufung).toBeNull();
    expect(r.verworfen).toBe(1);
  });

  it('__proto__ und constructor werden nicht übernommen', () => {
    const r = parseImport(
      '{"format":"fisidev-backup","version":1,"progress":{"__proto__":{"status":"gelernt"},"constructor":{"status":"ueben"},"q":{"status":"ueben"}},' +
        '"gamification":{"activity":{"__proto__":5,"2026-01-01":2},"xp":10}}'
    );
    expect(Object.keys(r.progress)).toEqual(['q']);
    expect(r.progress.status).toBeUndefined();
    expect(Object.getPrototypeOf(r.progress)).toBe(Object.prototype);
    expect(r.gamification.activity).toEqual({ '2026-01-01': 2 });
    expect(r.verworfen).toBe(3);
  });

  it('zu große Datei wird abgelehnt', () => {
    expect(pruefeDateiGroesse(MAX_BACKUP_BYTES + 1)).toMatch(/zu groß/);
    expect(pruefeDateiGroesse(1000)).toBeNull();
    const r = parseImport(' '.repeat(MAX_BACKUP_BYTES + 1));
    expect(r.ok).toBe(false);
    expect(r.fehler).toMatch(/zu groß/);
  });
});
