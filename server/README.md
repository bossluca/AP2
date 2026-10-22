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
| `GET` | `/` | gesamten Fortschritt als Map `{ itemId: { status, box, due, lastSeen, lastResult, history } }` |
| `PUT` | `/:itemId` | einen Eintrag setzen/aktualisieren |
| `POST` | `/merge` | `{ progress }` **nicht-destruktiv** zusammenführen (Migration des lokalen Stands beim ersten Login – nur fehlende Einträge werden übernommen) |
| `DELETE` | `/` | gesamten Fortschritt löschen |

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
| `PUT` | `/api/daten/:schluessel` | `{ wert }` speichern; nur `einstufung` (max. 64 KiB) und `eigeneKarten` (max. 512 KiB); `null` = gelöscht |

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

Registrierung: `GET /api/auth/config` liefert `{ registrierung }` (Env `REGISTRATION` =
`open`/`invite`/`closed`); bei `invite` braucht `POST /api/auth/register` ein `inviteCode`
(atomar eingelöst), auch für E-Mails aus `ADMIN_EMAILS`. Den ersten Code erzeugt der Betreiber per
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
  (`stability`, `difficulty`, `reps`, `lapses`, `last_review`), `updated_at`

`item_id` ist die Frage- bzw. Lerneinheit-ID aus dem Frontend – Fragen und
Lernzettel teilen sich denselben Fortschritts-Schlüsselraum.

## Code

- `src/app.js` — testbare Fastify-Factory (`buildApp`, via `app.inject` ohne Netzwerk testbar)
- `src/index.js` — Entrypoint (liest `.env`, startet den Server)
- `src/db.js` — DB-Init + Schema · `src/session.js` — Sitzungen · `src/backup.js` — Online-Backup (`VACUUM INTO`) + Integritätsprüfung (CLI für `scripts/backup.sh`/`restore.sh`)
- `src/auth.js` · `src/progress.js` · `src/gamification.js` · `src/rangliste.js` · `src/admin.js` · `src/daten.js` · `src/gruppen.js` — Routen ·
  `test/api.test.js` · `test/recovery.test.js` · `test/rateLimit.test.js` ·
  `test/rangliste.test.js` · `test/admin.test.js` · `test/daten.test.js` · `test/gruppen.test.js` · `test/backup.test.js` — Tests

Architektur-Begründungen (Backend-/Auth-Wahl): siehe [`../DECISIONS.md`](../DECISIONS.md).
