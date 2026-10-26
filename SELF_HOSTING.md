# Self-Hosting auf dem Home-Server – Leitfaden

Stand: 2026-10-20. Ziel: FiSi.dev **sicher, flott und ohne Datenverlust** selbst
betreiben – für eine kleine Gruppe (Klasse, Betrieb, Freunde), nicht für Tausende.
Technische Details zu Compose/Proxmox stehen in [`DEPLOYMENT.md`](DEPLOYMENT.md)
und [`PROXMOX_SETUP.md`](PROXMOX_SETUP.md); dieses Dokument ist der rote Faden.

> **In der Sandbox verifiziert (2026-10-20):** Docker-Images gebaut, Stack gestartet
> (beide Container `healthy`), Registrierung/Login/Fortschritt, Security-Header,
> Rate-Limits, gzip, **Backup → Daten ändern → Restore → Login** und Neustart-Persistenz.
> Messwerte unten stammen aus diesem Lauf.

---

## 1. Empfehlung auf einen Blick

```
Internet ──► Router/Firewall (Sophos/OPNsense) ──► NPM (TLS, HSTS) ──► fisidev-web (nginx) ──► fisidev-backend (Node + SQLite)
             nur 443 offen, GeoIP, IPS,             DMZ-VLAN              Rate-Limits, Header,      kein offener Port,
             DoS-Schutz                                                    gzip, Caching             Volume db_data
```

- **Eine kleine Debian-VM** auf Proxmox mit Docker – reicht dicke (s. 2).
- **Nur Port 443** von außen, und der landet beim Nginx Proxy Manager (NPM), nie direkt bei der App.
- **Server in eigenem VLAN/DMZ**, kein Zugriff von dort ins Heimnetz.
- **Nächtliches Backup** per `scripts/backup.sh` + Proxmox-VM-Backup + eine Kopie außer Haus.
- **Einmal im Monat Restore testen** (`scripts/restore.sh` in einer Test-VM).
- Wenn nur ihr selbst die App nutzt: **gar nicht öffentlich**, sondern per VPN (Variante A) – das ist die sicherste Lösung.

---

## 2. Voraussetzungen

### Hardware / VM (gemessen)

| Was | Messwert | Empfehlung VM |
|---|---|---|
| RAM Backend (Node) im Betrieb | **43–63 MB** | |
| RAM Web (nginx) im Betrieb | **~6 MB** | |
| Docker-Images | **~385 MB** (Backend 289 MB, Web 107 MB) | |
| Datenbank | **~70 KB** bei einer Handvoll Konten; wenige KB pro Nutzer | |
| Durchsatz statische Seite | **~10.000 Anfragen/s**, Median 6 ms (50 parallele Verbindungen) | |
| **VM** | | **1 vCPU, 1 GB RAM** (Build-Spitze), 10 GB Disk, Debian 12/13 |

Für 20–50 Lernende ist das großzügig. Der Engpass ist eher der **Upload deines
Internetanschlusses** als der Server: Ein Erstbesuch lädt ~1,4 MiB (komprimiert
deutlich weniger), danach kommt fast alles aus dem Browser-Cache (PWA).

### Software & Konten

- Proxmox (oder ein anderer Host) mit einer Debian-VM, darin **Docker + Compose v2**.
- **Nginx Proxy Manager** (vorhanden) für TLS-Zertifikate (Let's Encrypt).
- Eine **Domain** oder DynDNS-Namen (z. B. `lernen.deine-domain.de`), dessen A/AAAA-Record auf deinen Anschluss zeigt.
- Firewall/Router mit Portweiterleitung (Sophos Firewall Home Edition, OPNsense o. Ä.).
- Ein **zweiter Speicherort** für Backups (NAS, USB-Platte, Proxmox Backup Server) und idealerweise einer außer Haus.

---

## 3. Wie soll man drankommen? (Zugriffsvariante wählen)

| Variante | Für wen | Sicherheit | Aufwand |
|---|---|---|---|
| **A – nur per VPN** (WireGuard auf der Firewall, Tailscale/Headscale) | du + wenige feste Leute | **sehr hoch** – App ist im Internet unsichtbar, DDoS praktisch kein Thema | gering |
| **B – öffentlich über Firewall + NPM** (empfohlen für Klasse/Betrieb) | Gruppe ohne VPN-Einrichtung | hoch, wenn Abschnitt 4 umgesetzt ist | mittel |
| **C – B + vorgeschalteter CDN/Proxy** (z. B. Cloudflare-Proxy oder -Tunnel) | wenn echte DDoS-Angst besteht | höchste Robustheit gegen Überlastung | gering, aber Dritter sieht den Verkehr |

**Variante B** ist der gute Mittelweg. Mit `REGISTRATION=invite` kommen trotzdem nur
eingeladene Personen an ein Konto (s. `DEPLOYMENT.md` → „Konten & Admin“).

---

## 4. Netzwerk & Firewall (Variante B)

### 4.1 Segmentierung

1. **Eigenes VLAN/DMZ** für die Docker-VM (und NPM, falls er auf einer eigenen VM läuft).
2. Regeln: **DMZ → Heimnetz verboten**, DMZ → Internet nur, was nötig ist (DNS, NTP,
   HTTP/HTTPS für Updates). Heimnetz → DMZ darf administrieren (SSH, Proxmox).
3. In der VM selbst Port `8080` nur für die NPM-IP erlauben (`BIND_ADDRESS` in `.env`
   oder `ufw allow from <NPM-IP> to any port 8080`).

### 4.2 Portfreigabe

- **Nur TCP 443** (und 80 für die Let's-Encrypt-HTTP-Challenge bzw. die Umleitung auf HTTPS) → NPM.
- **Kein** Port 8080, 3001 oder SSH ins Internet. Fernwartung nur per VPN.

### 4.3 Was die Software-Firewall beitragen kann

**Sophos Firewall (SFOS / Home Edition):**

| Funktion | Einstellung | Nutzen |
|---|---|---|
| **DNAT-Regel** | WAN:443 → NPM:443, Quelle „Any“ bzw. per GeoIP eingeschränkt | nur ein Eingang |
| **GeoIP-Filter** | Firewall-Regel vor der DNAT: nur DE/AT/CH (o. Ä.) zulassen | sperrt den Großteil automatisierter Scans/Bots |
| **IPS** | Policy „generalpolicy“/„WAN to DMZ“ auf die Regel | erkennt Exploit-Versuche gegen nginx/Node |
| **DoS- & Spoof-Schutz** | *Intrusion Prevention → DoS & spoof protection*: SYN/UDP/ICMP-Flood-Limits aktivieren | dämpft kleine Flut-Angriffe auf Paketebene |
| **Web Server Protection (WAF)** | optional statt NPM: Sophos als Reverse-Proxy mit Let's Encrypt + Schutzprofil | OWASP-Filter vor der App; dann NPM für diese Seite weglassen |
| **ATP / Logging** | aktiv lassen, Alarme per Mail | du merkst, wenn jemand klopft |

**OPNsense** entsprechend: Portweiterleitung + Regel mit **GeoIP-Alias**, **Suricata**
(IPS-Modus) auf WAN, optional **CrowdSec**-Plugin (teilt Angreifer-IPs, blockt automatisch).

### 4.4 Nginx Proxy Manager

Für den Proxy-Host:

- **Force SSL**, **HTTP/2**, **HSTS** (inkl. Subdomains, wenn passend) aktivieren.
- **Block Common Exploits** aktivieren.
- Ziel: `http://<Docker-VM-IP>:8080`, **Websockets nicht nötig**.
- NPM setzt `X-Forwarded-For`; die App wertet das aus (echte Client-IP für die Rate-Limits).

---

## 5. DDoS & Überlastung – ehrlich eingeordnet

Ein **großer volumetrischer DDoS** (Gigabit-Fluten) legt *jeden* Heimanschluss lahm,
bevor die Pakete deine Firewall erreichen – dagegen hilft nur ein vorgeschalteter
Anbieter (Variante C) oder Unsichtbarkeit per VPN (Variante A). Für eine kleine
Lern-App ist das aber auch kein realistisches Ziel. Realistisch sind **Bots, Scanner,
Login-Durchprobieren und versehentliche Lastspitzen** – und die fängt der Stack in
mehreren Schichten ab:

| Schicht | Schutz | Wo konfiguriert |
|---|---|---|
| Firewall | GeoIP, IPS, SYN-/Flood-Limits, nur 443 offen | Sophos/OPNsense |
| NPM | TLS, Block Common Exploits | NPM-Oberfläche |
| **App-nginx** (neu) | **20 Anfragen/s je IP** auf `/api` (Spitzen bis 80), **30/min** auf `/api/auth/*`, max. **60 Verbindungen je IP**, Abbruch langsamer Clients nach 10 s (Slowloris), Body-Limit 2 MB | `lernapp/nginx.conf` |
| Backend | Login/Recovery: **8 Fehlversuche je IP+E-Mail / 15 min**, Gruppen-Codes gleich gebremst, Body-Limit 1 MiB | `server/src/lib/rateLimit.js` |
| Konten | `REGISTRATION=invite` – keine Spam-Registrierungen | `.env` |

Die Limits sind so gewählt, dass **eine ganze Klasse hinter einer gemeinsamen
Schul-IP** normal arbeiten kann. Im Test: 9. falscher Login → HTTP 429; 80 parallele
API-Anfragen einer IP → ~40 durch, Rest 429; normale Nutzung bleibt weit darunter.

---

## 6. Performance

- **Statische Dateien** liefert nginx direkt aus (gemessen ~10k Anfragen/s); gehashte
  Assets werden **1 Jahr gecacht**, `index.html`/Service-Worker nie → Updates kommen sofort an.
- **gzip** für JS/CSS/JSON (neu) – der größte Daten-Chunk schrumpft auf ~190 KB.
- **PWA/Offline:** Nach dem ersten Besuch läuft die App aus dem Browser-Cache; Lernen
  geht sogar ohne Verbindung, Fortschritt wird nachsynchronisiert (Offline-Outbox).
- **Bundle** seit 2026-10-20 um 64 % kleiner (vendor 427 KB statt 1,18 MB).
- **SQLite im WAL-Modus**: Lesen und Schreiben blockieren sich nicht; für Dutzende
  gleichzeitige Nutzer mehr als ausreichend.
- **HTTP/2 im NPM** aktivieren (parallele Downloads über eine Verbindung).
- Wenn es „hakt“, zuerst den **Upload des Anschlusses** prüfen, nicht die VM.

---

## 7. Wo liegen die Nutzerdaten?

| Daten | Ort | Gesichert durch |
|---|---|---|
| Konten (E-Mail, argon2-Passwort-Hash, Recovery-Code-Hash, Anzeigename) | SQLite `/app/data/lernapp.sqlite` im Docker-Volume `fisidev_db_data` | `scripts/backup.sh` |
| Lernstand (FSRS je Frage), XP/Streak, Lernplan, eigene Karten, Gruppen, Einladungen | dieselbe Datenbank | `scripts/backup.sh` |
| Konfiguration (`ADMIN_EMAILS`, `REGISTRATION`, Ports) | `.env` neben `docker-compose.yml` | **selbst sichern** (z. B. ins Passwort-Manager-Notiz oder mit ins Backup-Verzeichnis kopieren) |
| Daten von Nutzern **ohne Konto** | nur in deren Browser | Backup-Export auf der Konto-Seite (JSON) |

**Damit Anmeldungen nie „verschwinden“:**

- ⚠️ **Nie `docker compose down -v`** – das `-v` löscht das Volume mit allen Konten.
  Normales `down`/`up`/Rebuild lässt die Daten unangetastet (getestet).
- `SESSION_COOKIE_NAME` nicht ändern (sonst sind alle abgemeldet – Daten bleiben aber).
- E-Mails werden klein geschrieben gespeichert; Login ist unabhängig von Groß/Klein.
- **Passwort vergessen** → Recovery-Code (wird bei der Registrierung angezeigt). Ohne
  Code kann ein Admin das Konto aktuell nur löschen/sperren, nicht zurücksetzen
  (Admin-Reset steht im Fahrplan).

---

## 8. Backups (3-2-1-Regel)

**3 Kopien, 2 verschiedene Medien, 1 außer Haus.**

### 8.1 Datenbank-Backup (Pflicht)

```bash
# einmalig: Verzeichnis anlegen
sudo mkdir -p /var/backups/fisidev && sudo chmod 700 /var/backups/fisidev

# manuell
./scripts/backup.sh

# Cron (root): täglich 03:15, Exit-Code ≠ 0 bei Fehler
15 3 * * * cd /opt/fisidev && BACKUP_DIR=/var/backups/fisidev ./scripts/backup.sh >> /var/log/fisidev-backup.log 2>&1
```

Was das Skript tut:

1. **Online-Schnappschuss** im laufenden Backend (`VACUUM INTO`) – konsistent, auch im
   WAL-Modus. (Das frühere Kopieren der .sqlite-Datei konnte unvollständig sein.)
2. **Integritätsprüfung** (`PRAGMA integrity_check`) + Ausgabe „Konten / Einträge“.
3. Kopie auf den Host, **gzip**, Rechte `600`.
4. **Rotation:** 14 Tages-Backups, am Monatsersten ein Monats-Backup (12 Monate).

### 8.2 VM-Backup (zweite Ebene)

Proxmox: Datacenter → Backup → Job für die Docker-VM, täglich, Modus **Snapshot**,
Ziel **Proxmox Backup Server** oder NAS. Damit ist auch `.env`, NPM-Konfiguration usw. gesichert.

### 8.3 Außer Haus (dritte Ebene)

- `/var/backups/fisidev` verschlüsselt mit **restic** oder **rclone crypt** auf einen
  Cloud-Speicher oder zu einem Freund/Familienmitglied synchronisieren, z. B. nächtlich nach dem Backup.
- Oder PBS-Sync-Job auf einen zweiten PBS außer Haus.
- Verschlüsseln ist Pflicht: Die DB enthält E-Mail-Adressen (personenbezogen).

---

## 9. Wiederherstellen

```bash
./scripts/restore.sh /var/backups/fisidev/taeglich/lernapp-2026-10-20_031500.sqlite.gz
```

Ablauf (in der Sandbox getestet): Backup prüfen → Rückfrage „ja“ → **aktuellen Stand
vorher sichern** → Backend stoppen → Datei einspielen (alte WAL-Reste entfernen) →
Backend starten → warten bis `healthy` → Smoke-Test. Downtime: wenige Sekunden.

**Restore-Probe monatlich** (ein ungetestetes Backup ist keins):

1. Proxmox: VM klonen oder Test-VM mit gleichem Repo.
2. `./scripts/restore.sh <letztes Backup>` ausführen.
3. Mit einem Testkonto einloggen, Lernstand ansehen.
4. Ergebnis kurz notieren (Datum, Backup-Datei, ok).

**Notfälle:**

| Situation | Vorgehen |
|---|---|
| Versehentlich Konto/Daten gelöscht | `restore.sh` mit Backup von vor dem Fehler (Achtung: spätere Änderungen anderer gehen verloren → ggf. nachts) |
| VM kaputt | VM aus Proxmox-Backup zurückspielen; oder neue VM + Repo + `.env` + `restore.sh` |
| Datenbank beschädigt | Backend-Log prüfen, letztes Backup mit `integrity_check` (macht `restore.sh` automatisch) einspielen |
| Nutzer kommt nicht mehr rein | Recovery-Code nutzen lassen; Konto gesperrt? → Admin-Bereich entsperren |

---

## 10. Betrieb & Updates

- **Monitoring:** Uptime Kuma (o. Ä.) prüft `https://<domain>/api/health` jede Minute
  und alarmiert per Mail/Push. Zusätzlich das Backup-Log prüfen lassen (Datei-Alter < 26 h).
- **Updates App:** `./scripts/update.sh` (prüft, Backup, ff-only-Pull, Deploy, **automatischer
  Rückweg** bei Fehler, danach optional `security-check.sh`). `./scripts/update.sh --pruefen`
  zeigt nur, ob etwas Neues vorliegt. Konfiguration über Umgebungsvariablen
  (`UPDATE_SPERRFENSTER=21:45-22:45`, `SECURITY_CHECK_URL`, `BACKUP_DIR`, s. Kopf des Skripts).
  Manuell geht weiterhin `git pull && ./scripts/deploy.sh` (vorher `./scripts/backup.sh`).
  **Kein automatisches Deployen von `main` per Cron** ohne Rückfrage: Wer `main` ändern kann,
  könnte sonst Code auf deinem Server ausführen. Sinnvoll ist ein Cron, der nur `--pruefen`
  aufruft und dich benachrichtigt, oder ein bewusst gestartetes `update.sh`.
- **Basis-Images:** monatlich `docker compose build --pull && docker compose up -d`.
- **VM:** `unattended-upgrades` aktivieren, SSH nur mit Schlüssel, kein Root-Login.
- **Logs:** Compose begrenzt auf 3 × 10 MB je Container.

---

## 11. Checkliste Inbetriebnahme

- [ ] Debian-VM (1 vCPU, 1 GB RAM, 10 GB) in eigenem VLAN, Docker installiert
- [ ] Repo nach `/opt/fisidev`, `.env` aus `.env.example`: `ADMIN_EMAILS`, `REGISTRATION=open`
- [ ] `./scripts/deploy.sh` → beide Container `healthy`
- [ ] NPM-Proxy-Host mit Let's Encrypt, Force SSL, HTTP/2, HSTS, Block Common Exploits
- [ ] Firewall: nur 443 (+80) → NPM, GeoIP, IPS, DoS-Schutz; DMZ → LAN gesperrt
- [ ] `REGISTRATION=invite` + `ADMIN_EMAILS` setzen → `docker compose exec backend node src/einladung-cli.js` → eigenes Admin-Konto mit diesem Code anlegen
- [ ] `./scripts/security-check.sh https://<domain> --direkt <VM-IP>:<WEB_PORT>` → 0 Fehler
- [ ] Backup-Cron + Proxmox-Backup + Außer-Haus-Kopie eingerichtet
- [ ] **Restore einmal getestet**
- [ ] Uptime-Monitoring auf `/api/health`
- [ ] `/info` (Datenschutz/Impressum-Vorlage) mit eigenen Angaben ergänzt
