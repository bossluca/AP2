/* eslint-disable react-refresh/only-export-components -- Context-Datei exportiert bewusst Provider + Hook zusammen. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'ap2_lernapp_theme_v1';

/**
 * Ermittelt das Start-Theme: gespeicherte Wahl > System-Einstellung > "light".
 * @returns {'light'|'dark'}
 */
function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * @typedef {Object} ThemeContextValue
 * @property {'light'|'dark'} theme
 * @property {() => void} toggleTheme
 */

/** @type {import('react').Context<ThemeContextValue|null>} */
const ThemeContext = createContext(null);

/**
 * Verwaltet das Farbschema (Hell/Dunkel) der App.
 *
 * Setzt die Klasse `dark` auf <html> (von Tailwind ausgewertet) und merkt sich
 * die Wahl in localStorage. Ohne gespeicherte Wahl folgt die App der
 * System-Einstellung des Betriebssystems.
 *
 * @param {{children: import('react').ReactNode}} props
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Zugriff auf das Theme.
 * @returns {ThemeContextValue}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme muss innerhalb von <ThemeProvider> verwendet werden.');
  }
  return ctx;
}
