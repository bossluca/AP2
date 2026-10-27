import { useEffect, useId, useRef, useState } from 'react';

/**
 * Passwort-Bestätigung vor sensiblen Konto-Aktionen (Konto löschen, Recovery-Code
 * erneuern, C2/S18). Modaler Dialog mit Label, Fokus im Feld, Escape bricht ab,
 * Fehler erscheinen inline (`role="alert"`) – das Passwort verlässt den Dialog nur
 * über `onBestaetigen`.
 *
 * @param {object} props
 * @param {string} props.titel
 * @param {string} [props.beschreibung]
 * @param {string} props.bestaetigenText   Beschriftung des Absende-Buttons
 * @param {boolean} [props.gefahr]         roter Button (z. B. Löschen)
 * @param {(passwort:string)=>Promise<void>} props.onBestaetigen  wirft bei Fehler
 * @param {()=>void} props.onAbbrechen
 */
export default function PasswortDialog({
  titel,
  beschreibung,
  bestaetigenText,
  gefahr = false,
  onBestaetigen,
  onAbbrechen,
}) {
  const id = useId();
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState(null);
  const [busy, setBusy] = useState(false);
  const eingabe = useRef(null);

  useEffect(() => {
    eingabe.current?.focus();
  }, []);

  const absenden = async (e) => {
    e.preventDefault();
    if (!passwort) {
      setFehler('Bitte gib dein aktuelles Passwort ein.');
      eingabe.current?.focus();
      return;
    }
    setFehler(null);
    setBusy(true);
    try {
      await onBestaetigen(passwort);
    } catch (err) {
      setFehler(
        err?.status === 401
          ? 'Das Passwort ist falsch.'
          : err?.status === 429
            ? 'Zu viele Versuche. Bitte kurz warten und erneut probieren.'
            : err?.message || 'Aktion fehlgeschlagen.'
      );
      setPasswort('');
      eingabe.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-titel`}
      aria-describedby={beschreibung ? `${id}-text` : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) onAbbrechen();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !busy && onAbbrechen()} />
      <form
        onSubmit={absenden}
        className="relative card p-5 max-w-sm w-full space-y-3 bg-popover text-popover-foreground"
      >
        <h2 id={`${id}-titel`} className="font-semibold">
          {titel}
        </h2>
        {beschreibung && (
          <p id={`${id}-text`} className="text-sm text-muted-foreground">
            {beschreibung}
          </p>
        )}
        <div>
          <label htmlFor={`${id}-pw`} className="block text-xs text-muted-foreground mb-1">
            Aktuelles Passwort
          </label>
          <input
            id={`${id}-pw`}
            ref={eingabe}
            type="password"
            autoComplete="current-password"
            className="input w-full"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            aria-invalid={fehler ? 'true' : undefined}
            aria-describedby={fehler ? `${id}-fehler` : undefined}
          />
        </div>
        {fehler && (
          <p id={`${id}-fehler`} role="alert" className="text-sm text-red-600">
            {fehler}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className={
              gefahr
                ? 'px-4 py-2 rounded-md bg-red-600 text-white text-sm disabled:opacity-60'
                : 'btn-primary px-4 py-2'
            }
          >
            {busy ? '…' : bestaetigenText}
          </button>
          <button type="button" onClick={onAbbrechen} disabled={busy} className="btn-ghost px-4 py-2">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}
