# Änderungsprotokoll

Dieses Protokoll dokumentiert nutzerrelevante, technische und inhaltliche Änderungen.
Neue Einträge stehen oben. Git-Commits bleiben die Detailhistorie; hier steht das
verständliche Ergebnis inklusive Verifikation.

## Unveröffentlicht

### Hinzugefügt

- 2026-07-11: Mobile Sessionlängen mit 5, 10 oder 20 Karten; Auswahl bleibt
  gerätelokal gespeichert.
- 2026-07-11: Sticky Antwortaktionen und größere Touch-Ziele für die mobile
  Einhandbedienung.
- 2026-07-11: Reproduzierbarer Docker-Deploy mit Vorprüfung, Health-Wartephase
  und Smoke-Test sowie eine konkrete Deploy-/Rollback-Checkliste.

### Geändert

- 2026-07-11: Docker-Container mit Read-only-Root-Dateisystemen, Init-Prozessen,
  begrenzten Logs, explizitem Proxy-Vertrauen und separatem Web-Healthcheck gehärtet.
- 2026-07-11: PWA-App-Shell, Service Worker und Manifest werden nicht langfristig
  zwischengespeichert; neue Versionen werden zuverlässiger erkannt.
- 2026-07-11: Proxmox-Anleitung auf die tatsächlich verwendete Debian-VM als
  bevorzugten Docker-Host erweitert.

### Dokumentation

- 2026-07-11: `PROJECT_STATUS.md` als verifizierten Ist-Stand und zentrale nächste
  Roadmap ergänzt.
- 2026-07-11: `CONTRIBUTING.md` mit verbindlichem Arbeits-, Test- und
  Dokumentationsablauf ergänzt.
- 2026-07-11: README-Verweise auf Status, Roadmap und Änderungsprotokoll ergänzt.
- 2026-07-11: Mobile-/Deployment-Sprintplan und Betriebscheckliste ergänzt.

### Verifikation

- 2026-07-11: Frontend 275 Tests, Backend 31 Tests, ESLint, Datenvalidierung und
  Produktionsbuild erfolgreich.
- 2026-07-11: Bundle-Wachstum als technischer Fokus bestätigt: PWA-Precache rund
  2,08 MiB; große `vendor`- und `examdata`-Chunks.

## Eintragsvorlage

```markdown
### Hinzugefügt | Geändert | Behoben | Inhalte | Dokumentation

- JJJJ-MM-TT: Kurzes Ergebnis. Betroffene Bereiche: `pfad/datei`.
  Verifiziert mit: `npm test`, ...
```
