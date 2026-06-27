# Proxmox-LXC: Schritt-für-Schritt (AP-Lernapp mit Docker)

Konkrete Anleitung, um den Docker-Stack (`docker-compose.yml`: Backend + Nginx)
in einem unprivilegierten Debian/Ubuntu-LXC auf Proxmox zu betreiben.
SSL/HTTPS übernimmt der vorgelagerte **Nginx Proxy Manager (NPM)**.
Allgemeiner Überblick: siehe [`DEPLOYMENT.md`](DEPLOYMENT.md).

> **Status Container-Build:** Die Images wurden bisher **nicht** mit Docker gebaut
> (in der Entwicklungsumgebung war kein Docker verfügbar). Verifiziert sind:
> Frontend-Build (`npm run build`), Backend-Start, API end-to-end, 47 + 9 Tests.
> Der erste `docker compose build` findet also auf dem Proxmox-Host statt – unten
> steht, worauf zu achten ist.

## 1. Ressourcen-Empfehlung

Die App ist sehr klein (gemessen):

| Komponente | Größe |
|---|---|
| Frontend-Build `dist/` | **~0,9 MB** (JS gzip ~264 kB) |
| SQLite-DB | **~4 KB** leer, wächst nur ~einige KB pro Nutzer |
| Laufzeit-RAM (Backend-Node + Nginx) | grob ~100–200 MB |
| Docker-Images (node:24-alpine + nginx:alpine + Layer) | ~700 MB Disk |

**Empfohlener LXC:**

| Ressource | Wert | Begründung |
|---|---|---|
| vCPU | **2** | flüssiger `docker compose build` (1 reicht, ist nur langsamer) |
| RAM | **1 GB** (1024 MB) | Laufzeit braucht wenig; der **Build** (npm ci + Vite) ist der Peak. 512 MB kann beim Build knapp werden |
| Disk | **10 GB** | Images + Build-Cache + DB + Puffer |
| Swap | 512 MB | Sicherheitsnetz beim Build |

Für reinen Betrieb (Image fertig gebaut) genügen auch 512 MB RAM.

## 2. LXC anlegen (mit Nesting für Docker)

Docker im **unprivilegierten** LXC braucht das Feature **nesting**.

Im Proxmox-Webinterface: *Create CT* → Debian 12 oder Ubuntu 22.04/24.04 Template,
Ressourcen wie oben. Nach dem Anlegen unter *Options → Features* **Nesting** und
**keyctl** aktivieren.

Oder auf der Proxmox-Shell (CT-ID `120` als Beispiel anpassen):

```bash
# Nach dem Anlegen Features setzen
pct set 120 --features nesting=1,keyctl=1
pct reboot 120
```

> Falls Docker im LXC zickt (selten, je nach Storage/Kernel): alternativ eine
> kleine **KVM-VM** statt LXC nutzen – dasselbe `docker compose` läuft dort ohne
> Nesting-Sonderfälle.

## 3. Docker im LXC installieren

In der LXC-Konsole (`pct enter 120` oder via SSH):

```bash
apt update && apt install -y ca-certificates curl git
# Offizielles Docker-Setup
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

## 4. Projekt holen und starten

```bash
git clone https://github.com/bossluca/AP2.git
cd AP2

# .env anlegen (Standard-Port 8080 reicht)
cp .env.example .env

docker compose up -d --build
```

Erreichbar intern: `http://<LXC-IP>:8080`

**Worauf beim ersten Build achten:**
- Genug RAM/Swap (s. o.), sonst kann `npm ci`/Vite mit OOM abbrechen.
- `node:24-alpine` enthält das eingebaute `node:sqlite` – keine native Kompilierung,
  daher keine `build-essential`/`python3`-Pakete nötig.
- Erststart dauert ein paar Minuten (Image-Pull + Frontend-Build).

## 5. Nginx Proxy Manager einrichten

Der Stack läuft auf Port `8080` des LXC-Containers. NPM übernimmt SSL und
leitet den Traffic weiter. **Wichtig:** NPM muss die LXC-IP erreichen können
(gleicher Proxmox-Host oder Netzwerk-Erreichbarkeit).

### Proxy Host anlegen

Im NPM-Webinterface unter *Proxy Hosts → Add Proxy Host*:

| Feld | Wert |
|---|---|
| Domain Names | `lernapp.deinedomain.de` |
| Scheme | `http` |
| Forward Hostname / IP | `<LXC-IP>` (z. B. `192.168.1.120`) |
| Forward Port | `8080` |
| Cache Assets | ✓ (optional, empfohlen) |
| Block Common Exploits | ✓ |

Unter *SSL*-Tab:
- SSL Certificate: *Request a new SSL Certificate*
- Force SSL: ✓
- HTTP/2 Support: ✓
- Email für Let's Encrypt eintragen → *Save*

NPM holt das Zertifikat automatisch und erneuert es selbstständig.

### Voraussetzungen für Let's Encrypt

- Port **80** und **443** deines Routers müssen auf den NPM-Host weitergeleitet sein.
- Die Domain muss per DNS auf deine öffentliche IP zeigen.
- Bei wechselnder IP: DynDNS einrichten (z. B. DuckDNS, deSEC, Fritz!Box-eigener
  DynDNS-Client).

### CGNAT-Fallstrick

Hat dein Anschluss keine echte öffentliche IPv4 (häufig bei Kabel/Glasfaser-
Tarifen), funktioniert Port-Forwarding nicht. Optionen:
- Echte IPv4 beim Provider anfragen
- **Cloudflare Tunnel** nutzen – kein Port-Forwarding nötig, funktioniert auch
  hinter CGNAT. Sag Bescheid, wenn du diesen Weg gehen willst.

### Custom Nginx-Konfiguration in NPM (optional)

Für besseres Session-Handling im Backend unter *Advanced*:

```nginx
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header Host $host;
```

## 6. Backup der SQLite-Datenbank

Die DB liegt im Docker-Volume `db_data` (im Container `/app/data/lernapp.sqlite`).
Einfaches, robustes Backup per Cron auf dem LXC-Host:

```bash
mkdir -p /root/ap-backups

# Backup-Skript
cat > /root/ap-backup.sh <<'EOF'
#!/bin/bash
cd /root/AP2
TS=$(date +%Y%m%d-%H%M%S)
# VACUUM INTO = SQLite-konsistentes Online-Backup (kein Kopieren bei offener DB)
docker compose exec -T backend node -e "const {DatabaseSync}=require('node:sqlite'); new DatabaseSync('/app/data/lernapp.sqlite').exec(\"VACUUM INTO '/app/data/backup-$TS.sqlite'\")"
docker compose cp backend:/app/data/backup-$TS.sqlite /root/ap-backups/lernapp-$TS.sqlite
docker compose exec -T backend rm -f /app/data/backup-$TS.sqlite
# Nur die letzten 14 Backups behalten
ls -1t /root/ap-backups/lernapp-*.sqlite | tail -n +15 | xargs -r rm -f
EOF
chmod +x /root/ap-backup.sh

# Täglich um 3 Uhr
( crontab -l 2>/dev/null; echo "0 3 * * * /root/ap-backup.sh" ) | crontab -
```

Alternativ simpel (ohne konsistenten Snapshot, reicht bei geringer Last):

```bash
docker compose cp backend:/app/data/lernapp.sqlite /root/ap-backups/lernapp-$(date +%F).sqlite
```

**Restore:** Stack stoppen, Datei zurückkopieren, starten:

```bash
docker compose stop backend
docker compose cp /root/ap-backups/lernapp-JJJJ-MM-TT.sqlite backend:/app/data/lernapp.sqlite
docker compose start backend
```

## 7. Update auf neue Version

```bash
cd /root/AP2
git pull
docker compose up -d --build
```
