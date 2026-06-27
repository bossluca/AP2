import confetti from 'canvas-confetti';

/** Respektiert die System-Einstellung „reduzierte Bewegung". */
function reducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Kurzer Konfetti-Moment in den Akzentfarben – für Erfolge (Klausur bestanden,
 * Streak-Meilenstein …). Tut bewusst nichts, wenn reduzierte Bewegung aktiv ist.
 */
/**
 * Prüft, ob ein 2D-Canvas-Context verfügbar ist. In jsdom/Tests ist er es nicht –
 * dann unterbleibt jede Animation (canvas-confetti würde sonst asynchron werfen).
 */
function canvasVerfuegbar() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext && c.getContext('2d'));
  } catch {
    return false;
  }
}

export function feiern() {
  if (reducedMotion()) return;
  // Defensiv: in Nicht-Browser-/Test-Umgebungen (kein Canvas-Context) einfach
  // nichts tun, statt zu werfen.
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  if (!canvasVerfuegbar()) return;

  const farben = ['#6366f1', '#8b5cf6', '#38bdf8', '#22c55e'];
  const ende = Date.now() + 800;

  (function frame() {
    try {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors: farben, disableForReducedMotion: true });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors: farben, disableForReducedMotion: true });
    } catch {
      return; // z. B. fehlender Canvas-Context – abbrechen
    }
    if (Date.now() < ende) requestAnimationFrame(frame);
  })();
}
