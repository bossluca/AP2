import { describe, it, expect } from 'vitest';
import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('lässt das Original-Array unverändert (rein)', () => {
    const original = [1, 2, 3, 4, 5];
    const kopie = [...original];
    shuffle(original);
    expect(original).toEqual(kopie);
  });

  it('enthält exakt dieselben Elemente', () => {
    const ergebnis = shuffle([1, 2, 3, 4, 5]);
    expect([...ergebnis].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('ist mit injiziertem RNG deterministisch', () => {
    // rng = 0 → j ist stets 0: jede Position wird mit Index 0 getauscht.
    const rng = () => 0;
    expect(shuffle(['a', 'b', 'c'], rng)).toEqual(shuffle(['a', 'b', 'c'], rng));
  });

  it('kommt mit leeren und einelementigen Arrays klar', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle([42])).toEqual([42]);
  });
});
