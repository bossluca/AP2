# Deployment der AP-Lernapp

Die App besteht aus zwei Teilen:

- **Frontend** – statische React-App (Vite-Build), ausgeliefert von **Nginx**
  (im `web`-Container; gehärtet mit Security-Headern/CSP).
- **Backend** – Fastify + SQLite (`node:sqlite`), bedient `/api/*` (nur intern
  erreichbar, non-root, Healthcheck).

Der `web`-Container ist der Entry-Point des Stacks: er liefert die statischen
Dateien aus und leitet `/api/*` ans Backend weiter. **TLS/HTTPS terminiert der
vorgelagerte Nginx Proxy Manager (NPM)** mit Let's-Encrypt-Zertifikat. Dasselbe
Setup läuft unverändert auf einem **Proxmox-LXC** (mit Docker) und auf einem
**VPS** (z. B. Hostinger).

> Hinweis: Die Container-Images wurden in der Entwicklungsumgebung **nicht gebaut**
> (kein Docker vorhanden). Frontend-Build, Backend-Start und die API wurden jedoch
> ohne Container verifiziert (`npm run build`, `npm test`, End-to-End über HTTP).

## Voraussetzungen

- Docker + Docker Compose auf dem Zielsystem.
- Ein laufender **Nginx Proxy Manager** (oder anderer TLS-Reverse-Proxy) davor.
- Eine (Sub-)Domain, die auf die öffentliche IP zeigt (für HTTPS am NPM).

## Schnellstart (lokal testen, ohne TLS)

```bash
cp .env.example .env          # WEB_PORT=8080 belassen
docker compose up --build
# -> http://localhost:8080
```

## Produktion

1. `.env` anlegen (Port für den web-Container wählen):
   ```bash
   cp .env.example .env
   # in .env: WEB_PORT=8080 (oder ein freier Port)
   ```
2. Starten:
   ```bash
   chmod +x scripts/*.sh
   ./scripts/deploy.sh
   ```
   Das Skript validiert die Compose-Datei, baut und startet beide Container,
   wartet auf `healthy` und prüft `/healthz` sowie `/api/health`.
3. TLS/HTTPS terminiert der vorgelagerte **Nginx Proxy Manager** (NPM):
   Proxy-Host auf `http://<Host-IP>:${WEB_PORT}` anlegen, Let's-Encrypt-Zertifikat
   holen, **„Force SSL" + HSTS aktivieren** (die Security-Header der App selbst
   setzt der web-Container, HSTS gehört an den TLS-Terminator).

Der Fortschritt der Nutzer liegt in der SQLite-Datei im Volume `db_data`
(`/app/data/lernapp.sqlite` im Backend-Container).

Vollständige Vor-/Nachkontrolle und Rollback-Auslöser:
[`DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md).

### Manuelle Diagnose

```bash
docker compose ps
docker compose logs --tail=100 backend web
./scripts/smoke-test.sh
```

Die Logdateien werden durch Compose auf drei Dateien mit jeweils maximal 10 MB
begrenzt. Beide Container laufen mit Read-only-Root-Dateisystem, eigenen temporären
Dateisystemen und `no-new-privileges`; nur das SQLite-Volume bleibt dauerhaft
beschreibbar.

### Backup / Restore

```bash
# Backup der Datenbank
docker compose cp backend:/app/data/lernapp.sqlite ./lernapp-backup.sqlite

# Restore (Stack vorher stoppen)
docker compose cp ./lernapp-backup.sqlite backend:/app/data/lernapp.sqlite
```

Automatisieren (Cron auf dem Host, täglich 03:00, 14 Tage Aufbewahrung):

```bash
0 3 * * * cd /pfad/zum/repo && docker compose cp backend:/app/data/lernapp.sqlite \
  /var/backups/lernapp/lernapp-$(date +\%F).sqlite && \
  find /var/backups/lernapp -name 'lernapp-*.sqlite' -mtime +14 -delete
```

### Sicherheits-Checkliste Self-Hosting

Was der Stack **bereits mitbringt** (Stand 2026-07-04):

- ✅ **Container gehärtet:** Backend läuft als unprivilegierter `node`-User,
  beide Container mit `no-new-privileges` + Memory-Limits; Backend-Port ist
  **nicht** nach außen exponiert (nur `web` erreicht ihn).
- ✅ **Healthchecks:** `docker compose ps` zeigt den echten Zustand; `web`
  startet erst, wenn das Backend gesund ist. `restart: unless-stopped`.
- ✅ **Security-Header** (nginx im web-Container): CSP (nur eigene Ressourcen +
  Google Fonts), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `server_tokens off`.
- ✅ **Auth-Härtung:** argon2id-Hashes, httpOnly-Session-Cookies (`Secure` in
  Produktion), Brute-Force-Rate-Limit auf Login **und** Recovery,
  Passwort-Reset nur per Recovery-Code (kein Mail-Reset-Angriffsweg),
  Session-Widerruf bei Reset, periodischer Session-Aufräumjob,
  Request-Body-Limit 1 MiB (nginx deckelt zusätzlich bei 2 MB).

Was **du beim Aufsetzen** prüfen musst:

- [ ] **HTTPS erzwingen + HSTS** im Nginx Proxy Manager (s. o.) – ohne TLS sind
      Session-Cookies abgreifbar.
- [ ] **Firewall des Hosts:** nur 80/443 (NPM) und SSH offen; `WEB_PORT` (8080)
      idealerweise nur aus dem LAN/vom NPM erreichbar, nicht aus dem Internet.
- [ ] **SSH härten** (Key-Login statt Passwort, root-Login aus) und das System
      aktuell halten (`unattended-upgrades` im LXC/VPS).
- [ ] **Backups einrichten** (Cron oben) und **einmal die Wiederherstellung
      testen** – ein ungetestetes Backup ist keins.
- [ ] **Images aktuell halten:** regelmäßig `docker compose build --pull` +
      `up -d` (zieht node/nginx-Basis-Image-Updates nach).
- [ ] **Inhalte:** Repo bleibt privat; nur die paraphrasierten/KI-Inhalte
      ausliefern (ADR-007). Die `/info`-Seite (Datenschutz/Impressum) vor
      öffentlichem Betrieb als Betreiber finalisieren.
- [ ] **Recovery-Codes kommunizieren:** Es gibt bewusst keinen E-Mail-Reset –
      Nutzer müssen ihren Code notieren (die UI sagt das deutlich).

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

## Variante C — Frontend auf Vercel + Backend separat (Login/Sync)

Für Login & geräteübergreifenden Fortschritt **bei gleichzeitigem Vercel-Hosting** des
Frontends. **Wichtig:** Vercel ist serverless – das Backend mit lokaler **SQLite-Datei**
kann dort **nicht** laufen (kein persistentes Dateisystem). Das Backend läuft daher auf
einem **dauerhaften Host**; Vercel liefert nur das statische Frontend und **proxyt
`/api/*`** dorthin (same-origin → Cookies bleiben `SameSite=Lax`, kein CORS nötig).

```
Browser ── HTTPS ──▶ app.vercel.app ──(Rewrite /api/*)──▶ https://backend-host/api/*
            (Frontend, statisch)                          (Fastify + SQLite, persistent)
```

**1. Backend auf einem persistenten Host deployen** – zwei gängige Wege:
- **Managed (am einfachsten):** Railway / Render / Fly.io – `server/` als Node-Service
  deployen, **persistentes Volume** auf den DB-Pfad mounten, HTTPS gibt's automatisch.
- **Self-host:** den vorhandenen Stack auf Proxmox/VPS (Variante A/B); für Variante C
  genügt, dass das **Backend** unter einer eigenen HTTPS-(Sub-)Domain erreichbar ist
  (z. B. `api.deine-domain.de` via Nginx-Proxy-Manager-Host auf den Backend-Container).

**2. Backend-Env (Produktion):**
```bash
NODE_ENV=production            # → Cookie wird mit Secure gesetzt (Pflicht über HTTPS)
DB_PATH=/data/lernapp.sqlite   # auf ein PERSISTENTES Volume legen (sonst Datenverlust!)
PORT=3001                      # Railway/Render setzen PORT selbst – dann nicht überschreiben
# CORS_ORIGIN bewusst NICHT setzen – über den Vercel-Rewrite ist alles same-origin.
```

**3. Vercel-Rewrite eintragen:** in [`lernapp/vercel.json`](lernapp/vercel.json) ergänzen
(Backend-URL einsetzen):
```jsonc
"rewrites": [
  { "source": "/api/:path*", "destination": "https://DEIN-BACKEND-HOST.example.com/api/:path*" }
]
```
Danach in Vercel neu deployen. (Kein `VITE_API_URL` nötig – der Default `/api` greift dank
Rewrite.)

**4. Prüfen:** `https://app.vercel.app/api/health` muss `{"status":"ok"}` liefern; dann
in der App **Konto → Registrieren/Login**. Beim ersten Login wird der lokale Stand
nicht-destruktiv übernommen.

> **Alternative ohne Rewrite (Cross-Origin):** Statt des Rewrites `VITE_API_URL=https://backend-host/api`
> als Vercel-Env setzen. Dann braucht das Backend `CORS_ORIGIN=https://app.vercel.app`
> **und** der Cookie muss `SameSite=None; Secure` sein – fragiler (Third-Party-Cookie-Blocker).
> Der Rewrite-Weg oben ist robuster und empfohlen.

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
3. Für reines Seiten-Routing ist kein Rewrite nötig (die App nutzt **HashRouter**, `#/…`).
4. PWA (installierbar/offline) funktioniert über HTTPS automatisch.

> **Mit Login & Sync?** Das SQLite-Backend kann **nicht** auf Vercel selbst laufen
> (serverless, kein persistentes Dateisystem). Zwei Wege: **(empfohlen)** die ganze App
> auf den eigenen Host (Proxmox/VPS, [Variante A](#variante-a--proxmox-lxc)) – dann
> brauchst du Vercel gar nicht; **oder** Frontend auf Vercel lassen und `/api/*` per
> Rewrite an ein separat gehostetes Backend proxien → **siehe
> [Variante C](#variante-c--frontend-auf-vercel--backend-separat-loginsync)**.

Danach derselbe `dist/`-Build später auf dem **Proxmox-Server** (mit Backend via
Docker/Nginx) – siehe oben.
