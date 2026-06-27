/**
 * Fisher-Yates-Shuffle. Erzeugt eine neue, zufällig sortierte Kopie – das
 * Eingabe-Array bleibt unverändert (rein, gut testbar mit injizierbarem RNG).
 *
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng]  Zufallsquelle in [0,1); Default `Math.random`.
 * @returns {T[]} Neue, gemischte Kopie.
 */
export function shuffle(array, rng = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
