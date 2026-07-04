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
  - `exams`: 9 Prüfungstermine, 265 Einträge (243 lernbar, 244 mit Lösung); jede `meta` hat `pruefungsteil` (AP1/AP2). Davon **6 AP1** + **3 AP2-Übungsklausuren (KI-generiert: Set 1 mit 21 Fragen / 92 Punkte, Set 2 mit 22 Fragen / 101 Punkte, Set 3 mit 22 Fragen / 97 Punkte; je 11 Aufgaben, komplementäre Themen)**. Alle Fragen mit Punktzahl tragen **`schwierigkeit` (1–3)**, abgeleitet aus den Punkten (Migration `003-schwierigkeit-aus-punkten.mjs`; manuell gepflegte Werte werden nie überschrieben). **Alle 6 AP1-Prüfungen sind paraphrasiert** (`meta.paraphrasiert:true`, KI-überarbeitet – neu formuliert, nicht mehr wörtlich, s. ADR-007) und haben `schluesselwoerter`+`thema_tags` → im Klausur-Modus mit Auto-Auswertung. Pipeline: `scripts/import/paraphrasen/` (`extrahiere-quelle.mjs` → `_quelle/` [gitignored, verbatim], Agenten schreiben je `<slug>.json` mit **eigen-neu-formulierten** Aufgaben, `apply-paraphrasen.mjs` spielt idempotent ein). **Verbatim-Originale bleiben in der Git-Historie** (Repo privat halten)
  - `lerneinheiten`: 278 Lernzettel-Einheiten (111 AP1 + 167 AP2), getrennt von den Prüfungsfragen, mit `kategorie`/`thema_tags`/`quelle`/`pruefungsteil`
  - Import reproduzierbar via `scripts/import/*.mjs` (AP2-Fragen: `import-ap2-pruefungsfragen.mjs` + `-2.mjs` + `-3.mjs`, je eigener Marker/ID-Präfix, idempotent; jedes Set hat einen Keyword-Selbsttest: Musterlösung trifft ihre eigenen Schlagwörter); Migrationen unter `scripts/migrations/`. **AP1-Prüfungen sind noch wörtlich** und müssen vor Veröffentlichung paraphrasiert werden (ADR-007)
  - Lernzettel-Qualität: AP1-Import nutzt `pdftotext -layout` und rekonstruiert daraus **Aufzählungen** (eingerückte Zeilen → Markdown-`- `) und **umgebrochene Sätze** (Spaltenbreite ~64, `WRAP_MIN`); Pseudocode (Abschnitt 8.7) als Code-Block. Bekannte Titel-Mängel der Quelldokumente (Tippfehler, doppelte Titel) werden zentral in `scripts/import/lib/lernzettel-korrektur.mjs` (`korrigiereEinheit`, id-basiert) geheilt – von **beiden** Lernzettel-Importern genutzt. Inhalte selbst werden nie von Hand editiert
- Fortschritt: `src/context/ProgressContext.jsx` — Single Source of Truth, localStorage-Key `ap2_lernapp_progress_v1`, Multi-Tab-Sync via storage-Event. Lerneinheiten nutzen denselben Mechanismus (Key = Einheit-ID). Jeder Schreibvorgang stempelt **`updatedAt`** (Merge-/Sync-Basis). **Offline-Outbox** `src/lib/outbox.js` (rein, getestet, Key `ap2_lernapp_outbox_v1`): fehlgeschlagene Server-PUTs werden koalesziert gepuffert und bei online-Event/Login/nächstem Erfolg nachgeschrieben. `importProgress`/`getProgressRoh` + reines `src/lib/progressMerge.js` (jüngerer `updatedAt` gewinnt, nicht-destruktiv) bilden die Naht für den **Backup-Export/-Import** (`src/lib/datensicherung.js` rein/getestet + `components/DatenSicherung.jsx` auf der Konto-Seite, Format `fisidev-backup` v1)
- Gamification: **eigener `src/context/GamificationContext.jsx`** (`useGamification()`; `ProgressProvider` komponiert ihn – Aufrufer/Tests mounten weiterhin nur einen Provider, aber getrennte Context-Werte → XP-Gutschrift rendert nicht alle Fortschritts-Consumer). API: `gami`-Objekt + `recordActivity`/`recordKlausurErgebnis`/`recordXp`/`resetGamification`/`importGamification`, localStorage-Key `ap2_lernapp_gamification_v1` (`activity`, `klausurBest`, `xp`). **Mit Login auch kontogebunden** (Backend `/api/gamification`): beim Login wird der lokale Stand max-basiert gemergt (`lib/gamiMerge.js`, rein/getestet) und danach durchgeschrieben → Streak/XP/Quests pro Konto, geräteübergreifend. Reset (`resetProgress`) löscht lokal **und** serverseitig (Overwrite mit leerem Stand). Logik: `src/lib/aktivitaet.js` (Streak/Tagesziel/Heatmap + **Streak-Freeze** `streakDetail`/`verfuegbareFreezes` – einzelne verpasste Tage werden überbrückt, 1 Freeze je 7 aktive Tage, max 2) · `src/lib/quests.js` (3 abgeleitete **Tages-Quests**, rein) · `src/lib/erfolge.js` (Badges) · `src/lib/level.js` (XP/Level) · `src/lib/konfetti.js` (Feier-Moment, `canvas-confetti`). UI: `components/ProgressRing.jsx`, `components/Heatmap.jsx`, Streak-Badge + Level/XP in `App.jsx`/`Home`/`Statistik`. `components/ErfolgWatcher.jsx` (in `App.jsx` gemountet) feiert neu freigeschaltete Erfolge mit Konfetti+Toast. Karteikarten haben einen CSS-3D-Flip (`.flip*` in `index.css`)
- Theme: `src/context/ThemeContext.jsx` — localStorage-Key `ap2_lernapp_theme_v1`, `.dark`-Klasse + `@custom-variant`
- **„Was jetzt dran?" + Weiterlernen:** `src/lib/naechsteAktion.js` (rein, getestet) wählt aus Lernstand **eine** beste nächste Aktion (Resume → fällig → Schwächen → Heute lernen) → Home zeigt **einen** Primär-CTA statt mehrerer gleichrangiger Karten. **Resume** („dort weiter, wo du warst"): `src/lib/resume.js` (rein, getestet, gerätelokaler localStorage-Key `ap2_lernapp_resume_v1`, 3-Tage-TTL), im `ProgressContext` als `resume`/`setResume`/`clearResume`; `Lernen` + `ModulTraining` setzen/löschen es. Home-„Dein Tag"-Sektion bündelt Countdown/Reife + Fällig/Schwächen + Quests
- **Command-Palette (Cmd/Ctrl+K):** `components/CommandPalette.jsx` + reines `src/lib/befehle.js` (getestet: Befehlsliste aus `navigation.js` + Schnellaktionen, **toleranter Fuzzy-Filter** `filterBefehle`/`fuzzyScore`, deutsche Normalisierung via `antwortpruefung.normalisiere`). Öffnet per Cmd/K **und** über das Such-Icon (TopBar). Nav-Definition zentral in `src/navigation.js` (`NAV`/`NAV_SEKUNDAER`/`BOTTOM_ROUTES`) – von App-Shell **und** Palette genutzt (kein zirkulärer Import)
- **Inhalts-Kennzeichnung (Transparenz/Urheberrecht):** `src/lib/herkunft.js` (rein, getestet) leitet aus `examMeta.paraphrasiert` / `quelle`(„KI-generiert…")/`quelle_dateiname` / `unverifiziert_markiert` **einen** Hinweis ab; `components/HerkunftBadge.jsx` zeigt ihn (🤖 KI-generiert · ✍️ KI-überarbeitet/paraphrasiert · ⚠️ unverifiziert) in `Quiz`/`Flashcards`/`Klausur`/`ModulTraining`. Seite **`pages/Info.jsx`** (Route `/info`, Footer- + „Mehr"-Link): Datenschutz-**Vorlage** (was wird wo gespeichert) + Inhalts-Herkunft/Urheberrecht (klar als Vorlage gekennzeichnet, vom Betreiber zu finalisieren)
- **Empty-States:** `components/LeerZustand.jsx` (rein, getestet) – freundliche Leerzustände mit CTA in `Wiederholen`/`Lernen`/`Luecken`/`Lernzettel`/`Flashcards` + Palette
- Filterlogik: `src/lib/filters.js` (Fragen) · `src/data/lernobjekte.js` (einheitlich Fragen+Lernzettel + Filter, jetzt mit `schwierigkeit`/`punkte`) · Auswertung: `src/lib/statistik.js` (rückblickend) · **Prüfungsreife `src/lib/reife.js`** (vorausschauend: Mastery je Thema aus FSRS-Abrufwahrscheinlichkeit + **punktgewichtete Prognose**, getestet) · `src/lib/pruefungstermin.js` (Countdown, lokal) · **Tagesplan `src/lib/tagesplan.js`** (rein, getestet: FSRS-Fälligkeiten + neue Objekte rückwärts vom Termin → „heute X Wiederholungen + Y neue" mit Einschätzung locker/gut/sportlich, auf Home). Reife-Gauge + Themen-Mastery auf der Statistik-Seite, Countdown-Karte auf Home
- **SRS: FSRS** (`src/lib/fsrs.js`) — reines, getestetes Gedächtnismodell (Stabilität/Schwierigkeit/Abrufwahrscheinlichkeit, Ziel-Retention 90 %), 4-stufige Bewertung (Note 1 Nochmal … 4 Leicht, boolean wird gemappt). Schnittstelle `bewerten(entry, note, jetzt?, {retention,weights})` / `istFaellig` / `abrufwahrscheinlichkeitEintrag` — gleiche Naht wie der **Leitner-Adapter** `src/lib/srs.js` (bleibt als Zweit-Adapter; FSRS migriert dessen `box`-Altdaten beim ersten Review transparent). Eintrag bekommt `stability/difficulty/reps/lapses/last_review/due` + abgeleitete `box` (1–5) für die abwärtskompatible Statistik/Anzeige. `ProgressContext.recordReview(id, note)` ruft FSRS; Wiederholen zeigt je Note die Intervall-Vorschau
- Geteilte Kern-Module (rein, getestet): `src/lib/shuffle.js` (Fisher-Yates, injizierbarer RNG) · `src/lib/bewertung.js` (Single Source of Truth für richtig/teilweise/falsch + Styles, genutzt von Quiz+Klausur) · `src/lib/level.js` (XP/Level-Kurve). Tastatur-Kürzel: `src/hooks/useTastenkuerzel.js` (tiefes Hook, ignoriert Eingabefelder)
- Klausur-Modus: `src/lib/antwortpruefung.js` — reine, getestete Schlagwort-Matching-Engine (`pruefeAntwort`, deutsche Normalisierung mit Umlaut-Faltung, Synonyme, Pflicht-Schlagwörter). Für „Nennen Sie N …"-Fragen: `optionen.erforderlich` / Frage-Feld `mindest_treffer` → es genügen N Treffer aus einer Auswahl gleichwertiger Antworten (statt Anteils-Schwelle). Fragen-Schema/Schlagwort-Format dokumentiert in `lernapp/docs/FRAGEN_SCHEMA.md`. Selektor `getKlausuren()` in `useExamData.js`
- Memoisierte Selektoren: `src/data/useExamData.js`
- Seiten: `Home` (Dashboard), `Lernen` (frictionless „Heute lernen"-Smart-Session, `lib/lernsession.js`; Modi via `?modus=heute|schwaechen|frei` — **Schwächen-Training** priorisiert via `baueSchwaechenSession` die schwachen Themen-Tags aus `berechneStatistik`; **Confidence-based Answering**: Aufdecken über „Weiß ich"/„Bin unsicher" → feineres FSRS-Signal via reines `lib/confidence.js`, Auswertung warnt vor **Fehl-Sicherheit**), **`Lernpfade`** (geführter, fortschrittsbasierter Lernweg – s. u.), `Flashcards`, `Lernzettel`, `Wiederholen` (FSRS-SRS, 4-stufig + Intervall-Vorschau), `Quiz`, `Lückentext` (Cloze – Lücken **automatisch aus den Lernzetteln** via `lib/glossar`, tolerante Prüfung via `lib/cloze`, Renderer `components/ClozeFrage`; alle rein+getestet), **`Drill`** (`/drill`: schnelle Multiple-Choice-Runde, objektiv bewertet; Fragen + **Distraktoren automatisch aus dem Glossar** via reines `lib/mcDrill.js` – Distraktoren aus demselben Themenfeld, RNG injizierbar; Tastatur 1–4/Leertaste), `Klausur` (Prüfungssimulation: Freitext + Schlagwort-Check + optional Timer; Ergebnis zählt hoch via `hooks/useCountUp.js`, reduced-motion-bewusst), `Statistik`, `Suche` (Volltext), `Konto` (Login/Registrierung mit Speicher-Transparenz + Passwort-Bestätigung + Einwilligung + **Konto löschen** + **Recovery-Code** (Einmal-Anzeige, „Passwort vergessen?"-Reset, Code erneuern) + **Backup-Export/-Import**), **`Info`** (Über & Datenschutz, `/info`)
- **Lernpfade** (`pages/Lernpfade.jsx`, Routen `/lernpfade` + `/lernpfade/:id`): geführter Lernweg über die **nummerierten AP1-Lernzettel-Kategorien** („1. Grundlagen" … „11. IT-Sicherheit" = 11 Pfade; AP2-Themen ohne Nummern-Schema bleiben außen vor). Reines, getestetes Modul `src/lib/lernpfade.js` (`baueLernpfade(lerneinheiten, progress, now)` → Pfade mit Modulen; Pfad = Kategorie, Modul = Lerneinheit). Mastery je Modul aus `reife.objektMastery` (FSRS), Status `fertig`/`aktiv`/`offen` (erstes nicht-fertiges = aktiv); **keine harten Sperren** – Stoff bleibt frei zugänglich. UI: Übersicht (Pfad-Karten) + Detail (vertikale Pfad-Ansicht, `components/LernpfadNode.jsx`); Modul-Klick zeigt „Training starten" + (aufklappbar) den Lernzettel zum Nachlesen
- **Modul-Training** (`pages/ModulTraining.jsx`, Route `/lernpfade/:pfadId/:modulId`): abschließbarer Lern-Loop je Modul. Reines, getestetes Modul `src/lib/modulTraining.js` (`baueModulTraining(lerneinheit, {alleFragen}, opt)` → gemischte Schritt-Liste: **Lernzettel-Karte zuerst**, dann gemischt **Cloze** (aus `lib/glossar`) + **Prüfungsfragen** über gemeinsame `thema_tags`; RNG injizierbar). Schritt-Renderer je Typ; jeder Schritt verbucht Aktivität + XP, Frage-Schritte zusätzlich FSRS (`recordReview`). `werteTrainingAus(ergebnisse)` → bei ≥ 80 % markiert sich das Modul als `gelernt` (Pfad-Fortschritt zieht mit), sonst `ueben`. Abschluss-Screen verlinkt aufs nächste offene Modul
- Design-System „**Terminal**" in `src/index.css` (Tailwind 4 `@utility`): `card`/`card-interactive`, `btn`/`btn-primary`/`btn-ghost`/`btn-soft-{green,amber,red}`, `chip`, `input`, `text-gradient`, `text-accent`/`bg-accent`/`border-accent` — neue UI bitte diese Klassen nutzen statt Utilities zu duplizieren. **Akzent grün** zentral über CSS-Variablen (`--accent` = green-600 hell / `#5BE38A` dunkel, plus `--accent-strong`/`--accent-contrast`/`--line-rest`); Dark-Mode ist grün-getöntes Terminal-Schwarz (`#0B0F0C`/`#11160F`/`#1d271a`). Fonts: **Space Grotesk** (Headings/Marke) + **JetBrains Mono** (Mono/CLI-Labels, `.font-mono`), via `<link>` in `index.html`. Aurora-Hintergrund grün, Icons via `lucide-react`, Karten `rounded-2xl`. **Marke „FiSi.dev"** (`>_ FiSi.dev`, Zielgruppe Fachinformatiker Systemintegration / AP2) – in Nav (`App.jsx`), Home-Hero, `index.html` (`<title>`/`<meta>`) und PWA-Manifest (`vite.config.js`)
- Navigation in `App.jsx`: Desktop-Linkleiste ab `lg`, darunter **mobile Bottom-Tab-Nav** (`BottomNav` + `MehrSheet`); `animate-in`-Seitenfade. Karteikarten-Flip `.flip*` in `index.css`
- Performance/PWA: Routen lazy (React.lazy + Suspense), `vite manualChunks` trennt `vendor` + `examdata` vom App-Code (Start-Chunk ~32 kB). Installierbar + offline via `vite-plugin-pwa` (Workbox, Auto-Update; `devOptions.enabled:false`). Manifest/Icon: `public/pwa-icon.svg`
- **Robustheit:** `components/FehlerGrenze.jsx` (Error Boundary um den Seiten-Inhalt, in `AnimatedMain` gemountet – fängt Render-Fehler einer Seite ab statt weißer Seite, resettet sich beim Routenwechsel) + `src/App.smoke.test.jsx` (Rauchtest über die ganze App mit echten Providern/Daten gegen „weiße Seite"-Regressionen)
- Tests: Vitest + Testing-Library (`npm test`); Datensicherung/-prüfung: `npm run backup` / `npm run validate-data`
- `src/hooks/useProgress.js` ist nur noch deprecated Re-Export — nicht mehr direkt nutzen

## server/ – Backend (optional)

Fastify 5 + `node:sqlite` (keine native Build-Abhängigkeit). Bietet Auth
(E-Mail+Passwort, argon2id, serverseitige Session-Cookies) und Fortschritts-Sync.

- Routen: `/api/auth/{register,login,logout,me}` + **`DELETE /api/auth/account`** (DSGVO-Löschung:
  entfernt Konto + per `ON DELETE CASCADE` sessions/progress/gamification), `/api/progress` (GET/PUT/DELETE),
  `/api/progress/merge` (nicht-destruktive Migration des localStorage-Stands),
  `/api/gamification` (GET/PUT – kontogebundener Streak/XP/Quests-Stand)
- **Passwort-Reset ohne Mail-Server** (s. ADR-008): Registrierung liefert einen
  **Recovery-Code** (`XXXX-XXXX-XXXX-XXXX`, ~80 Bit, Einmal-Anzeige; serverseitig nur
  argon2-Hash in `users.recovery_hash`, additive Migration). `POST /api/auth/recover`
  (E-Mail + Code + neues Passwort; teilt die Login-Rate-Limit-Bremse, widerruft alle
  Sitzungen, rotiert den Code) + `POST /api/auth/recovery-code` (angemeldet: Code
  erzeugen/erneuern – auch für Bestandskonten)
- DB-Schema (`progress`) trägt neben `status/box/due/…` auch die **FSRS-Felder**
  (`stability/difficulty/reps/lapses/last_review`); additive Migration in `db.js`
  (`ALTER TABLE … ADD COLUMN`). Tabelle `gamification` (user_id, activity, xp, klausur_best)
- **Brute-Force-Schutz** auf `/api/auth/login`: reines, getestetes In-Memory-Sliding-Window
  `src/lib/rateLimit.js` (Zeit injizierbar, pro App-Instanz via `app.loginLimiter` dekoriert) –
  8 Fehlversuche je IP+E-Mail / 15 min → HTTP 429 + `Retry-After`; erfolgreicher Login resettet
  den Zähler. `trustProxy` (Env `TRUST_PROXY`, Default an) liefert hinter Nginx die echte Client-IP
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
