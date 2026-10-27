// Globales Test-Setup (von Vitest via vite.config.js geladen).
// Registriert die jest-dom-Matcher (toBeInTheDocument, toHaveTextContent, ...)
// für spätere Komponententests.
import '@testing-library/jest-dom/vitest';

// C9: Die Prüfungsdaten werden in der App erst nach dem Login dynamisch geladen.
// Tests stellen sie direkt bereit, damit Seiten/Selektoren wie bisher synchron
// darauf zugreifen können.
import examData from '../data/exam_data.json';
import { setzeExamDaten } from '../data/examDaten';
setzeExamDaten(examData);
