import { describe, it, expect } from 'vitest';
import { baueLernpfade, findePfad, READY_SCHWELLE } from './lernpfade';

const NOW = new Date('2026-06-01T00:00:00Z');

/** Frisch gefestigtes FSRS-Objekt → Abrufwahrscheinlichkeit ≈ 1 (mastery hoch). */
function fest() {
  return { stability: 100, difficulty: 5, last_review: NOW.toISOString(), box: 5 };
}

/** Lerneinheit-Fixture. */
function le(id, kategorie, titel = id) {
  return { id, kategorie, titel, pruefungsteil: 'AP1', thema_tags: [] };
}

describe('baueLernpfade – Gruppierung & Reihenfolge', () => {
  it('gruppiert nach nummerierter Kategorie und sortiert aufsteigend', () => {
    const einheiten = [
      le('b1', '2. Hardware'),
      le('a1', '1. Grundlagen'),
      le('a2', '1. Grundlagen'),
      le('k1', '11. IT-Sicherheit und Datenschutz'),
    ];
    const pfade = baueLernpfade(einheiten, {}, NOW);
    expect(pfade.map((p) => p.nummer)).toEqual([1, 2, 11]); // numerisch, nicht lexikografisch
    expect(pfade[0].titel).toBe('Grundlagen');
    expect(pfade[0].n).toBe(2);
    expect(pfade[0].id).toBe('pfad-01');
    expect(pfade[2].id).toBe('pfad-11');
  });

  it('ignoriert Lerneinheiten ohne Nummern-Kategorie (AP2-Themen)', () => {
    const einheiten = [le('a1', '1. Grundlagen'), le('x1', 'Protokolle'), le('y1', 'VPN')];
    const pfade = baueLernpfade(einheiten, {}, NOW);
    expect(pfade).toHaveLength(1);
    expect(pfade[0].nummer).toBe(1);
  });

  it('vergibt je Pfad ein Icon (mit Fallback)', () => {
    const pfade = baueLernpfade([le('a', '1. Grundlagen'), le('z', '99. Unbekannt')], {}, NOW);
    expect(pfade[0].icon).toBe('BookOpen');
    expect(pfade[1].icon).toBe('GraduationCap'); // Fallback
  });
});

describe('baueLernpfade – Mastery & Status', () => {
  it('leerer Fortschritt → Mastery 0, erstes Modul aktiv, Rest offen', () => {
    const einheiten = [le('a', '1. Grundlagen'), le('b', '1. Grundlagen'), le('c', '1. Grundlagen')];
    const [pfad] = baueLernpfade(einheiten, {}, NOW);
    expect(pfad.mastery).toBe(0);
    expect(pfad.erledigt).toBe(false);
    expect(pfad.module.map((m) => m.status)).toEqual(['aktiv', 'offen', 'offen']);
    expect(pfad.aktivesModul.id).toBe('a');
    expect(pfad.fertigeModule).toBe(0);
  });

  it('Mittelt die Modul-Mastery und markiert fertige Module', () => {
    const einheiten = [le('a', '1. Grundlagen'), le('b', '1. Grundlagen')];
    const progress = { a: fest() }; // a ≈ 1, b = 0
    const [pfad] = baueLernpfade(einheiten, progress, NOW);
    expect(pfad.mastery).toBeGreaterThan(0.45);
    expect(pfad.mastery).toBeLessThan(0.55);
    expect(pfad.module[0].status).toBe('fertig'); // a über Schwelle
    expect(pfad.module[0].mastery).toBeGreaterThanOrEqual(READY_SCHWELLE);
    expect(pfad.module[1].status).toBe('aktiv'); // b ist das erste nicht-fertige
    expect(pfad.fertigeModule).toBe(1);
  });

  it('Status „gelernt" zählt als fertig (auch ohne FSRS-Beleg)', () => {
    const einheiten = [le('a', '1. Grundlagen'), le('b', '1. Grundlagen')];
    const [pfad] = baueLernpfade(einheiten, { a: { status: 'gelernt' } }, NOW);
    expect(pfad.module[0].status).toBe('fertig');
    expect(pfad.module[1].status).toBe('aktiv');
  });

  it('alle Module fertig → erledigt, kein aktives Modul', () => {
    const einheiten = [le('a', '1. Grundlagen'), le('b', '1. Grundlagen')];
    const [pfad] = baueLernpfade(einheiten, { a: fest(), b: fest() }, NOW);
    expect(pfad.erledigt).toBe(true);
    expect(pfad.aktivesModul).toBeNull();
    expect(pfad.module.every((m) => m.status === 'fertig')).toBe(true);
  });
});

describe('findePfad', () => {
  it('findet per Slug-ID, sonst null', () => {
    const pfade = baueLernpfade([le('a', '7. Projektmanagement')], {}, NOW);
    expect(findePfad(pfade, 'pfad-07').nummer).toBe(7);
    expect(findePfad(pfade, 'pfad-99')).toBeNull();
    expect(findePfad(null, 'pfad-07')).toBeNull();
  });
});

describe('Robustheit', () => {
  it('leere/fehlende Eingaben → leeres Array, kein Crash', () => {
    expect(baueLernpfade([], {}, NOW)).toEqual([]);
    expect(baueLernpfade(undefined, undefined, NOW)).toEqual([]);
  });
});
