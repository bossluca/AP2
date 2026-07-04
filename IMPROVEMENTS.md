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
- [~] **P2 · S** **Lade-/Leerzustände:** **Empty-States erledigt** – wiederverwendbare
      `components/LeerZustand.jsx` (rein, getestet) mit CTA in `Wiederholen`/`Lernen`/`Luecken`/
      `Lernzettel`/`Flashcards` + Command-Palette. **Offen:** Skeletons/Lade-Indikator solange
      `AuthContext.ready` lädt. ✅ teilw. 2026-06-28
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
      **Sprint-2-Rest teilerledigt (2026-07-04):** ✅ **Multiple Choice** – Drill-Modus
      `/drill` (`lib/mcDrill.js` rein/getestet: MC-Fragen + Distraktoren automatisch aus dem
      Glossar, Distraktoren aus demselben Themenfeld). ✅ **Confidence-based Answering** –
      „Weiß ich"/„Bin unsicher" beim Aufdecken in `Lernen` (`lib/confidence.js` rein/getestet,
      feineres FSRS-Signal, Fehl-Sicherheits-Warnung). **Offen:** Matching/Reihenfolge.
- [x] **P2 · M** ~~**PWA/Offline:**~~ installierbar (Manifest + maskierbares Icon) und
      **offline** nutzbar (Service Worker via `vite-plugin-pwa`/Workbox, Auto-Update,
      26 Assets precached). Plus Mobile-Meta (lang=de, theme-color, Safe-Area). ✅ 2026-06-21
- [x] **P2 · S** ~~**Fortschritt exportieren/importieren** (JSON)~~ – Backup für Nutzer ohne
      Konto und einfacher Geräte-Umzug: reines `lib/datensicherung.js` (Format
      `fisidev-backup` v1, defensive Validierung) + `components/DatenSicherung.jsx`
      auf der Konto-Seite. Import **nicht-destruktiv** (je Eintrag gewinnt der jüngere
      `updatedAt` via `lib/progressMerge.js`; Gamification max-Merge). ✅ 2026-07-04
- [x] **P1 · M** ~~**Sync-Robustheit: Offline-Outbox + `updatedAt`**~~ – jeder
      Fortschritts-Write stempelt `updatedAt`; fehlgeschlagene Server-PUTs landen in
      einer koaleszierten **Outbox** (`lib/outbox.js`, rein/getestet) und werden bei
      online-Event/Login/nächstem Erfolg nachgeschrieben. Vorher gingen Offline-Writes
      angemeldeter Nutzer bis zum nächsten Login-Merge verloren. ✅ 2026-07-04
- [x] **P1 · M** ~~**Passwort-Reset (Recovery-Code)**~~ – vergessenes Passwort war endgültig
      (Blocker für Multi-User-Hosting). Recovery-Code bei Registrierung (Einmal-Anzeige,
      nur argon2-Hash gespeichert), `POST /api/auth/recover` (Sitzungen widerrufen,
      Code rotiert, Login-Rate-Limit geteilt), Code-Erneuern für Bestandskonten,
      „Passwort vergessen?"-UI. S. ADR-008. ✅ 2026-07-04
- [x] **P1 · S** ~~**Error Boundary + App-Rauchtest**~~ – `components/FehlerGrenze.jsx`
      fängt Render-Fehler einer Seite ab (statt weißer Seite), `App.smoke.test.jsx`
      rendert die ganze App mit echten Providern/Daten. ✅ 2026-07-04
- [x] **P2 · S** ~~**GamificationContext-Split**~~ – Streak/XP/Quests in eigenem Context
      (`ProgressProvider` komponiert ihn; Aufrufer unverändert) → gezielte Re-Renders,
      schlankerer ProgressContext. ✅ 2026-07-04
- [x] **P2 · S** ~~**GitHub Actions CI:**~~ `.github/workflows/ci.yml` läuft `npm ci` +
      Lint + Test + Build + `validate-data` (Frontend) und `npm test` (Backend) bei jedem
      Push/PR auf `main` (Node 22, npm-Cache). ✅ 2026-06-28
- [ ] **P3 · M** **E2E-Tests** (Playwright) für die Kern-Flows (Quiz, Wiederholen, Login).
      Der App-Rauchtest (`App.smoke.test.jsx`, jsdom) deckt seit 2026-07-04 die
      „weiße Seite"-Klasse ab; Playwright bleibt für echtes Browser-Verhalten offen.
- [x] **P1 · S** ~~**Drill → FSRS anbinden**~~ – MC-Ergebnis zählt als `recordReview`
      auf die **Quell-Lerneinheit** (`einheitId` durch `glossar`/`mcDrill` gereicht;
      richtig = Gut, falsch = Nochmal – Wiedererkennen ist schwächere Evidenz als
      Abrufen, darum nie „Leicht"). ✅ 2026-07-04
- [x] **P2 · S** ~~**Klausur-Feedback: verfehlte Schlagwörter zeigen.**~~ Verfehlte
      Begriffe sind jetzt klar gekennzeichnet („Das hat gefehlt", amber ✗; verfehlte
      **Pflicht**-Begriffe rot). Im „Nennen Sie N"-Modus bleiben nicht gebrauchte
      Alternativen neutral (○). ✅ 2026-07-04
- [x] **P2 · S** ~~**Übung ↔ Lernzettel-Deeplink**~~ – reines `lib/nachlesen.js`
      (+4 Tests) findet die passendsten Lernzettel via `thema_tags`;
      `components/NachlesenLinks.jsx` unter jeder Lösung in Quiz + Klausur; die
      Lernzettel-Seite versteht `?einheit=<id>` (aufklappen + hinscrollen). ✅ 2026-07-04
- [~] **P2 · M** **`schwierigkeit` wirklich nutzen** – ✅ (a) FSRS-Prior: `bewerten`
      nimmt `objektSchwierigkeit` (leicht −1 / schwer +1 auf die Erstbewertungs-D),
      durchgereicht aus Lernen/Wiederholen/Klausur/ModulTraining; ✅ (b) „Heute
      lernen" sortiert neue Objekte **leicht → schwer** (stabil nach dem Mischen).
      ✅ 2026-07-04. **Offen:** (c) Filter/Anzeige („nur schwere Fragen üben").
- [x] **P2 · S** ~~**Fehl-Sicherheit persistieren**~~ – History-Label `sicher-falsch`
      (`recordReview`-Option), zählt in `istSchwach` als Schwäche; Statistik zeigt
      eine ⚠️-Kachel (Objekte/Ereignisse) mit Direkteinstieg ins Schwächen-Training.
      ✅ 2026-07-04
- [ ] **P3 · M** **`exam_data` aus dem PWA-Precache lösen:** Der Precache liegt bei
      ~2 MB und wächst mit jedem Content-Set; jede Datenänderung invalidiert alles.
      Daten-Chunk per Runtime-Caching (stale-while-revalidate) statt Precache.
- [x] **P3 · S** ~~**Rate-Limit/Brute-Force-Schutz** für `/api/auth/login`~~ – reines,
      getestetes In-Memory-Sliding-Window `server/src/lib/rateLimit.js` (Zeit injizierbar,
      pro App-Instanz dekoriert): max. 8 Fehlversuche je IP+E-Mail / 15 min → HTTP 429 +
      `Retry-After`; erfolgreicher Login setzt den Zähler zurück. `trustProxy` (Env
      `TRUST_PROXY`, Default an) sorgt hinter Nginx für die echte Client-IP. 7 Modul- +
      2 Integrationstests. ✅ 2026-06-28

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
      **Zweite Übungsklausur ergänzt (2026-06-28):** `import-ap2-pruefungsfragen-2.mjs`
      (eigener Marker/ID-Präfix, idempotent) – **11 Aufgaben / 22 Fragen / 101 Punkte**,
      komplementäre Themen (DNS/DHCP, IPv6, Active Directory & Berechtigungen, PKI/
      Verschlüsselung, Cloud-Modelle IaaS/PaaS/SaaS, DB-Normalisierung, ITIL/Change,
      Lasten-/Pflichtenheft, Ransomware/Phishing, Verfügbarkeitsrechnung, strukturierte
      Verkabelung/LWL). Keyword-Selbsttest 22/22.
      **Dritte Übungsklausur ergänzt (2026-07-04):** `import-ap2-pruefungsfragen-3.mjs` –
      **11 Aufgaben / 22 Fragen / 97 Punkte** (Routing/NAT, Firewall/DMZ, Container vs.
      VM, NAS/SAN/iSCSI, USV + Rechnung, Lizenzen/Open Source, Automatisierung/
      Pseudocode, VoIP/QoS, Nutzwertanalyse + Rechnung, OSI-Fehlersuche, Green IT +
      Stromkosten-Rechnung). Keyword-Selbsttest 22/22. **Optional:** weitere Sets.
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
      Statistik. ✅ **Schwierigkeitsgrad je Frage** (2026-07-04): `schwierigkeit` (1–3) für
      alle 220 Fragen mit Punktzahl aus den Punkten abgeleitet (Migration
      `003-schwierigkeit-aus-punkten.mjs`, idempotent, überschreibt nie manuelle Werte);
      Set 3 bringt das Feld direkt mit.
- [ ] **P3 · L** **Alte Zwischenprüfungen 2017–2020** (FISI GA1/GA2/WiSo) – gescannte
      PDFs, brauchen OCR/visuelles Einlesen. Viel Material, hoher Aufwand; termin-/
      themenweise, ein Commit pro Termin.
- [ ] **P3 · M** **Glossar/Begriffskarten** automatisch aus Lernzettel-Fettbegriffen
      generieren (zusätzliche, sehr kurze Lernobjekte für schnelles Abfragen).

## 5. Infrastruktur / Hosting (Rest aus Phase 5)

- [ ] **P1 · S** **Vor öffentlichem Hosting: Inhalte urheberrechtlich entschärfen**
      (s. §4, P1 + `DECISIONS.md` ADR-007). Keine 1:1-Prüfungen ausliefern; Roh-/
      Aufbereitet-Material nicht öffentlich. **Voraussetzung** für Public-Deployment.
- [x] **P1 · S** ~~**Transparenz & Inhalts-Kennzeichnung im UI**~~ – Seite **`/info`** („Über &
      Datenschutz", Footer-Link): welche Daten wo gespeichert werden (localStorage vs. Konto,
      Passwort-Hash, kein Tracking), Recht auf Löschung; Inhalts-Herkunft/Urheberrecht (KI/
      paraphrasiert/unverifiziert). **Herkunfts-Badge** (`lib/herkunft.js` + `HerkunftBadge`) an
      jeder Lösung. Konto-Seite mit Speicher-Hinweis + Einwilligung + **Konto-Löschung**
      (`DELETE /api/auth/account`, kaskadiert). **Hinweis:** Info-Seite ist eine Vorlage; der
      Betreiber ergänzt Impressum/verantwortliche Stelle. ✅ 2026-06-28
- [ ] **P1 · S** `docker compose build` **real verifizieren** (auf dem Proxmox-Host oder
      einer Docker-Umgebung) – in der Dev-Umgebung war kein Docker verfügbar.
- [x] **P3 · S** ~~Healthcheck im `docker-compose.yml`~~ – Healthchecks für Backend
      (`/api/health` via node-fetch) **und** web (wget); `web` startet erst bei
      gesundem Backend (`depends_on: condition: service_healthy`). ✅ 2026-07-04
- [x] **P1 · M** ~~**Self-Hosting-Härtung**~~ – Backend-Container non-root (`USER node`),
      beide Container `no-new-privileges` + Memory-Limits; nginx mit **Security-Headern**
      (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-/Permissions-Policy,
      `server_tokens off`, `client_max_body_size`); Fastify **Body-Limit 1 MiB**;
      **Session-Aufräumjob** (abgelaufene Sitzungen, alle 6 h; `raeumeSessionsAuf`
      getestet). Neue **Sicherheits-Checkliste Self-Hosting** + Backup-Cron in
      `DEPLOYMENT.md`; Doku vom alten Caddy- aufs tatsächliche NPM/nginx-Setup
      korrigiert. ✅ 2026-07-04

## 6. Erlebnis & Gamification (die „fesselnde" Lernplattform)

> Ziel: aus einer Lern-App eine **Plattform, die motiviert und Spaß macht**. Kleine
> Belohnungen, sichtbarer Fortschritt und ruhige Animationen erhöhen die Lernzeit.
> Leitsatz: **spürbar lernen, aber leicht anfühlen** – Reibung raus, klares Ziel rein.

- [x] **P1 · M** ~~**„Heute lernen" – frictionless Smart-Session:**~~ ein Knopf im
      Home-Hero startet eine **kurze, fertige** Session (10 Objekte) ohne Filterwahl;
      priorisiert Schwaches/Fälliges, füllt mit Neuem auf, klares Ende mit motivierender
      Auswertung (gewusst-Quote, +XP, Streak). Flip-Karte + Tastatur, nutzt SRS/XP.
      Modul `lib/lernsession.js` (rein, 5 Tests), Seite `pages/Lernen.jsx`. ✅ 2026-06-21
- [x] **P2 · S** ~~**„Weiterlernen" / Resume:**~~ „dort weiter, wo du warst" – reines,
      getestetes `lib/resume.js` (gerätelokal, 3-Tage-TTL) + `ProgressContext`
      (`resume`/`setResume`/`clearResume`); `Lernen`+`ModulTraining` merken die Position.
      Home priorisiert es im Primär-CTA via `lib/naechsteAktion.js` (rein, getestet). ✅ 2026-06-28
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
- [x] **P2 · S** ~~**Gamification pro Konto syncen**~~ – Streak/XP/Quests kontogebunden &
      geräteübergreifend: Tabelle `gamification` + `/api/gamification` (GET/PUT), Login-Merge
      max-basiert (`lib/gamiMerge.js`, rein/getestet), Write-Through, Reset serverseitig.
      Damit hat **jedes Konto seinen vollständigen Fortschritt** (Lernstand war schon pro Konto).
      ✅ 2026-06-27
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
- [ ] **P2 · M** **Tagesplan ↔ Reife koppeln:** Der Tagesplan (2026-07-04) sagt *wie viel*,
      die Reife-Analyse weiß *was* – das Pensum thematisch füllen: „heute dran:
      X Wiederholungen + Y neue, **zuerst Thema A und B**" (schwächste reife-Themen),
      mit Direkteinstieg in eine vorgefilterte Session.
- [ ] **P2 · M** **Matching-Spiel + Reihenfolge-Format** (Sprint-2-Rest): Begriff ↔
      Definition-Paare aus dem Glossar (Quizlet-„Match", mobil stark) und
      Sortier-Aufgaben für Prozesse (DORA, OSI-Schichten, Subnetting-Schritte) –
      beides speist wie der Drill das FSRS.
- [ ] **P2 · M** **Lernpfad / Fortschritts-Map:** visuelle Themen-Reise (Knoten je
      Kategorie, freischaltbar), statt reiner Listen – greift Schwächen aus der Statistik auf.
- [x] **P2 · S** ~~**Command-Palette (Cmd/Ctrl-K):**~~ Schnell-Navigation + Aktionen über die
      Tastatur (`components/CommandPalette.jsx` + reines, getestetes `lib/befehle.js` mit
      tolerantem Fuzzy-Filter; Nav zentral in `src/navigation.js`). Öffnet per Cmd/K + Such-Icon.
      Terminal-Optik (`>_`-Prompt). ✅ 2026-06-28
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

## Optimierungsplan (Stand 2026-07-04)

> Nach der Robustheits-/Feature-Runde vom 2026-07-04 (Error Boundary, Outbox,
> Backup, Recovery-Code, Tagesplan, Confidence, Drill, Set 3, `schwierigkeit`).
> Leitgedanke: **erst die Lernschleife schließen** (Signale, die schon erhoben
> werden, auch nutzen), dann **adaptiver werden**, dann **Politur & Betrieb**.
> Alle Punkte stehen mit Details als Checkboxen in den Sektionen oben.

### Sprint A — Lernschleife schließen (P1–P2 · überwiegend S) · ✅ ERLEDIGT 2026-07-04

Kleine Eingriffe, die vorhandene Daten in Lernwirkung verwandeln (alle vier
umgesetzt, Details in §3):

1. **Drill → FSRS** (§3) — objektive MC-Ergebnisse ins Gedächtnismodell buchen;
   aktuell verpufft das beste Erinnerungs-Signal der App.
2. **Klausur: verfehlte Schlagwörter zeigen** (§3) — der eigentliche Lerneffekt
   der Simulation; die Engine kennt sie bereits.
3. **Übung ↔ Lernzettel-Deeplink** (§3) — bei Fehlern direkt zum Nachlesen.
4. **Fehl-Sicherheit persistieren** (§3) — Confidence-Signal in History/Statistik,
   speist das Schwächen-Training.

### Sprint B — Adaptivität (P2 · M) · teilerledigt

5. **`schwierigkeit` nutzen** (§3) — ✅ FSRS-Initialschwierigkeit + Sessions
   leicht → schwer (2026-07-04); offen: „nur schwere"-Filter.
6. **Tagesplan ↔ Reife koppeln** (§6) — das Pensum thematisch füllen
   („zuerst Thema A und B") mit Direkteinstieg.
7. **Matching + Reihenfolge** (§6) — die letzten zwei Abfrage-Formate,
   beide aus dem Glossar generierbar.

### Sprint C — Politur & Betrieb (P2–P3)

8. **UX-Reste** (§2): Toaster-Context, Skeletons solange `AuthContext.ready` lädt,
   Count-up auf Home/Statistik, A11y-Pass (aria-live fürs Antwort-Feedback,
   Fokus-Management), Emoji → Lucide-Rest, Swipe-Gesten mobil.
9. **Betrieb** (§5): ✅ Healthchecks + Container-/Proxy-Härtung + Checkliste
   (2026-07-04); offen: `docker compose build` auf dem Proxmox-Host real
   verifizieren; **PWA-Push-Erinnerung** (opt-in, §6).
10. **Technik-Schulden** (§3): `exam_data` aus dem PWA-Precache lösen (~2 MB,
    wächst mit jedem Set), Playwright-E2E für die Kern-Flows.

### Content (läuft parallel, unabhängig von Sprints)

- Fehlende offizielle Lösungen 2023/2024 nachtragen (§4) · gebündelte
  Teilaufgaben-Lösungen aufteilen (§4) · optional **AP2-Set 4** (Themen-Kandidaten:
  Kerberos/SSO, Backup-Strategien GFS, SNMP/Syslog, Netzwerksegmentierung/Zero Trust,
  WLAN-Ausleuchtung, SQL-Joins vertieft) · Prüfungskatalog FISI als Kategorie-Gerüst (§4).

### Bewusst NICHT (unverändert)

Framework-Wechsel, Hearts/FOMO-Mechaniken, 1:1-Originalprüfungen (ADR-007),
Bestenliste vor echten Mehrfachnutzern.
