# Deploy-Checkliste – FiSi.dev auf Proxmox

Stand: 2026-07-11

## Vor dem Deploy

- [ ] Ziel ist die Debian-VM, nicht der Proxmox-Host.
- [ ] Docker Engine, Compose v2, Git und curl sind installiert.
- [ ] Mindestens 1 GB RAM oder ausreichend Swap und 3 GB freier Speicher sind vorhanden.
- [ ] Repository und gewünschter Commit/Branch wurden geprüft.
- [ ] .env existiert; WEB_PORT, BIND_ADDRESS und Cookie-Name sind plausibel.
- [ ] Bei bestehender Nutzung wurde die SQLite-Datenbank gesichert.
- [ ] Lokale/CI-Tests, Lint, Datenvalidierung und Frontendbuild sind grün.
- [ ] Nginx Proxy Manager erreicht die IP der Docker-VM und den gewählten Port.

## Deploy

~~~bash
cd /opt/lernapp
git pull --ff-only
chmod +x scripts/*.sh
./scripts/deploy.sh
~~~

- [ ] Beide Container werden als healthy angezeigt.
- [ ] Das Smoke-Test-Skript ist erfolgreich.
- [ ] Die App öffnet sich über die interne VM-IP.
- [ ] Die App öffnet sich über die HTTPS-Domain.
- [ ] Login, eine Lernbewertung und erneutes Laden funktionieren.
- [ ] PWA-Update bzw. Neuladen zeigt die neue Version.

## Nach dem Deploy

- [ ] Die letzten 100 Containerlogs zeigen keine wiederholten Fehler.
- [ ] Nginx Proxy Manager nutzt Force SSL, HTTP/2 und HSTS.
- [ ] Port 8080 ist nur aus LAN/NPM erreichbar.
- [ ] Backup-Zeitplan und Speicherplatz wurden geprüft.
- [ ] Änderung und Deploy-Ergebnis stehen im Changelog.

## Rollback

Den letzten funktionierenden Commit vor dem Deploy mit git rev-parse HEAD notieren.
Bei einem App-Fehler auf diesen Commit wechseln und das Deploy-Skript erneut starten.
Danach die Ursache lokal beheben und regulär über main ausrollen. Bei beschädigten
Kontodaten zusätzlich die zuvor gesicherte SQLite-Datei wiederherstellen.

## Sofortige Rollback-Auslöser

- /healthz oder /api/health bleibt länger als 60 Sekunden fehlerhaft.
- Login oder Speichern eines Lernfortschritts funktioniert nicht.
- Container starten wiederholt neu oder laufen in das Speicherlimit.
- Die HTTPS-Domain liefert Zertifikats-, Proxy- oder Endlosschleifenfehler.
- Bestehende Nutzerstände fehlen oder können nicht geladen werden.
