# Deployment der AP-Lernapp

Die App besteht aus zwei Teilen:

- **Frontend** – statische React-App (Vite-Build), ausgeliefert von **Caddy**.
- **Backend** – Fastify + SQLite (`node:sqlite`), bedient `/api/*`.

Caddy ist der einzige Entry-Point: es liefert die statischen Dateien aus, leitet
`/api/*` ans Backend weiter und besorgt in Produktion **automatisch ein HTTPS-Zertifikat**
(Let's Encrypt). Dasselbe Setup läuft unverändert auf einem **Proxmox-LXC** (mit Docker)
und auf einem **VPS** (z. B. Hostinger).

> Hinweis: Die Container-Images wurden in der Entwicklungsumgebung **nicht gebaut**
> (kein Docker vorhanden). Frontend-Build, Backend-Start und die API wurden jedoch
> ohne Container verifiziert (`npm run build`, `npm test`, End-to-End über HTTP).

## Voraussetzungen

- Docker + Docker Compose auf dem Zielsystem.
- Eine (Sub-)Domain, die auf die öffentliche IP des Servers zeigt (für HTTPS).
- Offene Ports **80** und **443**.

## Schnellstart (lokal testen, ohne TLS)

```bash
cp .env.example .env          # SITE_ADDRESS=:80 belassen
docker compose up --build
# -> http://localhost
```

## Produktion

1. `.env` anlegen und Domain eintragen:
   ```bash
   cp .env.example .env
   # in .env:
   # SITE_ADDRESS=lernapp.example.de
   ```
2. Sicherstellen, dass der DNS-A-/AAAA-Record von `lernapp.example.de` auf den Server zeigt.
3. Starten:
   ```bash
   docker compose up -d --build
   ```
   Caddy holt automatisch ein Let's-Encrypt-Zertifikat. Fertig.

Der Fortschritt der Nutzer liegt in der SQLite-Datei im Volume `db_data`
(`/app/data/lernapp.sqlite` im Backend-Container).

### Backup / Restore

```bash
# Backup der Datenbank
docker compose cp backend:/app/data/lernapp.sqlite ./lernapp-backup.sqlite

# Restore (Stack vorher stoppen)
docker compose cp ./lernapp-backup.sqlite backend:/app/data/lernapp.sqlite
```

---

## Variante A — Proxmox-LXC

> **Ausführliche, copy-paste-fähige Schritt-für-Schritt-Anleitung** (LXC mit Nesting,
> Docker-Installation, DynDNS/Port-Forwarding, SQLite-Backup per Cron):
> **[`PROXMOX_SETUP.md`](PROXMOX_SETUP.md)**. Kurzfassung:

1. Unprivilegierten Debian/Ubuntu-Container anlegen (2 vCPU, 1 GB RAM, 10 GB Disk).
   - Für Docker im LXC: Container als **nesting=1** (Features → Nesting) anlegen, oder
     alternativ eine kleine VM verwenden.
2. Docker installieren:
   ```bash
   apt update && apt install -y docker.io docker-compose-plugin
   ```
3. Repo auf den Container bringen (git clone oder rsync), `.env` mit Domain füllen.
4. `docker compose up -d --build`.
5. Im Router/in der Firewall **Port 80 und 443** auf den Container weiterleiten
   (Port-Forwarding), damit Let's Encrypt und der externe Zugriff funktionieren.

## Variante B — VPS (z. B. Hostinger)

1. VPS mit Docker bestellen/aufsetzen (Ubuntu-Image; Docker ggf. via
   `curl -fsSL https://get.docker.com | sh`).
2. Domain beim Anbieter auf die VPS-IP zeigen lassen (A-Record).
3. Repo klonen, `.env` mit Domain füllen, `docker compose up -d --build`.
4. Ports 80/443 sind bei einem VPS i. d. R. direkt aus dem Internet erreichbar – kein
   Port-Forwarding nötig.

### Vor der Buchung prüfen (typische VPS-Stolpersteine)

Diese Punkte beeinflussen das Docker-Compose-Setup. Was ich sicher sagen kann ist
markiert; der Rest ist als **selbst zu prüfen** gekennzeichnet (statt zu raten):

- **Virtualisierung KVM, nicht OpenVZ:** Docker braucht eigene Kernel-Fähigkeiten.
  **KVM-VPS** (Standard bei Hostinger und den meisten Anbietern) sind problemlos
  Docker-tauglich. Sehr billige **OpenVZ/„Container-VPS"** können Docker
  einschränken. → *Prüfen, dass der Plan KVM ist.*
- **IPv4-Adresse:** Das Setup geht von einer öffentlichen IPv4 aus. Manche günstige
  Pläne sind **IPv4-knapp/IPv6-only** oder berechnen IPv4 extra. Ohne öffentliche
  IPv4 erreichen Clients ohne IPv6 die App nicht, und Let's Encrypt braucht
  Erreichbarkeit. → *Prüfen, dass eine öffentliche IPv4 enthalten ist.*
- **RAM für den Build:** Der erste `docker compose build` (npm ci + Vite) ist der
  Speicher-Peak. **≥ 1 GB RAM** einplanen; bei 512-MB-Plänen ggf. Swap aktivieren
  oder das `web`-Image vorab woanders bauen und nur das Backend auf dem VPS bauen.
- **Docker meist nicht vorinstalliert:** Bare-Ubuntu-Image → Docker selbst per
  `get.docker.com` installieren (Hostinger bietet teils ein „Docker"-Template an,
  das den Schritt spart). → *Optional Template wählen.*
- **Firewall:** Ports **80 und 443** in der Anbieter-Firewall/Security-Group
  freigeben (bei manchen Anbietern standardmäßig zu).
- **Snapshots/Backups:** Anbieter-Snapshots sind ein bequemes Voll-Backup, oft aber
  limitiert/kostenpflichtig. Das DB-Backup aus `PROXMOX_SETUP.md` (Cron) funktioniert
  unabhängig davon auch hier. → *Snapshot-Konditionen sind anbieterspezifisch, selbst
  prüfen.*

> Konkrete, tagesaktuelle Details zu einem bestimmten Hostinger-Tarif (genaue
> RAM-Größe, IPv4-Inklusiv, KVM) kann ich nicht garantieren – das bitte am
> Bestellformular gegenchecken. Das Compose-Setup selbst ist anbieterneutral.

---

## Empfehlung (Entscheidung liegt bei dir)

| Kriterium | Proxmox-LXC (zuhause) | VPS / Hostinger |
|---|---|---|
| Laufende Kosten | keine (eigene Hardware) | monatliche Gebühr |
| Erreichbarkeit von außen | Port-Forwarding/DynDNS nötig | direkt, feste IP |
| Kontrolle / Datenhoheit | maximal | beim Anbieter |
| Aufwand Ersteinrichtung | etwas höher (Nesting, Router) | gering |
| Verfügbarkeit | abhängig von Heim-Internet/Strom | hohe Uptime |

**Empfehlung:** Wenn die App zuverlässig von außen (z. B. unterwegs/mobil) erreichbar
sein soll, ist ein **kleiner VPS** der einfachste, robusteste Weg – feste IP, kein
Router-Gefummel, gute Uptime. Für reine Nutzung im Heimnetz oder wenn Kosten/Datenhoheit
im Vordergrund stehen, ist der **Proxmox-LXC** ideal. Da beide dasselbe `docker compose`
nutzen, ist ein späterer Wechsel jederzeit möglich.

## Ohne Backend betreiben (rein statisch)

Die App funktioniert auch **ganz ohne Backend** – dann fehlt nur der Konto-/Sync-Teil,
der Fortschritt bleibt lokal im Browser (`localStorage`). Dafür genügt es, den
`dist/`-Build statisch auszuliefern (siehe `lernapp/README.md`, Abschnitt „Deployment auf
Proxmox"). Die Konto-Seite zeigt dann lediglich Fehlermeldungen beim Anmelden – alle
Lernfunktionen bleiben nutzbar.

### Vercel (schnell zum Testen)

Ideal für einen schnellen Test-Link (rein statisch, ohne Backend → lokaler Fortschritt):

1. Repo in Vercel importieren, **Root Directory = `lernapp`** setzen.
2. Framework wird als **Vite** erkannt (Build `npm run build`, Output `dist`) – ist
   zusätzlich in [`lernapp/vercel.json`](lernapp/vercel.json) hinterlegt (inkl.
   `Cache-Control: no-cache` für `sw.js`/`manifest`, damit PWA-Updates sofort greifen).
3. Kein Rewrite nötig (die App nutzt **HashRouter**, Routing läuft über `#/…`).
4. PWA (installierbar/offline) funktioniert über HTTPS automatisch.

Danach derselbe `dist/`-Build später auf dem **Proxmox-Server** (mit Backend via
Docker/Caddy) – siehe oben.
