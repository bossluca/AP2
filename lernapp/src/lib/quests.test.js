import { describe, it, expect } from 'vitest';
import { baueTagesquests, questFortschritt } from './quests';

describe('baueTagesquests', () => {
  it('keine Aktivität → nichts erfüllt (außer ggf. „nichts fällig")', () => {
    const q = baueTagesquests({ heute: 0, tagesziel: 20, faellig: 5 });
    expect(q.find((x) => x.id === 'start').erfuellt).toBe(false);
    expect(q.find((x) => x.id === 'ziel').erfuellt).toBe(false);
    expect(q.find((x) => x.id === 'faellig').erfuellt).toBe(false);
  });

  it('eine Bewertung erfüllt „Heute lernen"', () => {
    const q = baueTagesquests({ heute: 1, tagesziel: 20, faellig: 3 });
    expect(q.find((x) => x.id === 'start').erfuellt).toBe(true);
    expect(q.find((x) => x.id === 'ziel').erfuellt).toBe(false);
  });

  it('Tagesziel-Quest erfüllt sich beim Erreichen des Ziels und kappt den Wert', () => {
    const q = baueTagesquests({ heute: 25, tagesziel: 20, faellig: 0 });
    const ziel = q.find((x) => x.id === 'ziel');
    expect(ziel.erfuellt).toBe(true);
    expect(ziel.wert).toBe(20); // gekappt auf das Ziel
  });

  it('„Fällige erledigt" ist erfüllt, wenn nichts mehr fällig ist', () => {
    expect(baueTagesquests({ faellig: 0 }).find((x) => x.id === 'faellig').erfuellt).toBe(true);
    expect(baueTagesquests({ faellig: 2 }).find((x) => x.id === 'faellig').erfuellt).toBe(false);
  });
});

describe('questFortschritt', () => {
  it('zählt erfüllte Quests und erkennt „alle erfüllt"', () => {
    const alle = baueTagesquests({ heute: 30, tagesziel: 20, faellig: 0 });
    const f = questFortschritt(alle);
    expect(f.erfuellt).toBe(3);
    expect(f.gesamt).toBe(3);
    expect(f.alleErfuellt).toBe(true);
  });

  it('leere Liste ist nicht „alle erfüllt"', () => {
    expect(questFortschritt([]).alleErfuellt).toBe(false);
  });
});
