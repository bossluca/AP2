/**
 * `TRUST_PROXY` → Fastify-`trustProxy`. Gezählt werden vertrauenswürdige
 * Proxy-Hops, nicht „alles vertrauen": Mit `true` nimmt Fastify den LINKEN
 * Eintrag von `X-Forwarded-For`, und den kann ein Angreifer frei setzen
 * (Rate-Limit pro IP+E-Mail wäre mit wechselnden Fake-IPs umgehbar).
 * Mit einer Hop-Zahl gilt der Eintrag, den der nächste vertraute Proxy angehängt hat.
 *
 * Unset/leer/ungültig → 1 (nginx im web-Container). `0` → aus (Direktbetrieb).
 * @param {string|undefined} wert
 * @returns {number}
 */
export function trustProxyAusEnv(wert) {
  if (wert === undefined || String(wert).trim() === '') return 1;
  const n = Number(wert);
  return Number.isInteger(n) && n >= 0 ? n : 1;
}
