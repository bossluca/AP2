# Änderungsprotokoll

Dieses Protokoll dokumentiert nutzerrelevante, technische und inhaltliche Änderungen.
Neue Einträge stehen oben. Git-Commits bleiben die Detailhistorie; hier steht das
verständliche Ergebnis inklusive Verifikation.

## Unveröffentlicht

### Hinzugefügt

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
