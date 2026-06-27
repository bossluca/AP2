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
import { getLearnableQuestions } from '../data/useExamData';
import { bewerten, istFaellig } from '../lib/srs';
import {
  addAktivitaet,
  berechneStreak,
  heuteAnzahl,
  aktiveTage as zaehleAktiveTage,
  STANDARD_TAGESZIEL,
} from '../lib/aktivitaet';
import { berechneLevel } from '../lib/level';
import { useAuth } from './AuthContext';
import { progressApi } from '../lib/api';

/**
 * Versionierter localStorage-Schlüssel. Bei inkompatiblen Schema-Änderungen
 * Suffix erhöhen (`_v2`, ...), damit alte Daten nicht falsch interpretiert werden.
 */
const STORAGE_KEY = 'ap2_lernapp_progress_v1';

/**
 * Lokaler Gamification-Stand (Lern-Aktivität pro Tag + bestes Klausur-Ergebnis).
 * Bewusst getrennt vom synchronisierten Fortschritt: rein lokal, best-effort.
 */
const GAMIFICATION_KEY = 'ap2_lernapp_gamification_v1';

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
  return { activity: {}, klausurBest: 0, xp: 0 };
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
 * @typedef {Object} QuestionProgress
 * @property {'gelernt'|'ueben'} [status]   Manuell/automatisch gesetzter Lernstatus.
 * @property {string}            [lastSeen] ISO-Zeitstempel des letzten Kontakts.
 * @property {'richtig'|'teilweise'|'falsch'} [lastResult] Letztes Quiz-Ergebnis.
 * @property {{ts:string, result:string}[]} [history] Letzte (max. 20) Ergebnisse.
 * @property {number}            [box]      Leitner-Box (1–5) für Spaced Repetition.
 * @property {string}            [due]      ISO-Zeitstempel der nächsten Fälligkeit.
 */

/**
 * @typedef {Object.<string, QuestionProgress>} ProgressMap
 *          Map von Frage-ID → Fortschritt.
 */

/**
 * Lädt den Fortschritt aus localStorage. Defensiv: gibt bei fehlenden,
 * defekten oder nicht parsebaren Daten ein leeres Objekt zurück.
 * @returns {ProgressMap}
 */
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Persistiert den Fortschritt. Fehler (Quota, Privatmodus) werden geschluckt,
 * damit die App auch ohne funktionierenden Storage nutzbar bleibt.
 * @param {ProgressMap} progress
 */
function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

/**
 * @typedef {Object} ProgressContextValue
 * @property {ProgressMap} progress
 * @property {(id:string, status:'gelernt'|'ueben') => void} setStatus
 * @property {(id:string, result:'richtig'|'teilweise'|'falsch') => void} recordQuizResult
 * @property {(id:string, gewusst:boolean) => void} recordReview  Leitner-Bewertung.
 * @property {() => void} resetProgress
 * @property {(id:string) => (string|null)} getStatus  Refstabil.
 * @property {(id:string) => (QuestionProgress|null)} getEntry   Refstabil.
 * @property {(id:string) => boolean} isDue  Refstabil – ist das Objekt fällig?
 * @property {{total:number, gelernt:number, ueben:number, offen:number}} stats
 */

/** @type {import('react').Context<ProgressContextValue|null>} */
const ProgressContext = createContext(null);

/**
 * Single Source of Truth für den Lernfortschritt der gesamten App.
 *
 * Hält den Fortschritt in einem zentralen State, synchronisiert ihn mit
 * localStorage und – über das `storage`-Event – mit anderen offenen Tabs.
 * Alle Seiten (Home, Quiz, Karteikarten) konsumieren denselben State, sodass
 * z. B. eine im Quiz bewertete Frage sofort in der Home-Statistik auftaucht.
 *
 * @param {{children: import('react').ReactNode}} props
 */
export function ProgressProvider({ children }) {
  const [progress, setProgress] = useState(loadProgress);
  const [gamification, setGamification] = useState(loadGamification);
  const { user } = useAuth();

  // Ref auf den jeweils aktuellen Stand, damit `getStatus` refstabil bleibt
  // und nachgelagerte useMemo-Filter nicht bei jeder Bewertung neu rechnen.
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Ref auf den angemeldeten Nutzer, damit die Mutatoren refstabil bleiben und
  // trotzdem wissen, ob serverseitig synchronisiert werden soll.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Persistieren bei jeder Änderung (lokaler Spiegel, auch wenn angemeldet).
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  // Gamification-Stand lokal persistieren.
  useEffect(() => {
    saveGamification(gamification);
  }, [gamification]);

  // Multi-Tab-Sync: Änderungen in einem anderen Tab übernehmen.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setProgress(loadProgress());
      else if (e.key === GAMIFICATION_KEY) setGamification(loadGamification());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Nach dem Login: lokalen Fortschritt nicht-destruktiv ins Konto übernehmen
  // (Migration) und anschließend den Kontostand als maßgeblich laden. Offline /
  // ohne Backend schlägt das fehl und der lokale Stand bleibt erhalten.
  useEffect(() => {
    if (!user) return;
    let aktiv = true;
    (async () => {
      try {
        await progressApi.merge(progressRef.current);
        const { progress: server } = await progressApi.getAll();
        if (aktiv && server) setProgress(server);
      } catch {
        /* offline: lokalen Stand behalten */
      }
    })();
    return () => {
      aktiv = false;
    };
  }, [user]);

  // Schreibt einen Eintrag in den State und (falls angemeldet) best-effort
  // ans Backend. Inhalt wird aus dem aktuellen Stand (Ref) berechnet.
  const persist = useCallback((questionId, entry) => {
    setProgress((prev) => ({ ...prev, [questionId]: entry }));
    if (userRef.current) progressApi.put(questionId, entry).catch(() => {});
  }, []);

  /** Setzt den Lernstatus einer Frage und aktualisiert `lastSeen`. */
  const setStatus = useCallback(
    (questionId, status) => {
      persist(questionId, {
        ...(progressRef.current[questionId] || {}),
        status,
        lastSeen: new Date().toISOString(),
      });
    },
    [persist]
  );

  /** Speichert ein Quiz-Ergebnis (mit gekappter Historie, max. 20 Einträge). */
  const recordQuizResult = useCallback(
    (questionId, result) => {
      const existing = progressRef.current[questionId] || {};
      const history = [
        ...(existing.history || []),
        { ts: new Date().toISOString(), result },
      ].slice(-20);
      persist(questionId, {
        ...existing,
        lastSeen: new Date().toISOString(),
        lastResult: result,
        history,
      });
    },
    [persist]
  );

  /**
   * Bewertet ein Lernobjekt im Spaced-Repetition-Sinn (Leitner). Aktualisiert
   * Box + Fälligkeit und protokolliert das Ergebnis in der Historie. Unabhängig
   * vom manuellen `status` (gelernt/üben).
   * @param {string} questionId
   * @param {boolean} gewusst
   */
  const recordReview = useCallback(
    (questionId, gewusst) => {
      const existing = progressRef.current[questionId] || {};
      const srs = bewerten(existing, gewusst);
      const history = [
        ...(existing.history || []),
        { ts: new Date().toISOString(), result: gewusst ? 'gewusst' : 'nicht' },
      ].slice(-20);
      persist(questionId, {
        ...existing,
        ...srs,
        lastSeen: new Date().toISOString(),
        history,
      });
    },
    [persist]
  );

  /** Löscht den gesamten Fortschritt (lokal und – falls angemeldet – im Konto). */
  const resetProgress = useCallback(() => {
    setProgress({});
    setGamification({ activity: {}, klausurBest: 0, xp: 0 });
    if (userRef.current) progressApi.reset().catch(() => {});
  }, []);

  /**
   * Verbucht Lernaktivität für heute (für Streak/Tagesziel/Heatmap). Wird von den
   * Lernmodi pro bewerteter Karte/Frage aufgerufen.
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

  /** Merkt sich das beste Klausur-Ergebnis (in %) für den Klausur-Held-Erfolg. */
  const recordKlausurErgebnis = useCallback((prozent) => {
    const p = Math.round(Number(prozent) || 0);
    setGamification((g) => ({ ...g, klausurBest: Math.max(g.klausurBest || 0, p) }));
  }, []);

  /** Refstabiler Status-Lookup über die Ref (keine Abhängigkeit von `progress`). */
  const getStatus = useCallback(
    (questionId) => progressRef.current[questionId]?.status || null,
    []
  );

  /** Refstabiler Lookup des kompletten Fortschritts-Eintrags (oder null). */
  const getEntry = useCallback((questionId) => progressRef.current[questionId] || null, []);

  /** Refstabil: ist das Lernobjekt aktuell fällig (Leitner)? Neu = fällig. */
  const isDue = useCallback(
    (questionId) => istFaellig(progressRef.current[questionId]),
    []
  );

  // Aggregierte Statistik – einmal pro Progress-Änderung berechnet.
  const stats = useMemo(() => {
    const learnable = getLearnableQuestions();
    const total = learnable.length;
    let gelernt = 0;
    let ueben = 0;
    for (const q of learnable) {
      const s = progress[q.id]?.status;
      if (s === 'gelernt') gelernt += 1;
      else if (s === 'ueben') ueben += 1;
    }
    return { total, gelernt, ueben, offen: total - gelernt - ueben };
  }, [progress]);

  // Abgeleitete Gamification-Kennzahlen (Streak, heutige Aktivität, aktive Tage).
  const gami = useMemo(
    () => ({
      activity: gamification.activity,
      streak: berechneStreak(gamification.activity),
      heuteAktivitaet: heuteAnzahl(gamification.activity),
      aktiveTage: zaehleAktiveTage(gamification.activity),
      klausurBest: gamification.klausurBest || 0,
      xp: gamification.xp || 0,
      level: berechneLevel(gamification.xp || 0),
      tagesziel: STANDARD_TAGESZIEL,
    }),
    [gamification]
  );

  const value = useMemo(
    () => ({
      progress,
      setStatus,
      recordQuizResult,
      recordReview,
      resetProgress,
      recordActivity,
      recordKlausurErgebnis,
      recordXp,
      getStatus,
      getEntry,
      isDue,
      stats,
      gami,
    }),
    [
      progress,
      setStatus,
      recordQuizResult,
      recordReview,
      resetProgress,
      recordActivity,
      recordKlausurErgebnis,
      recordXp,
      getStatus,
      getEntry,
      isDue,
      stats,
      gami,
    ]
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

/**
 * Zugriff auf den Fortschritts-Context.
 * @returns {ProgressContextValue}
 * @throws wenn außerhalb eines {@link ProgressProvider} verwendet.
 */
export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error('useProgress muss innerhalb von <ProgressProvider> verwendet werden.');
  }
  return ctx;
}
