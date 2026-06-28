/* eslint-disable react-refresh/only-export-components -- Context-Datei exportiert bewusst Provider + Hook zusammen. */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../lib/api';

/**
 * @typedef {Object} AuthContextValue
 * @property {{id:number, email:string}|null} user  Angemeldeter Nutzer oder null.
 * @property {boolean} ready   true, sobald der initiale me()-Check durch ist.
 * @property {(email:string, password:string)=>Promise<void>} login
 * @property {(email:string, password:string)=>Promise<void>} register
 * @property {()=>Promise<void>} logout
 * @property {()=>Promise<void>} deleteAccount  Konto + Serverdaten löschen (DSGVO).
 */

// Default-Wert, damit useAuth auch ohne Provider funktioniert (z. B. in Tests
// oder rein lokalem Betrieb ohne Backend): dann ist niemand angemeldet.
const AuthContext = createContext(
  /** @type {AuthContextValue} */ ({
    user: null,
    ready: true,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
    deleteAccount: async () => {},
  })
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Bestehende Sitzung beim Start prüfen. Schlägt fehl (kein Backend / nicht
  // angemeldet), bleibt user = null und die App läuft rein lokal weiter.
  useEffect(() => {
    let aktiv = true;
    authApi
      .me()
      .then((d) => aktiv && setUser(d.user))
      .catch(() => aktiv && setUser(null))
      .finally(() => aktiv && setReady(true));
    return () => {
      aktiv = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await authApi.login(email, password);
    setUser(d.user);
  }, []);

  const register = useCallback(async (email, password) => {
    const d = await authApi.register(email, password);
    setUser(d.user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  }, []);

  // Konto serverseitig löschen; danach abgemeldet. Wirft bei Fehler, damit die
  // UI eine Rückmeldung geben kann.
  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
