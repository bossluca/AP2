/* eslint-disable react-refresh/only-export-components -- Context-Datei exportiert bewusst Provider + Hook zusammen. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authApi, progressApi } from '../lib/api';
import {
  BESITZER_KEY,
  entscheideNachLogin,
  hatLokaleNutzerdaten,
  ladeBesitzer,
  loescheLokaleNutzerdaten,
  setzeBesitzer,
} from '../lib/besitzer';
import { flusheOutbox, ladeOutbox, speichereOutbox } from '../lib/outbox';

/**
 * @typedef {Object} AuthContextValue
 * @property {{id:number, email:string, admin?:boolean}|null} user  Angemeldeter Nutzer oder null.
 * @property {boolean} ready   true, sobald der initiale me()-Check durch ist.
 * @property {'mergen'|'laden'|null} syncModus  Wie die Provider nach dem Login
 *           synchronisieren (C1): lokalen Stand mergen oder nur Server-Stand laden.
 * @property {{user:Object}|null} uebernahmeFrage  Offene Rückfrage „Lokalen
 *           Fortschritt übernehmen?“ (anonyme Daten beim ersten Login).
 * @property {(ja:boolean)=>void} beantworteUebernahme
 * @property {(email:string, password:string)=>Promise<void>} login
 * @property {(email:string, password:string, inviteCode?:string)=>Promise<{recoveryCode?:string}>} register
 *           Liefert den einmalig anzuzeigenden Recovery-Code mit.
 * @property {(email:string, code:string, newPassword:string)=>Promise<{recoveryCode?:string}>} recover
 *           Passwort-Reset per Recovery-Code; liefert den neuen Code mit.
 * @property {()=>Promise<void>} logout
 * @property {()=>Promise<void>} deleteAccount  Konto + Serverdaten löschen (DSGVO).
 */

// Default-Wert, damit useAuth auch ohne Provider funktioniert (z. B. in Tests
// oder rein lokalem Betrieb ohne Backend): dann ist niemand angemeldet.
const AuthContext = createContext(
  /** @type {AuthContextValue} */ ({
    user: null,
    ready: true,
    syncModus: null,
    uebernahmeFrage: null,
    beantworteUebernahme: () => {},
    login: async () => {},
    register: async () => ({}),
    recover: async () => ({}),
    logout: async () => {},
    deleteAccount: async () => {},
  })
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  // C1: 'mergen' = lokalen Stand ins Konto übernehmen (anonym → Konto mit „Ja“
  // oder gleiches Konto), 'laden' = nur den Server-Stand laden (fremde lokale
  // Daten wurden verworfen bzw. Übernahme abgelehnt). null = abgemeldet.
  const [syncModus, setSyncModus] = useState(null);
  // Offene Rückfrage „Lokalen Fortschritt übernehmen?“ → { user } oder null.
  const [uebernahmeFrage, setUebernahmeFrage] = useState(null);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  /** Sitzung „scharf“ schalten: Besitzer setzen, Sync-Modus, Nutzer. */
  const aktiviere = useCallback((neuerUser, modus) => {
    setzeBesitzer(neuerUser.id);
    setSyncModus(modus);
    setUebernahmeFrage(null);
    setUser(neuerUser);
  }, []);

  /**
   * Zentrale Besitzer-Prüfung nach jedem erfolgreichen Login/`me()` (C1):
   * Daten eines anderen Kontos werden vor dem Aktivieren gelöscht, anonyme
   * Daten nur nach Rückfrage übernommen.
   */
  const uebernehmeSitzung = useCallback(
    (neuerUser) => {
      if (!neuerUser) return;
      const entscheidung = entscheideNachLogin(ladeBesitzer(), neuerUser.id);
      if (entscheidung === 'behalten') {
        aktiviere(neuerUser, 'mergen');
      } else if (entscheidung === 'verwerfen') {
        loescheLokaleNutzerdaten();
        aktiviere(neuerUser, 'laden');
      } else if (hatLokaleNutzerdaten()) {
        setUebernahmeFrage({ user: neuerUser }); // UI fragt nach (UebernahmeDialog)
      } else {
        aktiviere(neuerUser, 'mergen');
      }
    },
    [aktiviere]
  );

  /** Antwort auf die Übernahme-Rückfrage: Ja übernimmt, Nein verwirft lokal. */
  const beantworteUebernahme = useCallback(
    (ja) => {
      const frage = uebernahmeFrage;
      if (!frage) return;
      if (ja) {
        aktiviere(frage.user, 'mergen');
      } else {
        loescheLokaleNutzerdaten();
        aktiviere(frage.user, 'laden');
      }
    },
    [uebernahmeFrage, aktiviere]
  );

  // Bestehende Sitzung beim Start prüfen. Schlägt fehl (kein Backend / nicht
  // angemeldet), bleibt user = null und die App läuft rein lokal weiter.
  useEffect(() => {
    let aktiv = true;
    authApi
      .me()
      .then((d) => aktiv && uebernehmeSitzung(d?.user))
      .catch(() => {})
      .finally(() => aktiv && setReady(true));
    return () => {
      aktiv = false;
    };
  }, [uebernehmeSitzung]);

  // Anderer Tab hat sich ab- oder mit einem anderen Konto angemeldet: diesen
  // Tab abmelden und die Sitzung neu prüfen (nie mit fremdem Konto weiterlernen).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== BESITZER_KEY || !userRef.current) return;
      const besitzer = ladeBesitzer();
      if (besitzer && String(besitzer.userId) === String(userRef.current.id)) return;
      setUser(null);
      setSyncModus(null);
      authApi
        .me()
        .then((d) => uebernehmeSitzung(d?.user))
        .catch(() => {});
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [uebernehmeSitzung]);

  const login = useCallback(
    async (email, password) => {
      const d = await authApi.login(email, password);
      uebernehmeSitzung(d.user);
    },
    [uebernehmeSitzung]
  );

  const register = useCallback(
    async (email, password, inviteCode) => {
      const d = await authApi.register(email, password, inviteCode);
      uebernehmeSitzung(d.user);
      return d; // enthält den einmalig anzuzeigenden recoveryCode
    },
    [uebernehmeSitzung]
  );

  // Passwort vergessen: Reset per Recovery-Code; meldet direkt an.
  const recover = useCallback(
    async (email, code, newPassword) => {
      const d = await authApi.recover(email, code, newPassword);
      uebernehmeSitzung(d.user);
      return d; // enthält den rotierten recoveryCode
    },
    [uebernehmeSitzung]
  );

  /** Abgemeldet: Zustand leeren und lokale Nutzerdaten entfernen (Theme bleibt). */
  const abmeldenLokal = useCallback(() => {
    setUser(null);
    setSyncModus(null);
    setUebernahmeFrage(null);
    loescheLokaleNutzerdaten();
  }, []);

  // Logout: zuerst liegengebliebene Writes dieses Kontos senden (best-effort),
  // dann abmelden und lokal aufräumen – der nächste Nutzer sieht nichts davon.
  const logout = useCallback(async () => {
    const aktuell = userRef.current;
    if (aktuell) {
      try {
        const { rest } = await flusheOutbox(
          ladeOutbox(),
          (id, entry) => progressApi.put(id, entry),
          aktuell.id
        );
        speichereOutbox(rest);
      } catch {
        /* offline: Rest geht mit dem Aufräumen verloren */
      }
    }
    await authApi.logout().catch(() => {});
    abmeldenLokal();
  }, [abmeldenLokal]);

  // Konto serverseitig löschen; danach abgemeldet und lokal aufgeräumt. Wirft
  // bei Fehler, damit die UI eine Rückmeldung geben kann.
  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    abmeldenLokal();
  }, [abmeldenLokal]);

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        syncModus,
        uebernahmeFrage,
        beantworteUebernahme,
        login,
        register,
        recover,
        logout,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
