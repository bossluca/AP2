import { describe, it, expect } from 'vitest';
import { parseCloze, pruefeLuecke, pruefeCloze } from './cloze';

describe('parseCloze', () => {
  it('zerlegt Text und Lücken in Segmente und zählt die Lücken', () => {
    const { segmente, anzahl } = parseCloze('Das OSI-Modell hat {{7}} Schichten.');
    expect(anzahl).toBe(1);
    expect(segmente).toEqual([
      { typ: 'text', text: 'Das OSI-Modell hat ' },
      { typ: 'luecke', index: 0, loesung: '7' },
      { typ: 'text', text: ' Schichten.' },
    ]);
  });

  it('unterstützt mehrere Lücken mit fortlaufendem Index', () => {
    const { luecken, anzahl } = parseCloze('{{TCP}} ist verbindungsorientiert, {{UDP}} nicht.');
    expect(anzahl).toBe(2);
    expect(luecken[0].loesung).toBe('TCP');
    expect(luecken[1].loesung).toBe('UDP');
  });

  it('liest Synonyme hinter | als gleichwertige Varianten', () => {
    const { luecken } = parseCloze('Ein {{Router|Layer-3-Switch}} verbindet Netze.');
    expect(luecken[0].loesung).toBe('Router');
    expect(luecken[0].varianten).toContain(normalisiertesWort('Layer-3-Switch'));
  });

  it('liefert keine Lücken für reinen Text', () => {
    expect(parseCloze('Kein Platzhalter hier.').anzahl).toBe(0);
  });
});

// Kleiner Helfer für die Synonym-Erwartung (Normalisierung wird mitgetestet).
function normalisiertesWort(w) {
  return w
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

describe('pruefeLuecke', () => {
  const { luecken } = parseCloze('Antwort: {{Subnetzmaske}}');

  it('akzeptiert die korrekte Antwort (Groß/Klein egal)', () => {
    expect(pruefeLuecke(luecken[0], 'subnetzmaske')).toBe(true);
  });

  it('faltet Umlaute – Eingabe ohne Sonderzeichen zählt', () => {
    const { luecken: l } = parseCloze('{{Schlüssel}}');
    expect(pruefeLuecke(l[0], 'schluessel')).toBe(true);
  });

  it('lehnt leere und falsche Eingaben ab', () => {
    expect(pruefeLuecke(luecken[0], '')).toBe(false);
    expect(pruefeLuecke(luecken[0], 'Firewall')).toBe(false);
  });
});

describe('pruefeCloze', () => {
  const { luecken } = parseCloze('{{TCP}} vs {{UDP}}');

  it('alle richtig → bewertung "richtig"', () => {
    const r = pruefeCloze(luecken, ['tcp', 'udp']);
    expect(r.alleRichtig).toBe(true);
    expect(r.anzahl).toBe(2);
    expect(r.bewertung).toBe('richtig');
  });

  it('teils richtig → "teilweise" mit korrekter Trefferzahl', () => {
    const r = pruefeCloze(luecken, ['tcp', 'quatsch']);
    expect(r.anzahl).toBe(1);
    expect(r.treffer).toEqual([true, false]);
    expect(r.bewertung).toBe('teilweise');
  });

  it('nichts richtig → "falsch"', () => {
    const r = pruefeCloze(luecken, ['', '']);
    expect(r.anzahl).toBe(0);
    expect(r.bewertung).toBe('falsch');
  });
});
