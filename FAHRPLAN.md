# Fahrplan – FiSi.dev Lernapp

Stand: 2026-10-20. Priorisierter Ausblick für die nächsten Ausbaustufen.
Detail-Backlog mit Historie: `IMPROVEMENTS.md`. Architekturentscheidungen: `DECISIONS.md`.

Leitlinie: **erst Betrieb sicher machen, dann Konten ausbauen, dann Motivation,
parallel immer Inhalte.** Jede Stufe ist einzeln auslieferbar.

## Ist-Stand (kurz)

- Frontend: React-PWA, offline-fähig, ohne Konto voll nutzbar (localStorage).
- Backend (optional): Fastify + SQLite, E-Mail/Passwort (argon2id), Session-Cookies,
  Recovery-Code statt Mail-Reset, Sync von Lernstand + Gamification, Konto-Löschung.
- Gamification: Streak mit Freeze, Tagesziel, Tages-Quests, XP/Level, Badges,
  Heatmap, **neu: opt-in Wochen-Rangliste**.
- Lernmodi: Heute lernen, Schwächen, Lernpfade, Karteikarten, FSRS-Wiederholen,
  Quiz, Lückentext, Drill, **neu: Zuordnen**, Klausur-Simulation.
- Design: **shadcn/ui-Stil** (Tokens, zinc + grüner Primary, Geist-Fonts).

## Stufe 1 – Self-Hosting produktionsreif (P1)

Ziel: Die App läuft stabil auf dem eigenen Server (Proxmox-VM + Docker), Daten
sind gesichert, Updates sind risikoarm.

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 1.1 | `docker compose build` + Deploy auf dem Zielhost real verifizieren (`DEPLOY_CHECKLIST.md`) | S | belastbarer Erst-Deploy |
| 1.2 | Automatisches SQLite-Backup (`sqlite3 .backup` per Cron/Sidecar) + **Restore-Probe** dokumentieren | S | Datenverlust ausgeschlossen |
| 1.3 | Update-Ablauf: Image-Tag je Release, Rollback per Tag, Healthcheck-Gate | S | sichere Updates |
| 1.4 | Monitoring: Uptime-Kuma o. ä. auf `/api/health`, Log-Rotation, Disk-Alarm | S | Ausfälle fallen auf |
| 1.5 | Impressum/Datenschutz der `/info`-Vorlage final ausfüllen | S | rechtlich sauber |
| 1.6 | Optional: Zugriff nur per VPN/Tailscale oder Basic-Auth vor dem Proxy, solange privat | S | kleinere Angriffsfläche |

## Stufe 2 – Konten & Lernstand (P1–P2)

Ziel: Mehrere Lernende nutzen eine Instanz, jeder mit eigenem Stand, ohne Admin-Aufwand.

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 2.1 | **Einladungs-Codes** für die Registrierung (Env `REGISTRATION=invite|open|closed`) | M | keine Fremd-Registrierungen |
| 2.2 | **Admin-Rolle** + schlichte Admin-Seite: Konten listen/sperren/löschen, Einladungen erzeugen | M | Instanz verwaltbar ohne SQL |
| 2.3 | Sitzungen verwalten: „auf allen Geräten abmelden", Liste aktiver Geräte | S | Kontrolle bei Geräteverlust |
| 2.4 | Passwort ändern (angemeldet) + optional TOTP-2FA | M | Konten sicherer |
| 2.5 | Server-seitiger **Export** (DSGVO-Auskunft als JSON, gleiches Format wie lokales Backup) | S | Auskunftsrecht erfüllt |
| 2.6 | Optional: **OIDC-Login** (Authentik/Keycloak im Homelab) statt eigener Passwörter | L | Single Sign-on |
| 2.7 | Konflikt-Sync auf `updatedAt` auch serverseitig (heute: Merge nur clientseitig) | M | keine verlorenen Reviews bei Parallelnutzung |

## Stufe 3 – Gamification & Motivation (P2)

Ziel: Dranbleiben bis zur Prüfung, ohne Druck oder Datenschutz-Probleme.

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 3.1 | **Lerngruppen**: Gruppe per Code beitreten, Rangliste nur innerhalb der Gruppe (Klasse/Betrieb) | M | sozialer Ansporn im kleinen Kreis |
| 3.2 | **Wochen-Challenges** (z. B. „50 Subnetting-Aufgaben"), abgeleitet aus Tags, mit Badge | M | thematischer Fokus |
| 3.3 | **Ligen** (Bronze/Silber/Gold) wochenweise aus Rangliste – Auf-/Abstieg | M | Duolingo-Effekt |
| 3.4 | Erinnerungen per **Web-Push** (opt-in, nur mit Backend; VAPID) | M | Streak-Schutz |
| 3.5 | Mehr Badges: erste Klausur, 7 Tage Quests komplett, alle Lernpfade eines Themas | S | mehr Meilensteine |
| 3.6 | XP-Boost für Schwächen-Training und fällige Wiederholungen (statt nur Masse) | S | belohnt sinnvolles Lernen |
| 3.7 | Profil-Seite: Level, Badges, Heatmap, Prüfungsreife auf einen Blick | S | Fortschritt sichtbar |

## Stufe 4 – Lernqualität & Inhalte (laufend, P1–P2)

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 4.1 | Weitere AP2-Übungssets entlang `lernapp/docs/AP2_THEMENMATRIX.md` (Lücken zuerst) | M je Set | breitere Abdeckung |
| 4.2 | **Rechen-Trainer** mit generierten Aufgaben: Subnetting, IPv6-Kürzung, RAID-Kapazität, USV/Stromkosten, Übertragungszeit | M | unendlich Übung für Punktebringer |
| 4.3 | **Reihenfolge-Format** (OSI, Incident-Ablauf, Subnetting-Schritte) | M | letztes offenes Abfrageformat |
| 4.4 | Fallstudien-Modus: ein Szenario, mehrere verknüpfte Teilaufgaben wie in der echten AP2 | L | prüfungsnah |
| 4.5 | Optional **KI-Bewertung** von Freitext-Antworten (eigener API-Key, nur Backend, opt-in) zusätzlich zur Schlagwortprüfung | M | feineres Feedback |
| 4.6 | Fachliche Stichproben-Reviews der KI-generierten Fragen, Melde-Button „Frage fehlerhaft" | S | Vertrauen in Inhalte |

## Stufe 5 – Technik & Qualität (P2–P3)

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 5.1 | **Playwright-E2E** für Kernflows (Heute lernen, Klausur, Login, Rangliste) in CI | M | Browser-Regressionen fallen auf |
| 5.2 | `exam_data` aus dem PWA-Precache lösen (Runtime-Caching), Daten lazy laden | M | kleinerer Erst-Download |
| 5.3 | A11y-Pass (Fokus, Kontrast in beiden Themes, Screenreader-Labels) | S | barrierearm |
| 5.4 | Echte shadcn-Komponenten (Radix-basiert) für Dialoge/Selects/Toasts, wo heute Eigenbau | M | konsistente Interaktion |

## Empfohlene Reihenfolge

1. Stufe 1 komplett (1.1–1.5) – Voraussetzung für alles mit mehreren Nutzern.
2. 2.1 Einladungs-Codes + 2.2 Admin-Seite – dann kann die Instanz geteilt werden.
3. 4.2 Rechen-Trainer – größter Lernnutzen für die AP2.
4. 3.1 Lerngruppen – macht die neue Rangliste im Klassenkontext richtig wertvoll.
5. 5.1 E2E-Tests, bevor die Nutzerzahl wächst.
