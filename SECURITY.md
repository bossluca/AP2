# Sicherheit – Checks & Plan (FiSi.dev)

Stand: 2026-10-20 · Go-Live-Checkliste: `GO_LIVE_CHECKLISTE.md` · Instanz: `https://lernen.it-boss.eu` (Home-Server, VM 106 hinter
Sophos → Nginx Proxy Manager). Dieses Dokument sagt, **was geschützt wird**, **wie es
automatisch geprüft wird**, **was offen ist** und **in welcher Reihenfolge** es
abgearbeitet wird.

---

## 1. Was schützen wir – und wovor?

| Schutzgut | Wert | Realistische Bedrohung |
|---|---|---|
| **Heimnetz** (Proxmox, Nextcloud, Paperless …) | **hoch** | Die App als Einstieg ins Netz (Lücke in nginx/Node/Abhängigkeit → Seitwärtsbewegung) |
| Konten (E-Mail, Passwort-Hash, Recovery-Hash) | mittel | Login-Durchprobieren, Datenbank-/Backup-Leak, Session-Diebstahl |
| Admin-Rechte | mittel | Konto-Übernahme → fremde Konten sperren/löschen, Einladungen erzeugen |
| Lernstände, XP, Gruppen | niedrig | Verlust (Backup), Manipulation |
| Verfügbarkeit | niedrig | Bots, Scanner, Lastspitzen; großer DDoS trifft den Anschluss, nicht nur die App |

**Leitlinie:** Die App ist bewusst klein. Das größte Risiko ist nicht der Lernstand,
sondern dass ein öffentlich erreichbarer Dienst zur Tür ins Heimnetz wird. Deshalb
zählen Segmentierung und aktuelle Abhängigkeiten mehr als jede App-Funktion.

---

## 2. Automatische Checks

### 2.1 Backend-Invarianten – `server/test/security.test.js` (bei jedem `npm test` / CI)

| Regel | geprüft durch |
|---|---|
| Session-Cookie `HttpOnly`, `SameSite=Lax`, `Secure` im Produktivbetrieb | Cookie-Attribute nach Registrierung |
| Passwörter nur als argon2id-Hash | DB-Inhalt |
| Keine Hashes/Tokens in API-Antworten (`register`, `login`, `me`, Admin-Übersicht) | Antworttexte |
| Login verrät nicht, ob ein Konto existiert | gleiche Antwort **und Rechenzeit** für „falsches Passwort“ und „unbekannte E-Mail“; Registrierung ohne Code verrät keine E-Mails |
| Jede Admin-Route: anonym 401, Nicht-Admin 403 | alle 5 Routen |
| Admin-Rechte nicht per Request erschleichbar | `admin:true` im Body wird ignoriert |
| `invite`-Modus: **ohne gültigen Code kein Konto – auch nicht mit Admin-E-Mail** | inkl. Objekt-Injection im Code-Feld |
| Logout macht die Sitzung serverseitig ungültig | altes Cookie → 401 |
| Gefälschte Tokens / SQL-Sonderzeichen | 401 bzw. Tabelle bleibt intakt |

Dazu kommen bestehende Tests: Login-/Recovery-Rate-Limit (429 + `Retry-After`),
Body-Limit (413), Sperren beendet Sitzungen, Nutzer sehen fremden Fortschritt nicht,
Einladungscodes nur als Hash, einmalig, ablaufend.

### 2.2 Abhängigkeiten – CI (`.github/workflows/ci.yml`)

`npm audit --omit=dev --audit-level=high` für Frontend und Backend bei jedem Push/PR
**und wöchentlich montags** (neue Meldungen ohne Code-Änderung).

### 2.3 Laufende Instanz von außen – `scripts/security-check.sh`

Nur lesend, legt nichts an. Prüft:

- HTTP → HTTPS-Umleitung, Zertifikat ≥ 14 Tage gültig, TLS 1.0/1.1 abgelehnt
- HSTS (≥ 180 Tage), CSP (ohne `unsafe-inline`/`unsafe-eval` für Skripte),
  X-Frame-Options, nosniff, Referrer-/Permissions-Policy, keine Versions-Header
- API-Health, Registrierungsmodus nicht `open`, Registrierung ohne Code → 403,
  Admin-API/`me` anonym → 401, kein CORS für fremde Origins
- Geheimnis-Pfade (`/.env`, `/.git/config`, DB, Compose-Datei) geben nichts preis
- optional `--direkt <VM-IP>:<Port>`: App-Port am Proxy vorbei **nicht** erreichbar
- optional `--last`: Login-Bremse liefert 429

```bash
./scripts/security-check.sh https://lernen.it-boss.eu --direkt 10.10.20.50:8090
```

Exit-Code ≠ 0 bei einem Fehler → als Cron mit Log oder als Kuma-„Push“-Monitor nutzbar.

---

## 3. Befunde (Stand 2026-10-20)

| Nr | Befund | Risiko | Status |
|---|---|---|---|
| S1 | **Admin-E-Mail öffnete im `invite`-Modus die Registrierung ohne Code** (E-Mail unverifiziert → jeder mit Kenntnis der Adresse hätte das Admin-Konto vorab anlegen können). Zeitfenster am 2026-10-20 ca. 20:05 bis zur Registrierung des Betreibers. | hoch | **behoben im Code** (Erst-Code per CLI), Rollout offen → Ticket 8.1 |
| S2 | Fastify ≤ 5.12.4 (u. a. `X-Forwarded-*`-Spoofing bei `trustProxy`, Auth-Bypass über fehlerhafte URLs), fast-uri, find-my-way | hoch | **behoben im Code** (5.12.7), Rollout mit 8.1 |
| S3 | react-router ≤ 7.18.1 (Open Redirect, DoS beim Route-Matching) | mittel | **behoben im Code** (7.18.4), Rollout mit 8.1 |
| S4 | Sophos-Regel WAN → NPM: GeoIP, IPS, DoS-Schutz nicht geprüft | mittel | offen → Ticket 7.4 |
| S5 | Kein Alarm bei Ausfall/Zertifikatsablauf (Kuma überwacht die App nicht) | mittel | offen → Luca (Kuma-Monitor) |
| S6 | Wiederherstellung aus Backup nie geprobt | mittel | offen → Ticket 8.3 |
| S7 | Session-Tokens liegen im Klartext in der DB → wer DB/Backup liest, kann Sitzungen übernehmen (30 Tage) | mittel | offen → Code (Token-Hash), alle müssen sich danach neu anmelden |
| S8 | Kein Audit-Log (Logins, Fehlversuche, Admin-Aktionen) → Vorfälle nicht nachvollziehbar | mittel | offen → Code |
| S9 | Datenschutzerklärung `/info` ist nur Vorlage; bei Nutzung durch andere nötig (DSGVO Art. 13) | mittel (rechtlich) | offen → Luca |
| S10 | Basis-Images (node/nginx) und VM-Pakete werden nur bei Deploys aktualisiert | mittel | offen → Routine (Abschnitt 5) |
| S11 | Test-Werkzeuge (vitest/tinypool) mit bekannten Lücken | niedrig (nicht ausgeliefert) | offen → vitest-Major-Update |
| S12 | Rate-Limits im Speicher → Neustart setzt Zähler zurück | niedrig | akzeptiert |
| S13 | Einladungscode-Versuche nur über nginx gebremst (30/min), nicht in der App | niedrig (Codes ~60 Bit) | akzeptiert |
| S15 | Konto-Erkennung: Login antwortete bei unbekannter E-Mail messbar schneller (1 ms statt ~40 ms); im `invite`-Modus verriet die Registrierung ohne Code „bereits registriert“ | mittel | **behoben im Code** (Dummy-Hash, Code-Prüfung zuerst), Rollout mit 8.1 |
| S14 | Root-Dateisystem VM 106 zu 90 % voll (`containerd.alt`) → volle Platte = Ausfall | niedrig | offen → Aufräum-Ticket |

Erledigt am 2026-10-20: Security-Header wieder aktiv, Registrierung auf `invite`,
App-Port 8090 nur für NPM (Proxmox-Firewall), HTTPS + HSTS über NPM/Let's Encrypt,
Auto-Update ohne Backup abgeschaltet, nächtliches Backup auf `/mnt/data`.

---

## 4. Plan

### Phase 1 – diese Woche (Rollout + Sichtbarkeit)

1. **Ticket 8.1 – Update ausrollen** (S1–S3): Backup → `git pull` → `deploy.sh` →
   `security-check.sh` muss 0 Fehler melden. Danach im Admin-Bereich prüfen, dass nur
   erwartete Konten existieren.
2. **Kuma-Monitor** (S5): `https://lernen.it-boss.eu/api/health`, Keyword `ok`,
   Zertifikats-Ablaufwarnung an.
3. **Ticket 7.4 – Sophos prüfen** (S4): GeoIP DACH, IPS-Policy, DoS-/Flood-Schutz auf
   der WAN → NPM-Regel (wirkt auch auf `cloud`).
4. **Wöchentlicher Security-Check** als Cron auf VM 106 (So 21:30, vor dem Backup),
   Log nach `/var/log/fisidev-security.log`.

### Phase 2 – nächste 2–4 Wochen (Härtung im Code)

5. **Session-Tokens nur als Hash speichern** (S7) + Test „DB-Inhalt ≠ Cookie-Wert“.
6. **Audit-Log** (S8): Tabelle `audit` (Zeit, Ereignis, Konto-ID, IP), Einträge für
   Login ok/fehlgeschlagen, Sperre, Löschung, Einladung, Recovery; Aufbewahrung 90 Tage;
   Ansicht im Admin-Bereich.
7. **Restore-Probe** (S6, Ticket 8.3): echtes Backup in einen Test-Stack einspielen,
   Login prüfen, Ergebnis dokumentieren. Danach halbjährlich.
8. **Datenschutzerklärung finalisieren** (S9) bevor weitere Personen eingeladen werden.

### Phase 3 – danach (Betrieb)

9. Admin-Konto mit **2FA (TOTP)** absichern.
10. **CrowdSec oder fail2ban** auf die NPM-Logs (sperrt Scanner/Brute-Force an der Firewall).
11. **Backup außer Haus** (3-2-1), verschlüsselt.
12. vitest auf aktuelle Major-Version (S11), Aufräum-Ticket Root-FS (S14).

---

## 5. Routine

| Wann | Was |
|---|---|
| nach jedem Deploy | `security-check.sh` → 0 Fehler; Admin-Bereich: Konten plausibel |
| wöchentlich (automatisch) | Security-Check-Cron, CI-Audit, Backup-Log ansehen (`"konten"` > 0) |
| monatlich | `docker compose build --pull && ./scripts/deploy.sh` (Basis-Images), `apt upgrade` in VM 106, Einladungen aufräumen |
| halbjährlich | Restore-Probe, Konten-/Admin-Liste prüfen, dieses Dokument aktualisieren |

## 6. Meldeweg

Sicherheitsprobleme bitte nicht öffentlich melden, sondern direkt an den Betreiber
(Kontakt auf `/info`).
