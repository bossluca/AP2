import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Konto-Seite: Registrieren / Anmelden / Abmelden. Im angemeldeten Zustand wird
 * der Lernfortschritt automatisch mit dem Konto synchronisiert (Migration des
 * lokalen Stands beim ersten Login passiert im ProgressContext).
 *
 * Die App funktioniert auch ohne Konto rein lokal – dieser Bereich ist optional.
 */
export default function Konto() {
  const { user, login, register, logout } = useAuth();
  const [modus, setModus] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [fehler, setFehler] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setFehler(null);
    setBusy(true);
    try {
      if (modus === 'register') await register(email, passwort);
      else await login(email, passwort);
      setEmail('');
      setPasswort('');
    } catch (err) {
      setFehler(err.message || 'Aktion fehlgeschlagen.');
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
          Dein Lernfortschritt wird mit diesem Konto synchronisiert und ist auf anderen Geräten
          verfügbar.
        </p>
        <button
          onClick={() => logout()}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:border-red-400 text-sm"
        >
          Abmelden
        </button>
      </div>
    );
  }

  const inputClass =
    'w-full input';

  return (
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-bold">👤 Konto</h1>
      <p className="text-sm text-gray-500">
        Optional: Mit einem Konto wird dein Fortschritt geräteübergreifend gespeichert. Ohne Konto
        läuft alles lokal im Browser.
      </p>

      <div className="flex gap-2 text-sm">
        <button
          onClick={() => {
            setModus('login');
            setFehler(null);
          }}
          className={`px-3 py-1.5 rounded-md border ${
            modus === 'login'
              ? 'bg-indigo-500 text-white border-indigo-500'
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
              ? 'bg-indigo-500 text-white border-indigo-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          Registrieren
        </button>
      </div>

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
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1" htmlFor="passwort">
            Passwort {modus === 'register' && '(mind. 8 Zeichen)'}
          </label>
          <input
            id="passwort"
            type="password"
            autoComplete={modus === 'register' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            className={inputClass}
          />
        </div>

        {fehler && <p className="text-sm text-red-600">{fehler}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full py-2.5"
        >
          {busy ? '…' : modus === 'register' ? 'Konto erstellen' : 'Jetzt anmelden'}
        </button>
      </form>
    </div>
  );
}
