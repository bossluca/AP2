# Projektstatus – FiSi.dev Lernapp

Stand: 2026-07-11

Dieses Dokument ist der aktuelle Einstiegspunkt für die Weiterentwicklung. Historische
Phasen bleiben in `ROADMAP.md`, Architekturentscheidungen in `DECISIONS.md` und das
ausführliche Ideen-Backlog in `IMPROVEMENTS.md` erhalten.

## Kurzfazit

Die Lernapp ist kein früher Prototyp mehr, sondern eine funktionsreiche, getestete PWA
mit optionalem Multi-User-Backend. Der nächste sinnvolle Schwerpunkt ist nicht ein
Framework-Wechsel, sondern:

1. mehr und systematisch geprüfte AP2-Inhalte,
2. die vorhandenen Lernsignale noch stärker für adaptive Tagespläne nutzen,
3. Performance, E2E-Tests und Barrierefreiheit vor öffentlichem Betrieb abrunden.

## Verifizierter technischer Stand

| Bereich | Stand |
|---|---|
| Frontend | React 19, Vite 6, Tailwind 4, React Router 7, HashRouter |
| Backend | Fastify 5, `node:sqlite`, Session-Cookies, Argon2id |
| Betrieb | Docker Compose, Nginx, PWA/Offline, optional rein statisch |
| Tests | 48 Frontend-Testdateien / 279 Tests; 31 Backend-Tests |
| Qualität | ESLint, Datenvalidierung und Produktionsbuild erfolgreich |
| Daten | 10 Prüfungen, 287 Einträge, 265 lernbar, 266 mit Lösung |
| Lernzettel | 278 Einheiten (111 AP1, 167 AP2) |
| Prüfungen | 6 paraphrasierte AP1-Prüfungen, 4 KI-generierte AP2-Übungssets |

Verifikation vom 2026-07-11:

```text
lernapp: npm test               279/279 bestanden
lernapp: npm run lint           bestanden
lernapp: npm run validate-data  bestanden
lernapp: npm run build          bestanden
server:  npm test               31/31 bestanden
```

Build-Beobachtung: Der PWA-Precache umfasst rund 2,10 MiB. Die größten Chunks sind
`vendor` (ca. 1,18 MB, gzip ca. 263 KB) und `examdata` (ca. 729 KB, gzip ca. 191 KB).
Das ist aktuell funktionsfähig, sollte aber vor stark wachsendem AP2-Datenbestand
gezielt optimiert werden.

## Architektur in einem Blick

- `lernapp/src/data/exam_data.json` ist die zentrale Inhaltsquelle für Prüfungen und
  Lernzettel. Änderungen daran laufen ausschließlich über Import-/Migrationsskripte.
- `ProgressContext` verwaltet Lernfortschritt und Offline-Sync; `GamificationContext`
  hält XP, Streaks und Quests getrennt.
- FSRS steuert Wiederholungen. Statistik, Prüfungsreife, Tagesplan und Schwächenmodus
  leiten daraus Lernentscheidungen ab.
- Das Backend ist optional. Ohne Login bleibt die App vollständig lokal nutzbar;
  mit Login werden Fortschritt und Gamification kontobezogen synchronisiert.
- Das Frontend ist als PWA installierbar und wird in produktiven Builds über Nginx
  ausgeliefert; `/api` wird an Fastify weitergereicht.

## Stärken

- Breite Lernschleife: Lesen, Cloze, Drill, Quiz, Karteikarten, FSRS-Wiederholung,
  Modultraining und Klausursimulation greifen ineinander.
- Reine Kernmodule mit guter Testabdeckung und injizierbarer Zeit bzw. Zufälligkeit.
- Offline-first und optionaler Account statt Login-Zwang.
- Reproduzierbare Content-Importe und explizite Herkunftskennzeichnung.
- Sicherheitsgrundlagen wie Argon2id, serverseitige Sessions, Rate-Limit,
  Body-Limit, Konto-Löschung und Recovery-Codes sind vorhanden.

## Risiken und offene Punkte

1. **Content-Qualität und -Abdeckung:** Drei AP2-Übungssets reichen noch nicht für
   eine breite, prüfungsnahe Vorbereitung. Neue Sets brauchen Themenmatrix,
   Quellen-/Herkunftskennzeichnung, Selbsttests und fachliche Stichproben.
2. **Wachsendes Datenbundle:** `exam_data` wird derzeit als großer Chunk gebaut und
   vom Service Worker vorab gecacht. Weitere Prüfungen erhöhen Start-/Updatekosten.
3. **Kein Browser-E2E-Schutz:** Unit-/Komponententests sind stark, echte Kernabläufe
   im Browser (inklusive PWA/Login) sind noch nicht mit Playwright abgesichert.
4. **Öffentlicher Betrieb:** Docker-Build, Restore-Probe, TLS/HSTS, Host-Firewall und
   Datenschutzhinweise müssen auf dem Zielsystem abschließend geprüft werden.
5. **Dokumenthistorie:** `ROADMAP.md` ist bewusst historisch und darf nicht als
   heutiger Ist-Stand gelesen werden; dieses Dokument hat dafür Vorrang.

## Nächste Roadmap

### Abgeschlossener Sprint – Mobile Lernen und Deployment

Der erste Ausbau-Sprint ist in `MOBILE_DEPLOYMENT_PLAN.md` festgeschrieben. Er
liefert kurze wählbare Handy-Sessions, daumenfreundliche Antwortaktionen und einen
reproduzierbaren, gehärteten Docker-Deploy für die Debian-VM. Danach folgt Phase N1.

### Phase N1 – Content-Fundament AP2 · teilweise abgeschlossen

- ✅ Eine reproduzierbare AP2-Themenmatrix bündelt die 167 Einheiten und vier
  Übungssets: `lernapp/docs/AP2_THEMENMATRIX.md`.
- Qualitätskriterien für neue Fragen verbindlich machen: eindeutige Punkte,
  Schwierigkeit, Themen-Tags, Musterlösung, Schlagwörter, Keyword-Selbsttest,
  Herkunft und eigenständige Formulierung.
- ✅ AP2-Set 4 ergänzt 22 Fragen/99 Punkte zu Kerberos/SSO, GFS/Backup,
  SNMP/Syslog, Segmentierung/Zero Trust, WLAN-Ausleuchtung, SQL-Joins,
  TLS, Linux, Hochverfügbarkeit, Incident Response und SLA/Kapazität.
- Als nächste Content-Lücke weist die Matrix nur noch VPN/Fernzugriff als „dünn“ aus.
- Danach weitere Sets nur anhand nachweisbarer Lücken ergänzen, nicht nach Menge.

### Phase N2 – Adaptive Lernsteuerung

- ✅ Tagesplan mit Themen-Mastery gekoppelt: Pensum wird nach den schwächsten
  heute bearbeitbaren Themen zusammengestellt.
- ✅ Direkteinstieg in die vorgeschlagene, vorgefilterte Tagesplan-Session.
- Session-Länge wählbar machen und einen Filter für schwere Aufgaben ergänzen.
- Prüfen, ob Matching- und Reihenfolgeaufgaben fachlich zuverlässig aus den Daten
  generiert werden können.

### Phase N3 – Qualität und Performance

- Playwright-E2E für die wichtigsten Wege: Heute lernen, Wiederholen,
  Klausursimulation, Login/Sync und Backup-Import.
- `exam_data` aus dem vollständigen PWA-Precache lösen bzw. nach Prüfungsteil oder
  Inhaltsart bedarfsgerecht laden.
- A11y-Pass mit Tastatur, Fokusführung, `aria-live`, Kontrast und Screenreader-Smoke.
- Mobile Bedienung mit Swipe-Gesten und konsistentem Toast-Feedback abrunden.

### Phase N4 – Betriebsreife

- Containerbuild auf dem Zielhost ausführen und Healthchecks prüfen.
- Datenbank-Backup und echte Wiederherstellung testen.
- TLS/HSTS, Firewall, SSH-Härtung und Updateprozess anhand `DEPLOYMENT.md` abhaken.
- Datenschutz-/Inhaltstexte vor öffentlicher Freigabe finalisieren; Repository und
  Rohmaterial entsprechend ADR-007 privat halten.

## Definition of Done für kommende Änderungen

Eine Änderung gilt erst als abgeschlossen, wenn:

- Verhalten und Akzeptanzkriterien klar sind,
- relevante Tests ergänzt bzw. angepasst und grün sind,
- `npm run lint` besteht,
- bei Datenänderungen Backup und `npm run validate-data` erfolgt sind,
- bei Frontendänderungen der Produktionsbuild besteht,
- die Änderung in `CHANGELOG.md` dokumentiert ist,
- Roadmap/ADR/Schema-Dokumentation bei Bedarf aktualisiert wurden.
