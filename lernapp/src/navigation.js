import {
  Home as HomeIcon,
  Play,
  Route as RouteIcon,
  Layers,
  FileText,
  RotateCcw,
  HelpCircle,
  GraduationCap,
  BarChart3,
  PencilLine,
  Zap,
  Info,
  Puzzle,
  Trophy,
} from 'lucide-react';

/**
 * Zentrale Navigations-Definition (eigenes Modul, damit sowohl die App-Shell als
 * auch die Command-Palette darauf zugreifen, ohne zirkulär `App.jsx` zu
 * importieren). `icon` = Lucide-Komponente (für die UI), `iconName` = Name als
 * String (für die Palette, die Icons dynamisch auflöst).
 */
export const NAV = [
  { to: '/', label: 'Start', end: true, icon: HomeIcon, iconName: 'Home' },
  { to: '/lernen', label: 'Lernen', icon: Play, iconName: 'Play' },
  { to: '/lernpfade', label: 'Lernpfade', icon: RouteIcon, iconName: 'Route' },
  { to: '/karteikarten', label: 'Karten', icon: Layers, iconName: 'Layers' },
  { to: '/lernzettel', label: 'Lernzettel', icon: FileText, iconName: 'FileText' },
  { to: '/wiederholen', label: 'Wiederholen', icon: RotateCcw, iconName: 'RotateCcw' },
  { to: '/quiz', label: 'Quiz', icon: HelpCircle, iconName: 'HelpCircle' },
  { to: '/luecken', label: 'Lückentext', icon: PencilLine, iconName: 'PencilLine' },
  { to: '/drill', label: 'Drill', icon: Zap, iconName: 'Zap' },
  { to: '/matching', label: 'Zuordnen', icon: Puzzle, iconName: 'Puzzle' },
  { to: '/klausur', label: 'Klausur', icon: GraduationCap, iconName: 'GraduationCap' },
  { to: '/statistik', label: 'Statistik', icon: BarChart3, iconName: 'BarChart3' },
];

/** Sekundäre Ziele: nicht in der Hauptleiste, aber im „Mehr"-Sheet + Palette. */
export const NAV_SEKUNDAER = [
  { to: '/rangliste', label: 'Rangliste', icon: Trophy, iconName: 'Trophy' },
  { to: '/info', label: 'Über & Datenschutz', icon: Info, iconName: 'Info' },
];

/** Routen, die in der mobilen Bottom-Leiste primär erscheinen. */
export const BOTTOM_ROUTES = ['/', '/lernen', '/wiederholen', '/statistik'];

/** Routen, die in der Desktop-Leiste direkt erscheinen (Rest über „Mehr"). */
export const DESKTOP_ROUTES = ['/', '/lernen', '/lernpfade', '/wiederholen', '/klausur', '/statistik'];
