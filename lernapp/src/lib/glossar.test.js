import { describe, it, expect } from 'vitest';
import { clozeAusText, baueGlossarCloze } from './glossar';

describe('clozeAusText', () => {
  it('macht aus einer Zeile mit genau einem Fettbegriff eine Lücke', () => {
    const items = clozeAusText('Ein **Router** verbindet verschiedene Netze miteinander.');
    expect(items).toHaveLength(1);
    expect(items[0].begriff).toBe('Router');
    expect(items[0].text).toBe('Ein {{Router}} verbindet verschiedene Netze miteinander.');
  });

  it('überspringt Zeilen ohne oder mit mehreren Fettbegriffen', () => {
    expect(clozeAusText('Kein Begriff, nur Text hier drin.')).toHaveLength(0);
    expect(clozeAusText('**TCP** und **UDP** sind Protokolle.')).toHaveLength(0);
  });

  it('überspringt zu kurzen Kontext und reine Zahlen', () => {
    expect(clozeAusText('**Router**')).toHaveLength(0); // kein Kontext
    expect(clozeAusText('Die Antwort ist **42** hier.')).toHaveLength(0); // reine Zahl
  });

  it('erkennt das Glossar-Muster „Begriff: Erklärung"', () => {
    const items = clozeAusText('Fehleranalyse: Suche nach Index-Fehlern in der Schleife.');
    expect(items).toHaveLength(1);
    expect(items[0].begriff).toBe('Fehleranalyse');
    expect(items[0].text).toBe('{{Fehleranalyse}}: Suche nach Index-Fehlern in der Schleife.');
  });

  it('reicht Tags und Quelle durch', () => {
    const items = clozeAusText('Ein **Switch** arbeitet auf Schicht 2 im Netzwerk.', {
      tags: ['Netzwerk'],
      quelle: 'OSI-Modell',
    });
    expect(items[0].tags).toEqual(['Netzwerk']);
    expect(items[0].quelle).toBe('OSI-Modell');
  });
});

describe('baueGlossarCloze', () => {
  const einheiten = [
    {
      id: 'lz1',
      titel: 'Netzwerk',
      thema_tags: ['Netzwerk'],
      inhalt_text:
        'Ein **Router** verbindet verschiedene Netze.\nEin **Switch** arbeitet auf Schicht 2.',
    },
    {
      id: 'lz2',
      titel: 'Mehr Netzwerk',
      thema_tags: ['Netzwerk'],
      inhalt_text: 'Ein **Router** leitet Pakete weiter und trennt Broadcast-Domänen.',
    },
  ];

  it('sammelt Items über Einheiten und vergibt stabile IDs', () => {
    const cloze = baueGlossarCloze(einheiten);
    const begriffe = cloze.map((c) => c.begriff);
    expect(begriffe).toContain('Router');
    expect(begriffe).toContain('Switch');
    expect(cloze.every((c) => c.id.startsWith('cloze_'))).toBe(true);
  });

  it('dedupliziert gleiche Begriffe über Einheiten hinweg', () => {
    const cloze = baueGlossarCloze(einheiten);
    const router = cloze.filter((c) => c.begriff.toLowerCase() === 'router');
    expect(router).toHaveLength(1);
  });

  it('begrenzt die Anzahl je Einheit', () => {
    const viele = [
      {
        id: 'x',
        inhalt_text: ['**Aaa** ist ein Begriff hier.', '**Bbb** ist ein Begriff hier.', '**Ccc** ist ein Begriff hier.', '**Ddd** ist ein Begriff hier.'].join('\n'),
      },
    ];
    expect(baueGlossarCloze(viele, { maxProEinheit: 2 })).toHaveLength(2);
  });
});
