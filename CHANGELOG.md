# Änderungsprotokoll

Dieses Protokoll dokumentiert nutzerrelevante, technische und inhaltliche Änderungen.
Neue Einträge stehen oben. Git-Commits bleiben die Detailhistorie; hier steht das
verständliche Ergebnis inklusive Verifikation.

## Unveröffentlicht

### Betrieb

- 2026-10-26: **`scripts/update.sh`:** Update in einem Schritt (Vorprüfung, Backup,
  ff-only-Pull, Deploy, automatischer Rückweg bei Fehler, optional Sicherheits-Check,
  Sperrfenster, Sperre gegen Parallelläufe, `--pruefen`). `scripts/test-update.sh`
  prüft Erfolg, Fehler mit Rückweg, Backup-Fehler, lokale Änderungen, Sperrfenster und
  Nicht-Fast-Forward mit echten Git-Repos (21 Prüfungen).

### Sicherheit

- 2026-10-22: **Nutzung nur mit Konto (C9, S21).** Neue Env `REQUIRE_LOGIN` (Compose-Default
  `true`, Server ohne Env `false`); `GET /api/auth/config` meldet `loginPflicht`. Ohne Sitzung
  zeigt die App nur die Konto-Seite (Login, Registrierung mit Einladung, Passwort vergessen,
  Einladungslink). Die Prüfungs-/Lernzettel-Daten werden erst nach dem Login per dynamischem
  Import geladen, sind nicht mehr im Service-Worker-Precache (stattdessen Laufzeit-Cache, beim
  Logout gelöscht) und nginx liefert `/assets/examdata-*.js` nur mit gültiger Sitzung aus
  (`auth_request`). Offline nach einem Login bleibt die App nutzbar; ohne Backend bleibt sie
  rein lokal. `security-check.sh` prüft das.
- 2026-10-22: **Spam-Schutz Registrierung (C9, S13):** eigenes nginx-Limit für
  `POST /api/auth/register`; falsche Einladungscodes zählen im Backend gegen die Login-Bremse
  (8 je IP / 15 min → 429).
- 2026-10-22: **Verhaltensänderung:** `docker-compose.yml` setzt ohne `.env` jetzt
  `REGISTRATION=invite` (vorher `open`) und `REQUIRE_LOGIN=true`. Instanzen, die bewusst offen
  oder ohne Konto nutzbar sein sollen, müssen das in der `.env` ausdrücklich setzen.

- 2026-10-22: **Lokale Daten gehören genau einem Konto (C1, S17).** Bisher blieben
  Lernstand, XP, Outbox, Einstufung und eigene Karten nach dem Abmelden im Browser und
  wurden beim Login eines **anderen** Kontos in dessen Konto gemergt. Jetzt: Besitzer-Marker
  `ap2_lernapp_owner_v1`; Abmelden und Konto löschen entfernen alle `ap2_lernapp_*`-Daten
  (Theme bleibt), vorher wird die Outbox gesendet; Login eines anderen Kontos verwirft
  fremde Reste und lädt nur den Kontostand; Outbox-Einträge sind an das Konto gebunden.
  Lernstand ohne Konto wird beim ersten Login nur nach Rückfrage („Lokalen Fortschritt in
  dieses Konto übernehmen?“) übernommen. **Verhaltensänderung:** Nach dem Abmelden ist der
  Browser leer; wer offline abmeldet, verliert noch nicht gesendete Bewertungen.

- 2026-10-20: **Admin-Erstregistrierung nur noch per Einladungscode.** Im Modus
  `invite` öffnete eine E-Mail aus `ADMIN_EMAILS` die Registrierung ohne Code – da die
  E-Mail nicht verifiziert wird, hätte jeder mit Kenntnis der Adresse das Admin-Konto
  vorab anlegen können. Den ersten Code erzeugt der Betreiber jetzt auf dem Server
  (`docker compose exec backend node src/einladung-cli.js`).
- 2026-10-22: **Login-Bremse nicht mehr per `X-Forwarded-For` umgehbar:** `TRUST_PROXY`
  zählt jetzt vertraute Hops (Default 1) statt „alles vertrauen“, nginx überschreibt
  `X-Forwarded-For` mit der echten Client-IP. Test belegt: mit der alten Einstellung
  blieben 12 Fehl-Logins mit wechselnden Fake-IPs ohne 429.
- 2026-10-20: **Keine Konto-Erkennung mehr:** Login prüft bei unbekannter E-Mail gegen
  einen Dummy-Hash (gleiche Antwortzeit), Recovery ebenso; im `invite`-Modus wird der
  Code vor der Existenz der E-Mail geprüft. `GO_LIVE_CHECKLISTE.md` ergänzt.
- 2026-10-20: **Abhängigkeiten aktualisiert:** fastify 5.12.7 (u. a. `X-Forwarded-*`-
  Spoofing, Auth-Bypass), fast-uri, find-my-way, react-router 7.18.4.
- 2026-10-20: **Security-Checks:** `server/test/security.test.js` (10 Invarianten),
  `scripts/security-check.sh` (Black-Box-Prüfung der laufenden Instanz), `npm audit`
  in CI inkl. wöchentlichem Lauf; Plan und Befunde in `SECURITY.md`.

### Hinzugefügt

- 2026-10-20: **Self-Hosting-Leitfaden** `SELF_HOSTING.md` (Voraussetzungen mit
  Messwerten, Zugriffsvarianten VPN/öffentlich/CDN, Sophos/OPNsense-Einstellungen,
  DDoS-Schichten, Performance, Datenhaltung, 3-2-1-Backups, Restore-Probe, Checkliste).
- 2026-10-20: **Konsistente Backups + Restore:** `server/src/backup.js`
  (`VACUUM INTO` + `integrity_check`, getestet), `scripts/backup.sh` (Rotation
  14 Tage/12 Monate, gzip, Exit-Code für Cron) und `scripts/restore.sh` (prüft,
  sichert vorher, spielt ein, Smoke-Test). End-to-end im Docker-Stack getestet.
- 2026-10-20: **AP2-Übungsklausur 5** (KI-generiert, 11 Aufgaben / 22 Fragen /
  87 Punkte) für die bisher dünnen Themen: IPsec-VPN, Remote-Zugriff,
  Monitoring-Schwellwerte, Protokollierung & DSGVO, AGDLP, Cluster/Load
  Balancer, Verfügbarkeits- und Leasing-Rechnung, ACID/SQL, Linux-Rechte/cron,
  ITIL. Keyword-Selbsttest 22/22; laut Themenmatrix jetzt alle 16 Themen „Gut“.
- 2026-10-20: **Sechs neue Erfolge** (Einstufung, eigener Stapel, Wochensieger,
  Level 5/10, 5000 XP); Statistik und ErfolgWatcher teilen `hooks/useErfolge`.
- 2026-10-20: **Wochen-Challenges** auf der Startseite: an 5 Tagen lernen,
  100 Objekte bewerten, 15 Wiederholungen im wöchentlich rotierenden
  Fokus-Thema (`lib/challenges.js`, rein/getestet, aus vorhandenen Signalen).
- 2026-10-20: **Lerngruppen** (Rangliste-Seite): Gruppe anlegen, per Code
  `XXXX-XXXX` beitreten (Rate-Limit gegen Durchprobieren), verlassen; eigene
  Wochen-Rangliste je Gruppe (`/api/rangliste?gruppe=<id>`), unabhängig vom
  globalen Opt-in. Anzeigename lässt sich ohne öffentliche Teilnahme speichern.
- 2026-10-20: **Konto-Sync für Lernplan + eigene Karten** (`/api/daten`,
  Tabelle `user_daten`): Merge beim Login (jüngere Einstufung, Vereinigung der
  Stapel), danach Durchschreiben jeder Änderung (`components/KontoDatenSync`).
- 2026-10-20: **Playwright-E2E** (`npm run e2e`, `lernapp/e2e/`): Startseite,
  Einstufung bis Lernplan, Rechen-Trainer, Heute lernen, eigene Karten – Desktop
  und Mobil gegen den Produktions-Build; neuer CI-Job.

- 2026-10-20: **Rechen-Trainer** (`/rechnen`): unbegrenzt generierte Aufgaben
  (Hosts pro Netz, Netz-/Broadcastadresse mit Oktett-Kurzweg, Teilnetze, IPv6
  kürzen nach RFC 5952, RAID-Kapazität, Übertragungszeit, Stromkosten,
  USV-Laufzeit, Verfügbarkeit, Zahlensysteme) mit Lösungsweg und toleranter
  Prüfung (Komma/Punkt, Einheiten). `lib/rechentrainer.js` rein/getestet.
- 2026-10-20: **Einladungs-Codes + Admin-Bereich** für Self-Hosting:
  `REGISTRATION=open|invite|closed`, `ADMIN_EMAILS`; Admin-Seite `/admin`
  (Konten sperren/löschen, Einladungen mit Link `#/konto?einladung=…`).
  Codes nur als SHA-256-Hash gespeichert, atomar eingelöst; gesperrte Konten
  verlieren sofort alle Sitzungen. Additive DB-Migration.
- 2026-10-20: Backup enthält jetzt auch **eigene Kartenstapel und den Lernplan**
  (optionale Felder, ältere Backups bleiben gültig).

- 2026-10-20: **Einstufungstest + individueller Lernplan** (`/einstufung`):
  kurzer MC-Test über 16 AP2-Themen (Fragen aus den Lernzetteln, „Weiß ich
  nicht" statt Raten), Themenprofil und Wochenplan bis zum Prüfungstermin
  (schwache, prüfungsrelevante Themen zuerst, Endspurt = Prüfungssimulation).
  Antworten fließen als FSRS-Signal in den Lernstand. Neuer Lernmodus
  `/lernen?modus=thema&thema=<id>`, Lernplan-Karte auf der Startseite, neue
  Nutzer bekommen den Test als Primär-Aktion. Themenkatalog zentral in
  `lib/themen.js` (auch von `analyse-ap2` genutzt).
- 2026-10-20: **Eigene Karten** (`/eigene-karten`): PDF hochladen oder Text
  einfügen → Kartenvorschläge (Glossar, „Begriff – Erklärung", Abkürzungen,
  Frage/Antwort, Überschrift + Aufzählung) → prüfen/bearbeiten → als Stapel
  speichern und mit FSRS lernen. PDF wird per pdf.js **im Browser** gelesen
  (eigener Lazy-Chunk, nicht im PWA-Precache); nichts wird hochgeladen.
- 2026-10-20: **Zuordnen-Spiel** (`/matching`): Begriffe den Definitionen
  zuordnen, Paare automatisch aus den Lernzetteln (`lib/matching.js`, rein/getestet).
  Fehlerfreie Paare zählen als FSRS-Review „Gut“, sonst „Nochmal“; XP + Aktivität.
- 2026-10-20: **Opt-in Wochen-Rangliste** (`/rangliste`, nur mit Konto):
  Anzeigename statt E-Mail, Punkte = Lernaktivität der letzten 7 Tage,
  jederzeit abmeldbar. Backend `GET /api/rangliste` + `PUT /api/rangliste/profil`,
  additive DB-Migration. Info-Seite um den Datenschutz-Hinweis ergänzt.
- 2026-10-20: `FAHRPLAN.md` – priorisierter Fahrplan für Self-Hosting,
  Konten, Gamification und Inhalte.

- 2026-07-11: Mobile Sessionlängen mit 5, 10 oder 20 Karten; Auswahl bleibt
  gerätelokal gespeichert.
- 2026-07-11: Sticky Antwortaktionen und größere Touch-Ziele für die mobile
  Einhandbedienung.
- 2026-07-11: Reproduzierbarer Docker-Deploy mit Vorprüfung, Health-Wartephase
  und Smoke-Test sowie eine konkrete Deploy-/Rollback-Checkliste.
- 2026-07-11: AP2-Übungsklausur 4 mit 22 KI-generierten Fragen in 11 Aufgaben
  (99 Punkte), lückenorientiert und mit Keyword-Selbsttest.
- 2026-07-11: Reproduzierbare AP2-Themenmatrix mit stabilem Themenkatalog,
  Abdeckungsstatus und npm-Skript `analyse-ap2`.

### Geändert

- 2026-10-20: **Sicherheitsfix nginx:** CSP/X-Frame-Options & Co. fehlten an
  `index.html`, `sw.js` und den Assets (eigenes `add_header` im location-Block
  verwarf die geerbten). Header jetzt als Include in jedem Block. Dazu
  **Rate-Limits** (`/api` 20 r/s, `/api/auth` 30/min, 60 Verbindungen je IP),
  Slowloris-Timeouts, echte Client-IP hinter NPM und **gzip**.
- 2026-10-20: **Barrierefreiheit:** axe-Check (WCAG 2.1 A/AA) für 7 Hauptseiten
  in hellem und dunklem Theme als Teil der Playwright-Suite (`e2e/a11y.spec.js`).
  Behoben: Primary im Hellmodus auf green-700 (Kontrast weißer Text/grüner Text
  ≥ 4,5:1), gesperrte Badges ohne halbtransparenten Text (+ „gesperrt“ für
  Screenreader).
- 2026-10-20: **Bundle-Chunk vendor −64 %**: `import * as Icons from 'lucide-react'` (Lernpfade,
  Command-Palette) zog alle Icons mit; jetzt explizite Icon-Maps. vendor-Chunk
  1,18 MB → 427 KB (gzip 263 → 131 KB), PWA-Precache 2,17 → 1,43 MiB.
  Wächter-Test `src/bundle.test.js` verhindert Rückfall.
- 2026-10-20: Neue, noch nie gelernte Inhalte zählen nicht mehr als „fällig“
  (Startseite zeigte Neulingen „543 fällig“); die Statistik führt sie als `neu`.
- 2026-10-20: Design-Feinschliff: einheitliche Seitentitel (ohne Emoji,
  `tracking-tight`), Lernmodi-Kacheln mit Lucide-Icons im 3-Spalten-Raster,
  dezentes Punktraster im Hero, aktive Bottom-Nav als Pill, Grautöne auf
  `muted-foreground`-Token vereinheitlicht, Fortschrittsring mobil ausgeblendet.
- 2026-10-20: nginx liefert `.mjs` (pdf.js-Worker) mit JavaScript-MIME aus.
- 2026-10-20: **Design auf shadcn/ui-Stil umgestellt**: semantische Tokens
  (`background`/`card`/`muted`/`border`/`primary` …, Basis zinc, Primary grün)
  via `@theme inline`, neutrales Dark-Theme statt grün getöntem Terminal-Schwarz,
  Fonts Geist + Geist Mono, Aurora-Hintergrund und Farbverläufe entfernt.
  Klassennamen (`card`, `btn-*`, `chip`, `input`) bleiben – alle Seiten
  übernehmen den Look ohne Umbau.
- 2026-10-20: Desktop-Navigation zeigt nur die Kernbereiche, Rest über „Mehr“
  (vorher liefen 11 Links aus dem Container).

- 2026-07-11: Docker-Container mit Read-only-Root-Dateisystemen, Init-Prozessen,
  begrenzten Logs, explizitem Proxy-Vertrauen und separatem Web-Healthcheck gehärtet.
- 2026-07-11: PWA-App-Shell, Service Worker und Manifest werden nicht langfristig
  zwischengespeichert; neue Versionen werden zuverlässiger erkannt.
- 2026-07-11: Proxmox-Anleitung auf die tatsächlich verwendete Debian-VM als
  bevorzugten Docker-Host erweitert.
- 2026-07-11: Tagesplan priorisiert schwache, heute bearbeitbare Themen und
  startet direkt eine entsprechend vorgefilterte Lernsession.

### Dokumentation

- 2026-07-11: `PROJECT_STATUS.md` als verifizierten Ist-Stand und zentrale nächste
  Roadmap ergänzt.
- 2026-07-11: `CONTRIBUTING.md` mit verbindlichem Arbeits-, Test- und
  Dokumentationsablauf ergänzt.
- 2026-07-11: README-Verweise auf Status, Roadmap und Änderungsprotokoll ergänzt.
- 2026-07-11: Mobile-/Deployment-Sprintplan und Betriebscheckliste ergänzt.

### Verifikation

- 2026-07-11: Frontend 279 Tests, Backend 31 Tests, ESLint, Datenvalidierung und
  Produktionsbuild erfolgreich.
- 2026-07-11: Bundle-Wachstum als technischer Fokus bestätigt: PWA-Precache rund
  2,08 MiB; große `vendor`- und `examdata`-Chunks.

## Eintragsvorlage

```markdown
### Hinzugefügt | Geändert | Behoben | Inhalte | Dokumentation

- JJJJ-MM-TT: Kurzes Ergebnis. Betroffene Bereiche: `pfad/datei`.
  Verifiziert mit: `npm test`, ...
```
