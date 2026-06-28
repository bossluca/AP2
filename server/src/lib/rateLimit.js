/**
 * Schlanker In-Memory-Rate-Limiter (Sliding Window) gegen Brute-Force auf den
 * Auth-Routen. Bewusst ohne externe Abhängigkeit und ohne Fastify-Kopplung:
 * reine Funktion über einen Schlüssel (z. B. IP+E-Mail), Zeit injizierbar →
 * deterministisch testbar.
 *
 * Schnittstelle (klein, tief):
 *   const limiter = erstelleRateLimiter({ maxVersuche, fensterMs, jetzt });
 *   limiter.pruefe(schluessel)  -> { erlaubt, verbleibend, retryNachSek }
 *   limiter.erfolg(schluessel)  -> Zähler zurücksetzen (z. B. nach Login-Erfolg)
 *
 * Designentscheidung: `pruefe` zählt den Versuch *mit* (ein Aufruf = ein
 * Versuch). So bleibt die Aufrufstelle trivial (einmal fragen, fertig). Ein
 * geglückter Login ruft `erfolg`, damit ein gültiger Nutzer nicht durch frühere
 * Tippfehler ausgesperrt bleibt.
 *
 * In-Memory ist für einen Single-Instance-Node bewusst ausreichend (kein Redis):
 * Die App läuft als ein Container hinter dem Reverse-Proxy. Bei Neustart ist der
 * Speicher leer – akzeptabel, da Sessions ohnehin in der DB liegen.
 */
export function erstelleRateLimiter({ maxVersuche = 5, fensterMs = 15 * 60 * 1000, jetzt = Date.now } = {}) {
  /** @type {Map<string, number[]>} Schlüssel → Zeitstempel der Versuche im Fenster. */
  const treffer = new Map();

  /** Abgelaufene Zeitstempel entfernen; gibt die noch gültigen zurück. */
  function aktuelle(schluessel, t) {
    const grenze = t - fensterMs;
    const liste = (treffer.get(schluessel) || []).filter((ts) => ts > grenze);
    if (liste.length === 0) treffer.delete(schluessel);
    else treffer.set(schluessel, liste);
    return liste;
  }

  return {
    /**
     * Zählt einen Versuch und meldet, ob er erlaubt ist.
     * @returns {{ erlaubt: boolean, verbleibend: number, retryNachSek: number }}
     */
    pruefe(schluessel) {
      const t = jetzt();
      const liste = aktuelle(schluessel, t);
      if (liste.length >= maxVersuche) {
        // Blockiert: kein weiterer Zähler, aber Retry-Hinweis aus dem ältesten
        // noch zählenden Versuch ableiten.
        const aeltester = liste[0];
        const retryNachSek = Math.max(1, Math.ceil((aeltester + fensterMs - t) / 1000));
        return { erlaubt: false, verbleibend: 0, retryNachSek };
      }
      liste.push(t);
      treffer.set(schluessel, liste);
      return { erlaubt: true, verbleibend: maxVersuche - liste.length, retryNachSek: 0 };
    },

    /** Erfolgreiche Aktion: Zähler für diesen Schlüssel leeren. */
    erfolg(schluessel) {
      treffer.delete(schluessel);
    },

    /** Nur für Tests/Diagnose: aktuelle Versuchszahl im Fenster. */
    _stand(schluessel) {
      return aktuelle(schluessel, jetzt()).length;
    },
  };
}
