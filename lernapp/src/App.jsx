import { useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Search, User, Moon, Sun, Flame, Menu, X } from 'lucide-react';
import { NAV, NAV_SEKUNDAER, BOTTOM_ROUTES, DESKTOP_ROUTES } from './navigation';
import Home from './pages/Home';
// Übrige Seiten lazy laden – schlankerer Start-Chunk, Seite kommt bei Bedarf.
const Lernen = lazy(() => import('./pages/Lernen'));
const Lernpfade = lazy(() => import('./pages/Lernpfade'));
const ModulTraining = lazy(() => import('./pages/ModulTraining'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Luecken = lazy(() => import('./pages/Luecken'));
const Drill = lazy(() => import('./pages/Drill'));
const Matching = lazy(() => import('./pages/Matching'));
const Rangliste = lazy(() => import('./pages/Rangliste'));
const Einstufung = lazy(() => import('./pages/Einstufung'));
const EigeneKarten = lazy(() => import('./pages/EigeneKarten'));
const Rechnen = lazy(() => import('./pages/Rechnen'));
const Admin = lazy(() => import('./pages/Admin'));
const Klausur = lazy(() => import('./pages/Klausur'));
const Lernzettel = lazy(() => import('./pages/Lernzettel'));
const Wiederholen = lazy(() => import('./pages/Wiederholen'));
const Statistik = lazy(() => import('./pages/Statistik'));
const Suche = lazy(() => import('./pages/Suche'));
const Konto = lazy(() => import('./pages/Konto'));
import { useTheme } from './context/ThemeContext';
import { useGamification } from './context/GamificationContext';
import ErfolgWatcher from './components/ErfolgWatcher';
import KontoDatenSync from './components/KontoDatenSync';
import UebernahmeDialog from './components/UebernahmeDialog';
import CommandPalette from './components/CommandPalette';
import FehlerGrenze from './components/FehlerGrenze';
const Info_Seite = lazy(() => import('./pages/Info'));

const linkClass = ({ isActive }) =>
  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
    isActive
      ? 'bg-muted text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const iconClass = ({ isActive }) =>
  `grid place-items-center w-9 h-9 rounded-lg transition-colors ${
    isActive
      ? 'bg-muted text-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
      className="grid place-items-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

/** Lern-Streak: Flamme + Tage in Folge. Nur ab Streak ≥ 1 sichtbar. */
function StreakBadge() {
  const { gami } = useGamification();
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
function TopBar({ onPalette, onMehr }) {
  return (
    <nav className="border-b sticky top-0 bg-background/80 backdrop-blur z-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1 sm:gap-2">
        <NavLink
          to="/"
          end
          className="font-bold text-base sm:text-lg mr-1 sm:mr-3 shrink-0 flex items-center gap-1.5"
        >
          <span className="font-mono text-accent" aria-hidden="true">
            &gt;_
          </span>
          <span className="text-gradient">FiSi.dev</span>
        </NavLink>

        {/* Desktop (ab lg): volle Linkleiste */}
        <div className="hidden lg:flex items-center gap-1">
          {NAV.filter((l) => DESKTOP_ROUTES.includes(l.to)).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          <button
            onClick={onMehr}
            className="px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-flex items-center gap-1"
          >
            Mehr <Menu size={14} aria-hidden="true" />
          </button>
        </div>

        {/* Rechte Icon-Gruppe (immer sichtbar) */}
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <StreakBadge />
          <button
            onClick={onPalette}
            className="grid place-items-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Befehle & Suche (Strg/Cmd + K)"
            title="Befehle & Suche (Strg/Cmd + K)"
          >
            <Search size={18} />
          </button>
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
  `flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
    isActive ? 'text-foreground' : 'text-muted-foreground'
  }`;

/** Mobile/Tablet (bis lg): fixe Tab-Leiste unten + „Mehr"-Button. */
function BottomNav({ onMehr }) {
  const items = BOTTOM_ROUTES.map((to) => NAV.find((n) => n.to === to));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t bg-background/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.end} className={bottomItemClass}>
            {({ isActive }) => (
              <>
                <span
                  className={`grid place-items-center h-7 w-12 rounded-full transition-colors ${
                    isActive ? 'bg-muted text-accent' : ''
                  }`}
                >
                  <it.icon size={20} aria-hidden="true" />
                </span>
                <span>{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={onMehr} className="flex min-h-14 touch-manipulation flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground">
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
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Alle Bereiche">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 inset-x-0 lg:bottom-auto lg:top-16 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-[36rem] lg:rounded-xl lg:border bg-popover text-popover-foreground border-t rounded-t-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl animate-in">
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold">Alle Bereiche</span>
          <button onClick={onClose} aria-label="Schließen" className="grid place-items-center w-8 h-8 rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
          {[...NAV, ...NAV_SEKUNDAER].map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-accent text-accent bg-muted'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <it.icon size={22} aria-hidden="true" />
              <span className="text-center leading-tight">{it.label}</span>
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
      <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
    </div>
  );
}

/** Hauptbereich – bei jedem Routenwechsel via `key` neu eingeblendet (Fade). */
function AnimatedMain() {
  const location = useLocation();
  return (
    <main key={location.pathname} className="max-w-4xl mx-auto p-4 sm:p-6 pb-24 lg:pb-8 animate-in">
      <FehlerGrenze>
        <Suspense fallback={<SeiteLaedt />}>
          <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/lernen" element={<Lernen />} />
          <Route path="/lernpfade" element={<Lernpfade />} />
          <Route path="/lernpfade/:id" element={<Lernpfade />} />
          <Route path="/lernpfade/:pfadId/:modulId" element={<ModulTraining />} />
          <Route path="/karteikarten" element={<Flashcards />} />
          <Route path="/lernzettel" element={<Lernzettel />} />
          <Route path="/wiederholen" element={<Wiederholen />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/luecken" element={<Luecken />} />
          <Route path="/drill" element={<Drill />} />
          <Route path="/matching" element={<Matching />} />
          <Route path="/rangliste" element={<Rangliste />} />
          <Route path="/einstufung" element={<Einstufung />} />
          <Route path="/eigene-karten" element={<EigeneKarten />} />
          <Route path="/rechnen" element={<Rechnen />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/klausur" element={<Klausur />} />
          <Route path="/statistik" element={<Statistik />} />
          <Route path="/suche" element={<Suche />} />
          <Route path="/info" element={<Info_Seite />} />
          <Route path="/konto" element={<Konto />} />
          </Routes>
        </Suspense>
      </FehlerGrenze>
    </main>
  );
}

/** Dezenter Footer mit Marke + Link zu „Über & Datenschutz". */
function AppFooter() {
  return (
    <footer className="max-w-4xl mx-auto px-4 pb-28 lg:pb-10 pt-2">
      <div className="border-t pt-4 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          <span className="text-accent">&gt;_</span> FiSi.dev
        </span>
        <NavLink to="/info" className="hover:text-accent transition-colors">
          Über &amp; Datenschutz
        </NavLink>
      </div>
    </footer>
  );
}

/**
 * Wurzelkomponente: Router + Layout-Rahmen. State-Provider (Theme, Auth,
 * Progress) werden in main.jsx oberhalb eingehängt.
 */
export default function App() {
  const [mehrOffen, setMehrOffen] = useState(false);
  const [paletteOffen, setPaletteOffen] = useState(false);
  return (
    <HashRouter>
      <div className="relative isolate min-h-screen bg-background text-foreground">
        <div className="relative z-10">
          <TopBar onPalette={() => setPaletteOffen(true)} onMehr={() => setMehrOffen(true)} />
          <AnimatedMain />
          <AppFooter />
        </div>
        <BottomNav onMehr={() => setMehrOffen(true)} />
        {mehrOffen && <MehrSheet onClose={() => setMehrOffen(false)} />}
        <CommandPalette
          offen={paletteOffen}
          onClose={() => setPaletteOffen(false)}
          onToggle={() => setPaletteOffen((o) => !o)}
        />
        <ErfolgWatcher />
        <KontoDatenSync />
        <UebernahmeDialog />
      </div>
    </HashRouter>
  );
}
