import { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';
import { useProgress } from '../context/ProgressContext';
import DatenSicherung from '../components/DatenSicherung';

/**
 * Konto-Seite: Registrieren / Anmelden / Abmelden / Konto löschen. Im angemeldeten
 * Zustand synchronisiert der ProgressContext den Lernfortschritt mit dem Konto.
 *
 * Datentransparenz ist hier bewusst sichtbar (was wird wo gespeichert) – Details
 * auf der Seite „Über & Datenschutz". Die App funktioniert auch ohne Konto rein
 * lokal; dieser Bereich ist optional.
 */
export default function Konto() {
  const { user, login, register, recover, logout, deleteAccount } = useAuth();
  const { resetProgress } = useProgress();
  const [modus, setModus] = useState('login'); // 'login' | 'register' | 'recover'
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [passwort2, setPasswort2] = useState('');
  const [recoveryEingabe, setRecoveryEingabe] = useState('');
  const [einwilligung, setEinwilligung] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  // Einmalig anzuzeigender Recovery-Code (nach Registrierung/Reset/Erneuern).
  const [neuerCode, setNeuerCode] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setFehler(null);
    if (modus === 'register') {
      if (passwort !== passwort2) {
        setFehler('Die Passwörter stimmen nicht überein.');
        return;
      }
      if (!einwilligung) {
        setFehler('Bitte stimme der Speicherung gemäß Datenschutzhinweis zu.');
        return;
      }
    }
    setBusy(true);
    try {
      if (modus === 'register') {
        const d = await register(email, passwort);
        if (d?.recoveryCode) setNeuerCode(d.recoveryCode);
      } else if (modus === 'recover') {
        const d = await recover(email, recoveryEingabe, passwort);
        if (d?.recoveryCode) setNeuerCode(d.recoveryCode);
      } else {
        await login(email, passwort);
      }
      setEmail('');
      setPasswort('');
      setPasswort2('');
      setRecoveryEingabe('');
      setEinwilligung(false);
    } catch (err) {
      // 429 = Rate-Limit (Brute-Force-Schutz) klar benennen.
      if (err.status === 429) {
        setFehler('Zu viele Versuche. Bitte kurz warten und erneut probieren.');
      } else {
        setFehler(err.message || 'Aktion fehlgeschlagen.');
      }
    } finally {
      setBusy(false);
    }
  };

  const kontoLoeschen = async () => {
    setFehler(null);
    setBusy(true);
    try {
      await deleteAccount();
      resetProgress(); // lokalen Stand ebenfalls leeren
      setLoeschen(false);
    } catch (err) {
      setFehler(err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  // Einmal-Anzeige des Recovery-Codes (nach Registrierung, Reset oder Erneuern).
  const recoveryHinweis = neuerCode && (
    <div className="card p-4 border-amber-300 dark:border-amber-700 space-y-2" role="alert">
      <div className="flex items-center gap-1.5 font-semibold text-sm">
        <KeyRound size={15} className="text-amber-500" aria-hidden="true" /> Dein Recovery-Code
      </div>
      <p className="font-mono text-lg tracking-wider select-all">{neuerCode}</p>
      <p className="text-xs text-gray-500">
        Notiere diesen Code sicher (Passwort-Manager, Zettel). Er wird <strong>nur jetzt</strong>{' '}
        angezeigt und ist der einzige Weg, ein vergessenes Passwort zurückzusetzen – es gibt
        keine E-Mail-Wiederherstellung.
      </p>
      <button onClick={() => setNeuerCode(null)} className="btn-ghost px-3 py-1.5 text-xs">
        Ich habe ihn notiert
      </button>
    </div>
  );

  const codeErneuern = async () => {
    setFehler(null);
    setBusy(true);
    try {
      const d = await authApi.neuerRecoveryCode();
      setNeuerCode(d.recoveryCode);
    } catch (err) {
      setFehler(err.message || 'Code konnte nicht erzeugt werden.');
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <div className="space-y-4 max-w-md">
        <h1 className="text-xl font-bold">👤 Konto</h1>
        <p className="text-sm">
          Angemeldet als <span className="font-medium">{user.email}</span>.
        </p>
        <p className="text-sm text-gray-500">
          Dein Fortschritt – Lernstand, XP/Level und Streak – wird mit diesem Konto synchronisiert
          und ist auf anderen Geräten verfügbar. Jedes Konto hat seinen eigenen Fortschritt.
        </p>

        {recoveryHinweis}
        {fehler && <p className="text-sm text-red-600">{fehler}</p>}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => logout()} className="btn-ghost px-4 py-2">
            Abmelden
          </button>
          <button onClick={codeErneuern} disabled={busy} className="btn-ghost px-4 py-2">
            Neuen Recovery-Code erzeugen
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Mit dem Recovery-Code kannst du dein Passwort zurücksetzen, falls du es vergisst
          (es gibt keine E-Mail-Wiederherstellung). Alter Code wird dabei ungültig.
        </p>

        <DatenSicherung />

        {/* Konto löschen (DSGVO „Recht auf Löschung") */}
        <div className="border-t border-gray-200 dark:border-[#1d271a] pt-4 space-y-2">
          <h2 className="text-sm font-semibold">Konto löschen</h2>
          <p className="text-xs text-gray-500">
            Entfernt dein Konto und alle serverseitig gespeicherten Daten (E-Mail, Fortschritt,
            XP/Streak) unwiderruflich. Der lokale Stand in diesem Browser wird ebenfalls geleert.
          </p>
          {!loeschen ? (
            <button
              onClick={() => setLoeschen(true)}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:border-red-400 text-sm"
            >
              Konto löschen …
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={kontoLoeschen}
                disabled={busy}
                className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm disabled:opacity-60"
              >
                {busy ? '…' : 'Endgültig löschen'}
              </button>
              <button
                onClick={() => setLoeschen(false)}
                className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>

        <Link to="/info" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-accent">
          <ShieldCheck size={13} aria-hidden="true" /> Was wird gespeichert? – Über &amp; Datenschutz
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-bold">👤 Konto</h1>
      <p className="text-sm text-gray-500">
        Optional: Mit einem Konto wird dein Fortschritt geräteübergreifend gespeichert. Ohne Konto
        läuft alles lokal im Browser.
      </p>

      {/* Speicher-Transparenz */}
      <div className="card p-3 text-xs text-gray-500 space-y-1">
        <p>
          <ShieldCheck size={13} className="inline mr-1 -mt-0.5 text-accent" aria-hidden="true" />
          Gespeichert werden deine <strong>E-Mail</strong>, ein <strong>Passwort-Hash</strong>{' '}
          (nie im Klartext) und dein <strong>Lernfortschritt</strong>. Kein Tracking, keine Werbung.
        </p>
        <Link to="/info" className="text-accent hover:underline">
          Mehr unter „Über &amp; Datenschutz" →
        </Link>
      </div>

      <div className="flex gap-2 text-sm">
        <button
          onClick={() => {
            setModus('login');
            setFehler(null);
          }}
          className={`px-3 py-1.5 rounded-md border ${
            modus === 'login'
              ? 'bg-accent text-[var(--accent-contrast)] border-accent'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          Anmelden
        </button>
        <button
          onClick={() => {
            setModus('register');
            setFehler(null);
          }}
          className={`px-3 py-1.5 rounded-md border ${
            modus === 'register'
              ? 'bg-accent text-[var(--accent-contrast)] border-accent'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          Registrieren
        </button>
      </div>

      {modus === 'recover' && (
        <p className="text-xs text-gray-500">
          Passwort vergessen? Setze es mit deinem <strong>Recovery-Code</strong> zurück (wurde
          dir bei der Registrierung angezeigt). Ohne Code kann das Passwort nicht
          wiederhergestellt werden.
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="email">
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full input"
          />
        </div>
        {modus === 'recover' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1" htmlFor="recovery">
              Recovery-Code
            </label>
            <input
              id="recovery"
              type="text"
              autoComplete="one-time-code"
              required
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={recoveryEingabe}
              onChange={(e) => setRecoveryEingabe(e.target.value)}
              className="w-full input font-mono"
            />
          </div>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="passwort">
            {modus === 'recover' ? 'Neues Passwort (mind. 8 Zeichen)' : 'Passwort'}
            {modus === 'register' && ' (mind. 8 Zeichen)'}
          </label>
          <input
            id="passwort"
            type="password"
            autoComplete={modus === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            className="w-full input"
          />
        </div>

        {modus === 'register' && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1" htmlFor="passwort2">
                Passwort bestätigen
              </label>
              <input
                id="passwort2"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={passwort2}
                onChange={(e) => setPasswort2(e.target.value)}
                className="w-full input"
              />
            </div>
            <label className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={einwilligung}
                onChange={(e) => setEinwilligung(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Ich stimme zu, dass meine E-Mail und mein Lernfortschritt gemäß dem{' '}
                <Link to="/info" className="text-accent hover:underline">
                  Datenschutzhinweis
                </Link>{' '}
                gespeichert werden.
              </span>
            </label>
          </>
        )}

        {fehler && <p className="text-sm text-red-600">{fehler}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
          {busy
            ? '…'
            : modus === 'register'
              ? 'Konto erstellen'
              : modus === 'recover'
                ? 'Passwort zurücksetzen'
                : 'Jetzt anmelden'}
        </button>

        {modus === 'login' && (
          <button
            type="button"
            onClick={() => {
              setModus('recover');
              setFehler(null);
            }}
            className="block text-xs text-gray-500 hover:text-accent"
          >
            Passwort vergessen? Mit Recovery-Code zurücksetzen →
          </button>
        )}
        {modus === 'recover' && (
          <button
            type="button"
            onClick={() => {
              setModus('login');
              setFehler(null);
            }}
            className="block text-xs text-gray-500 hover:text-accent"
          >
            ← Zurück zur Anmeldung
          </button>
        )}
      </form>

      <DatenSicherung />
    </div>
  );
}
