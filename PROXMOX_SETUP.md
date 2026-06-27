# Proxmox-LXC: Schritt-für-Schritt (AP-Lernapp mit Docker)

Konkrete Anleitung, um den Docker-Stack (`docker-compose.yml`: Backend + Caddy)
in einem unprivilegierten Debian/Ubuntu-LXC auf Proxmox zu betreiben. Allgemeiner
Überblick & VPS-Variante: siehe [`DEPLOYMENT.md`](DEPLOYMENT.md).

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
| Laufzeit-RAM (Backend-Node + Caddy) | grob ~150–300 MB |
| Docker-Images (node:24-alpine + caddy:2-alpine + Layer) | ~1–1,5 GB Disk |

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

# .env anlegen
cp .env.example .env
# Für lokalen Test im LAN reicht der Default (SITE_ADDRESS=:80).
# Für HTTPS mit eigener Domain in .env setzen:
#   SITE_ADDRESS=lernapp.deinedomain.de

docker compose up -d --build
```

Erreichbar: `http://<LXC-IP>` (bzw. `https://lernapp.deinedomain.de`, sobald die
Domain zeigt und Port 80/443 erreichbar sind – Caddy holt das Zertifikat dann
automatisch).

**Worauf beim ersten Build achten:**
- Genug RAM/Swap (s. o.), sonst kann `npm ci`/Vite mit OOM abbrechen.
- `node:24-alpine` enthält das eingebaute `node:sqlite` – keine native Kompilierung,
  daher keine `build-essential`/`python3`-Pakete nötig.
- Erststart dauert ein paar Minuten (Image-Pull + Frontend-Build).

## 5. Von außen erreichbar machen (ohne feste öffentliche IP)

Typische Heimanschlüsse haben eine wechselnde IP und liegen evtl. hinter
CGNAT. Allgemeines Vorgehen (Router-unabhängig):

1. **DynDNS einrichten:** Dienst wählen (z. B. DuckDNS, deSEC, No-IP oder der in
   vielen Routern – Fritz!Box etc. – integrierte DynDNS-Client). Er hält einen
   Hostnamen (`deinname.duckdns.org`) auf deine wechselnde IP aktuell.
2. **Port-Forwarding** im Router: TCP **80** und **443** auf die LXC-IP weiterleiten.
   (Port 80 wird für die Let's-Encrypt-HTTP-Challenge gebraucht.)
3. In `.env` `SITE_ADDRESS=deinname.duckdns.org` setzen, Stack neu starten:
   `docker compose up -d`.
4. **CGNAT-Fallstrick:** Hat dein Anschluss keine echte öffentliche IPv4 (häufig bei
   Kabel/Glasfaser-Tarifen ohne feste IP), funktioniert Port-Forwarding nicht. Dann:
   echte IPv4 beim Provider anfragen **oder** einen Tunnel nutzen (z. B. Cloudflare
   Tunnel / Tailscale Funnel) – das umgeht Port-Forwarding ganz. Das ist dann ein
   eigener kleiner Zusatzschritt; sag Bescheid, wenn du diesen Weg gehen willst.

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
# .backup nutzt SQLite-konsistentes Online-Backup (kein Kopieren bei offener DB)
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

Alternativ ganz simpel (ohne konsistenten Snapshot, reicht bei geringer Last):

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
