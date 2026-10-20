# Änderungsprotokoll

Dieses Protokoll dokumentiert nutzerrelevante, technische und inhaltliche Änderungen.
Neue Einträge stehen oben. Git-Commits bleiben die Detailhistorie; hier steht das
verständliche Ergebnis inklusive Verifikation.

## Unveröffentlicht

### Hinzugefügt

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
