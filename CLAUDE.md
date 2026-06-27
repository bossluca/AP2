# AP2 – Projektkontext

Lernprojekt für die Abschlussprüfung Teil 2 (AP2), Fachinformatiker Systemintegration (FISI).

## Struktur

- `lernapp/` — React-Lernwebapp (siehe `lernapp/CLAUDE.md` bzw. unten für Details)
- `server/` — Backend (Fastify + `node:sqlite`): Auth + Fortschritts-Sync für Multi-User
- `Pruefungen_Rohdaten/` — Original-Prüfungsunterlagen
  - `AP1/` — AP1/GA1-Prüfungen (gescannte PDFs, OCR nötig) + native Lernzettel/Cheatsheets
  - `AP2/Lernzettel/{DOCX,PDF}` — AP2-Lernzettel (28 Themen; native DOCX = Importquelle)
- `Pruefungen_Aufbereitet/` — Aufbereitete Prüfungen als Markdown (`INDEX.md` als Übersicht)
- `AP2_Lernmaterial_Uebersicht.md` — Übersicht über vorhandenes Lernmaterial (AP1 + Zwischenprüfungen)
- `docker-compose.yml` · `DEPLOYMENT.md` · `PROXMOX_SETUP.md` — Containerisierung + Hosting
- `ROADMAP.md` (Phasen 0–5, erledigt) · `DECISIONS.md` (ADR) · `IMPROVEMENTS.md` (lebendes Backlog)

## lernapp/ – Architektur

React 19 + Vite 6 + Tailwind 4 + React Router 7 (HashRouter).

- Daten: `src/data/exam_data.json`
  - `exams`: 7 Prüfungstermine, 213 Einträge (191 lernbar, 151 mit Lösung); jede `meta` hat `pruefungsteil` (AP1/AP2). Davon **6 AP1** + **1 AP2-Übungsklausur (KI-generiert, 21 Fragen / 11 Aufgaben / 92 Punkte)**. **Alle 6 AP1-Prüfungen sind paraphrasiert** (`meta.paraphrasiert:true`, KI-überarbeitet – neu formuliert, nicht mehr wörtlich, s. ADR-007) und haben `schluesselwoerter`+`thema_tags` → im Klausur-Modus mit Auto-Auswertung. Pipeline: `scripts/import/paraphrasen/` (`extrahiere-quelle.mjs` → `_quelle/` [gitignored, verbatim], Agenten schreiben je `<slug>.json` mit **eigen-neu-formulierten** Aufgaben, `apply-paraphrasen.mjs` spielt idempotent ein). **Verbatim-Originale bleiben in der Git-Historie** (Repo privat halten)
  - `lerneinheiten`: 278 Lernzettel-Einheiten (111 AP1 + 167 AP2), getrennt von den Prüfungsfragen, mit `kategorie`/`thema_tags`/`quelle`/`pruefungsteil`
  - Import reproduzierbar via `scripts/import/*.mjs` (AP2-Fragen: `import-ap2-pruefungsfragen.mjs`, idempotent); Migrationen unter `scripts/migrations/`. **AP1-Prüfungen sind noch wörtlich** und müssen vor Veröffentlichung paraphrasiert werden (ADR-007)
  - Lernzettel-Qualität: AP1-Import nutzt `pdftotext -layout` und rekonstruiert daraus **Aufzählungen** (eingerückte Zeilen → Markdown-`- `) und **umgebrochene Sätze** (Spaltenbreite ~64, `WRAP_MIN`); Pseudocode (Abschnitt 8.7) als Code-Block. Bekannte Titel-Mängel der Quelldokumente (Tippfehler, doppelte Titel) werden zentral in `scripts/import/lib/lernzettel-korrektur.mjs` (`korrigiereEinheit`, id-basiert) geheilt – von **beiden** Lernzettel-Importern genutzt. Inhalte selbst werden nie von Hand editiert
- Fortschritt: `src/context/ProgressContext.jsx` — Single Source of Truth, localStorage-Key `ap2_lernapp_progress_v1`, Multi-Tab-Sync via storage-Event. Lerneinheiten nutzen denselben Mechanismus (Key = Einheit-ID)
- Gamification: ebenfalls in `ProgressContext` (`gami`-Objekt + `recordActivity`/`recordKlausurErgebnis`/`recordXp`), eigener localStorage-Key `ap2_lernapp_gamification_v1` (rein lokal: `activity`, `klausurBest`, `xp`). Logik: `src/lib/aktivitaet.js` (Streak/Tagesziel/Heatmap + **Streak-Freeze** `streakDetail`/`verfuegbareFreezes` – einzelne verpasste Tage werden überbrückt, 1 Freeze je 7 aktive Tage, max 2) · `src/lib/quests.js` (3 abgeleitete **Tages-Quests**, rein) · `src/lib/erfolge.js` (Badges) · `src/lib/level.js` (XP/Level) · `src/lib/konfetti.js` (Feier-Moment, `canvas-confetti`). UI: `components/ProgressRing.jsx`, `components/Heatmap.jsx`, Streak-Badge + Level/XP in `App.jsx`/`Home`/`Statistik`. `components/ErfolgWatcher.jsx` (in `App.jsx` gemountet) feiert neu freigeschaltete Erfolge mit Konfetti+Toast. Karteikarten haben einen CSS-3D-Flip (`.flip*` in `index.css`)
- Theme: `src/context/ThemeContext.jsx` — localStorage-Key `ap2_lernapp_theme_v1`, `.dark`-Klasse + `@custom-variant`
- Filterlogik: `src/lib/filters.js` (Fragen) · `src/data/lernobjekte.js` (einheitlich Fragen+Lernzettel + Filter, jetzt mit `schwierigkeit`/`punkte`) · Auswertung: `src/lib/statistik.js` (rückblickend) · **Prüfungsreife `src/lib/reife.js`** (vorausschauend: Mastery je Thema aus FSRS-Abrufwahrscheinlichkeit + **punktgewichtete Prognose**, getestet) · `src/lib/pruefungstermin.js` (Countdown, lokal). Reife-Gauge + Themen-Mastery auf der Statistik-Seite, Countdown-Karte auf Home
- **SRS: FSRS** (`src/lib/fsrs.js`) — reines, getestetes Gedächtnismodell (Stabilität/Schwierigkeit/Abrufwahrscheinlichkeit, Ziel-Retention 90 %), 4-stufige Bewertung (Note 1 Nochmal … 4 Leicht, boolean wird gemappt). Schnittstelle `bewerten(entry, note, jetzt?, {retention,weights})` / `istFaellig` / `abrufwahrscheinlichkeitEintrag` — gleiche Naht wie der **Leitner-Adapter** `src/lib/srs.js` (bleibt als Zweit-Adapter; FSRS migriert dessen `box`-Altdaten beim ersten Review transparent). Eintrag bekommt `stability/difficulty/reps/lapses/last_review/due` + abgeleitete `box` (1–5) für die abwärtskompatible Statistik/Anzeige. `ProgressContext.recordReview(id, note)` ruft FSRS; Wiederholen zeigt je Note die Intervall-Vorschau
- Geteilte Kern-Module (rein, getestet): `src/lib/shuffle.js` (Fisher-Yates, injizierbarer RNG) · `src/lib/bewertung.js` (Single Source of Truth für richtig/teilweise/falsch + Styles, genutzt von Quiz+Klausur) · `src/lib/level.js` (XP/Level-Kurve). Tastatur-Kürzel: `src/hooks/useTastenkuerzel.js` (tiefes Hook, ignoriert Eingabefelder)
- Klausur-Modus: `src/lib/antwortpruefung.js` — reine, getestete Schlagwort-Matching-Engine (`pruefeAntwort`, deutsche Normalisierung mit Umlaut-Faltung, Synonyme, Pflicht-Schlagwörter). Für „Nennen Sie N …"-Fragen: `optionen.erforderlich` / Frage-Feld `mindest_treffer` → es genügen N Treffer aus einer Auswahl gleichwertiger Antworten (statt Anteils-Schwelle). Fragen-Schema/Schlagwort-Format dokumentiert in `lernapp/docs/FRAGEN_SCHEMA.md`. Selektor `getKlausuren()` in `useExamData.js`
- Memoisierte Selektoren: `src/data/useExamData.js`
- Seiten: `Home` (Dashboard), `Lernen` (frictionless „Heute lernen"-Smart-Session, `lib/lernsession.js`; Modi via `?modus=heute|schwaechen|frei` — **Schwächen-Training** priorisiert via `baueSchwaechenSession` die schwachen Themen-Tags aus `berechneStatistik`), `Flashcards`, `Lernzettel`, `Wiederholen` (FSRS-SRS, 4-stufig + Intervall-Vorschau), `Quiz`, `Lückentext` (Cloze – Lücken **automatisch aus den Lernzetteln** via `lib/glossar`, tolerante Prüfung via `lib/cloze`, Renderer `components/ClozeFrage`; alle rein+getestet), `Klausur` (Prüfungssimulation: Freitext + Schlagwort-Check + optional Timer; Ergebnis zählt hoch via `hooks/useCountUp.js`, reduced-motion-bewusst), `Statistik`, `Suche` (Volltext), `Konto` (Login)
- Design-System in `src/index.css` (Tailwind 4 `@utility`): `card`/`card-interactive`, `btn`/`btn-primary`/`btn-ghost`/`btn-soft-{green,amber,red}`, `chip`, `input`, `text-gradient` — neue UI bitte diese Klassen nutzen statt Utilities zu duplizieren. Akzent-Verlauf **Indigo→Fuchsia** (lebendig), Marken-/Hero-Gradient sky→indigo→fuchsia, Aurora-Hintergrund. Icons via `lucide-react`. Karten `rounded-2xl`
- Navigation in `App.jsx`: Desktop-Linkleiste ab `lg`, darunter **mobile Bottom-Tab-Nav** (`BottomNav` + `MehrSheet`); `animate-in`-Seitenfade. Karteikarten-Flip `.flip*` in `index.css`
- Performance/PWA: Routen lazy (React.lazy + Suspense), `vite manualChunks` trennt `vendor` + `examdata` vom App-Code (Start-Chunk ~32 kB). Installierbar + offline via `vite-plugin-pwa` (Workbox, Auto-Update; `devOptions.enabled:false`). Manifest/Icon: `public/pwa-icon.svg`
- Tests: Vitest + Testing-Library (`npm test`); Datensicherung/-prüfung: `npm run backup` / `npm run validate-data`
- `src/hooks/useProgress.js` ist nur noch deprecated Re-Export — nicht mehr direkt nutzen

## server/ – Backend (optional)

Fastify 5 + `node:sqlite` (keine native Build-Abhängigkeit). Bietet Auth
(E-Mail+Passwort, argon2id, serverseitige Session-Cookies) und Fortschritts-Sync.

- Routen: `/api/auth/{register,login,logout,me}`, `/api/progress` (GET/PUT/DELETE),
  `/api/progress/merge` (nicht-destruktive Migration des localStorage-Stands)
- Testbare App-Factory (`src/app.js`, `app.inject`); Tests via `npm test` (node:test)
- Konfiguration über `.env` (siehe `server/.env.example`); DB-Pfad als Volume in Docker
- **Wichtig:** Das Frontend funktioniert auch **ohne** Backend voll (rein lokal,
  `localStorage`). Alle Server-Aufrufe sind best-effort; ohne Backend = abgemeldet.

### Deployment
- **Mit Backend (Docker):** `docker compose up -d --build` startet Backend + Caddy
  (Frontend statisch + Reverse-Proxy `/api` + automatisches HTTPS). Siehe `DEPLOYMENT.md`.
- **Nur Frontend (statisch):** HashRouter, kein Server-Routing nötig.
  - Root-Domain: Standard-Build (`base='/'`); Subpfad: `VITE_BASE=/lernapp/ npm run build`
- Dev: `lernapp` (`npm run dev`, Port 5173, proxyt `/api` → `localhost:3001`) +
  `server` (`npm run dev`, Port 3001).

Details siehe `lernapp/README.md` und `DEPLOYMENT.md`.

### Bekannter Sandbox-Quirk
In Cloud-Sandbox-Umgebungen (bash-Mount) wurden kürzlich per Write/Edit überschriebene Dateien teils truncated oder NUL-gepaddet zurückgelesen. Die Schreibvorgänge selbst sind korrekt — nur das Zurücklesen über bash kann lügen. Bei `npm run build`-Verifikation in so einer Umgebung: Projekt nach `/tmp` kopieren, NUL-Bytes strippen (`tr -d '\000'`), ggf. truncated Dateien aus bekanntem Inhalt rekonstruieren.

## Arbeiten mit Claude Code

- Bei Änderungen an `lernapp/` oder `server/`: vor Build/Test immer `npm install` sicherstellen (node_modules ist gitignored)
- Tests: `lernapp` → `npm test` (Vitest), `server` → `npm test` (node:test). Vor Commits grün halten.
- Datenänderungen an `exam_data.json`: vorher `npm run backup`; Lernzettel nicht von Hand editieren, sondern über `scripts/import/*` neu erzeugen
- Commits klein und beschreibend halten
- Lernmaterial (`Pruefungen_*`) ist reine Dokumentation/Daten — keine Build-Schritte nötig
