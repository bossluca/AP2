# Sprintplan – Mobile Lernen und Docker-Deployment

Stand: 2026-07-11

## Ziel

Die App soll auf dem Smartphone in kurzen, konzentrierten Einheiten gut bedienbar
sein und auf einem frischen Debian-Docker-Host reproduzierbar gestartet werden
können. Der bestehende React-/Fastify-Stack bleibt unverändert.

## Nutzerannahmen

- Der häufigste Zugriff erfolgt auf einem Smartphone.
- Eine typische spontane Lerneinheit dauert etwa 3–10 Minuten.
- Der wichtigste Ablauf ist: App öffnen → passende Session starten → Karte
  beantworten → Fortschritt sicher speichern.
- Der Betrieb erfolgt zunächst auf einer Debian-VM unter Proxmox, davor steht
  Nginx Proxy Manager für TLS.

## Sprintumfang

### Mobile Lernwirkung

- Sessionlänge mit 5, 10 oder 20 Karten wählbar und lokal merken.
- Antwortaktionen auf kleinen Displays im gut erreichbaren unteren Bereich halten.
- Touch-Ziele auf mindestens 48 Pixel erhöhen.
- Fortschritt für assistive Technik korrekt beschriften.
- Tastaturhinweise auf kleinen Touch-Geräten ausblenden.
- Tests für Auswahl und Persistenz der Sessionlänge ergänzen.

### Deployment

- Compose-Stack mit Init-Prozessen, begrenzten Containerlogs, Read-only-Dateisystemen
  und notwendigen temporären Schreibbereichen härten.
- Separaten Web-Health-Endpunkt bereitstellen.
- Ein Deploy-Skript für Vorprüfung, Build, Start und Smoke-Test ergänzen.
- Ein eigenständig ausführbares Smoke-Test-Skript ergänzen.
- CI für Frontendtests, Lint, Datenvalidierung, Build und Backendtests ergänzen.
- Deployment- und Rollback-Schritte auf die Debian-VM aktualisieren.

## Akzeptanzkriterien

- Auf 360-Pixel-Breite bleiben Lernkarte und Aktionen ohne horizontales Überlaufen
  bedienbar.
- Die gewählte Sessionlänge bleibt nach einem Neuladen erhalten.
- Frontendtests, Lint, Datenvalidierung, Build und Backendtests sind grün.
- Die Compose-Konfiguration ist auf einem Docker-Host gültig.
- Nach einem Deploy liefern /healthz und /api/health HTTP 200.
- Alle Änderungen stehen im Änderungsprotokoll und im Deployment-Runbook.

## Nicht Teil dieses Sprints

- Neue AP2-Prüfungssets; sie folgen nach Stabilisierung des mobilen Lern- und
  Deployment-Fundaments.
- Push-Benachrichtigungen und Social-/Bestenlistenfunktionen.
- Wechsel des Frontend- oder Backend-Frameworks.
