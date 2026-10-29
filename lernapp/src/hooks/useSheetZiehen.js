import { useCallback, useEffect, useRef } from 'react';
import {
  animiereFeder,
  geschwindigkeitAusVerlauf,
  gummiband,
  reduzierteBewegung,
  sollSchliessen,
} from '../lib/bewegung';

/** Ab dieser Breite ist das Fenster ein Popover (kein Bottom-Sheet, kein Ziehen). */
const DESKTOP = '(min-width: 1024px)';

function istDesktop() {
  return typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? true
    : window.matchMedia(DESKTOP).matches;
}

/**
 * Bottom-Sheet wie bei iOS: lässt sich am Griff 1:1 mit dem Finger ziehen
 * (gleicher Greif-Versatz, nach oben elastisch gebremst), schließt nach dem
 * Schwung des Loslassens (nicht nach der Position), übernimmt die
 * Geschwindigkeit in eine Feder und ist jederzeit unterbrechbar – wer ein
 * schließendes Sheet greift, hält es an der aktuellen Stelle. Schließen per
 * Knopf, Hintergrund oder Escape nimmt denselben Weg nach unten, den es
 * hereingekommen ist. Auf dem Desktop und bei „weniger Bewegung“ schließt es
 * sofort.
 *
 * @param {() => void} onClose  Wird erst aufgerufen, wenn das Sheet weg ist.
 */
export function useSheetZiehen(onClose) {
  const panelRef = useRef(null);
  const hintergrundRef = useRef(null);
  const position = useRef(0); // aktuelle Verschiebung in px (Presentation-Wert)
  const stopp = useRef(null); // laufende Feder abbrechen
  const zug = useRef(null); // { versatz, verlauf }
  const geschlossen = useRef(false);

  const setze = useCallback((y) => {
    position.current = y;
    const panel = panelRef.current;
    if (!panel) return;
    panel.style.transform = y === 0 ? '' : `translate3d(0, ${y}px, 0)`;
    const hoehe = panel.offsetHeight || 1;
    if (hintergrundRef.current) {
      hintergrundRef.current.style.opacity = String(Math.max(0, Math.min(1, 1 - y / hoehe)));
    }
  }, []);

  const beende = useCallback(() => {
    if (geschlossen.current) return;
    geschlossen.current = true;
    onClose();
  }, [onClose]);

  const wegFeder = useCallback(
    (geschwindigkeit = 0) => {
      const panel = panelRef.current;
      if (!panel) return beende();
      stopp.current?.();
      stopp.current = animiereFeder({
        von: position.current,
        nach: panel.offsetHeight + 24,
        geschwindigkeit,
        daempfung: 1,
        antwort: 0.34,
        beiFrame: setze,
        beiEnde: beende,
      });
    },
    [beende, setze]
  );

  /** Schließen per Knopf/Hintergrund/Escape: derselbe Weg wie beim Hereinkommen. */
  const schliessen = useCallback(() => {
    if (istDesktop() || reduzierteBewegung()) return beende();
    return wegFeder(0);
  }, [beende, wegFeder]);

  useEffect(() => {
    const beiTaste = (e) => {
      if (e.key === 'Escape') schliessen();
    };
    document.addEventListener('keydown', beiTaste);
    return () => {
      document.removeEventListener('keydown', beiTaste);
      stopp.current?.();
    };
  }, [schliessen]);

  const beiDown = useCallback((e) => {
    if (istDesktop() || e.button > 0) return;
    if (e.target.closest && e.target.closest('button, a, input')) return;
    stopp.current?.(); // Unterbrechen: ab hier gilt der aktuelle Wert auf dem Bildschirm
    e.currentTarget.setPointerCapture?.(e.pointerId);
    zug.current = {
      versatz: e.clientY - position.current, // dort greifen, wo man getroffen hat
      verlauf: [{ y: e.clientY, t: performance.now() }],
    };
  }, []);

  const beiMove = useCallback(
    (e) => {
      const z = zug.current;
      if (!z) return;
      const hoehe = panelRef.current?.offsetHeight || 1;
      let y = e.clientY - z.versatz;
      if (y < 0) y = gummiband(y, hoehe); // nach oben: elastischer Widerstand
      z.verlauf.push({ y: e.clientY, t: performance.now() });
      if (z.verlauf.length > 8) z.verlauf.shift();
      setze(y);
    },
    [setze]
  );

  const beiUp = useCallback(() => {
    const z = zug.current;
    zug.current = null;
    if (!z) return;
    const hoehe = panelRef.current?.offsetHeight || 1;
    const v = geschwindigkeitAusVerlauf(z.verlauf);
    if (sollSchliessen({ position: position.current, geschwindigkeit: v, hoehe })) {
      if (reduzierteBewegung()) return beende();
      return wegFeder(v);
    }
    // Zurück an die Ruheposition; nur nach einem Wurf mit leichtem Nachfedern.
    stopp.current = animiereFeder({
      von: position.current,
      nach: 0,
      geschwindigkeit: v,
      daempfung: Math.abs(v) > 300 ? 0.8 : 1,
      antwort: 0.3,
      beiFrame: setze,
    });
  }, [beende, setze, wegFeder]);

  const griffProps = {
    onPointerDown: beiDown,
    onPointerMove: beiMove,
    onPointerUp: beiUp,
    onPointerCancel: beiUp,
    style: { touchAction: 'none' },
  };

  return { panelRef, hintergrundRef, griffProps, schliessen };
}
