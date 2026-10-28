# Go-Live-Checkliste – FiSi.dev öffentlich betreiben

Stand: 2026-10-20 · Ziel: `https://lernen.it-boss.eu` für dich und eingeladene Personen,
ohne dass App, Konten oder das Heimnetz angreifbar werden.

**Legende:** ✅ erledigt und belegt (Test/Prüfung) · ⏳ offen · 👤 musst du selbst
machen (GUI/Entscheidung) · 🔧 Code/Ticket. Befund-Nummern `S…` → `SECURITY.md`.

---

## 0. Kurzfassung – diese Punkte blockieren das Einladen anderer

| # | Muss vor dem Einladen erledigt sein | Status |
|---|---|---|
| 1 | Sicherheits-Update ausrollen (Admin-Code per CLI, Konto-Erkennung, Fastify/React-Router-Updates) | ⏳ 🔧 Ticket 8.1 |
| 2 | `security-check.sh` gegen die echte Domain: **0 Fehler** | ⏳ nach 8.1 |
| 3 | NPM-Admin-Oberfläche (Port 81), Proxmox (8006), SSH **nicht** aus dem Internet erreichbar | ⏳ 👤 prüfen |
| 4 | Sophos: Zone SERVER/DMZ darf **nicht** ins LAN (Seitwärtsbewegung) | ⏳ 👤 Ticket 7.4 |
| 5 | Monitoring: Kuma-Monitor auf `/api/health` mit Alarm | ⏳ 👤 |
| 6 | Wiederherstellung einmal geprobt | ⏳ 🔧 Ticket 8.3 |
| 7 | Datenschutzerklärung (+ ggf. Impressum) auf `/info` fertig | ⏳ 👤 |
| 8 | Klären, ob alle ausgelieferten Inhalte (Lernzettel!) veröffentlicht werden dürfen | ⏳ 👤 (entschärft durch C9: Inhalte nur noch für eingeladene, angemeldete Nutzer) |
| 9 | Login-Pflicht aktiv (`REQUIRE_LOGIN=true`, `REGISTRATION=invite`), `security-check.sh` meldet „examdata ohne Sitzung gesperrt (401)“ | ✅ im Code · ⏳ Rollout C9 |

Alles darunter ist entweder schon erledigt oder Härtung für danach.

---

## 1. Anwendung – die klassischen Angriffe (OWASP Top 10)

| Angriff | Wie die App geschützt ist | Beleg | Status |
|---|---|---|---|
| **SQL-Injection** | Jede Abfrage nutzt Platzhalter (`prepare('… WHERE email = ?')`), nie Text-Zusammenbau mit Eingaben. Einzige dynamische SQL-Stelle (`db.js`, Migration) nutzt feste Spaltennamen aus dem Code. | Code-Scan; Test „SQL-Sonderzeichen“ | ✅ |
| **XSS** (fremdes Skript einschleusen) | React escaped alle Ausgaben; kein `dangerouslySetInnerHTML`; Lernzettel über `react-markdown` **ohne** HTML-Durchreichung; CSP `script-src 'self'` blockt eingeschleuste Skripte zusätzlich. | Code-Scan; `security-check.sh` (CSP) | ✅ |
| **Zugriff auf fremde Daten** (IDOR) | Fortschritt, Gamification, Daten: immer `WHERE user_id = <eigene Sitzung>`; Gruppen-Rangliste nur für Mitglieder; Admin-Routen prüfen Rolle serverseitig. | Tests „Nutzer sehen den Fortschritt anderer nicht“, „Admin-API 401/403 je Route“ | ✅ |
| **Rechte erschleichen** | Admin-Rolle nur aus `ADMIN_EMAILS` (Server-Konfiguration), nie aus Requests. | Test „Admin-Rechte nicht per API“ | ✅ |
| **CSRF** (fremde Seite löst Aktion aus) | Cookie `SameSite=Lax` + `__Host-`-Präfix (kein Cookie-Tossing durch Geschwister-Subdomains); globaler Hook prüft `Sec-Fetch-Site`/`Origin`, Requests mit Body nur als JSON (415); Recovery-Code und Konto löschen verlangen das Passwort. Kein CORS für fremde Origins. | `server/test/kontoSchutz.test.js`; `security-check.sh` (CORS) | ✅ im Code · ⏳ Rollout (einmalige Neuanmeldung aller Nutzer) |
| **Clickjacking** | `X-Frame-Options: SAMEORIGIN` + CSP `frame-ancestors 'self'`. | `security-check.sh` | ✅ |
| **Konto-Erkennung** (welche E-Mails existieren?) | Gleiche Login-Antwort **und gleiche Rechenzeit** für unbekannte E-Mail/falsches Passwort; im `invite`-Modus wird der Code **vor** der Existenz geprüft. | Tests „Login verrät nicht …“, „Timing“, „Registrierung verrät nicht …“ | ✅ im Code · ⏳ Rollout 8.1 |
| **Bekannte Lücken in Bibliotheken** | `npm audit` in CI (jeder Push + wöchentlich), Stand 2026-10-20 im ausgelieferten Code **0 Treffer**. | CI-Job | ✅ im Code · ⏳ Rollout 8.1 |
| **Server-Fehlkonfiguration** | Keine Versions-Header, keine Verzeichnislisten, Geheimnis-Pfade (`/.env`, `/.git`, DB) nicht abrufbar, Body-Limit 1 MiB. | `security-check.sh` | ✅ |
| **SSRF / Datei-Upload** | Der Server ruft keine fremden URLs auf. PDF-Upload („Eigene Karten“) wird **nur im Browser** verarbeitet, nichts landet auf dem Server. | Architektur | ✅ |
| **Protokollierung** | Sicherheitsprotokoll (Tabelle `audit`): Logins, Fehlversuche, Bremse, Registrierung, Recovery, Löschung, Sperren, Einladungen; 90 Tage; nie Passwörter/Codes/Tokens/E-Mails; Ansicht im Admin-Bereich. | Tests „Audit-Einträge enthalten keine Geheimnisse“, „nur Admin darf lesen“ | ✅ im Code (C6) · ⏳ Rollout |

## 2. Login, Konten & Sitzungen

| Thema | Umsetzung | Status |
|---|---|---|
| Passwort-Speicherung | argon2id (aktueller Standard), nie Klartext, nie in Antworten | ✅ Test |
| Brute-Force | 8 Fehlversuche je IP+E-Mail / 15 min → 429; zusätzlich nginx 30/min auf `/api/auth` | ✅ Test |
| Registrierung | `REGISTRATION=invite` (seit C9 auch Compose-Default); Codes nur als Hash, einmalig/ablaufend; erster Admin-Code nur per Server-CLI | ✅ läuft · ⏳ CLI mit 8.1 |
| Spam bei Registrierung | nginx: eigenes Limit `POST /api/auth/register` (10 sofort, dann 1/min je IP); Backend: falsche Einladungscodes 8/15 min je IP → 429 | ✅ im Code (C9) · ⏳ Rollout |
| Login-Pflicht | `REQUIRE_LOGIN=true`: ohne Sitzung nur Konto-Seite; Lerninhalte (`/assets/examdata-*.js`) nur mit Sitzung (nginx `auth_request`), nicht im Precache, Cache-Löschung beim Logout | ✅ im Code (C9) · ⏳ Rollout + `security-check.sh` |
| Geteilte Geräte | Logout/Konto löschen leeren alle lokalen Lerndaten; fremde Daten werden nie ins eigene Konto gemergt | ✅ im Code (C1) · ⏳ Rollout |
| Passwort vergessen | Recovery-Code (~80 Bit, nur Hash gespeichert), widerruft alle Sitzungen; kein Mail-Reset-Angriffsweg | ✅ Test |
| Sitzungen | Zufalls-Token 256 Bit, `HttpOnly`/`Secure`/`SameSite=Lax`, 30 Tage, Logout + Sperre beenden sie serverseitig | ✅ Test |
| Sitzungen in der DB | Nur `sha256(token)` in der DB; wer ein Backup liest, kann keine Sitzung übernehmen. Beim ersten Start nach dem Update werden alte Sitzungen verworfen (einmal neu anmelden). | ✅ Test „DB-Inhalt enthält den Cookie-Wert nicht“ · ⏳ Rollout |
| Passwort-Mindestlänge | 8 Zeichen | ⏳ 🔧 Empfehlung: 10, plus Hinweis „Passphrase“ |
| Admin-Konto | normales Passwort | ⏳ 🔧 Phase 3: 2FA (TOTP) |
| Konto löschen (DSGVO) | Nutzer löscht selbst, alle Daten per CASCADE; Backups rotieren nach 14 Tagen bzw. 12 Monaten raus → in der Datenschutzerklärung nennen | ✅ / 👤 Text |

## 3. Transport & Reverse Proxy (NPM)

| Punkt | Status |
|---|---|
| Nur HTTPS, HTTP → 301, HSTS 2 Jahre, HTTP/2, Let's Encrypt | ✅ Ticket 7.2 |
| Zertifikat erneuert sich automatisch (NPM) – **Kuma warnt bei Ablauf** | ⏳ 👤 Kuma |
| „Block Common Exploits“ am Proxy-Host | ✅ |
| **NPM-Admin (Port 81) nur aus dem LAN** – prüfen: vom Handy im Mobilfunk `http://<deine-IP>:81` muss scheitern | ⏳ 👤 |
| NPM-Admin: starkes eigenes Passwort, Standard-Login (`admin@example.com`) entfernt | ⏳ 👤 |
| HSTS-Subdomains **aus** (sonst zwingt es `paperless` & Co. auf HTTPS) | ✅ |

## 4. Netzwerk & Firewall

| Punkt | Status |
|---|---|
| Nur 80/443 von außen → Sophos → NPM; keine weiteren Weiterleitungen | ✅ laut Ist-Aufnahme 7.1 · 👤 in der Fritzbox gegenprüfen |
| App-Port 8090 nur vom NPM erreichbar (Proxmox-Firewall) | ✅ Ticket 7.3 |
| **Segmentierung:** Zone SERVER (NPM, VM 106, Nextcloud …) darf **nicht** ins LAN 10.10.10.0/24 aufbauen; nur LAN → SERVER zur Verwaltung | ⏳ 👤 Ticket 7.4 |
| Sophos auf der WAN-Regel: GeoIP (DACH + Urlaubsländer), IPS-Policy, DoS-/Flood-Schutz | ⏳ 👤 Ticket 7.4 |
| Proxmox-GUI (8006) und SSH **nie** ins Internet; Fernzugriff nur per VPN | ⏳ 👤 prüfen (VPN laut 7.1 unbekannt) |
| Später: CrowdSec/fail2ban auf NPM-Logs | Phase 3 |

**Warum Segmentierung so wichtig ist:** Wird je ein öffentlich erreichbarer Dienst
(NPM, die App, Nextcloud) übernommen, entscheidet die Firewall zwischen SERVER und LAN,
ob der Angreifer bei einem Container bleibt oder an deine PCs, das NAS und Proxmox kommt.

## 5. Server (VM 106, Proxmox)

| Punkt | Status |
|---|---|
| Sicherheits-Updates automatisch (`unattended-upgrades`) | ⏳ 👤/🔧 prüfen |
| SSH nur mit Schlüssel, `PermitRootLogin no`, `PasswordAuthentication no` | ⏳ 👤/🔧 prüfen |
| Root-Dateisystem 90 % voll (`containerd.alt`) → volle Platte = Ausfall | ⏳ 🔧 Aufräum-Ticket |
| Proxmox selbst aktuell, 2FA für den Proxmox-Login | ⏳ 👤 |
| Auto-Deploy per `git pull` ohne Prüfung abgeschaltet | ✅ Ticket 6.3 |

## 6. Docker

| Punkt | Status |
|---|---|
| Backend als unprivilegierter `node`-User, `no-new-privileges`, Read-only-Root, Memory-Limits | ✅ |
| Backend ohne eigenen Port nach außen (nur über nginx im Web-Container) | ✅ |
| Kein `docker.sock` in Containern gemountet | ✅ |
| `.env` mit Rechten 600, nicht im Git | ✅ |
| Basis-Images monatlich aktualisieren: `docker compose build --pull && ./scripts/deploy.sh` | ⏳ Routine |

## 7. Daten & Backups

| Punkt | Status |
|---|---|
| Nächtliches konsistentes Backup (21:50) nach `/mnt/data`, vom 22:30-VM-Backup erfasst | ✅ Ticket 6.7 |
| **Restore einmal real geprobt** | ⏳ 🔧 Ticket 8.3 |
| Kopie außer Haus (3-2-1), verschlüsselt | ⏳ Phase 3 |
| Backups enthalten E-Mails + Passwort-Hashes → Rechte 600/700, nicht unverschlüsselt in die Cloud | ✅ lokal · ⏳ außer Haus |

## 8. Überwachung & Notfall

| Punkt | Status |
|---|---|
| Kuma: `https://lernen.it-boss.eu/api/health`, Keyword `ok`, Zertifikats-Warnung, Alarm aufs Handy | ⏳ 👤 |
| Wöchentlicher `security-check.sh` per Cron mit Log | ⏳ 🔧 |
| Backup-Log prüfen (`/var/log/fisidev-backup.log`, `"konten"` > 0) | ⏳ Routine |

**Notfallplan – Verdacht auf Einbruch:**
1. In NPM den Proxy-Host `lernen.it-boss.eu` **deaktivieren** (App offline, Rest läuft).
2. **Snapshot** von VM 106 in Proxmox (Beweise sichern, nichts löschen).
3. Logs sichern: `docker compose logs > /root/vorfall-<datum>.log`.
4. Alle Sitzungen beenden (Konten im Admin-Bereich sperren/entsperren oder Tabelle `sessions` leeren).
5. Ursache suchen; ggf. aus einem Backup **vor** dem Vorfall wiederherstellen (`restore.sh`).
6. Betroffene informieren (DSGVO: bei Risiko für Personen innerhalb von 72 h an die Aufsichtsbehörde).

## 9. Recht & Inhalte

| Punkt | Status |
|---|---|
| **Datenschutzerklärung** (`/info` ist nur Vorlage): wer betreibt, welche Daten (E-Mail, Lernstand, IP in Logs), Zweck, Speicherdauer inkl. Backups, Rechte (Auskunft, Löschung), Kontakt | ⏳ 👤 vor dem Einladen |
| **Impressum:** bei rein privater Nutzung im Freundes-/Klassenkreis meist nicht nötig, sobald es öffentlich beworben oder „geschäftsmäßig“ wird, Pflicht (DDG § 5) | ⏳ 👤 entscheiden |
| **Urheberrecht Prüfungen:** AP1-Prüfungen paraphrasiert, AP2-Sets KI-generiert, gekennzeichnet (ADR-007) | ✅ |
| **Urheberrecht Lernzettel:** 111 AP1-Lernzettel stammen laut Quellfeld von einer **fremden Person** (Reddit „u/DeFyuseOW“, 2025) und sind wörtlich importiert; bei den 167 AP2-Lernzetteln ist die Herkunft nicht dokumentiert → Details und Optionen in `docs/INHALTE_PLAN.md` Abschnitt 2. Klären, ob du sie veröffentlichen darfst (Autor/in fragen, Lizenz prüfen, sonst neu formulieren). Seit C9 nur noch für angemeldete, eingeladene Nutzer abrufbar (kein öffentlicher Download mehr) – die Rechtsfrage bleibt trotzdem | ⏳ 👤 |
| Git-Repo bleibt **privat** (enthält in der Historie wörtliche Originale) | ✅ 👤 so lassen |

## 10. Reihenfolge bis zum Einladen

1. PR mit den Sicherheits-Fixes mergen → **Ticket 8.1** (Backup, Update, Deploy, `security-check.sh` = 0 Fehler).
2. 👤 Kuma-Monitor anlegen · NPM-Admin/Proxmox/SSH von außen prüfen (Abschnitt 3/4).
3. 👤 **Ticket 7.4** Sophos: Segmentierung SERVER ↛ LAN, GeoIP, IPS.
4. 🔧 **Ticket 8.2** VM-Härtung lesen/prüfen: unattended-upgrades, SSH-Konfiguration, Speicherplatz.
5. 🔧 **Ticket 8.3** Restore-Probe.
6. 👤 Datenschutzerklärung/Impressum, Lernzettel-Rechte klären.
7. Erste Einladungen verschicken. Danach Routine aus `SECURITY.md` Abschnitt 5.
