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

### Sonstiges

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/health` | `{ status: "ok" }` |

## Datenmodell (SQLite)

- **`users`** — `id`, `email` (unique), `password_hash` (argon2id), `created_at`,
  `recovery_hash` (argon2 des Recovery-Codes; additive Migration)
- **`sessions`** — `token` (PK), `user_id`, `created_at`, `expires_at` (30 Tage)
- **`progress`** — PK `(user_id, item_id)`; Felder `status`, `box`, `due`,
  `last_seen`, `last_result`, `history` (JSON), FSRS-Felder
  (`stability`, `difficulty`, `reps`, `lapses`, `last_review`), `updated_at`

`item_id` ist die Frage- bzw. Lerneinheit-ID aus dem Frontend – Fragen und
Lernzettel teilen sich denselben Fortschritts-Schlüsselraum.

## Code

- `src/app.js` — testbare Fastify-Factory (`buildApp`, via `app.inject` ohne Netzwerk testbar)
- `src/index.js` — Entrypoint (liest `.env`, startet den Server)
- `src/db.js` — DB-Init + Schema · `src/session.js` — Sitzungen
- `src/auth.js` · `src/progress.js` · `src/gamification.js` — Routen ·
  `test/api.test.js` · `test/recovery.test.js` · `test/rateLimit.test.js` — Tests

Architektur-Begründungen (Backend-/Auth-Wahl): siehe [`../DECISIONS.md`](../DECISIONS.md).
