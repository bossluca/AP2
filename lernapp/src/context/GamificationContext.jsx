/* eslint-disable react-refresh/only-export-components -- Context-Datei exportiert bewusst Provider + Hook zusammen. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addAktivitaet,
  streakDetail,
  verfuegbareFreezes,
  heuteAnzahl,
  aktiveTage as zaehleAktiveTage,
  STANDARD_TAGESZIEL,
} from '../lib/aktivitaet';
import { berechneLevel } from '../lib/level';
import { useAuth } from './AuthContext';
import { gamificationApi } from '../lib/api';
import { mergeGamification } from '../lib/gamiMerge';

/**
 * Lokaler Gamification-Stand (Lern-Aktivität pro Tag, XP, bestes
 * Klausur-Ergebnis). Bewusst getrennt vom Lernfortschritt: eigener
 * localStorage-Schlüssel, eigener Context → eine XP-Gutschrift rendert
 * nicht alle Fortschritts-Consumer neu.
 */
const GAMIFICATION_KEY = 'ap2_lernapp_gamification_v1';

/** Leerer Ausgangszustand (auch für Reset/Merge verwendet). */
export function leererGamificationStand() {
  return { activity: {}, klausurBest: 0, xp: 0 };
}

/** Lädt den Gamification-Stand defensiv aus localStorage. */
function loadGamification() {
  try {
    const raw = localStorage.getItem(GAMIFICATION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      return {
        activity: parsed.activity && typeof parsed.activity === 'object' ? parsed.activity : {},
        klausurBest: Number(parsed.klausurBest) || 0,
        xp: Number(parsed.xp) || 0,
      };
    }
  } catch {
    /* ignore */
  }
  return leererGamificationStand();
}

/** Persistiert den Gamification-Stand (Fehler werden geschluckt). */
function saveGamification(g) {
  try {
    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(g));
  } catch {
    /* ignore */
  }
}

/**
 * @typedef {Object} GamificationContextValue
 * @property {{activity:Object, streak:number, freezesGenutzt:number,
 *   freezesVerfuegbar:number, heuteAktivitaet:number, aktiveTage:number,
 *   klausurBest:number, xp:number, level:Object, tagesziel:number}} gami
 * @property {(n?:number) => void} recordActivity
 * @property {(amount:number) => void} recordXp
 * @property {(prozent:number) => void} recordKlausurErgebnis
 * @property {() => void} resetGamification
 * @property {(stand:Object) => void} importGamification  Max-basiertes Merge (Export/Import, Login).
 * @property {() => Object} getGamificationRoh  Refstabil – roher Stand für Export.
 */

/** @type {import('react').Context<GamificationContextValue|null>} */
const GamificationContext = createContext(null);

/**
 * Hält Streak/XP/Quests-Daten, synchronisiert sie mit localStorage und –
 * falls angemeldet – best-effort mit dem Konto (`/api/gamification`).
 * Beim Login wird der lokale Stand max-basiert mit dem Kontostand gemergt.
 *
 * @param {{children: import('react').ReactNode}} props
 */
export function GamificationProvider({ children }) {
  const [gamification, setGamification] = useState(loadGamification);
  const { user } = useAuth();

  // Ref auf den aktuellen Stand (für refstabilen Export-Lookup).
  const gamificationRef = useRef(gamification);
  useEffect(() => {
    gamificationRef.current = gamification;
  }, [gamification]);

  // Server-Sync erst nach dem Login-Merge „scharf" schalten, sonst würde der
  // lokale Stand den evtl. höheren Kontostand überschreiben.
  const gamiSyncBereit = useRef(false);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Lokal persistieren – und, wenn angemeldet und Merge durch, durchschreiben.
  useEffect(() => {
    saveGamification(gamification);
    if (userRef.current && gamiSyncBereit.current) {
      gamificationApi.put(gamification).catch(() => {});
    }
  }, [gamification]);

  // Multi-Tab-Sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === GAMIFICATION_KEY) setGamification(loadGamification());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Nach dem Login: Kontostand laden, max-basiert mit lokalem Stand mergen.
  // Der Save-Effekt schreibt den gemergten Stand anschließend zurück.
  useEffect(() => {
    gamiSyncBereit.current = false; // bei Nutzerwechsel/Logout Sync pausieren
    if (!user) return;
    let aktiv = true;
    (async () => {
      try {
        const { gamification: serverGami } = await gamificationApi.get();
        if (aktiv) setGamification((lokal) => mergeGamification(lokal, serverGami));
      } catch {
        /* offline: lokalen Stand behalten */
      }
      if (aktiv) gamiSyncBereit.current = true;
    })();
    return () => {
      aktiv = false;
    };
  }, [user]);

  /**
   * Verbucht Lernaktivität für heute (für Streak/Tagesziel/Heatmap). Wird von
   * den Lernmodi pro bewerteter Karte/Frage aufgerufen.
   * @param {number} [n]
   */
  const recordActivity = useCallback((n = 1) => {
    setGamification((g) => ({ ...g, activity: addAktivitaet(g.activity, n) }));
  }, []);

  /** Schreibt Erfahrungspunkte gut (für Level-Fortschritt). */
  const recordXp = useCallback((amount) => {
    const x = Math.max(0, Math.floor(Number(amount) || 0));
    if (x === 0) return;
    setGamification((g) => ({ ...g, xp: (g.xp || 0) + x }));
  }, []);

  /** Merkt das beste Klausur-Ergebnis (in %) für den Klausur-Held-Erfolg. */
  const recordKlausurErgebnis = useCallback((prozent) => {
    const p = Math.round(Number(prozent) || 0);
    setGamification((g) => ({ ...g, klausurBest: Math.max(g.klausurBest || 0, p) }));
  }, []);

  /** Setzt den Gamification-Stand zurück (lokal; Server via Save-Effekt). */
  const resetGamification = useCallback(() => {
    setGamification(leererGamificationStand());
  }, []);

  /**
   * Übernimmt einen importierten Stand nicht-destruktiv (max-basiertes Merge,
   * gleiche Semantik wie der Login-Merge). Für Fortschritts-Import/Backup.
   */
  const importGamification = useCallback((stand) => {
    setGamification((lokal) => mergeGamification(lokal, stand));
  }, []);

  /** Refstabil: roher Stand (activity/xp/klausurBest) für den Export. */
  const getGamificationRoh = useCallback(() => gamificationRef.current, []);

  // Abgeleitete Kennzahlen (Streak, heutige Aktivität, Level, Freezes).
  const gami = useMemo(() => {
    const at = zaehleAktiveTage(gamification.activity);
    const freezes = verfuegbareFreezes(at);
    const det = streakDetail(gamification.activity, new Date(), freezes);
    return {
      activity: gamification.activity,
      streak: det.streak,
      freezesGenutzt: det.genutzt,
      freezesVerfuegbar: freezes,
      heuteAktivitaet: heuteAnzahl(gamification.activity),
      aktiveTage: at,
      klausurBest: gamification.klausurBest || 0,
      xp: gamification.xp || 0,
      level: berechneLevel(gamification.xp || 0),
      tagesziel: STANDARD_TAGESZIEL,
    };
  }, [gamification]);

  const value = useMemo(
    () => ({
      gami,
      recordActivity,
      recordXp,
      recordKlausurErgebnis,
      resetGamification,
      importGamification,
      getGamificationRoh,
    }),
    [
      gami,
      recordActivity,
      recordXp,
      recordKlausurErgebnis,
      resetGamification,
      importGamification,
      getGamificationRoh,
    ]
  );

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

/**
 * Zugriff auf den Gamification-Context.
 * @returns {GamificationContextValue}
 * @throws wenn außerhalb eines {@link GamificationProvider} verwendet.
 */
export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error('useGamification muss innerhalb von <GamificationProvider> verwendet werden.');
  }
  return ctx;
}
