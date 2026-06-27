# ROADMAP — AP-Lernapp Ausbau

Stand: 2026-06-21 · Grundlage: Bestandsaufnahme (Schritt 1 des Auftrags).
Diese Datei dokumentiert die **abgeschlossenen Phasen 0–5**. Architektur-/Grundsatz-
entscheidungen stehen knapp in `DECISIONS.md` (ADR-Stil).

> **Weiterentwicklung ab hier:** siehe **[`IMPROVEMENTS.md`](IMPROVEMENTS.md)** —
> getracktes Backlog (Design/UX, Funktionen, Inhalte, Infrastruktur) mit Priorität,
> Aufwand und Checkboxen.

---

## 1. Bestandsaufnahme (Ist-Zustand)

### 1.1 App
- React 19 + Vite 6 + Tailwind 4 + React Router 7 (HashRouter), rein statisch.
- Fortschritt nur in `localStorage` (`ap2_lernapp_progress_v1`), kein Backend.
- Saubere Architektur: zentraler `ProgressContext` (Single Source of Truth),
  memoisierte Selektoren (`useExamData.js`), reine Filterlogik (`lib/filters.js`).
- Seiten: Home (Statistik), Flashcards, Quiz. Fortschritt pro Frage-`id`
  (`status`, `lastResult`, `history` max. 20). Multi-Tab-Sync via storage-Event.
- **Kein Test-Setup** vorhanden (kein Vitest/Testing-Library).

### 1.2 Datenbestand (in der App)
- `exam_data.json`: 6 Prüfungstermine, 200 Einträge → 178 lernbar, 107 mit Lösung,
  17 Tags. Alle 6 sind bereits in `Pruefungen_Aufbereitet/` als Markdown gepflegt.

### 1.3 Rohdaten (`Pruefungen_Rohdaten/AP1/`, 122 Dateien)
**Maschinen-Lesbarkeit geprüft (pdftotext):**

| Material | Format | Status |
|---|---|---|
| **Lernzettel/Cheatsheets** (8 PDFs + 1 HTML, ~470k Zeichen) | **nativer Text** | ✅ leicht extrahierbar, **noch ungenutzt** |
| `Prüfungskatalog FISI.pdf` (~69k Z.) | nativer Text | ✅ ideal für Themen-/Kategorie-Struktur |
| Prüfungs-PDFs (AO 2020 + alte Zwischenprüfungen) | **gescannt, 0 Z. Text** | ⚠️ **OCR nötig** |

**Untapped Prüfungen** (noch nicht in der App):
- **Alte Zwischenprüfungen 2017–2020** (Sommer/Winter), je GA1 (nach Fachrichtung,
  FISI-relevant: `FISI`/`FiSi`), GA2, WiSo — jeweils mit Lösungen. Anderes Format
  als die AO-2020-AP (eigene „Zwischenprüfung"), aber gutes Übungsmaterial.
- Mögliche **offizielle Lösungen** für 2023/2024, die in `Pruefungen_Aufbereitet/`
  aktuell als „unverifiziert" fehlen, aber in Roh-PDFs evtl. enthalten sind.

**OCR-Lage:** Lokal sind weder `tesseract` noch `pdftoppm`/ImageMagick installiert.
Realistischer Extraktionsweg für gescannte PDFs: visuelles Einlesen Seite für Seite
durch Claude (so entstanden vermutlich auch die bestehenden `Aufbereitet`-Dateien) —
funktioniert, ist aber aufwändig und sollte priorisiert eingesetzt werden.

### 1.4 ⚠️ Wichtigste Beobachtung: Scope „AP1 vs. AP2"
Projekt heißt **AP2**, aber **sämtliche** Inhalte (App + Rohdaten) sind **Teil 1
(GA1 / AP1)** — die `README` sagt das explizit. Es gibt aktuell **kein einziges
AP2-Prüfungsmaterial** im Repo. → Klärungsbedarf, siehe Frage Q1.

---

## 2. Offene Entscheidungen (vor der Implementierung)

> Q1 + Q2 sind **entschieden** (2026-06-21). Q3–Q5 stehen erst bei Phase 4/5 an —
> hier nur Empfehlung dokumentiert.

- **Q1 — Scope → ENTSCHIEDEN: „AP2 ergänzen, AP1 als Basis".** Datenmodell bekommt
  eine `pruefungsteil`-Dimension (`AP1` | `AP2`). AP1 = Grundlagen (vorhanden),
  AP2 = wird vom Nutzer separat geliefert. Beide Teile koexistieren als getrennte,
  filterbare Bereiche. App-Titel/Doku entsprechend neutral/korrekt fassen.
- **Q2 — Content-Priorität → ENTSCHIEDEN: „Lernzettel zuerst" + „Funktionen (Phase 3)
  vorziehen".** Reihenfolge: Lernzettel einpflegen UND parallel Quiz/Statistik/Suche/
  Leitner bauen. Alte Zwischenprüfungen (OCR) und Lösungen 2023/24 später.
- **Q3 — Backend (Phase 4):** Empfehlung **Node + Fastify + SQLite** (leicht,
  läuft überall, ein File, kein DB-Server). Alternative Supabase/Postgres nur, wenn
  Multi-Device-Sync/Hosting-by-third-party gewünscht. Auth: **E-Mail+Passwort,
  argon2-Hash, Session-Cookie (httpOnly)** statt JWT (einfacher zu widerrufen,
  SPA same-origin). → Bestätigung bei Phase 4.
- **Q4 — Hosting (Phase 5):** Empfehlung **Proxmox-LXC + Caddy** (automatisches
  TLS, volle Kontrolle, keine laufenden Kosten) — Docker-Setup so generisch, dass
  Hostinger-VPS ohne Änderung funktioniert. → Entscheidung bei Phase 5.
- **Q5 — HashRouter:** bleibt (Auftrag bestätigt), auch mit Backend kein Server-Routing nötig.

---

## 3. Phasen, Reihenfolge & Aufwand

Aufwand grob: S = klein (<½ Tag), M = mittel, L = groß/iterativ.

### Phase 0 — Fundament & Sicherung · **S**
- `scripts/backup-data.mjs` + Schema-Validierung; `exam_data.json` vor jeder
  strukturellen Änderung sichern (Auftragsvorgabe).
- Vitest + Testing-Library einrichten, `lib/filters.js` als erste Tests absichern.
- *Ziel:* keine Datenverluste, Refactoring-Sicherheit.

### Phase 1 — Datenmodell erweitern (rückwärtskompatibel) · **S–M**
- Neue **optionale** Felder pro Frage: `quelle`/`herkunft`, `schwierigkeit`
  (1–3), `kategorie`, `einheit_typ` (`pruefungsfrage` | `lernkarte`).
- Neue Top-Level-Sektion `lerneinheiten` für Lernzettel-Inhalte, getrennt von
  `exams` (Auftrag: „getrennt von den Prüfungsfragen").
- **Fortschritt bleibt kompatibel:** Key bleibt die Frage-`id`; nur additive
  Felder → `_v1`-localStorage unverändert nutzbar. Migrationspfad dokumentiert.

### Phase 2 — Mehr Lerninhalte · **L (iterativ)**
- **2a (Quick Win):** Lernzettel/Cheatsheets (nativer Text) → `lerneinheiten`,
  thematisch geschnitten, als neue Kategorie „Lernkarten/Spickzettel".
- **2b:** Fehlende offizielle Lösungen 2023/2024 aus Roh-PDFs nachtragen.
- **2c:** Alte Zwischenprüfungen (FISI-relevant) per visuellem Einlesen → JSON,
  termin- und themenweise, mit `quelle`-Markierung. Pro Termin ein Commit.

### Phase 3 — Lernfunktionen · **M–L** · ✅ ABGESCHLOSSEN (2026-06-21)
- ✅ **Einheitliche Lernobjekte** (`data/lernobjekte.js`): Fragen + Lernzettel über
  eine gemeinsame Struktur + reiner, injizierbarer Filter (Art/Teil/Kategorie/Tag/
  Status/fällig/Volltext).
- ✅ **Spaced Repetition (Leitner, 5 Boxen):** `lib/srs.js` + `recordReview` im
  ProgressContext; additiv & kompatibel zu `_v1` (kein Key-Bump nötig — entgegen
  ursprünglicher Annahme, da nur additive Felder `box`/`due`). Seite `/wiederholen`.
- ✅ **Statistik:** `lib/statistik.js` + Seite `/statistik` (% gelernt, Box-Verteilung,
  Fälligkeit, Schwachstellen nach Tag, Verlauf/Tag, Aufschlüsselung nach Prüfungsteil).
- ✅ **Volltextsuche** über Fragen, Lösungen und Lernzettel (Seite `/suche`).
- ✅ Quiz/Karteikarten unverändert lauffähig; neue Filter laufen über `lernobjekte.js`.
- _Offen/optional:_ FilterBar der bestehenden Quiz/Karteikarten-Seiten um
  `pruefungsteil` erweitern (aktuell nur im Wiederholen-/Such-Modus).

### Phase 4 — Multi-User-Backend + Auth + Migration · **L** · ✅ ABGESCHLOSSEN (2026-06-21)
- ✅ **Fastify + `node:sqlite`** (statt better-sqlite3 → keine native Build-Abhängigkeit,
  s. ADR-002). Schema: `users`, `sessions`, `progress` (user_id, item_id, status, box,
  due, last_seen, last_result, history).
- ✅ Auth: argon2id-Hash, **serverseitige Session-Cookies** (httpOnly, s. ADR-003).
- ✅ REST-API + **Frontend-Anbindung** (Konto-Seite, AuthContext, Write-Through-Sync);
  **nicht-destruktive localStorage-Migration beim Login** (`/api/progress/merge`, ADR-004).
- ✅ App läuft weiterhin **vollständig ohne Backend** (rein lokal, graceful degradation).
- ✅ `server/.env.example`, keine Secrets im Repo. 9 Backend-Tests + E2E geprüft.

### Phase 5 — Hosting/Containerisierung · **M** · ✅ ABGESCHLOSSEN (2026-06-21)
- ✅ `server/Dockerfile` (Backend) + `lernapp/Dockerfile` (mehrstufig: Vite-Build →
  **Caddy** serviert statisch + Reverse-Proxy `/api` + automatisches HTTPS).
- ✅ `docker-compose.yml` (Backend + Caddy + Volumes), `.env.example`, `Caddyfile`.
- ✅ `DEPLOYMENT.md`: Proxmox-LXC **und** VPS-Weg + begründete Empfehlung (Entscheidung
  bleibt beim Nutzer). _Hinweis:_ Images mangels Docker in der Dev-Umgebung noch nicht
  gebaut; Frontend-Build/Backend/API ohne Container verifiziert.

### Phase 6 — Doku (laufend)
- `CLAUDE.md`, `lernapp/README.md` aktuell halten; größere Entscheidungen in
  `DECISIONS.md` (ADR, knapp). Kleine, beschreibende Commits.

---

## 4. Vorgeschlagene Reihenfolge (nach Q1/Q2-Entscheidung)
**0 → 1 (inkl. `pruefungsteil`) → 2a (Lernzettel) → 3 (Quiz + Statistik + Suche) →
3 (Leitner-SRS) → 2b/2c (alte Prüfungen, laufend) → 4 (Backend) → 5 (Hosting).**
Lernzettel und Lernfunktionen haben Vorrang (Nutzerwunsch); OCR-lastige alte
Prüfungen und AP2-Material (sobald geliefert) ziehen laufend nach.
