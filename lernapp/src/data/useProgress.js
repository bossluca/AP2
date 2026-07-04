/**
 * @deprecated Der Fortschritt wird jetzt zentral über den ProgressContext
 * verwaltet (Single Source of Truth, Multi-Tab-Sync). Dieses Modul
 * re-exportiert nur noch `useProgress` aus dem Context, damit ältere Importe
 * nicht brechen. Neue Importe bitte direkt aus `../context/ProgressContext`.
 */
export { useProgress } from '../context/ProgressContext';
