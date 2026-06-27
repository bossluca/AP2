import { useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  Home as HomeIcon,
  Play,
  Layers,
  FileText,
  RotateCcw,
  HelpCircle,
  GraduationCap,
  BarChart3,
  Search,
  User,
  Moon,
  Sun,
  Flame,
  Menu,
  X,
  PencilLine,
} from 'lucide-react';
import Home from './pages/Home';
// Übrige Seiten lazy laden – schlankerer Start-Chunk, Seite kommt bei Bedarf.
const Lernen = lazy(() => import('./pages/Lernen'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Luecken = lazy(() => import('./pages/Luecken'));
const Klausur = lazy(() => import('./pages/Klausur'));
const Lernzettel = lazy(() => import('./pages/Lernzettel'));
const Wiederholen = lazy(() => import('./pages/Wiederholen'));
const Statistik = lazy(() => import('./pages/Statistik'));
const Suche = lazy(() => import('./pages/Suche'));
const Konto = lazy(() => import('./pages/Konto'));
import { useTheme } from './context/ThemeContext';
import { useProgress } from './context/ProgressContext';
import ErfolgWatcher from './components/ErfolgWatcher';

/** Hauptnavigationspunkte (Reihenfolge = Anzeige). */
const NAV = [
  { to: '/', label: 'Start', end: true, icon: HomeIcon },
  { to: '/lernen', label: 'Lernen', icon: Play },
  { to: '/karteikarten', label: 'Karten', icon: Layers },
  { to: '/lernzettel', label: 'Lernzettel', icon: FileText },
  { to: '/wiederholen', label: 'Wiederholen', icon: RotateCcw },
  { to: '/quiz', label: 'Quiz', icon: HelpCircle },
  { to: '/luecken', label: 'Lückentext', icon: PencilLine },
  { to: '/klausur', label: 'Klausur', icon: GraduationCap },
  { to: '/statistik', label: 'Statistik', icon: BarChart3 },
];

/** Routen, die in der mobilen Bottom-Leiste primär erscheinen. */
const BOTTOM_ROUTES = ['/', '/lernen', '/wiederholen', '/statistik'];

const linkClass = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/30'
      : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
  }`;

const iconClass = ({ isActive }) =>
  `grid place-items-center w-9 h-9 rounded-lg transition-colors ${
    isActive
      ? 'bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white shadow-sm shadow-fuchsia-500/30'
      : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
  }`;

/** Hell-/Dunkel-Umschalter (zeigt das Symbol des anwählbaren Modus). */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={dark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren'}
      title={dark ? 'Hellmodus' : 'Dunkelmodus'}
      className="grid place-items-center w-9 h-9 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

/** Lern-Streak: Flamme + Tage in Folge. Nur ab Streak ≥ 1 sichtbar. */
function StreakBadge() {
  const { gami } = useProgress();
  if (!gami || gami.streak < 1) return null;
  return (
    <span
      title={`${gami.streak} Tage in Folge gelernt`}
      className="inline-flex items-center gap-1 px-1.5 h-9 text-sm font-semibold text-orange-500 dark:text-orange-400"
    >
      <Flame size={18} aria-hidden="true" />
      {gami.streak}
    </span>
  );
}

/** Obere Leiste: Marke, Desktop-Linkleiste (ab lg), rechte Icon-Gruppe. */
function TopBar() {
  return (
    <nav className="border-b border-gray-200/70 dark:border-gray-800 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur z-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2">
        <NavLink to="/" end className="font-bold text-base sm:text-lg mr-1 sm:mr-3 shrink-0">
          <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
            AP&nbsp;Lernapp
          </span>
        </NavLink>

        {/* Desktop (ab lg): volle Linkleiste */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Rechte Icon-Gruppe (immer sichtbar) */}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <StreakBadge />
          <NavLink to="/suche" className={iconClass} aria-label="Suche">
            <Search size={18} />
          </NavLink>
          <NavLink to="/konto" className={iconClass} aria-label="Konto">
            <User size={18} />
          </NavLink>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

const bottomItemClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-fuchsia-600 dark:text-fuchsia-400' : 'text-gray-500 dark:text-gray-400'
  }`;

/** Mobile/Tablet (bis lg): fixe Tab-Leiste unten + „Mehr"-Button. */
function BottomNav({ onMehr }) {
  const items = BOTTOM_ROUTES.map((to) => NAV.find((n) => n.to === to));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t border-gray-200/70 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={bottomItemClass}>
            <it.icon size={20} aria-hidden="true" />
            <span>{it.label}</span>
          </NavLink>
        ))}
        <button onClick={onMehr} className="flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          <Menu size={20} aria-hidden="true" />
          <span>Mehr</span>
        </button>
      </div>
    </nav>
  );
}

/** „Mehr"-Sheet: alle Bereiche als Kachelraster (mobil). */
function MehrSheet({ onClose }) {
  return (
    <div className="lg:hidden fixed inset-0 z-30" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-950 rounded-t-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">Alle Bereiche</span>
          <button onClick={onClose} aria-label="Schließen" className="grid place-items-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {NAV.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-fuchsia-300 dark:border-fuchsia-700 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50 dark:bg-fuchsia-900/20'
                    : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                }`
              }
            >
              <it.icon size={22} aria-hidden="true" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Dezenter Lade-Indikator, während ein Seiten-Chunk nachgeladen wird. */
function SeiteLaedt() {
  return (
    <div className="grid place-items-center py-24" role="status" aria-label="Lädt …">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
    </div>
  );
}

/** Hauptbereich – bei jedem Routenwechsel via `key` neu eingeblendet (Fade). */
function AnimatedMain() {
  const location = useLocation();
  return (
    <main key={location.pathname} className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 lg:pb-8 animate-in">
      <Suspense fallback={<SeiteLaedt />}>
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/lernen" element={<Lernen />} />
          <Route path="/karteikarten" element={<Flashcards />} />
          <Route path="/lernzettel" element={<Lernzettel />} />
          <Route path="/wiederholen" element={<Wiederholen />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/luecken" element={<Luecken />} />
          <Route path="/klausur" element={<Klausur />} />
          <Route path="/statistik" element={<Statistik />} />
          <Route path="/suche" element={<Suche />} />
          <Route path="/konto" element={<Konto />} />
        </Routes>
      </Suspense>
    </main>
  );
}

/**
 * Wurzelkomponente: Router + Layout-Rahmen. State-Provider (Theme, Auth,
 * Progress) werden in main.jsx oberhalb eingehängt.
 */
export default function App() {
  const [mehrOffen, setMehrOffen] = useState(false);
  return (
    <HashRouter>
      <div className="relative isolate min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="aurora" aria-hidden="true" />
        <div className="relative z-10">
          <TopBar />
          <AnimatedMain />
        </div>
        <BottomNav onMehr={() => setMehrOffen(true)} />
        {mehrOffen && <MehrSheet onClose={() => setMehrOffen(false)} />}
        <ErfolgWatcher />
      </div>
    </HashRouter>
  );
}
