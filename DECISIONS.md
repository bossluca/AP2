# Architecture Decision Records (ADR)

Kurze Begründungen größerer Entscheidungen. Knapp halten.

---

## ADR-001 — HashRouter beibehalten
**Status:** akzeptiert · **Datum:** 2026-06-21
Die App nutzt `HashRouter` (`#/...`). Beibehalten, auch mit Backend: das Frontend
bleibt statisch ausgeliefert, kein Server-seitiges Routing/Rewrite nötig. Das
Backend bedient ausschließlich `/api/*`.

---

## ADR-002 — Backend: Fastify + node:sqlite
**Status:** akzeptiert · **Datum:** 2026-06-21
**Entscheidung:** Leichtgewichtiges Node-Backend mit **Fastify 5** und der in Node ≥ 22
**eingebauten** SQLite-Implementierung `node:sqlite`.

**Begründung / Trade-offs:**
- Läuft identisch auf Proxmox-LXC **und** jedem VPS (Hostinger) – ein Prozess, eine
  Datei als DB, kein DB-Server zu betreiben.
- `node:sqlite` statt `better-sqlite3`: **keine native Build-Abhängigkeit**
  (node-gyp) → reibungslos unter Windows-Dev und in schlanken Docker-Images.
- Alternative **Supabase/Postgres** verworfen für dieses Projekt: externe
  Abhängigkeit/Account, potenzielle Kosten, weniger Self-Hosting-Kontrolle. Bei
  echtem Mehrgeräte-/Mehrnutzer-Skalierungsbedarf später re-evaluierbar (Datenmodell
  ist simpel portierbar).

## ADR-003 — Auth: argon2 + serverseitige Session-Cookies
**Status:** akzeptiert · **Datum:** 2026-06-21
**Entscheidung:** E-Mail + Passwort. Passwörter mit **argon2id** gehasht
(`@node-rs/argon2`, vorgebaut – keine Kompilierung). Sitzungen **serverseitig** in
der DB, Referenz über **httpOnly-Cookie** (`SameSite=Lax`, `Secure` in Produktion).

**Begründung / Trade-offs:**
- Server-Sessions statt JWT: **sofort widerrufbar** (Logout/Sperre = Zeile löschen),
  kein Token-Invalidierungsproblem. Bei same-origin-SPA ist ein Cookie einfacher und
  sicherer (httpOnly schützt vor XSS-Token-Diebstahl) als Token im localStorage.
- argon2id ist aktueller Stand für Passwort-Hashing (speicherhart); `@node-rs/argon2`
  liefert vorgebaute Binaries → kein Build-Stress.

## ADR-004 — Fortschritt-Migration: nicht-destruktives Merge
**Status:** akzeptiert · **Datum:** 2026-06-21
Beim ersten Login wird der lokale `localStorage`-Fortschritt per
`POST /api/progress/merge` hochgeladen. Merge ist **nicht-destruktiv**: nur auf dem
Server fehlende Einträge werden übernommen, vorhandene bleiben unangetastet
(kein stilles Überschreiben). Damit gehen weder lokale noch Konto-Daten verloren.

## ADR-005 — Hosting-Dimensionierung (konkrete Messwerte)
**Status:** informativ · **Datum:** 2026-06-21
Gemessene Größen als Grundlage für die LXC-/VPS-Dimensionierung:
- Frontend-Build `dist/`: **~0,9 MB** (JS 926 kB / gzip ~264 kB).
- SQLite-DB: **~4 KB** leer; wächst nur ~einige KB pro Nutzer (Fortschritt ist klein).
- Docker-Images node:24-alpine + caddy:2-alpine inkl. Layer: grob **~1–1,5 GB** Disk.

**Empfehlung LXC/VPS:** 2 vCPU, **1 GB RAM** (Peak ist der Build, nicht der Betrieb),
10 GB Disk. Reiner Betrieb käme mit 512 MB aus. Details + Begründung in
`PROXMOX_SETUP.md`.

**Offen / nicht verifiziert:** Der `docker compose build` wurde **noch nicht** real
ausgeführt (in der Dev-Umgebung kein Docker installiert). Verifiziert sind statt
dessen: Frontend-Build, Backend-Start, API end-to-end, 47 (Frontend) + 9 (Backend)
Tests grün, Full-Stack über den Vite-Dev-Proxy. Der erste echte Container-Build
erfolgt auf dem Proxmox-Host.

---

## ADR-006 — Stack beibehalten, per Libraries erweitern (kein Framework-Wechsel)
**Status:** akzeptiert · **Datum:** 2026-06-21
**Frage:** Reicht der Stack (React 19 · Vite 6 · Tailwind 4 · React Router 7 ·
Fastify 5 · `node:sqlite`) für eine „fesselnde" Lernplattform (Gamification,
Animationen, PWA – s. `IMPROVEMENTS.md` §6), oder ist ein anderer Stack besser?

**Entscheidung:** **Beibehalten und gezielt mit kleinen, tree-shakebaren Libraries
erweitern.** Kein Wechsel zu SSR-/Meta-Frameworks.

**Begründung / Trade-offs:**
- Die App ist bewusst **rein clientseitig und offline-/statisch** lauffähig
  (HashRouter, kein Server-Routing nötig). **Next.js o. ä. brächte SSR-Komplexität
  ohne Mehrwert** für einen Lern-Client und würde das einfache statische Hosting
  (Caddy/jeder Webspace) verkomplizieren.
- React 19 + Vite 6 + Tailwind 4 sind **aktuelle Major-Versionen** und für reichhaltige,
  animierte UIs voll ausreichend. Engagement entsteht durch Design + Libs, nicht durch
  den Unterbau.
- Geplante Ergänzungen bleiben im Ökosystem: `framer-motion`/`motion`, `canvas-confetti`,
  `lucide-react`, `cmdk`, `vite-plugin-pwa`, optional `zustand`; Backend ggf.
  `@fastify/rate-limit`, `@fastify/websocket`. Zuordnung zu den Vorhaben: Tabelle in
  `IMPROVEMENTS.md` §6 („Umsetzung mit unserem Stack").
- **Auflage:** Mit dem Hinzufügen von Animations-Libs zugleich **Code-Splitting/Daten
  auslagern** (IMPROVEMENTS 3.1) umsetzen, damit die Bundle-Größe nicht zum Problem wird.
- **Re-Evaluierung später**, falls: echtes Multi-User-Skalieren (→ Postgres statt
  SQLite, s. ADR-002) oder SEO/öffentliche Inhaltsseiten (→ dann SSR erwägen).

---

## ADR-007 — Prüfungsinhalte nicht 1:1 verbreiten (Urheberrecht)
**Status:** akzeptiert · **Datum:** 2026-06-21
**Sachlage:** Die originalen IHK/AKA-Prüfungsaufgaben und die offiziellen Musterlösungen
sind **urheberrechtlich geschützt**. Der aktuelle Datenbestand (`exam_data.json`,
`Pruefungen_Aufbereitet/`, `Pruefungen_Rohdaten/`) enthält teils **wörtliche** Aufgaben.

**Entscheidung:** Für jegliche **Veröffentlichung/öffentliches Hosting** dürfen die
Inhalte **nicht 1:1** verwendet werden. Aufgaben/Lösungen werden **eigenständig
umformuliert** (gleiches Thema/gleiche Kompetenz, eigener Wortlaut, variierte Szenarien/
Zahlen) und als **KI-generiert** bzw. **„an Prüfungsthemen angelehnt"** gekennzeichnet –
nicht als offizielle Prüfung ausgegeben.

**Aktueller Stand (aktualisiert 2026-06-27):** Das GitHub-Repo ist **privat**. Die
**6 AP1-Prüfungen sind paraphrasiert** (200 Einträge neu formuliert nach Kompetenz –
neue Szenarien/Firmen/Zahlen, eigener Wortlaut; `meta.paraphrasiert:true`, deklariert als
**KI-überarbeitet**). Umsetzung reproduzierbar via `scripts/import/paraphrasen/`. Die
AP2-Übungsklausur war von Anfang an KI-generiert. Originalität automatisiert geprüft
(4-Gramm-Jaccard Median ~0,08; hohe Ähnlichkeit nur bei kurzen, nicht schützbaren
Funktions-/Faktenfragen wie „Nennen Sie zwei gesetzliche Grundlagen").

**Git-Historie bereinigt (2026-06-27):** Historie in **einen wurzellosen Commit**
zusammengefasst (squash + force-push) → die verbatim Originaltexte aus früheren Commits
sind aus der erreichbaren Historie entfernt. Zusätzlich **Roh-/Aufbereitet-Ordner aus
dem Tracking genommen** (`git rm --cached`) und **gitignored**: `Pruefungen_Rohdaten/` +
`Pruefungen_Aufbereitet/` sind nur noch **lokale Arbeitsgrundlage** (Import-Skripte lesen
sie weiter). Repo enthält damit kein urheberrechtlich geschütztes Original mehr (117 statt
302 getrackte Dateien; größte Datei 712 KB, Large-File-Warnung weg).

**Konsequenzen / Rest-To-do:**
- Der eigentliche Schutz ist die **echte Neuformulierung** – erfüllt; das Label allein
  ersetzt sie nicht. Stichproben-Feinschliff der Lösungen bleibt sinnvoll.
- **GitHub** kann unerreichbare alte Commits intern noch eine Weile vorhalten (privates
  Repo → gering). Lokaler Sicherungs-Tag `pre-squash-backup-20260627` (nicht gepusht).
- **Repo vorerst privat halten**; Roh-/Aufbereitet-Material **nicht** zurück ins Repo
  holen / nicht öffentlich ausliefern (Bezug zu `DEPLOYMENT.md`).
- **Keine Rechtsberatung** – im Zweifel rechtlich prüfen lassen.
