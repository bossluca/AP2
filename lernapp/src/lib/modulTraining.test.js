import { describe, it, expect } from 'vitest';
import { baueModulTraining, werteTrainingAus, STANDARD_TRAINING } from './modulTraining';

/** Deterministischer RNG (immer 0) → stabile Reihenfolge in den Tests. */
const rng0 = () => 0;

/** Lerneinheit mit einigen fettgedruckten Glossar-Zeilen (für Cloze-Ertrag). */
function einheit(overrides = {}) {
  return {
    id: 'lz1',
    titel: 'OSI-Modell',
    pruefungsteil: 'AP1',
    thema_tags: ['OSI-Modell', 'Netzwerk/IP-Adressierung'],
    inhalt_text: [
      '**Vermittlungsschicht** sorgt für die Wegfindung im Netz zwischen Quelle und Ziel.',
      '**Transportschicht** stellt die Ende-zu-Ende-Verbindung zwischen den Anwendungen her.',
      '**Sicherungsschicht** sichert die Übertragung auf dem direkten Abschnitt ab.',
      '**Bitübertragungsschicht** überträgt die rohen Bits über das physische Medium.',
      '**Anwendungsschicht** stellt die Dienste direkt für die Programme bereit.',
      'Eine Zeile ganz ohne Fettung liefert keine Lücke.',
    ].join('\n'),
    ...overrides,
  };
}

/** Prüfungsfrage-Fixture. */
function frage(id, tags, { hat_antwort = true, ist_kontext_block = false } = {}) {
  return { id, thema_tags: tags, hat_antwort, ist_kontext_block, frage_text: id };
}

describe('baueModulTraining – Aufbau & Quellen', () => {
  it('stellt den Lernzettel-Schritt immer an den Anfang', () => {
    const schritte = baueModulTraining(einheit(), { alleFragen: [] }, { rng: rng0 });
    expect(schritte[0].typ).toBe('lernzettel');
    expect(schritte[0].id).toBe('mt_lz_lz1');
    expect(schritte[0].back).toContain('Vermittlungsschicht');
  });

  it('erzeugt Cloze-Schritte aus dem Lernzettel (begrenzt durch maxCloze)', () => {
    const schritte = baueModulTraining(
      einheit(),
      { alleFragen: [] },
      { rng: rng0, maxCloze: 2, maxFragen: 0 }
    );
    const cloze = schritte.filter((s) => s.typ === 'cloze');
    expect(cloze).toHaveLength(2);
    expect(cloze[0].text).toContain('{{'); // enthält eine Lücke
  });

  it('nimmt nur thematisch passende, lösbare Fragen auf', () => {
    const fragen = [
      frage('f_pass', ['OSI-Modell']),
      frage('f_pass2', ['Netzwerk/IP-Adressierung', 'Sonstiges']),
      frage('f_fremd', ['Kostenrechnung/Wirtschaft']),
      frage('f_kontext', ['OSI-Modell'], { ist_kontext_block: true }),
      frage('f_ohneloesung', ['OSI-Modell'], { hat_antwort: false }),
    ];
    const schritte = baueModulTraining(
      einheit(),
      { alleFragen: fragen },
      { rng: rng0, maxCloze: 0, maxFragen: 10 }
    );
    const frageIds = schritte.filter((s) => s.typ === 'frage').map((s) => s.id);
    expect(frageIds).toContain('f_pass');
    expect(frageIds).toContain('f_pass2');
    expect(frageIds).not.toContain('f_fremd');
    expect(frageIds).not.toContain('f_kontext');
    expect(frageIds).not.toContain('f_ohneloesung');
  });

  it('begrenzt die Fragen auf maxFragen', () => {
    const fragen = Array.from({ length: 12 }, (_, i) => frage(`f${i}`, ['OSI-Modell']));
    const schritte = baueModulTraining(
      einheit(),
      { alleFragen: fragen },
      { rng: rng0, maxFragen: 3, maxCloze: 0 }
    );
    expect(schritte.filter((s) => s.typ === 'frage')).toHaveLength(3);
  });

  it('nutzt die echte Frage-ID als Schritt-ID (SRS-Fortschritt landet richtig)', () => {
    const schritte = baueModulTraining(
      einheit(),
      { alleFragen: [frage('2022_Frühjahr_1a', ['OSI-Modell'])] },
      { rng: rng0, maxCloze: 0 }
    );
    const fr = schritte.find((s) => s.typ === 'frage');
    expect(fr.id).toBe('2022_Frühjahr_1a');
  });

  it('ist robust ohne Einheit und ohne Fragen', () => {
    expect(baueModulTraining(null, { alleFragen: [] })).toEqual([]);
    const schritte = baueModulTraining(einheit({ thema_tags: [] }), {});
    expect(schritte[0].typ).toBe('lernzettel'); // Lernzettel kommt auch ohne Tags/Fragen
  });

  it('verwendet sinnvolle Standard-Obergrenzen', () => {
    expect(STANDARD_TRAINING.maxCloze).toBeGreaterThan(0);
    expect(STANDARD_TRAINING.maxFragen).toBeGreaterThan(0);
  });
});

describe('werteTrainingAus', () => {
  it('zählt richtig/teilweise/falsch und bildet den gewichteten Prozentwert', () => {
    const r = werteTrainingAus(['richtig', 'richtig', 'teilweise', 'falsch']);
    expect(r.anzahl).toBe(4);
    expect(r.richtig).toBe(2);
    expect(r.teilweise).toBe(1);
    expect(r.falsch).toBe(1);
    // (1 + 1 + 0.5 + 0) / 4 = 62.5% → gerundet 63
    expect(r.prozent).toBe(63);
    expect(r.bestanden).toBe(false);
  });

  it('markiert ab Schwelle als bestanden', () => {
    const r = werteTrainingAus(['richtig', 'richtig', 'richtig', 'richtig', 'teilweise']);
    // (4 + 0.5) / 5 = 90%
    expect(r.prozent).toBe(90);
    expect(r.bestanden).toBe(true);
  });

  it('ist robust bei leerer Eingabe', () => {
    const r = werteTrainingAus([]);
    expect(r.prozent).toBe(0);
    expect(r.bestanden).toBe(false);
  });
});
