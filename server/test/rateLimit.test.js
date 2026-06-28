import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erstelleRateLimiter } from '../src/lib/rateLimit.js';

/** Limiter mit steuerbarer Uhr. */
function mitUhr(opts = {}) {
  let now = 1_000_000;
  const limiter = erstelleRateLimiter({ jetzt: () => now, ...opts });
  return { limiter, vor: (ms) => { now += ms; } };
}

test('erlaubt bis zum Limit, blockiert danach', () => {
  const { limiter } = mitUhr({ maxVersuche: 3, fensterMs: 1000 });
  assert.equal(limiter.pruefe('k').erlaubt, true);
  assert.equal(limiter.pruefe('k').erlaubt, true);
  assert.equal(limiter.pruefe('k').erlaubt, true);
  assert.equal(limiter.pruefe('k').erlaubt, false); // 4. Versuch
});

test('verbleibend zählt herunter', () => {
  const { limiter } = mitUhr({ maxVersuche: 3, fensterMs: 1000 });
  assert.equal(limiter.pruefe('k').verbleibend, 2);
  assert.equal(limiter.pruefe('k').verbleibend, 1);
  assert.equal(limiter.pruefe('k').verbleibend, 0);
});

test('Fenster läuft ab → wieder erlaubt', () => {
  const { limiter, vor } = mitUhr({ maxVersuche: 2, fensterMs: 1000 });
  limiter.pruefe('k');
  limiter.pruefe('k');
  assert.equal(limiter.pruefe('k').erlaubt, false);
  vor(1001); // Fenster vorbei
  assert.equal(limiter.pruefe('k').erlaubt, true);
});

test('Sliding Window: alte Versuche fallen einzeln raus', () => {
  const { limiter, vor } = mitUhr({ maxVersuche: 2, fensterMs: 1000 });
  limiter.pruefe('k'); // t=0
  vor(600);
  limiter.pruefe('k'); // t=600 → jetzt voll
  assert.equal(limiter.pruefe('k').erlaubt, false);
  vor(500); // t=1100: erster Versuch (t=0) ist raus, zweiter (t=600) noch drin
  assert.equal(limiter.pruefe('k').erlaubt, true);
});

test('Schlüssel sind unabhängig', () => {
  const { limiter } = mitUhr({ maxVersuche: 1, fensterMs: 1000 });
  assert.equal(limiter.pruefe('a').erlaubt, true);
  assert.equal(limiter.pruefe('a').erlaubt, false);
  assert.equal(limiter.pruefe('b').erlaubt, true); // anderer Schlüssel unberührt
});

test('erfolg() setzt den Zähler zurück', () => {
  const { limiter } = mitUhr({ maxVersuche: 2, fensterMs: 1000 });
  limiter.pruefe('k');
  limiter.pruefe('k');
  assert.equal(limiter.pruefe('k').erlaubt, false);
  limiter.erfolg('k');
  assert.equal(limiter.pruefe('k').erlaubt, true);
});

test('retryNachSek bei Block sinnvoll', () => {
  const { limiter } = mitUhr({ maxVersuche: 1, fensterMs: 60_000 });
  limiter.pruefe('k');
  const r = limiter.pruefe('k');
  assert.equal(r.erlaubt, false);
  assert.ok(r.retryNachSek > 0 && r.retryNachSek <= 60);
});
