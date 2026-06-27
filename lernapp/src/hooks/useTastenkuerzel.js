import { useEffect, useRef } from 'react';

/** Ist das Ziel ein Texteingabefeld (dann Shortcuts ignorieren)? */
function istEingabefeld(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true;
}

/**
 * Registriert globale Tastatur-Kürzel. Kleine Schnittstelle, viel Verhalten
 * dahinter: ignoriert Eingaben in Text-Feldern, lässt Modifier-Kombis (Strg/Cmd/
 * Alt) durch (Browser-Shortcuts bleiben heil), ruft `preventDefault` nur bei einem
 * Treffer und räumt den Listener wieder ab. Die Handler-Map darf sich pro Render
 * ändern, ohne den Listener neu zu binden (Ref hält stets die aktuelle Version).
 *
 * @param {Object<string, (e: KeyboardEvent) => void>} belegung
 *        Map `KeyboardEvent.key` → Handler, z. B. `{ ' ': aufdecken, '1': falsch }`.
 * @param {{ aktiv?: boolean }} [optionen]  `aktiv: false` deaktiviert die Kürzel.
 */
export function useTastenkuerzel(belegung, { aktiv = true } = {}) {
  const ref = useRef(belegung);
  useEffect(() => {
    ref.current = belegung;
  });

  useEffect(() => {
    if (!aktiv) return undefined;
    const onKeyDown = (e) => {
      if (istEingabefeld(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const handler = ref.current[e.key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [aktiv]);
}
