import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Error Boundary um den Seiten-Inhalt: fängt Render-Fehler einer Seite ab
 * (z. B. durch einen defekten Fortschritts-/Daten-Eintrag) und zeigt statt
 * einer weißen Seite eine freundliche Fehlerkarte mit Auswegen.
 *
 * Muss eine Klassen-Komponente sein (React bietet für Error Boundaries
 * keine Hook-API). Wird pro Routenwechsel neu gemountet (key in
 * `AnimatedMain`), dadurch setzt sich der Fehlerzustand beim Navigieren
 * automatisch zurück.
 */
export default class FehlerGrenze extends Component {
  constructor(props) {
    super(props);
    this.state = { fehler: null };
  }

  static getDerivedStateFromError(fehler) {
    return { fehler };
  }

  componentDidCatch(fehler, info) {
    // Bewusst nur Konsole – kein externes Tracking (Datenschutz, s. /info).
    console.error('Seiten-Fehler:', fehler, info?.componentStack);
  }

  render() {
    if (!this.state.fehler) return this.props.children;
    return (
      <div className="card p-6 sm:p-8 text-center max-w-lg mx-auto" role="alert">
        <AlertTriangle size={36} className="mx-auto text-amber-500" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-bold">Hier ist etwas schiefgelaufen</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Diese Seite konnte nicht angezeigt werden. Dein Lernfortschritt ist
          davon nicht betroffen. Lade die Seite neu oder wechsle zu einem
          anderen Bereich.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            <RotateCcw size={16} aria-hidden="true" /> Neu laden
          </button>
          <a href="#/" className="btn btn-ghost" onClick={() => this.setState({ fehler: null })}>
            Zur Startseite
          </a>
        </div>
        <p className="mt-4 font-mono text-xs text-gray-400 break-all">
          {String(this.state.fehler?.message || this.state.fehler)}
        </p>
      </div>
    );
  }
}
