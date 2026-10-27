# AP Lernapp – Backend

Leichtgewichtiges Backend für Auth und geräteübergreifenden Lernfortschritt.
**Fastify 5** + **`node:sqlite`** (in Node ≥ 22 eingebaut – keine native
Build-Abhängigkeit). Das Frontend funktioniert auch **ohne** dieses Backend
vollständig (rein lokal über `localStorage`).

## Setup

```bash
npm install
cp .env.example .env       # Konfiguration anpassen
npm run dev                # Watch-Modus, Standard-Port 3001
# npm start                # ohne Watch
npm test                   # API-Tests (node:test, via app.inject)
```

## Konfiguration (`.env`)

| Variable | Default | Zweck |
|---|---|---|
| `PORT` | `3001` | HTTP-Port |
| `HOST` | `0.0.0.0` | Bind-Adresse |
| `DB_PATH` | `./data/lernapp.sqlite` | SQLite-Datei (in Docker auf ein Volume legen) |
| `SESSION_COOKIE_NAME` | `ap_session` | Name des Sitzungs-Cookies |
| `CORS_ORIGIN` | – | Erlaubter Origin (nur nötig, wenn Frontend auf anderer Origin; im Dev übernimmt das der Vite-Proxy) |
| `NODE_ENV` | `development` | `production` → `Secure`-Flag für Cookies (HTTPS) |

Secrets (`.env`) niemals committen.

## API

Alle Antworten sind JSON. Authentifizierung über ein **httpOnly-Session-Cookie**
(serverseitige Sitzung). Geschützte Routen antworten ohne gültige Sitzung mit `401`.

### Auth (`/api/auth`)

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/register` | `{ email, password }` → Konto anlegen (argon2id-Hash), Cookie setzen. `409` bei vorhandener E-Mail, `400` bei ungültiger Eingabe (Passwort ≥ 8 Zeichen) |
| `POST` | `/login` | `{ email, password }` → anmelden, Cookie setzen. `401` bei falschen Daten. **Rate-Limit:** `429` (+`Retry-After`) nach zu vielen Fehlversuchen je IP+E-Mail |
| `POST` | `/logout` | Sitzung beenden, Cookie löschen |
| `GET` | `/me` | aktuellen Nutzer liefern (`401` wenn nicht angemeldet) |
| `POST` | `/recover` | **Passwort-Reset per Recovery-Code** (s. ADR-008): `{ email, recoveryCode, newPassword }` → neues Passwort setzen, **alle** Sitzungen widerrufen, Code rotieren (Antwort enthält den neuen), direkt anmelden. `401` bei falschem Code, teilt das Login-Rate-Limit |
| `POST` | `/recovery-code` | (angemeldet) neuen Recovery-Code erzeugen/rotieren – Antwort `{ recoveryCode }`, wird nur einmal angezeigt |
| `DELETE` | `/account` | **Konto löschen** (DSGVO): entfernt den Nutzer und – per `ON DELETE CASCADE` – alle sessions/progress/gamification; Cookie wird gelöscht. `401` wenn nicht angemeldet |

> `POST /register` liefert zusätzlich `recoveryCode` mit – der einzige Weg, ein
> vergessenes Passwort zurückzusetzen (kein E-Mail-Reset). Es wird nur der
> argon2-Hash gespeichert (`users.recovery_hash`).

### Fortschritt (`/api/progress`) — erfordert Login

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/` | gesamten Fortschritt als Map `{ itemId: { status, box, due, lastSeen, lastResult, history, stability, difficulty, reps, lapses, last_review, updatedAt } }` |
| `PUT` | `/:itemId` | einen Eintrag setzen/aktualisieren → `{ ok, uebernommen }`. `400` bei ungültigem Eintrag, `413` wenn ein **neuer** Eintrag die Obergrenze je Konto überschreitet. Ist der gespeicherte Stand neuer (`updatedAt`), bleibt er erhalten: `200 { ok: true, uebernommen: false }` |
| `POST` | `/merge` | `{ progress }` **nicht-destruktiv** zusammenführen (Migration des lokalen Stands beim ersten Login – nur fehlende Einträge werden übernommen) → `{ imported, skipped }` (+ `limitErreicht: true`, wenn die Obergrenze griff); ungültige Einträge werden übersprungen |
| `DELETE` | `/` | gesamten Fortschritt löschen |

**Eingabe-Regeln (C3, `src/lib/validierung.js`):** `itemId` 1–100 Zeichen aus Buchstaben
(inkl. Umlaute), Ziffern, `_ . : -`; `status` ∈ `gelernt`/`ueben`; `box` ganzzahlig 1–5;
`due`/`lastSeen`/`last_review`/`updatedAt` ISO-Datum; `stability` 0,01–36500; `difficulty`
1–10; `reps`/`lapses` ganzzahlig 0–100000; `lastResult` 1–40 Zeichen; `history` ≤ 20 Einträge
`{ ts: ISO, result: 1–40 Zeichen }`. Fehlende/`null`-Felder sind erlaubt, unbekannte Felder
werden verworfen. **Obergrenze:** 5000 Einträge je Konto (`PROGRESS_GRENZEN` in
`src/progress.js`). **Konflikte:** Der Client-Zeitstempel `updatedAt` wird als
`client_updated_at` gespeichert (auf die Server-Zeit gekappt); ein PUT überschreibt nur, wenn
er neuer oder gleich ist – ohne `updatedAt` nur neue Einträge oder Altbestand ohne Zeitstempel.

### Gamification (`/api/gamification`) — erfordert Login

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/gamification` | `{ gamification: { activity, xp, klausurBest } \| null }` |
| `PUT` | `/api/gamification` | kompletten Stand überschreiben. `activity`: Schlüssel `YYYY-MM-DD`, Werte 0–100000, mehr als 400 Tage werden auf die jüngsten 400 gekürzt; `xp` 0–10 000 000; `klausurBest` 0–100000. Sonst `400` |

### Rangliste (`/api/rangliste`) — erfordert Login, opt-in

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/rangliste` | eigenes Profil `{ optIn, anzeigename }`, Top 20 der Woche (`rang`, `anzeigename`, `punkte`, `xp`, `istIch`) + eigener Platz. Nur Konten mit Opt-in, nie E-Mail |
| `PUT` | `/api/rangliste/profil` | `{ optIn: boolean, anzeigename }` – Teilnahme an/aus; Name 3–20 Zeichen, eindeutig (409 bei Dublette) |

Punkte = bewertete Lernobjekte der letzten 7 Tage aus dem Aktivitäts-Log des
Gamification-Stands (`src/lib/rangliste.js`, rein/getestet).

### Konto-Daten (`/api/daten`) — erfordert Login

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/daten` | `{ daten: { einstufung?: {wert, updatedAt}, eigeneKarten?: {wert, updatedAt} } }` |
| `PUT` | `/api/daten/:schluessel` | `{ wert }` speichern; nur `einstufung` (max. 64 KiB, sonst `413`) und `eigeneKarten` (max. 512 KiB); `wert` muss Objekt oder Liste sein (`400`), `null` = gelöscht |

### Lerngruppen (`/api/gruppen`) — erfordert Login + Anzeigename

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/gruppen` | eigene Gruppen `{ id, name, code, mitglieder, erstellt }` |
| `POST` | `/api/gruppen` | `{ name }` (3–40 Zeichen) → Gruppe + Code `XXXX-XXXX`; max. 10 eigene |
| `POST` | `/api/gruppen/beitreten` | `{ code }` (Groß/klein, Bindestrich egal); Rate-Limit wie Login |
| `DELETE` | `/api/gruppen/:id/mitgliedschaft` | verlassen; leere Gruppen werden gelöscht |

`GET /api/rangliste?gruppe=<id>` liefert die Wochen-Rangliste nur der Mitglieder (403 für Nicht-Mitglieder).

### Admin (`/api/admin`) — nur Konten aus `ADMIN_EMAILS`

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/admin/uebersicht` | Registrierungsmodus, Konten (E-Mail, seit, gesperrt, XP, Einträge), Einladungen (ohne Klartext-Code) |
| `PATCH` | `/api/admin/users/:id` | `{ gesperrt: boolean }` – Sperren beendet alle Sitzungen; nicht für das eigene Konto |
| `DELETE` | `/api/admin/users/:id` | Konto samt Daten löschen (nicht das eigene) |
| `POST` | `/api/admin/invites` | `{ maxUses 1–100, gueltigTage 0–365, notiz }` → Code (nur einmal im Klartext) |
| `DELETE` | `/api/admin/invites/:id` | Einladung widerrufen |

Registrierung: `GET /api/auth/config` liefert `{ registrierung, loginPflicht }` (Env
`REGISTRATION` = `open`/`invite`/`closed`; Env `REQUIRE_LOGIN` = `true`/`false`, ohne Angabe
`false`, in `docker-compose.yml` `true` – dann zeigt das Frontend ohne Sitzung nur die
Konto-Seite und nginx liefert die Prüfungsdaten nur mit Sitzung aus). Bei `invite` braucht
`POST /api/auth/register` ein `inviteCode` (atomar eingelöst), auch für E-Mails aus
`ADMIN_EMAILS`; falsche Codes zählen gegen die Login-Bremse (`IP|invite`, 8 Fehlversuche /
15 min → 429, Erfolg setzt zurück). Den ersten Code erzeugt der Betreiber per
`node src/einladung-cli.js [notiz]` im Container (1x nutzbar, 1 Tag gültig). Gesperrte Konten können sich nicht anmelden/zurücksetzen.

### Sonstiges

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/health` | `{ status: "ok" }` |

## Datenmodell (SQLite)

- **`users`** — `id`, `email` (unique), `password_hash` (argon2id), `created_at`,
  `recovery_hash` (argon2 des Recovery-Codes; additive Migration),
  `anzeigename` + `rangliste_optin` (Rangliste, Default aus; additive Migration),
  `gesperrt` (Admin-Sperre; additive Migration)
- **`user_daten`** — PK `(user_id, schluessel)`, `wert` (JSON), `updated_at`
- **`gruppen`** (`name`, `code`, `created_by`) + **`gruppen_mitglieder`** (PK `(gruppe_id, user_id)`)
- **`invites`** — `code_hash` (SHA-256), `hinweis` (erste 4 Zeichen), `notiz`, `max_uses`,
  `uses`, `created_by`, `created_at`, `expires_at`
- **`sessions`** — `token` (PK), `user_id`, `created_at`, `expires_at` (30 Tage)
- **`progress`** — PK `(user_id, item_id)`; Felder `status`, `box`, `due`,
  `last_seen`, `last_result`, `history` (JSON), FSRS-Felder
  (`stability`, `difficulty`, `reps`, `lapses`, `last_review`), `updated_at` (Server-Zeit),
  `client_updated_at` (Client-`updatedAt` für den Konfliktschutz; additive Migration beim Start)

`item_id` ist die Frage- bzw. Lerneinheit-ID aus dem Frontend – Fragen und
Lernzettel teilen sich denselben Fortschritts-Schlüsselraum.

## Code

- `src/app.js` — testbare Fastify-Factory (`buildApp`, via `app.inject` ohne Netzwerk testbar)
- `src/index.js` — Entrypoint (liest `.env`, startet den Server)
- `src/db.js` — DB-Init + Schema · `src/session.js` — Sitzungen · `src/backup.js` — Online-Backup (`VACUUM INTO`) + Integritätsprüfung (CLI für `scripts/backup.sh`/`restore.sh`)
- `src/auth.js` · `src/progress.js` · `src/gamification.js` · `src/rangliste.js` · `src/admin.js` · `src/daten.js` · `src/gruppen.js` — Routen ·
  `test/api.test.js` · `test/recovery.test.js` · `test/rateLimit.test.js` ·
  `test/rangliste.test.js` · `test/admin.test.js` · `test/daten.test.js` · `test/gruppen.test.js` · `test/backup.test.js` · `test/validierung.test.js` · `test/eingaben.test.js` — Tests

Architektur-Begründungen (Backend-/Auth-Wahl): siehe [`../DECISIONS.md`](../DECISIONS.md).
