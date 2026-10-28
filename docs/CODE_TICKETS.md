# Code-Tickets aus dem Review (2026-10-22)

Quelle: Backend-Review (`server/src`, Docker, nginx, Skripte) und Frontend-Review
(`lernapp/src`). Befunde, die schon behoben sind, stehen in `SECURITY.md` (S1–S3, S15, S16).
Hier steht, was **noch zu tun ist**. Jedes Ticket ist für sich lesbar und kann von einer
eigenen Sitzung abgearbeitet werden.

**Arbeitsregeln für jedes Ticket**

- Eigener Branch `claude/<ticket-id>-<kurzname>` von aktuellem `main`, ein PR pro Ticket,
  PR-Text ohne Geheimnisse. **Nicht selbst mergen, nichts deployen.**
- Vorher `npm install` in `server/` bzw. `lernapp/`. Vor dem Commit grün: `server` →
  `npm test`; `lernapp` → `npm test`, `npm run lint`, `npm run build`. Neue Tests sind Pflicht
  (Test muss ohne die Änderung nachweislich fehlschlagen).
- Keine Inhalte aus `lernapp/src/data/exam_data.json` von Hand ändern.
- Änderungen an Doku mitpflegen (`SECURITY.md` Befundtabelle, `CHANGELOG.md`, bei Architektur
  `CLAUDE.md`). Kein Modellname in Commit-/PR-Texten außer der vorgegebenen Co-Authored-By-Zeile.

**Reihenfolge:** C1 → C2 → C3 → C4 → C5 → C6 → C7 → C8. C1/C2 zuerst (hoch), C7/C8 jederzeit.

| Nr | Titel | Schwere | Bereich | Modell / Aufwand |
|---|---|---|---|---|
| C1 | Daten zwischen Konten trennen (Logout/Kontowechsel) – **umgesetzt** (Branch `claude/c1-konten-trennung`) | hoch | Frontend | Opus / mittel |
| C2 | Sensible Konto-Aktionen absichern (Passwort, Origin, Cookie, Admin) – **umgesetzt** (Branch `claude/c2-konto-aktionen`) | hoch–mittel | Backend + Frontend | Sonnet / mittel |
| C3 | Server-Eingaben validieren, Speicher begrenzen, `updatedAt` serverseitig – **umgesetzt** (Branch `claude/c3-server-validierung`) | mittel | Backend | Opus / mittel |
| C4 | Importierte und vom Server geladene Daten validieren – **umgesetzt** (Branch `claude/c4-import-validierung`) | mittel | Frontend | Opus / mittel |
| C5 | Sync-Robustheit (Retry, Race, 401, Timeout, gelöschte Stapel) | mittel | Frontend | Opus / mittel |
| C6 | Sitzungs-Tokens hashen + Audit-Log – **umgesetzt** (Branch `claude/c6-sitzung-audit`) | mittel | Backend + Frontend | Opus / mittel |
| C7 | Docker-/Deploy-Härtung | niedrig–mittel | Compose, nginx | Sonnet / niedrig |
| C8 | Kleinere Fehler (PDF-Import, Plan ab Termin, SW-Fallback) | niedrig | Frontend | Sonnet / niedrig |
| C9 | Nutzung nur mit Konto (Login-Pflicht) + Schutz des Servers – **umgesetzt** (Branch `claude/c9-login-pflicht`, gestapelt auf C1) | hoch | Backend + Frontend + nginx | Opus / mittel |

---

## C1 – Daten zwischen Konten trennen (hoch)

**Problem (bestätigt durch Code-Lektüre).** `logout` in `lernapp/src/context/AuthContext.jsx`
löscht lokal nichts. Auf einem geteilten Gerät (Schul-PC, Familie) gilt: Konto A lernt und
meldet sich ab, Konto B meldet sich an. Beim Login von B ruft `ProgressContext.jsx` (Effekt
ab Zeile ~179) `progressApi.merge(progressRef.current)` mit **As** Fortschritt auf und
`flusheAusstehende()` sendet **As** gepufferte Outbox-Einträge unter Bs Sitzung. Gamification
wird max-gemergt (`GamificationContext.jsx` ~137–153), Einstufung und eigene Karten per
`mergeKontoDaten` in Bs Konto geschrieben (`KontoDatenSync.jsx` ~24–50). Umgekehrt sieht B
kurz As Daten. Folge: Datenleck und vermischte Konten.

**Ziel.** Lokale Daten gehören genau einem Besitzer (Konto-ID oder „anonym“). Nie Daten eines
Kontos in ein anderes Konto übernehmen.

**Umsetzung.**
1. Neues reines Modul `lernapp/src/lib/besitzer.js` (getestet): speichert/liest den Besitzer
   unter `ap2_lernapp_owner_v1` (`{ userId }` oder `null` = anonym) und listet alle lokalen
   Schlüssel, die zum Besitz gehören: `ap2_lernapp_progress_v1`, `…gamification_v1`,
   `…outbox_v1`, `…einstufung_v1`, `…eigene_karten_v1`, `…resume_v1` (nicht Theme).
   Funktion `loescheLokaleNutzerdaten()` und `entscheideNachLogin(besitzer, userId)` →
   `'uebernehmen'` (anonym → erstes Konto, bestehendes Verhalten, aber mit Rückfrage im UI),
   `'behalten'` (gleiche ID), `'verwerfen'` (andere ID: lokale Daten löschen, dann Server laden).
2. `logout` und `deleteAccount`: danach `loescheLokaleNutzerdaten()` und Contexts auf leeren
   Stand setzen (Provider hören auf ein Ereignis oder lesen neu). Bei Logout vorher die Outbox
   versuchen zu leeren, danach löschen.
3. Login-Effekte (Progress, Gamification, KontoDatenSync) erst nach `entscheideNachLogin`
   ausführen; bei `'verwerfen'` nichts mergen, nur Server-Stand laden. Besitzer nach Login setzen.
4. Outbox-Einträge mit `userId` markieren; fremde Einträge nie senden (`lib/outbox.js`).
5. UI: Beim ersten Login mit lokalen anonymen Daten Rückfrage „Lokalen Fortschritt in dieses
   Konto übernehmen?“ (Ja/Nein). Bei Nein: lokale Daten verwerfen.

**Stand:** umgesetzt – `lib/besitzer.js` (+ Test), `AuthContext` entscheidet nach jedem Login/`me()`
(`syncModus` `mergen`/`laden`), `components/UebernahmeDialog.jsx`, Outbox-Einträge mit `userId`,
Integrationstests `src/context/kontenTrennung.test.jsx` gegen ein In-Memory-Backend
(`src/test/fakeBackend.js`). Beim Aufräumen werden **alle** `ap2_lernapp_*`-Schlüssel außer dem Theme
entfernt (auch Prüfungstermin, Session-Umfang).

**Akzeptanz.** Tests (Vitest, mit echten Providern wie `App.smoke.test.jsx`): A lernt → Logout →
B Login: B sieht nichts von A, der Server von B bekommt keinen Merge mit As Daten, As Outbox wird
nicht unter B gesendet. Anonym lernen → Login mit „Ja“ übernimmt, mit „Nein“ nicht. Gleiches Konto
erneut anmelden behält lokalen Stand. `deleteAccount` räumt lokal auf.

---

## C2 – Sensible Konto-Aktionen absichern (hoch–mittel)

**Probleme.**
a) `POST /api/auth/recovery-code` und `DELETE /api/auth/account` (`server/src/auth.js`)
   verlangen nur die Sitzung. Wer eine Sitzung übernimmt (XSS in einer anderen Seite, offener
   Rechner), kann sich einen neuen Recovery-Code erzeugen und das Konto danach **dauerhaft**
   übernehmen (`/api/auth/recover` setzt das Passwort) oder das Konto löschen.
b) CSRF-Rest: Das Cookie ist `SameSite=Lax`, gilt aber auch für **Geschwister-Subdomains**
   (`cloud.it-boss.eu` ist „same-site“ zu `lernen.it-boss.eu`). Bodylose oder JSON-lose POSTs
   (z. B. `logout`, `recovery-code`, `POST /api/admin/invites` mit Defaults über `text/plain`)
   lassen sich von dort ohne Preflight auslösen.
c) Cookie-Name `ap_session` ohne `__Host-`-Präfix: Eine Geschwister-Subdomain kann per
   `Domain=it-boss.eu` ein eigenes `ap_session` setzen (Cookie-Tossing).
d) Admin-Rolle hängt an einer unverifizierten E-Mail: Löscht ein Admin sein Konto, kann sich
   jeder mit einem gültigen Einladungscode mit dieser E-Mail registrieren und ist Admin.

**Umsetzung.**
1. `recovery-code` und `account` (DELETE) verlangen im Body `password` (aktuelles Passwort,
   argon2-Prüfung, gleiche Bremse wie Login: `loginLimiter` mit eigenem Schlüssel). Frontend
   (`Konto.jsx`, `DatenSicherung`-nahe Dialoge) fragt das Passwort ab. Tests: ohne/falsches
   Passwort → 401, mit richtigem → ok; Bremse greift.
2. Globaler `onRequest`-Hook in `server/src/app.js`: Für alle Methoden außer GET/HEAD/OPTIONS
   `Sec-Fetch-Site` prüfen (`cross-site` und `same-site` → 403; fehlt der Header: `Origin` muss
   zu `Host` passen, sonst 403) und `Content-Type: application/json` erzwingen (Ausnahme:
   Requests ohne Body). Tests inkl. `inject`-Header-Varianten.
3. Cookie-Name bei `secureCookie: true` zu `__Host-ap_session` machen (Pfad `/`, kein
   `Domain`); in `app.js`/`auth.js` zentral, `SESSION_COOKIE_NAME` in `.env.example` und
   `docker-compose.yml` anpassen/dokumentieren. Nach dem Rollout müssen sich alle neu anmelden
   (im PR vermerken). Achtung: `security.test.js` (Cookie-Test) mitziehen.
4. Admin-Konten: `DELETE /api/auth/account` für Admins (E-Mail in `ADMIN_EMAILS`) verweigern
   (Hinweis: zuerst aus `ADMIN_EMAILS` entfernen), und im Admin-Bereich „Konto löschen“ eines
   Admins verbieten. Test: Registrierung mit Admin-E-Mail nach Löschversuch weiter unmöglich.

**Stand:** umgesetzt – `server/src/lib/csrf.js` (reine Herkunftsprüfung + Cookie-Name), Hook in
`app.js`, `bestaetigePasswort` in `auth.js` (Schlüssel `${ip}|konto:${userId}`), Admin-Schutz in
`auth.js` und `admin.js` (409), Frontend `components/PasswortDialog.jsx`. Entscheidungen: bei
`Sec-Fetch-Site` zusätzlich Ausnahme für den konfigurierten `CORS_ORIGIN` (Dev-Setup);
`X-Forwarded-Proto` wird nur verglichen, wenn gesetzt; Admin-Prüfung kommt vor der
Passwortprüfung (409 statt 401). Tests: `server/test/kontoSchutz.test.js`,
`PasswortDialog.test.jsx`, `api.test.js`, `Konto.test.jsx`, `Admin.test.jsx`.

**Akzeptanz.** Alle neuen Tests grün, `security.test.js` erweitert, `SECURITY.md` Befunde
ergänzt (S17–S20).

---

## C3 – Server-Eingaben validieren, Speicher begrenzen (mittel)

**Probleme (Backend).**
- `PUT /api/progress/:itemId` (`server/src/progress.js`) akzeptiert beliebige Typen. Ein Objekt
  als `stability` führt zu einem 500 beim SQLite-Binding, beliebige Strings landen in der DB.
  Es gibt **keine Obergrenze** der Einträge je Konto: ein eingeladenes Konto kann die Datenbank
  mit Millionen Zeilen füllen (Body-Limit gilt nur je Request).
- `PUT /api/gamification`: `activity` nur auf „ist Objekt“ geprüft (bis 1 MiB), `xp` und
  `klausurBest` ohne Obergrenze. Die Wochen-Rangliste vertraut diesen Werten und parst bei jedem
  Aufruf das JSON aller Teilnehmer.
- Last-Write-Wins nach Ankunftszeit: `upsert` speichert immer `new Date()`, der Client-Wert
  `updatedAt` wird verworfen. Ein veralteter Outbox-Eintrag eines Geräts überschreibt neuere
  Stände eines anderen. `rowToEntry` gibt `updatedAt` nicht zurück.

**Umsetzung.**
1. Neues reines Modul `server/src/lib/validierung.js` (getestet): `pruefeProgressEintrag(entry)`
   → bereinigter Eintrag oder `null`. Regeln: `status` ∈ erlaubte Menge (aus dem Frontend ableiten:
   `lernapp/src/context/ProgressContext.jsx`), `box` 1–5, `due`/`lastSeen`/`last_review` gültiges
   ISO-Datum oder `null`, `stability` 0.01–36500, `difficulty` 1–10, `reps`/`lapses` ganze Zahlen
   0–100000, `history` höchstens 20 Einträge mit Längenlimit, `itemId` ≤ 100 Zeichen und
   `^[\w.:-]+$`. Bei Verstoß 400 mit klarer Meldung.
2. Pro Konto höchstens z. B. 5000 Fortschritts-Einträge (konfigurierbar per Konstante); `merge`
   zählt mit. Gamification: `activity` höchstens 400 Tage mit je Zahl ≤ 100000, `xp` und
   `klausurBest` ≤ 10 000 000 / ≤ 100000; sonst 400.
3. `updatedAt` persistieren (neue Spalte `client_updated_at`, additive Migration in `db.js`
   wie die FSRS-Spalten). `PUT` überschreibt nur, wenn `entry.updatedAt` **neuer oder gleich**
   dem gespeicherten ist (fehlt es: nur wenn Eintrag nicht existiert); `rowToEntry` liefert
   `updatedAt` zurück. Test: veralteter Eintrag überschreibt neueren nicht.
4. Frontend-Anpassung nur falls nötig (`updatedAt` wird bereits gestempelt, s. `CLAUDE.md`).

**Akzeptanz.** Tests für jede Regel (gültig/ungültig/Grenzwerte), Test für Obergrenze, Test für
LWW-Schutz; bestehende `api.test.js` bleibt grün; DB-Migration läuft idempotent auf einer
bestehenden Datenbank (Test mit voraufgebauter DB).

**Status: umgesetzt** (Branch `claude/c3-server-validierung`). Abweichungen/Entscheidungen:
- `itemId` erlaubt Buchstaben inkl. Umlaute (`^[\p{L}\p{N}_.:-]+$`), weil echte Fragen-IDs
  „Frühjahr“ enthalten; `\w` hätte 96 Fragen ausgesperrt (Vertragstest
  `lernapp/src/lib/serverVertrag.test.js` prüft alle echten IDs und FSRS-Ausgaben).
- Obergrenze überschritten → `413`; bestehende Einträge bleiben änderbar. Grenze in
  `PROGRESS_GRENZEN.maxEintraege` (`server/src/progress.js`).
- `activity` > 400 Tage wird auf die jüngsten 400 **gekürzt** statt abgelehnt (der Client kürzt
  sein Log nicht – langjährige Nutzer würden sonst dauerhaft aus dem Sync fallen).
- Veralteter PUT → `200 {ok:true, uebernommen:false}`; ein `updatedAt` aus der Zukunft wird auf
  die Server-Zeit gekappt (falsche Geräteuhr blockiert keine anderen Geräte).
- Merge überspringt ungültige Einträge und solche über der Grenze → `{imported, skipped}`
  (+ `limitErreicht`).
- Frontend: Die Outbox verwirft endgültig abgelehnte Writes (400/409/413/414/422) statt die
  Warteschlange dauerhaft zu blockieren (`lib/outbox.js`).
- Bestehende DB-Zeilen werden nicht nachträglich geprüft (bleiben lesbar).

---

## C4 – Importierte und vom Server geladene Daten validieren (mittel)

**Probleme (Frontend, Review-Funde 4–7).**
- Backup-Import (`lib/datensicherung.js` ~90–100, `components/DatenSicherung.jsx` ~42–66) und
  Server-Werte (`KontoDatenSync.jsx`) werden nur oberflächlich geprüft. Beispiele, die die App
  dauerhaft kaputt machen: eine Karte `null` in `eigeneKarten` (TypeError in `lernReihe`), `name`
  als Objekt (React-Fehler in `EigeneKarten.jsx`), `history: 5` (wirft bei jeder Bewertung in
  `ProgressContext.jsx` ~232/265), `difficulty <= 0` (NaN in `fsrs.js` ~136, dann `RangeError` bei
  `toISOString()` ~243), `due: "kaputt"` (Karte nie mehr fällig), `einstufung: {datum:"x",
  auswertung:{themen:5}}` (Absturz von `Home.jsx` ~446 über `planAusErgebnis`, `Array(NaN)`).
- `DatenSicherung.jsx` liest die Datei ohne Größenlimit, meldet Erfolg trotz vollem localStorage
  (`speichereStapel`-Rückgabewert und `saveProgress`-Fehler werden ignoriert).
- Schlüssel `__proto__` im Import (`datensicherung.js` ~93–95, `progressMerge.js` ~17): kein
  globaler Schaden, aber geerbte Eigenschaften verfälschen Lookups.

**Umsetzung.**
1. Zentrales, reines Modul `lernapp/src/lib/validiere.js` (getestet) mit `bereinigeProgressEintrag`,
   `bereinigeStapel`/`bereinigeKarte`, `bereinigeEinstufung`, `bereinigeGamification`. Gleiche
   Wertebereiche wie in C3 (Konstanten teilen oder spiegeln und im Test gegeneinander prüfen).
   Strings per `String()` + Längenlimit, Zahlen mit `Number.isFinite` + Clamp, Daten per
   `Date.parse`, Arrays gekappt, Stapel/Karten-Anzahl begrenzt, Keys `__proto__`/`constructor`/
   `prototype` verwerfen (`Object.create(null)` oder Filter).
2. Alle Eingänge nutzen es: Backup-Import, `importProgress`, `mergeKontoDaten`/`KontoDatenSync`
   (Serverwerte), `ladeEinstufung`/`ladeStapel` beim Lesen aus localStorage (defensiv).
3. `Home.jsx`: `planAusErgebnis` in `try/catch`, bei Fehler Einstufung verwerfen und Hinweis zeigen.
4. `DatenSicherung.jsx`: Dateigröße ≤ 5 MB prüfen, Speicherfehler an die UI melden („Backup
   konnte nicht gespeichert werden, Speicher voll“), Importergebnis (übernommen/verworfen) anzeigen.
5. `fsrs.js`: `bewerten` defensiv gegen ungültige Eingaben (Fallback auf Startwerte statt Wurf).

**Akzeptanz.** Tests mit bösartigen Backups (jeder oben genannte Fall) → App rendert weiter
(`App.smoke.test.jsx` erweitern), ungültige Teile werden verworfen, gültige bleiben. Test für
Größenlimit und Quota-Fehler (localStorage-Mock wirft).

**Stand:** umgesetzt – `lib/validiere.js` (+ Vertragstest gegen `server/src/lib/validierung.js`), Eingänge: `parseImport`, `importProgress`, `mergeKontoDaten`, Serverstand in Progress-/GamificationContext, `ladeEinstufung`/`ladeStapel`/Start-Laden; `Home` mit try/catch; `DatenSicherung` mit 5-MB-Limit, Ergebnis- und Quota-Meldung; `saveProgress` meldet Fehler (Rückgabewert + Ereignis `fisidev:speicherfehler`); `fsrs.js` defensiv. Zahlen werden geklemmt statt Einträge verworfen (kein Fortschrittsverlust); `difficulty <= 0` → 1. Beim Laden aus dem eigenen localStorage wird nichts gekürzt (nur repariert).

---

## C5 – Sync-Robustheit (mittel)

**Probleme (Review-Funde 3, 8–11).**
- `KontoDatenSync.jsx` ~47–50: Schlägt der erste `datenApi.get()` fehl, wird trotzdem
  `bereit.current = true` gesetzt; der nächste lokale Schreibvorgang überschreibt die Serverdaten.
- `ProgressContext.jsx` ~292–299: `progressApi.merge(...)` läuft **im State-Updater** (mehrfach unter
  StrictMode). ~184–187: `setProgress(server)` ersetzt den Stand komplett und verwirft Bewertungen,
  die während des Logins gemacht wurden.
- `lib/api.js` ~11–25: kein zentrales 401-Handling (abgelaufene Sitzung bleibt „angemeldet“, Writes
  landen in der Outbox), kein Fetch-Timeout (hängender Request blockiert Merge/Sync), IDs in URLs
  (`ranglisteApi.get`) unkodiert.
- Gelöschte Eigene-Karten-Stapel kommen zurück (Vereinigung nach ID ohne Löschmarker,
  `datensicherung.js` ~41–48, `kontoDaten.js` ~35–41).

**Umsetzung.** (1) `bereit` nur nach erfolgreichem Merge, Wiederholung beim `online`-Event.
(2) Merge außerhalb des Updaters; Server-Antwort mit `mergeProgress(aktuellerStand, server)`
zusammenführen statt ersetzen. (3) `api.js`: 401 → einmaliges Ereignis, `AuthContext` setzt
`user=null`; `AbortSignal.timeout(15000)`; `encodeURIComponent`. (4) Löschmarker (Tombstones mit
Zeitstempel) für Stapel in `lib/eigeneKarten.js`, `kontoDaten.js` und im Backup-Format (Version
abwärtskompatibel lesen).

**Akzeptanz.** Tests je Punkt (Fehlschlag des GET → kein Überschreiben, Doppel-Aufruf im
StrictMode sendet einmal, 401 meldet ab, Timeout bricht ab, gelöschter Stapel bleibt gelöscht).

---

## C6 – Sitzungs-Tokens hashen + Audit-Log (mittel)

**Probleme.** (S7) `sessions.token` liegt im Klartext in der DB; wer ein Backup oder die DB liest,
kann 30 Tage lang Sitzungen übernehmen. (S8) Es gibt keine Nachvollziehbarkeit von Logins,
Fehlversuchen und Admin-Aktionen.

**Umsetzung.**
1. `server/src/session.js`: Cookie enthält das Token, die DB speichert `sha256(token)`
   (Spalte `token_hash`, additive Migration; alte Zeilen mit Klartext-`token` beim Start löschen,
   alle Nutzer müssen sich einmal neu anmelden – im PR und `CHANGELOG.md` vermerken). Lookups,
   Logout, Sperren, Aufräumjob und Tests anpassen. Test: DB-Inhalt ≠ Cookie-Wert.
2. Tabelle `audit` (`id`, `zeit`, `ereignis`, `konto_id` nullable, `ip`, `detail` kurz), Einträge
   für: Login ok/fehlgeschlagen/gebremst (429), Registrierung, Recovery, Konto gelöscht,
   Sperren/Entsperren, Einladung erzeugt/gelöscht. Keine Passwörter, Codes oder Tokens loggen.
   Aufbewahrung 90 Tage (Aufräumjob in `index.js`). IP nur aus `req.ip` (nach C-Fix S16).
3. Admin-API `GET /api/admin/audit?limit=100` (nur Admin) und eine einfache Tabelle in
   `lernapp/src/pages/Admin.jsx`.
4. `pages/Info.jsx` (Datenschutz-Vorlage) um den Hinweis „Sicherheitsprotokoll (IP, 90 Tage)“
   ergänzen.

**Akzeptanz.** Tests: Audit-Einträge entstehen, enthalten keine Geheimnisse, Aufräumen nach
90 Tagen, nur Admin darf lesen; Session-Tests (Login, Logout, Sperre, Ablauf) bleiben grün.

---

## C7 – Docker-/Deploy-Härtung (niedrig–mittel)

**Befunde.** `docker-compose.yml`: `REGISTRATION` hat den Default `open` (unsicherer Default
für ein öffentlich erreichbares Deployment); keine `cap_drop`, kein `pids_limit`; der
Web-Container (`nginx:alpine`) startet den Master als root; Basis-Images nur per Tag
(`node:24-alpine`, `nginx:alpine`). Backend-Healthcheck und `read_only` sind gut.

**Umsetzung.** (1) Default `REGISTRATION` in `docker-compose.yml` und `.env.example` auf
`invite` ändern und in `DEPLOYMENT.md`/`CHANGELOG.md` als **Verhaltensänderung** kennzeichnen.
(2) Für beide Services `cap_drop: [ALL]` (Web braucht keine Capabilities, wenn er als
Nicht-Root auf Port 8080 läuft), `pids_limit: 200`. (3) Web-Image auf `nginxinc/nginx-unprivileged`
mit festem Tag umstellen (Pfade für Cache/PID prüfen, `tmpfs`-Einträge anpassen), Healthcheck
und `lernapp/nginx.conf` beibehalten. (4) Basis-Images auf konkrete Minor-Tags pinnen
(Dockerfiles), im `SECURITY.md`-Abschnitt Routine „monatlich Basis-Images erneuern“ erwähnen.
(5) Nginx: Methoden außerhalb GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS blocken
(`limit_except` in den `/api`-Locations).

**Akzeptanz.** Stack lokal (Docker verfügbar, sonst Konfig mit `docker compose config` prüfen und
`nginx -t` im Container) startet, beide Container `healthy`, `scripts/smoke-test.sh` und
`scripts/security-check.sh` bestehen. Rollback beschreiben (alter Tag/Image).

---

## C8 – Kleinere Fehler (niedrig)

- `lib/kartenGenerator.js` ~139–140: Rückgabe `seiten: doc.numPages` statt tatsächlich gelesener
  Seiten (`Math.min(doc.numPages, maxSeiten)`); `doc.destroy()` in `finally`; Gesamt-Textlänge
  kappen (z. B. 2 MB).
- `lib/einstufung.js` ~225–228: Prüfungstermin am Teststart oder in der Vergangenheit ergibt
  einen 56-Tage-Plan. Stattdessen Hinweis anzeigen („Termin liegt in der Vergangenheit“) bzw.
  1 Tag planen; Test ergänzen.
- `vite.config.js`: `navigateFallbackDenylist: [/^\/api\//]`, damit der Service Worker für
  `/api/…`-Navigationen nicht `index.html` ausliefert.
- Hinweis (kein Ticket): Remote-Bilder in importierten Karten (`MarkdownContent.jsx`) lädt der
  Browser **nicht**, weil die CSP `img-src 'self' data:` setzt. Nur bei Änderung der CSP erneut prüfen.

**Akzeptanz.** Je Punkt ein Test bzw. Konfigurationsprüfung; `npm test`, Lint, Build grün.

---

## C9 – Nutzung nur mit Konto (Login-Pflicht) + Schutz des Servers (hoch)

**Hintergrund (Wunsch des Betreibers).** Die App soll nur mit Konto nutzbar sein; Nutzer werden
per Einladungscode eingeladen. Prüfungs- und Lernzettel-Inhalte (urheberrechtlich heikel) dürfen
für Unangemeldete nicht abrufbar sein, der Server soll vor Fremdzugriff und Spam geschützt sein.
Baut auf C1 auf (Besitzer-Marker).

**Anforderungen.**
1. **Server-Config:** Env `REQUIRE_LOGIN` (Default `true` in `docker-compose.yml`/`.env.example`,
   ohne Env in `server/src/index.js` `false` → lokale Entwicklung/Tests unverändert).
   `GET /api/auth/config` liefert zusätzlich `loginPflicht: boolean`. Doku in `DEPLOYMENT.md`,
   `server/README.md`, `.env.example`, `CLAUDE.md`.
2. **Frontend-Gate:** `loginPflicht` und keine Sitzung → nur die Konto-Seite (Login, Registrierung
   mit Einladungscode, Passwort vergessen, Einladungslink `#/konto?einladung=CODE`), keine
   Lerninhalte, keine Navigation zu Lernseiten. Backend nicht erreichbar **und** kein früherer
   Login → bisheriges rein lokales Verhalten (statisches Deployment/Preview). Offline nach früherem
   Login (C1-Besitzer-Marker gesetzt) → App läuft mit lokalen Daten weiter; sobald der Server
   erreichbar ist und keine Sitzung besteht, greift das Gate. Abgemeldet = immer Gate.
3. **Inhalte nur mit Sitzung:** (a) `exam_data.json` erst nach Login per dynamischem `import()`
   laden (Selektoren in `useExamData.js` bleiben synchron/API-kompatibel, Tests dürfen Daten direkt
   bereitstellen); (b) Chunk `examdata` aus dem Precache (`globIgnores`), stattdessen
   Runtime-Caching (CacheFirst, eigener Cache), beim Logout/Kontowechsel `caches.delete`;
   (c) nginx liefert `/assets/examdata-*.js` nur mit gültiger Sitzung (`auth_request` →
   `GET /api/auth/me`, eigene Include-Datei, Security-Header in jedem location-Block);
   (d) `scripts/security-check.sh`: examdata ohne Sitzung → 401/403, Startseite ohne Lerninhalte.
4. **Spam-/Missbrauchsschutz:** (a) nginx-Rate-Limit nur für `POST /api/auth/register`
   (10/Stunde je IP, eigene Zone, 429); (b) `REGISTRATION=invite` als Compose-Default
   (Verhaltensänderung in `CHANGELOG.md`/`DEPLOYMENT.md`); (c) falsche Einladungscodes zählen
   gegen `app.loginLimiter` (Schlüssel `${req.ip}|invite`, 8 Fehlversuche/15 min → 429,
   erfolgreiche Registrierung setzt zurück); (d) Tests für alles.
5. Doku: `docs/CODE_TICKETS.md`, `SECURITY.md` (Befund + Status), `GO_LIVE_CHECKLISTE.md`,
   `CHANGELOG.md`, `CLAUDE.md`.

**Akzeptanz.** Server-Tests (Config-Flag, Einladungs-Bremse), Frontend-Tests (Gate-Logik, Gate
zeigt nur Konto, keine Daten vor Login, Cache-Löschung beim Logout), E2E mit gemocktem Backend
(Gate) und ohne Backend (lokal), Build ohne examdata im Precache. nginx-Teile, die lokal nicht
laufen, im PR als „beim Rollout prüfen“ markieren.

**Stand:** umgesetzt. Server: `lib/konfig.js` (`schalterAusEnv`), `loginPflicht` in
`/api/auth/config`, Einladungs-Bremse in `auth.js` (Tests `test/loginPflicht.test.js`).
Frontend: `data/examDaten.js` (dynamischer Import), `lib/zugang.js`, `useZugang`,
`LoginGate`/`ExamDatenGrenze` in `App.jsx`, `lib/examdatenCache.js`; Tests
`src/loginGate.test.jsx`, `src/lib/zugang.test.js`, `src/data/examDaten.test.js`,
`src/bundle.test.js`, E2E `e2e/login-gate.spec.js`. nginx: `nginx-auth-sitzung.conf`,
Zone `register`. Abweichung: nginx kennt keine Stunden-Raten → Register-Limit 10 sofort, danach
1/min je IP (das eigentliche Limit sind Einladungscodes + Backend-Bremse).

