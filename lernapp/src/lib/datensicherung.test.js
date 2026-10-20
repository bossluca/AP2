import { describe, it, expect } from 'vitest';
import {
  baueExport,
  parseImport,
  mergeStapel,
  neuereEinstufung,
  exportDateiname,
  BACKUP_FORMAT,
  BACKUP_VERSION,
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
    expect(r.einstufung).toEqual(einstufung);
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
