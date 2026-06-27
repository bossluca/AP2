import { describe, it, expect } from 'vitest';
import { normalisiere, pruefeAntwort } from './antwortpruefung';

describe('normalisiere', () => {
  it('schreibt klein und faltet Umlaute zu Digraphen', () => {
    expect(normalisiere('Größe')).toBe('groesse');
    expect(normalisiere('Übung')).toBe('uebung');
    expect(normalisiere('Maß')).toBe('mass');
  });

  it('lässt „ue" und „ü" auf denselben Wert fallen', () => {
    expect(normalisiere('virtuelle Maschine')).toBe(normalisiere('virtuelle Maschine'));
    expect(normalisiere('Gebäude')).toBe(normalisiere('Gebaeude'));
  });

  it('entfernt Satzzeichen und faltet Mehrfach-Leerzeichen', () => {
    expect(normalisiere('  Hallo,   Welt!! ')).toBe('hallo welt');
  });

  it('strippt diakritische Zeichen', () => {
    expect(normalisiere('Café résumé')).toBe('cafe resume');
  });

  it('ist robust gegen Nicht-Strings', () => {
    expect(normalisiere(null)).toBe('');
    expect(normalisiere(undefined)).toBe('');
    expect(normalisiere(42)).toBe('');
  });
});

describe('pruefeAntwort', () => {
  // Schlagwörter als Wortstämme/Kurzformen formuliert (z. B. „bereitstell"
  // matcht „bereitstellen" wie „bereitstellt") – so toleriert die Engine
  // Flexionen, ohne unscharfes Stemming zu brauchen.
  const serverKeywords = [
    { begriff: 'Dienst', synonyme: ['Service', 'bereitstell'] },
    { begriff: 'virtuelle Maschine', synonyme: ['VM', 'Hardware'] },
    { begriff: 'zentral', synonyme: ['Zentralrechner'] },
  ];

  it('erkennt Treffer über das Haupt-Schlagwort', () => {
    const r = pruefeAntwort('Ein Server stellt zentral Dienste bereit', serverKeywords);
    expect(r.anzahl).toBe(2); // "Dienst" + "zentral"
    expect(r.gesamt).toBe(3);
  });

  it('akzeptiert abweichende Formulierungen über Synonyme', () => {
    // Formulierung A: Hardware-Sicht
    const a = pruefeAntwort('Hardware für Unternehmen mit großer Rechenleistung', serverKeywords);
    expect(a.treffer.map((t) => t.begriff)).toContain('virtuelle Maschine');
    // Formulierung B: VM-Sicht (andere Worte, gleiche Bedeutung)
    const b = pruefeAntwort('eine VM, die Dienste bereitstellt', serverKeywords);
    expect(b.treffer.map((t) => t.begriff)).toEqual(
      expect.arrayContaining(['virtuelle Maschine', 'Dienst'])
    );
  });

  it('akzeptiert einfache Strings als Schlagwörter', () => {
    const r = pruefeAntwort('Das OSI-Modell hat sieben Schichten', ['OSI', 'sieben Schichten']);
    expect(r.anzahl).toBe(2);
    expect(r.bewertung).toBe('richtig');
  });

  it('prüft kurze Schlagwörter an Wortgrenzen (keine Fehltreffer im Wort)', () => {
    // "vm" darf nicht in "vmware-light" o. ä. mitten im Wort matchen
    const treffer = pruefeAntwort('eine VM läuft', [{ begriff: 'VM' }]);
    expect(treffer.anzahl).toBe(1);
    const fehl = pruefeAntwort('Schwarm von Servern', [{ begriff: 'VM' }]);
    expect(fehl.anzahl).toBe(0);
  });

  it('berechnet Quote und Bewertung anhand der Schwellen', () => {
    const voll = pruefeAntwort('Dienste bereitstellen, virtuelle Maschine, zentral', serverKeywords);
    expect(voll.quote).toBeCloseTo(1);
    expect(voll.bewertung).toBe('richtig');

    const halb = pruefeAntwort('nur zentral erwähnt', serverKeywords);
    expect(halb.quote).toBeCloseTo(1 / 3);
    expect(halb.bewertung).toBe('falsch'); // < 0.4

    const teilweise = pruefeAntwort('zentral und Dienste bereitstellen', serverKeywords);
    expect(teilweise.quote).toBeCloseTo(2 / 3);
    expect(teilweise.bewertung).toBe('teilweise');
  });

  it('respektiert Pflicht-Schlagwörter (ohne sie nie „richtig")', () => {
    const kw = [
      { begriff: 'Firewall', pflicht: true },
      { begriff: 'Paketfilter' },
      { begriff: 'Regeln' },
    ];
    // Alle außer Pflicht getroffen → trotz hoher Quote nicht „richtig"
    const ohnePflicht = pruefeAntwort('Paketfilter mit Regeln', kw);
    expect(ohnePflicht.pflichtErfuellt).toBe(false);
    expect(ohnePflicht.bewertung).not.toBe('richtig');

    const mitPflicht = pruefeAntwort('Firewall als Paketfilter mit Regeln', kw);
    expect(mitPflicht.pflichtErfuellt).toBe(true);
    expect(mitPflicht.bewertung).toBe('richtig');
  });

  it('liefert bewertung=null, wenn keine Schlagwörter hinterlegt sind', () => {
    const r = pruefeAntwort('irgendeine Antwort', []);
    expect(r.hatSchluesselwoerter).toBe(false);
    expect(r.bewertung).toBeNull();
    expect(r.gesamt).toBe(0);
  });

  it('zählt leere Antwort als kein Treffer', () => {
    const r = pruefeAntwort('', serverKeywords);
    expect(r.anzahl).toBe(0);
    expect(r.bewertung).toBe('falsch');
  });

  it('erlaubt Tippen ohne Umlaute (ue statt ü)', () => {
    const r = pruefeAntwort('das gebaeude hat eine usv', [
      { begriff: 'Gebäude' },
      { begriff: 'USV' },
    ]);
    expect(r.anzahl).toBe(2);
  });

  describe('„Nennen Sie N …"-Modus (optionen.erforderlich)', () => {
    // Liste = Auswahl gleichwertiger Antworten; N Treffer genügen.
    const vorteile = [
      { begriff: 'Auslastung' },
      { begriff: 'Kosten' },
      { begriff: 'Snapshot' },
      { begriff: 'bereitstell' },
      { begriff: 'Hochverfügbar' },
    ];

    it('wertet N Treffer als „richtig", obwohl die Quote < Schwelle liegt', () => {
      const r = pruefeAntwort('bessere Auslastung und geringere Kosten', vorteile, {
        erforderlich: 2,
      });
      expect(r.anzahl).toBe(2);
      expect(r.quote).toBeCloseTo(2 / 5); // Anteil wäre sonst nur „teilweise"
      expect(r.erforderlich).toBe(2);
      expect(r.bewertung).toBe('richtig');
    });

    it('ist „teilweise" bei mindestens einem, aber zu wenigen Treffern', () => {
      const r = pruefeAntwort('nur die Auslastung', vorteile, { erforderlich: 2 });
      expect(r.anzahl).toBe(1);
      expect(r.bewertung).toBe('teilweise');
    });

    it('ist „falsch" ohne jeden Treffer', () => {
      const r = pruefeAntwort('völlig anderes Thema', vorteile, { erforderlich: 2 });
      expect(r.anzahl).toBe(0);
      expect(r.bewertung).toBe('falsch');
    });

    it('begrenzt das Ziel auf die Listenlänge', () => {
      const r = pruefeAntwort('Auslastung, Kosten, Snapshot, bereitstellen, hochverfügbar', vorteile, {
        erforderlich: 99,
      });
      expect(r.erforderlich).toBe(5); // nicht 99
      expect(r.bewertung).toBe('richtig');
    });

    it('berücksichtigt auch im N-Modus Pflicht-Schlagwörter', () => {
      const kw = [
        { begriff: 'Angriffsfläche', pflicht: true },
        { begriff: 'Dienste' },
        { begriff: 'Update' },
      ];
      const ohne = pruefeAntwort('Dienste abschalten und Updates', kw, { erforderlich: 2 });
      expect(ohne.anzahl).toBe(2);
      expect(ohne.pflichtErfuellt).toBe(false);
      expect(ohne.bewertung).toBe('teilweise'); // Pflicht fehlt → nicht „richtig"
    });

    it('fällt ohne erforderlich auf die Anteils-Bewertung zurück', () => {
      const r = pruefeAntwort('Auslastung und Kosten', vorteile);
      expect(r.erforderlich).toBeNull();
      expect(r.bewertung).toBe('teilweise'); // 2/5 = 0.4
    });
  });
});
