# Verbesserungs-Backlog (lebendes Dokument)

Getrackte To-dos für die Weiterentwicklung der AP-Lernapp. Abgehakte Punkte
bleiben als Verlauf stehen. Ergänzt die abgeschlossene Phasen-`ROADMAP.md`.

**Priorität:** P1 = hoher Nutzen/bald · P2 = mittel · P3 = nice-to-have
**Aufwand:** S = klein (<½ Tag) · M = mittel · L = groß

---

## 1. Dokumentation (Lücken aus Review 2026-06-21)

- [x] **P1 · S** ~~Veraltete Dublette `lernapp/README_LERNAPP.md` entfernen.~~ ✅ 2026-06-21
- [x] **P1 · S** ~~`README.md` im **Repo-Root** anlegen~~ (Feature-Liste, Aufbau,
      Quickstart, Deployment, Verweise). ✅ 2026-06-21
- [x] **P2 · S** ~~`server/README.md`: API-Routen, Env-Vars, Start/Test, Datenmodell.~~ ✅ 2026-06-21
- [ ] **P3 · S** Kurzes `CONTRIBUTING`/Konventionen-Snippet (Commits, Tests grün halten).

## 2. Design & UX (moderner / dynamischer)

> Leitidee: ruhiger, „app-iger" Look mit dezenter Bewegung – ohne die
> Übersichtlichkeit zu verlieren. CSS-first (keine schwere Animations-Lib nötig);
> `framer-motion` nur, falls Routen-/Listen-Animationen gewünscht (P3).

- [x] **P1 · M** ~~**Responsive Navigation:**~~ Hamburger-Menü mobil, Desktop-Linkleiste,
      Suche/Konto/Theme als Icon-Gruppe rechts, Marke als Gradient. ✅ 2026-06-21
- [x] **P1 · M** ~~**Visuelles Refresh des Karten-/Layout-Systems:**~~ Design-System mit
      `@utility`-Klassen (`card`, `card-interactive`, `btn`/`btn-primary`/`btn-ghost`/
      `btn-soft-*`, `chip`, `input`), weiche Schatten, `rounded-xl`, Gradient-Buttons,
      Seiten-bg `gray-50`. Auf alle Seiten angewendet. ✅ 2026-06-21
- [x] **P1 · S** ~~**Micro-Interactions:**~~ Hover-Lift auf Kacheln, `active:scale` auf
      Buttons, Seiten-Fade (`animate-in`) bei jedem Routenwechsel, `focus-visible`-Ringe,
      `prefers-reduced-motion`-Guard. ✅ 2026-06-21
- [x] **P1 · S** ~~**Farbpalette „blau-lila, heller":**~~ Akzent von Purple auf Indigo→Violet
      umgestellt (zentral über `@utility`-Klassen), Marken-Gradient dreifarbig
      sky→indigo→violet, `::selection` in Akzentfarbe. ✅ 2026-06-21
- [x] **P1 · M** ~~**Design-Aufwertung „moderner & fesselnder":**~~ dekorativer
      Aurora-Hintergrund (weiche Farbverläufe, light/dark), Gradient-Hero auf der
      Startseite mit **animiertem Fortschritts-Ring** (`components/ProgressRing.jsx`),
      Gradient-Pillen für aktive Navigation, Statuskarten mit Akzentleiste, Kacheln
      mit Hover-Pfeil, weiches Karten-Glühen, `text-gradient`-Utility. ✅ 2026-06-21
- [x] **P2 · S** ~~**Karten-Flip-Animation**~~ (Karteikarten): echter 3D-Y-Flip
      Frage ↔ Lösung, beide Seiten via Grid gestapelt (kein Layout-Sprung),
      reduced-motion-fest. CSS in `index.css` (`.flip*`). ✅ 2026-06-21
- [ ] **P3 · S** **Karteikarten-Politur (Rest):** Swipe-Gesten (mobil) für
      „gewusst/nicht", optionaler Mini-Fortschritts-Indikator pro Karte.
- [x] **P2 · S** ~~**Tastatur-Shortcuts**~~ im Wiederholen-/Karteikarten-Modus
      (Leertaste = aufdecken, ←/→ = blättern, 1/2 = bewerten). Tiefes Hook
      `hooks/useTastenkuerzel.js` (ignoriert Eingabefelder, lässt Modifier durch),
      getestet; dezente Tasten-Hinweise in der UI (`aria-hidden`). ✅ 2026-06-21
- [ ] **P2 · M** **Statistik aufwerten:** `ProgressRing` auch in der Statistik nutzen,
      animierte Balken, klarere Farben pro Box; optional kleine Sparkline beim Verlauf.
- [x] **P2 · M** ~~**Farb-Refresh „lebendiger" + ruhigere Karten:**~~ Akzent-Verlauf auf
      **Indigo → Fuchsia** (Hero/Marke sky→indigo→fuchsia, Aurora mit Pink), kräftigere
      Buttons/Ringe; Karten weicher (`rounded-2xl`, hellerer Rand), mehr Weißraum
      (Container-Padding, Bottom-Abstand). ✅ 2026-06-21
- [x] **P3 · M** ~~**Mobile Bottom-Tab-Navigation**~~ (App-Feeling): fixe Tab-Leiste bis
      `lg` (Start/Lernen/Wiederholen/Statistik + „Mehr"-Sheet mit allen Bereichen);
      Desktop-Linkleiste ab `lg`. Ersetzt das Hamburger-Menü. ✅ 2026-06-21
- [ ] **P3 · S** **Accent-Theme-Picker:** Nutzer wählt Akzentfarbe – CSS-Variablen statt
      fixer Tailwind-Farben, in `localStorage` gemerkt (baut auf dem Farb-Refresh auf).
- [~] **P3 · S** **Animierte Zahlen (Count-up)** – **Klausur-Auswertung erledigt:**
      reduced-motion-bewusster Hook `hooks/useCountUp.js` (getestet) zählt Prozent +
      Punkte hoch; erkannte Schlagwörter „poppen" (`treffer-pop`). **Offen:** Count-up
      auch auf Home-/Statistik-Kennzahlen ausweiten, gestaffeltes Listen-Einblenden.
- [ ] **P2 · S** **Lade-/Leerzustände:** Skeletons bzw. ein dezenter Lade-Indikator,
      solange `AuthContext.ready` lädt; freundliche Empty-States mit CTA.
- [ ] **P2 · S** **Toaster/Snackbar** statt nur Inline-Meldungen (gespeichert,
      angemeldet, Fehler) – ein winziger eigener Toast-Context reicht.
- [~] **P3 · M** **Icon-System (`lucide-react`):** Navigation (Top-Leiste + Bottom-Nav +
      „Mehr"-Sheet, Suche/Konto/Theme/Streak) auf konsistente SVG-Icons umgestellt. ✅ teilw.
      **Rest:** Emoji-Icons in den Seiten-Überschriften/Buttons noch auf Lucide ziehen.
- [ ] **P3 · S** **A11y-Pass:** sichtbare Fokus-Ringe, `aria`-Labels, Kontrast prüfen,
      `prefers-reduced-motion` respektieren.

## 3. Funktionen & Qualität

- [x] **P2 · S** ~~**Code-Optimierung: Duplikate in tiefe Module gezogen**~~ – Fisher-Yates
      `shuffle` (war 3× kopiert) → `lib/shuffle.js` (mit injizierbarem RNG, getestet);
      Bewertungs-Optionen (war in Quiz + Klausur dupliziert) → `lib/bewertung.js` als
      Single Source of Truth. Kleinere Schnittstellen, Konsistenz garantiert. ✅ 2026-06-21
- [x] **P1 · L** ~~**Klausur-Simulationsmodus** (`/klausur`):~~ ganze Prüfung mit echten
      Fragen, Freitext-Antworten, **flexible Schlagwort-Prüfung** (`lib/antwortpruefung.js`,
      tolerant ggü. Formulierung/Umlauten/Synonymen), optionaler Timer, Auswertung
      (% + Themen-Schwächen), Übernahme in den Fortschritt. Engine + Seite getestet.
      Schema-Doku: `lernapp/docs/FRAGEN_SCHEMA.md`. ✅ 2026-06-21
- [x] **P2 · M** ~~**Adaptives Schwächen-Training:**~~ neuer Lern-Modus, der gezielt an
      den schwachen Themen arbeitet – `lib/lernsession.js#baueSchwaechenSession` (rein,
      getestet) priorisiert Objekte aus den schwachen Tags (`berechneStatistik`) und füllt
      bei Bedarf mit normaler Session auf. Einstieg über `Lernen?modus=schwaechen`, Karte
      auf Home + „Gezielt üben" in der Statistik. ✅ 2026-06-27
- [x] **P1 · L** ~~**FSRS statt Leitner (Gedächtnismodell):**~~ reines, getestetes Modul
      `lib/fsrs.js` (Stabilität/Schwierigkeit/Abrufwahrscheinlichkeit, Ziel-Retention 90 %,
      4-stufige Bewertung Nochmal/Schwer/Gut/Leicht) an derselben Naht wie der Leitner-Adapter
      (`lib/srs.js` bleibt als Zweit-Adapter; `box`-Altdaten werden beim 1. Review transparent
      migriert). `ProgressContext.recordReview(id, note)` nutzt FSRS; Wiederholen zeigt je Note
      die **Intervall-Vorschau** (Anki-Stil). 16 neue Tests. ✅ 2026-06-27 (Sprint 1, s. PRODUKT_STRATEGIE.md)
- [x] **P1 · M** ~~**Bundle-Größe / Code-Splitting:**~~ Routen lazy-geladen (React.lazy +
      Suspense) und `vite manualChunks` (vendor + examdata getrennt). **Start-Code-Chunk
      953 KB → ~32 KB** (gzip ~11 KB); Seiten als 2–11 KB-Chunks; Daten/Libs getrennt
      cachebar. Datenschicht-Schnittstelle blieb synchron. ✅ 2026-06-21
- [ ] **P3 · M** **Daten erst bei Bedarf laden (optional):** `exam_data.json` zusätzlich
      asynchron hinter einem Bootstrap-Gate, damit der App-Shell *vor* den Daten paintet
      (Skeleton). Größerer Eingriff (Async-Selektoren/Tests); erst falls nötig.
- [ ] **P2 · M** **Quiz/Karteikarten auf `lernobjekte` vereinheitlichen:** dann auch dort
      Filter nach Prüfungsteil/Kategorie und optional Lernzettel als Karten.
- [x] **P1 · M** ~~**Lückentext / Cloze (aktives Abrufen):**~~ neues Format + Modus `/luecken`.
      Reine Engine `lib/cloze.js` (Parse + tolerante Prüfung, deutsche Normalisierung) und
      Generator `lib/glossar.js`, der Cloze-Items **automatisch aus den Lernzetteln** erzeugt
      (Muster „Begriff: Erklärung" + `**fett**`; 487 Items aus 278 Einheiten). Renderer
      `components/ClozeFrage.jsx`. Alles getestet (21 neue Tests). ✅ 2026-06-27 (Sprint 2)
      **Offen (Sprint 2-Rest):** MC/Matching/Reihenfolge, Confidence-based Answering.
- [x] **P2 · M** ~~**PWA/Offline:**~~ installierbar (Manifest + maskierbares Icon) und
      **offline** nutzbar (Service Worker via `vite-plugin-pwa`/Workbox, Auto-Update,
      26 Assets precached). Plus Mobile-Meta (lang=de, theme-color, Safe-Area). ✅ 2026-06-21
- [ ] **P2 · S** **Fortschritt exportieren/importieren** (JSON) – Backup für Nutzer ohne
      Konto, und einfacher Geräte-Umzug.
- [ ] **P2 · S** **GitHub Actions CI:** `npm test` (Frontend + Backend) bei jedem Push –
      hält die Suite grün und dokumentiert den Status im Repo.
- [ ] **P3 · M** **E2E-Tests** (Playwright) für die Kern-Flows (Quiz, Wiederholen, Login).
- [ ] **P3 · S** **Rate-Limit/Brute-Force-Schutz** für `/api/auth/login` (kleiner
      In-Memory-Limiter) – Härtung fürs öffentliche Hosting.

## 4. Inhalte (mehr Stoff) + Integration

> Integrationsprinzip bleibt: **reproduzierbare Import-Skripte** (`scripts/import/*`),
> additive Datenfelder, ein Commit pro Quelle, danach in der App sichtbar. Vor jedem
> Lauf `npm run backup`.

> ⚠️ **Rechtlicher Rahmen (wichtig):** Die originalen IHK/AKA-Prüfungsaufgaben **und**
> die offiziellen Musterlösungen sind **urheberrechtlich geschützt**. Sie dürfen nicht
> 1:1 (wörtlich) öffentlich verbreitet werden. Inhalte daher **eigenständig
> umformulieren** – gleiche Themen/Kompetenzen, andere Wortwahl, Zahlen und Szenarien.

- [x] **P1 · L** ~~**Prüfungsaufgaben urheberrechtlich entschärfen (Paraphrasieren).**~~
      **Erledigt:** Alle **6 AP1-Prüfungen (200 Einträge) neu formuliert** – per Sub-Agent
      je Prüfung (eigene Szenarien/Firmen/Zahlen, eigener Wortlaut, gleiche Kompetenz/
      Punktzahl), eingespielt via Pipeline `scripts/import/paraphrasen/`
      (`extrahiere-quelle.mjs` → `_quelle/` [gitignored, verbatim] → `<slug>.json` →
      `apply-paraphrasen.mjs`, idempotent). `meta.paraphrasiert:true`, als **KI-überarbeitet**
      deklariert. Originalität geprüft (4-Gramm-Jaccard Median ~0,08; hohe Ähnlichkeit nur
      bei kurzen, nicht schützbaren Funktions-/Faktenfragen). Beim Paraphrasieren zugleich
      **`schluesselwoerter` + `thema_tags` ergänzt** → AP1 jetzt mit Auto-Auswertung im
      Klausur-Modus (132 Musterlösungen treffen ihre eigenen Schlagwörter).
      **Git-Historie bereinigt (2026-06-27):** Historie in einen wurzellosen Commit
      gesquasht (force-push) **und** Roh-/Aufbereitet-Ordner aus dem Tracking genommen +
      gitignored → kein urheberrechtlich geschütztes Original mehr im Repo (117 statt 302
      Dateien). **Rest:** (a) Repo privat halten (GitHub kann unerreichbare Commits intern
      kurz vorhalten); (b) inhaltlicher Feinschliff der Lösungen (stichprobenartig). Siehe
      ADR-007.
- [ ] **P1 · M** **Restliche AP1-Lernzettel** (nativer Text, schnell): Prüfungskatalog
      FISI (als **Kategorie-/Tag-Gerüst** für alle Inhalte nutzbar!), Kurzform,
      ap1-lernguide, `AP1_Lerninhalte_Systemintegration.html`. Pattern wie AP1-Import.
- [x] **P1 · L** ~~**AP2-Prüfungsfragen (KI-generiert)**~~ – **KI-generierte
      AP2-Übungsklausur** ausgebaut auf **11 Aufgaben / 21 Fragen / 92 Punkte**, je mit
      `schluesselwoerter` (+ `mindest_treffer`), via `import-ap2-pruefungsfragen.mjs`.
      Themen u. a. Subnetting, Virtualisierung, IT-Sicherheit, RAID/Backup, SQL, TCO,
      Datenschutz, **WLAN/VPN, Monitoring, Pseudocode, Netzplan**. Rechtlich sauber
      (eigene Aufgaben, keine 1:1-IHK-Inhalte). Keyword-Selbsttest 21/21.
      **Optional:** weitere Übungsklausuren / mehr Aufgaben pro Thema.
- [x] **P1 · L** ~~**Lernzettel-Qualität (AP1) deutlich verbessert**~~ – AP1-Import auf
      `pdftotext -layout` umgestellt und Markdown rekonstruiert: zuvor zu Fließtext
      kollabierte **Aufzählungen** sind jetzt echte `- `-Listen, **über die Spaltenbreite
      umgebrochene Sätze/Listenpunkte** werden wieder zusammengefügt (`WRAP_MIN`),
      Pseudocode (8.7) als Code-Block. **Titel-Mängel der Quelle** (Tippfehler
      „Enwicklungssoftware/Markformen/Kommuniaktion …", doppelte AP2-Titel) zentral in
      `scripts/import/lib/lernzettel-korrektur.mjs` geheilt. Bekannte Rest-Limitierung:
      vereinzelt verwaiste Schlusswörter sehr langer Listenpunkte (kosmetisch).
- [x] **P1 · S** ~~**Klausur-Auswertung fairer („Nennen Sie N …")**~~ – neue Engine-Option
      `optionen.erforderlich` / Frage-Feld `mindest_treffer`: bei Aufzählungsfragen genügen
      **N** von mehreren gleichwertigen Schlagwörtern für „richtig" (statt 80 %-Quote über
      *alle* Optionen). In der AP2-Übungsklausur für 2a/3b/6b gesetzt, mit Tests abgesichert.
- [ ] **P3 · S** **Gebündelte Teilaufgaben-Lösungen aufteilen** – in einigen Original-Aufgaben
      (z. B. 2022_Frühjahr 2ga/gb/gc, 2022_Herbst 2ca/cb/cc) liegt die komplette Lösung beim
      **letzten** Teil, die vorderen Teilfragen haben keine. Pre-existing aus der Quelle (kein
      Paraphrasier-Fehler). Für saubere Klausur-Anzeige je Teilfrage die Lösung zuordnen.
- [ ] **P2 · S** **Fehlende offizielle Lösungen 2023/2024** aus den Roh-PDFs nachtragen
      (ersetzt „unverifiziert"-Markierungen wo möglich).
- [x] **P2 · M** ~~**Tags der bestehenden Fragen anreichern**~~ – im Zuge der
      Paraphrasierung **alle AP1-Fragen getaggt** (vorher 24 ohne `thema_tags`, jetzt 0),
      kontrolliertes Vokabular. Verbessert Filter, SRS-Gruppierung und Schwachstellen-
      Statistik. **Offen:** Schwierigkeitsgrad je Frage (leicht/mittel/schwer).
- [ ] **P3 · L** **Alte Zwischenprüfungen 2017–2020** (FISI GA1/GA2/WiSo) – gescannte
      PDFs, brauchen OCR/visuelles Einlesen. Viel Material, hoher Aufwand; termin-/
      themenweise, ein Commit pro Termin.
- [ ] **P3 · M** **Glossar/Begriffskarten** automatisch aus Lernzettel-Fettbegriffen
      generieren (zusätzliche, sehr kurze Lernobjekte für schnelles Abfragen).

## 5. Infrastruktur / Hosting (Rest aus Phase 5)

- [ ] **P1 · S** **Vor öffentlichem Hosting: Inhalte urheberrechtlich entschärfen**
      (s. §4, P1 + `DECISIONS.md` ADR-007). Keine 1:1-Prüfungen ausliefern; Roh-/
      Aufbereitet-Material nicht öffentlich. **Voraussetzung** für Public-Deployment.
- [ ] **P1 · S** `docker compose build` **real verifizieren** (auf dem Proxmox-Host oder
      einer Docker-Umgebung) – in der Dev-Umgebung war kein Docker verfügbar.
- [ ] **P3 · S** Healthcheck im `docker-compose.yml` (Backend `/api/health`) +
      `restart`-Policy bereits gesetzt.

## 6. Erlebnis & Gamification (die „fesselnde" Lernplattform)

> Ziel: aus einer Lern-App eine **Plattform, die motiviert und Spaß macht**. Kleine
> Belohnungen, sichtbarer Fortschritt und ruhige Animationen erhöhen die Lernzeit.
> Leitsatz: **spürbar lernen, aber leicht anfühlen** – Reibung raus, klares Ziel rein.

- [x] **P1 · M** ~~**„Heute lernen" – frictionless Smart-Session:**~~ ein Knopf im
      Home-Hero startet eine **kurze, fertige** Session (10 Objekte) ohne Filterwahl;
      priorisiert Schwaches/Fälliges, füllt mit Neuem auf, klares Ende mit motivierender
      Auswertung (gewusst-Quote, +XP, Streak). Flip-Karte + Tastatur, nutzt SRS/XP.
      Modul `lib/lernsession.js` (rein, 5 Tests), Seite `pages/Lernen.jsx`. ✅ 2026-06-21
- [ ] **P2 · S** **„Weiterlernen" / Resume:** letzte Position bzw. „dort weiter, wo du
      warst" anbieten; reduziert Einstiegs-Reibung weiter.
- [ ] **P2 · S** **Session-Länge wählbar** („nur 5", „10", „bis fällig leer") – kurze
      Optionen für das „leicht"-Gefühl, kein Zwang zu langen Runden.
- [ ] **P3 · S** **Swipe-Gesten** (mobil) im Lern-/Karteikarten-Modus für „gewusst/nicht"
      – noch flüssigere, „leichte" Bedienung.
- [ ] **P3 · S** **Tägliche Erinnerung** (PWA-Notification, opt-in) an die Streak –
      sanfter Anstoß, setzt PWA (3.x) voraus.
- [x] **P1 · M** ~~**Lern-Streak & Tagesziel:**~~ Streak (aufeinanderfolgende Lerntage,
      „lebendig" auch wenn heute noch offen) als Flammen-Indikator in der Navbar +
      Tagesziel-Balken auf der Startseite. Aktivitäts-Log lokal in `ProgressContext`
      (`recordActivity`), Logik in `lib/aktivitaet.js`. ✅ 2026-06-21
- [x] **P1 · M** ~~**GitHub-Style Heatmap**~~ der Lernaktivität (13 Wochen, Mo–So) auf der
      Statistik-Seite – reines CSS-Grid (`components/Heatmap.jsx`, `baueHeatmap`). ✅ 2026-06-21
- [x] **P1 · S** ~~**Erfolge/Badges:**~~ 10 Abzeichen (gelernt-Meilensteine, Streak-Stufen,
      aktive Tage, Klausur ≥ 80 %) – regelbasiert & getestet (`lib/erfolge.js`), Anzeige
      auf der Statistik-Seite (frei/gesperrt). ✅ 2026-06-21
- [x] **P2 · S** ~~**Konfetti/Feier-Moment**~~ bei bestandener Klausur (≥ 50 %) –
      `canvas-confetti`, reduced-motion + Canvas-Verfügbarkeit beachtet
      (`lib/konfetti.js`). ✅ 2026-06-21
- [x] **P2 · S** ~~**Badge-Unlock: Konfetti + Toast**~~ – `components/ErfolgWatcher.jsx`
      erkennt neu freigeschaltete Erfolge (Diff gegen zuletzt Gesehenes, kein Feuern
      beim Laden) und feiert mit Konfetti + Toast. Deckt auch Streak-Meilensteine ab
      (sind Badges). ✅ 2026-06-21
- [x] **P2 · S** ~~**Streak-Freeze + Tages-Quests:**~~ verpasste Tage überbrücken (gesund,
      ohne Verlust-Angst) – `aktivitaet.js#streakDetail`/`verfuegbareFreezes` (1 Freeze je
      7 aktive Tage, max 2), Freeze-Anzeige am Streak. Plus 3 abgeleitete **Tages-Quests**
      (`lib/quests.js`, rein/getestet) als Motivations-Checkliste auf Home. 10 neue Tests.
      ✅ 2026-06-27 (Sprint 4, s. PRODUKT_STRATEGIE.md)
- [ ] **P3 · S** **Streak/Aktivität ins Backend syncen** (aktuell rein lokal in
      `ap2_lernapp_gamification_v1`), damit Streak geräteübergreifend zählt.
- [x] **P2 · M** ~~**XP & Level:**~~ jede Bewertung gibt XP (richtig 10 / teilweise 5 /
      falsch 2), Level mit wachsender Kurve + Fortschrittsbalken (Statistik) und Level-
      Chip auf der Startseite. Tiefes Modul `lib/level.js` (7 Tests), XP im
      `ProgressContext` (`recordXp`). ✅ 2026-06-21
- [x] **P1 · M** ~~**Prüfungsreife / Mastery + Prognose:**~~ neues reines Modul `lib/reife.js`
      (getestet): Mastery je Thema aus der FSRS-Abrufwahrscheinlichkeit + **punktgewichtete
      Prognose** („geschätzte Prüfungsreife %"), Themen „bereit" ab ≥ 80 % & genug geübt.
      Reife-Gauge + Themen-Mastery (schwach zuerst) auf der Statistik-Seite. Plus
      **Prüfungstermin-Countdown + Tagesziel** auf Home (`lib/pruefungstermin.js`).
      ✅ 2026-06-27 (Sprint 3, s. PRODUKT_STRATEGIE.md)
- [ ] **P2 · M** **Lernpfad / Fortschritts-Map:** visuelle Themen-Reise (Knoten je
      Kategorie, freischaltbar), statt reiner Listen – greift Schwächen aus der Statistik auf.
- [ ] **P2 · S** **Command-Palette (Cmd/Ctrl-K):** Schnell-Navigation + Sofort-Suche –
      wirkt sehr „pro" und beschleunigt die Bedienung.
- [ ] **P2 · S** **Motivierende Microcopy & Leerzustände** mit kleinen Illustrationen/
      Maskottchen statt nüchterner Texte; situative Tipps („Noch 3 bis zum Tagesziel!").
- [ ] **P3 · M** **Onboarding-Tour** beim ersten Start (3–4 Schritte, was die App kann).
- [ ] **P3 · M** **Social/Bestenliste** (nur mit Backend/Konto): optionaler, anonymer
      Wochen-Vergleich – stark motivierend, aber Datenschutz bewusst gestalten (opt-in).
- [ ] **P3 · S** **Sound-/Haptik-Feedback** (dezent, standardmäßig aus) für richtig/falsch.

### Umsetzung mit unserem Stack (Tech-Eignung)

> **Fazit:** Der aktuelle Stack (React 19 · Vite 6 · Tailwind 4 · React Router 7 ·
> Fastify 5 · `node:sqlite`) **reicht für die gesamte Sektion 6 aus – kein
> Framework-Wechsel nötig.** Die App ist bewusst clientseitig/offline-fähig
> (HashRouter, statisch hostbar); SSR-Frameworks (Next.js o. ä.) brächten hier nur
> Komplexität ohne Nutzen. Engagement entsteht durch **kleine, tree-shakebare
> Libraries + Design**, nicht durch einen anderen Unterbau. Beim Ergänzen von
> Animations-Libs zugleich **3.1 (Code-Splitting)** angehen, damit die Ladezeit gut bleibt.

| Vorhaben (Sektion 6 / Design) | Umsetzung mit unserem Stack | Bibliothek / Aufwand |
|-------------------------------|------------------------------|----------------------|
| Streak, Tagesziel, XP/Level   | Aus vorhandener Review-Historie ableiten; State im `ProgressContext`/`localStorage` (+ optional Backend-Sync) | **0 neue Libs**; ggf. `date-fns` (tree-shakebar) oder native `Date` |
| Aktivitäts-Heatmap (Kalender) | Reines CSS-Grid + SVG, analog zu `ProgressRing` | **0 neue Libs** (optional `visx` für komplexe Charts) |
| Badges/Erfolge                | Regeln als reine Funktionen (gut testbar) + UI-Komponente | **0 neue Libs** |
| Konfetti-/Feier-Moment        | Einmalige Canvas-Animation | `canvas-confetti` (~6 kB gz) |
| Karten-Flip, Listen-Stagger, Bottom-Tab-Indikator, Page-Transitions | Deklarative Animationen, `layoutId` für „magic move" | `framer-motion`/`motion` (~30–50 kB gz, tree-shakebar) |
| Command-Palette (Cmd/Ctrl-K)  | Headless Combobox + Fuzzy-Suche über vorhandene Daten | `cmdk` (~5 kB gz) |
| Konsistentes Icon-Set          | Emojis → SVG-Icons (per-Icon importiert) | `lucide-react` (nur genutzte Icons im Bundle) |
| Animierte Zahlen (Count-up)   | `requestAnimationFrame`-Hook (wie `ProgressRing`) | **0 neue Libs** |
| Accent-Theme-Picker            | CSS-Variablen statt fixer Tailwind-Farben, in `localStorage` | **0 neue Libs** |
| PWA / Offline / installierbar | Service Worker + Manifest zur Build-Zeit | `vite-plugin-pwa` (Workbox, kein nennenswertes Runtime-Bundle) |
| Wachsender globaler State (falls nötig) | Erst bei echtem Prop-Drilling; Context reicht bisher | optional `zustand` (~1 kB gz) |
| Social/Bestenliste (opt-in)   | Tabellen + Routen in Fastify ergänzen | **kein neues Backend**; ggf. `@fastify/rate-limit` (Härtung) |
| Live-Bestenliste (optional)   | Falls je Echtzeit gewünscht | `@fastify/websocket` (im Fastify-Ökosystem) |

---

## Vorgeschlagener nächster „Sprint" (kompakt & sichtbar)

Ein guter Block für eine **fesselnde** Plattform mit viel sichtbarem Effekt:

1. **Lern-Streak & Tagesziel + Heatmap** (6.1–6.2) — der größte „dranbleiben"-Hebel.
2. **Erfolge/Badges + Konfetti-Moment** (6.3–6.4) — Belohnung, die Spaß macht.
3. **Tastatur-Shortcuts + Karten-Flip** (2.4–2.5) — wirkt dynamisch und schnell.
4. **Statistik mit `ProgressRing` aufwerten** (2.6) — konsistente, schöne Visualisierung.
5. **Bundle-Größe senken** (3.1) — spürbar schnellere Ladezeit.

Parallel/inhaltlich: **AP2-Prüfungsfragen** einpflegen (sobald Quelle da → sofort im
Klausur-Modus nutzbar), danach PWA/Offline + CI.
