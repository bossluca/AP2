import { useEffect, useState } from 'react';

/**
 * Zählt eine Zahl von 0 auf `ziel` hoch (easeOut) – für „lebendige" Ergebnisse.
 *
 * Respektiert **`prefers-reduced-motion`**: ist die Bewegungsreduktion aktiv
 * (oder lässt sich die Präferenz nicht ermitteln, z. B. im Test/SSR), wird ohne
 * Animation sofort der Zielwert geliefert. Rein über `requestAnimationFrame`,
 * räumt sauber auf.
 *
 * @param {number} ziel  Endwert (wird gerundet ausgegeben).
 * @param {Object} [optionen]
 * @param {number} [optionen.dauer=800]  Animationsdauer in ms.
 * @returns {number} Aktueller (gerundeter) Wert.
 */
export function useCountUp(ziel, { dauer = 800 } = {}) {
  const reduziert = reduzierteBewegung();
  const [wert, setWert] = useState(0);

  useEffect(() => {
    if (reduziert) return undefined; // keine Animation → Zielwert direkt zurückgeben
    let raf;
    let start = null;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / dauer);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setWert(Math.round(ziel * eased)); // im rAF-Callback (kein State-Set im Effekt-Body)
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ziel, dauer, reduziert]);

  return reduziert ? ziel : wert;
}

/** true = keine Animation (Reduktion aktiv ODER Präferenz nicht ermittelbar). */
function reduzierteBewegung() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
