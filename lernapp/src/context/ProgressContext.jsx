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
import { bewerten, istFaellig } from '../lib/fsrs';
import {
  addAktivitaet,
  streakDetail,
  verfuegbareFreezes,
  heuteAnzahl,
  aktiveTage as zaehleAktiveTage,
  STANDARD_TAGESZIEL,
} from '../lib/aktivitaet';
import { berechneLevel } from '../lib/level';
import { ladeResume, speichereResume, loescheResume } from '../lib/resume';
import { useAuth } from './AuthContext';
import { progressApi, gamificationApi } from '../lib/api';
import { mergeGamification } from '../lib/gamiMerge';

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
 * @property {number}            [box]      Abgeleitete Stärke-Stufe (1–5) für Anzeige/Statistik.
 * @property {number}            [stability]   FSRS-Stabilität (Tage bis Ziel-Retention).
 * @property {number}            [difficulty]  FSRS-Schwierigkeit (1–10).
 * @property {number}            [reps]        Anzahl Wiederholungen.
 * @property {number}            [lapses]      Anzahl Vergessens-Ereignisse.
 * @property {string}            [last_review] ISO-Zeitstempel der letzten Bewertung.
 * @property {string}            [due]      ISO-Zeitstempel der nächsten Fälligkeit.
 */

/**
 * Ergebnis-Label einer SRS-Bewertung für die Historie (steuert u. a. die
 * Schwachstellen-Erkennung in `statistik.js`). Akzeptiert boolean oder FSRS-Note.
 * @param {boolean|number} note
 */
function reviewLabel(note) {
  if (typeof note === 'boolean') return note ? 'gewusst' : 'nicht';
  if (note <= 1) return 'nicht';
  if (note === 2) return 'schwer';
  return 'gewusst';
}

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
 * @property {(id:string, note:boolean|number) => void} recordReview  FSRS-Bewertung (boolean oder Note 1–4).
 * @property {() => void} resetProgress
 * @property {(id:string) => (string|null)} getStatus  Refstabil.
 * @property {(id:string) => (QuestionProgress|null)} getEntry   Refstabil.
 * @property {(id:string) => boolean} isDue  Refstabil – ist das Objekt fällig?
 * @property {{total:number, gelernt:number, ueben:number, offen:number}} stats
 * @property {import('../lib/resume').ResumeEintrag|null} resume  Zuletzt begonnene Session.
 * @property {(e:{to:string,titel:string,modus?:string}) => void} setResume
 * @property {() => void} clearResume
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
  // „Weiterlernen": zuletzt begonnene Session (gerätelokal, best-effort).
  const [resume, setResumeState] = useState(() => ladeResume());
  const { user } = useAuth();

  // Ref auf den jeweils aktuellen Stand, damit `getStatus` refstabil bleibt
  // und nachgelagerte useMemo-Filter nicht bei jeder Bewertung neu rechnen.
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Ref auf den Gamification-Stand (für den Login-Merge) + Flag, ab wann der
  // Server-Sync „scharf" ist (erst nach dem Login-Merge, sonst würde der lokale
  // Stand den evtl. höheren Kontostand überschreiben).
  const gamificationRef = useRef(gamification);
  useEffect(() => {
    gamificationRef.current = gamification;
  }, [gamification]);
  const gamiSyncBereit = useRef(false);

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

  // Gamification-Stand lokal persistieren – und, wenn angemeldet und der
  // Login-Merge durch ist, best-effort ins Konto durchschreiben (Overwrite).
  useEffect(() => {
    saveGamification(gamification);
    if (userRef.current && gamiSyncBereit.current) {
      gamificationApi.put(gamification).catch(() => {});
    }
  }, [gamification]);

  // Multi-Tab-Sync: Änderungen in einem anderen Tab übernehmen.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setProgress(loadProgress());
      else if (e.key === GAMIFICATION_KEY) setGamification(loadGamification());
      else if (e.key === 'ap2_lernapp_resume_v1') setResumeState(ladeResume());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Nach dem Login: lokalen Fortschritt nicht-destruktiv ins Konto übernehmen
  // (Migration) und anschließend den Kontostand als maßgeblich laden. Offline /
  // ohne Backend schlägt das fehl und der lokale Stand bleibt erhalten.
  useEffect(() => {
    gamiSyncBereit.current = false; // bei Nutzerwechsel/Logout Sync pausieren
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
      // Gamification: Server-Stand laden, mit lokalem mischen (max-basiert) und
      // übernehmen. Das anschließende setGamification schreibt via Save-Effekt
      // den gemergten Stand ins Konto zurück.
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
   * Bewertet ein Lernobjekt im Spaced-Repetition-Sinn (FSRS). Aktualisiert den
   * FSRS-Zustand (Stabilität/Schwierigkeit/Fälligkeit, abgeleitete Box) und
   * protokolliert das Ergebnis in der Historie. Unabhängig vom manuellen
   * `status` (gelernt/üben). Alt-Daten (Leitner-`box`) werden transparent migriert.
   * @param {string} questionId
   * @param {boolean|1|2|3|4} note  boolean (gewusst?) oder FSRS-Note
   *        (1 Nochmal · 2 Schwer · 3 Gut · 4 Leicht).
   */
  const recordReview = useCallback(
    (questionId, note) => {
      const existing = progressRef.current[questionId] || {};
      const srs = bewerten(existing, note);
      const history = [
        ...(existing.history || []),
        { ts: new Date().toISOString(), result: reviewLabel(note) },
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
    loescheResume();
    setResumeState(null);
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

  /** Merkt die zuletzt begonnene Lern-Aktion (für „Weiterlernen"). */
  const setResume = useCallback((eintrag) => {
    const voll = speichereResume(eintrag);
    if (voll) setResumeState(voll);
  }, []);

  /** Löscht den Weiterlernen-Zustand (z. B. nach sauberem Session-Abschluss). */
  const clearResume = useCallback(() => {
    loescheResume();
    setResumeState(null);
  }, []);

  /** Refstabiler Status-Lookup über die Ref (keine Abhängigkeit von `progress`). */
  const getStatus = useCallback(
    (questionId) => progressRef.current[questionId]?.status || null,
    []
  );

  /** Refstabiler Lookup des kompletten Fortschritts-Eintrags (oder null). */
  const getEntry = useCallback((questionId) => progressRef.current[questionId] || null, []);

  /** Refstabil: ist das Lernobjekt aktuell fällig (FSRS)? Neu = fällig. */
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
      resume,
      setResume,
      clearResume,
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
      resume,
      setResume,
      clearResume,
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
