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
- Design: **Apple-Stil** (Tokens, Systemschrift, Material, Federn; grüner Primary).
- **Neu:** Einstufungstest + Lernplan bis zur Prüfung, eigene Karten aus PDF/Text,
  Rechen-Trainer, Einladungs-Codes + Admin-Bereich, Lerngruppen, Konto-Sync für
  Lernplan/eigene Karten, Playwright-E2E in CI (Stand 2026-10-20).

## Stufe 1 – Self-Hosting produktionsreif (P1)

Ziel: Die App läuft stabil auf dem eigenen Server (Proxmox-VM + Docker), Daten
sind gesichert, Updates sind risikoarm.

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 1.1 | ✅ Sandbox-Verifikation (Build, healthy, Login, Backup/Restore, Neustart). Offen: einmal auf dem Zielhost nach `DEPLOY_CHECKLIST.md` | S | belastbarer Erst-Deploy |
| 1.2 | ✅ `scripts/backup.sh` + `restore.sh` (Online-Backup, Rotation, Integritätsprüfung), Restore-Probe in `SELF_HOSTING.md` | S | Datenverlust ausgeschlossen |
| 1.3 | Update-Ablauf: Image-Tag je Release, Rollback per Tag, Healthcheck-Gate | S | sichere Updates |
| 1.4 | Monitoring: Uptime-Kuma o. ä. auf `/api/health`, Log-Rotation, Disk-Alarm | S | Ausfälle fallen auf |
| 1.5 | Impressum/Datenschutz der `/info`-Vorlage final ausfüllen | S | rechtlich sauber |
| 1.6 | Optional: Zugriff nur per VPN/Tailscale oder Basic-Auth vor dem Proxy, solange privat | S | kleinere Angriffsfläche |

## Stufe 2 – Konten & Lernstand (P1–P2)

Ziel: Mehrere Lernende nutzen eine Instanz, jeder mit eigenem Stand, ohne Admin-Aufwand.

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 2.1 | ✅ **Einladungs-Codes** für die Registrierung (Env `REGISTRATION=invite|open|closed`) | M | keine Fremd-Registrierungen |
| 2.2 | ✅ **Admin-Rolle** + schlichte Admin-Seite: Konten listen/sperren/löschen, Einladungen erzeugen | M | Instanz verwaltbar ohne SQL |
| 2.3 | Sitzungen verwalten: „auf allen Geräten abmelden", Liste aktiver Geräte | S | Kontrolle bei Geräteverlust |
| 2.4 | Passwort ändern (angemeldet) + optional TOTP-2FA | M | Konten sicherer |
| 2.5 | Server-seitiger **Export** (DSGVO-Auskunft als JSON, gleiches Format wie lokales Backup) | S | Auskunftsrecht erfüllt |
| 2.6 | Optional: **OIDC-Login** (Authentik/Keycloak im Homelab) statt eigener Passwörter | L | Single Sign-on |
| 2.7 | Konflikt-Sync auf `updatedAt` auch serverseitig (heute: Merge nur clientseitig) | M | keine verlorenen Reviews bei Parallelnutzung |

## Stufe 3 – Gamification & Motivation (P2)

Ziel: Dranbleiben bis zur Prüfung, ohne Druck oder Datenschutz-Probleme.

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 3.1 | ✅ **Lerngruppen**: Gruppe per Code beitreten, Rangliste nur innerhalb der Gruppe (Klasse/Betrieb) | M | sozialer Ansporn im kleinen Kreis |
| 3.2 | ✅ **Wochen-Challenges** (z. B. „50 Subnetting-Aufgaben"), abgeleitet aus Tags, mit Badge | M | thematischer Fokus |
| 3.3 | **Ligen** (Bronze/Silber/Gold) wochenweise aus Rangliste – Auf-/Abstieg | M | Duolingo-Effekt |
| 3.4 | Erinnerungen per **Web-Push** (opt-in, nur mit Backend; VAPID) | M | Streak-Schutz |
| 3.5 | ✅ Mehr Badges (Einstufung, eigener Stapel, Wochensieger, Level 5/10, 5000 XP) | S | mehr Meilensteine |
| 3.6 | XP-Boost für Schwächen-Training und fällige Wiederholungen (statt nur Masse) | S | belohnt sinnvolles Lernen |
| 3.7 | Profil-Seite: Level, Badges, Heatmap, Prüfungsreife auf einen Blick | S | Fortschritt sichtbar |

## Stufe 4 – Lernqualität & Inhalte (laufend, P1–P2)

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 4.1 | ✅ Set 5 (dünne Themen) · weiter: Weitere AP2-Übungssets entlang `lernapp/docs/AP2_THEMENMATRIX.md` (Lücken zuerst) | M je Set | breitere Abdeckung |
| 4.2 | ✅ **Rechen-Trainer** mit generierten Aufgaben: Subnetting, IPv6-Kürzung, RAID-Kapazität, USV/Stromkosten, Übertragungszeit | M | unendlich Übung für Punktebringer |
| 4.3 | **Reihenfolge-Format** (OSI, Incident-Ablauf, Subnetting-Schritte) | M | letztes offenes Abfrageformat |
| 4.4 | Fallstudien-Modus: ein Szenario, mehrere verknüpfte Teilaufgaben wie in der echten AP2 | L | prüfungsnah |
| 4.5 | Optional **KI-Bewertung** von Freitext-Antworten (eigener API-Key, nur Backend, opt-in) zusätzlich zur Schlagwortprüfung | M | feineres Feedback |
| 4.7 | ✅ Lernplan pro Konto syncen; offen: Re-Test nach jeder Planphase, Fortschritt je Thema im Plan anzeigen | M | Plan wandert mit, misst Lernerfolg |
| 4.8 | Eigene Karten: ✅ Backup, ✅ Konto-Sync; offen: Teilen per Datei, optional OCR (tesseract.js) für Scans | M | eigene Inhalte gehen nicht verloren |
| 4.6 | Fachliche Stichproben-Reviews der KI-generierten Fragen, Melde-Button „Frage fehlerhaft" | S | Vertrauen in Inhalte |

## Stufe 5 – Technik & Qualität (P2–P3)

| # | Aufgabe | Aufwand | Ergebnis |
|---|---|---|---|
| 5.1 | ✅ **Playwright-E2E** für Kernflows (Einstufung, Heute lernen, Rechnen, eigene Karten; Desktop + Mobil) in CI – offen: Login/Rangliste mit Backend | M | Browser-Regressionen fallen auf |
| 5.2 | ✅ Teil 1: Bundle entschlackt (Lucide-Namespace-Importe raus: vendor 1,18 MB → 427 KB, Precache 2,17 → 1,43 MiB). Offen: `exam_data` aus dem PWA-Precache lösen (Runtime-Caching), Daten lazy laden | M | kleinerer Erst-Download |
| 5.3 | ✅ Automatischer A11y-Check (axe, WCAG 2.1 AA, 7 Seiten × hell/dunkel) in der E2E-Suite; Kontrast behoben. Offen: manueller (Fokus, Kontrast in beiden Themes, Screenreader-Labels) | S | barrierearm |
| 5.4 | Echte shadcn-Komponenten (Radix-basiert) für Dialoge/Selects/Toasts, wo heute Eigenbau | M | konsistente Interaktion |

## Empfohlene Reihenfolge

1. Stufe 1 komplett (1.1–1.5) – Voraussetzung für alles mit mehreren Nutzern.
2. ~~2.1 Einladungs-Codes + 2.2 Admin-Seite~~ ✅ – Instanz kann geteilt werden.
3. ~~4.2 Rechen-Trainer~~ ✅
4. ~~3.1 Lerngruppen~~ ✅
5. ~~4.7 Lernplan + eigene Karten pro Konto syncen~~ ✅
6. ~~5.1 E2E-Tests~~ ✅ (Frontend; Backend-Flows folgen)
7. ~~3.2 Wochen-Challenges~~ ✅
8. ~~3.5 neue Badges~~ ✅ · ~~5.2 Bundle~~ ✅ (Teil 1)
9. ~~4.1 Set 5~~ ✅ (alle 16 Themen „Gut“) · ~~5.3 A11y automatisch~~ ✅
10. **Als Nächstes:** Stufe 1 auf dem Zielhost (Docker-Deploy, Backup/Restore-Probe,
    Monitoring) · 3.3 Ligen · 3.4 Web-Push-Erinnerungen · 4.4 Fallstudien-Modus ·
    5.1 E2E für Login/Rangliste mit Backend · 5.2 `exam_data` aus dem Precache.

## Einschätzung: Karten aus hochgeladenen PDFs

Umgesetzt als **regelbasierter Generator im Browser** (Aufwand: M, ca. 1 Tag).
Funktioniert gut bei strukturierten Lernzetteln (Glossarzeilen, Fragen,
Aufzählungen, Abkürzungen). Grenzen: Fließtext ohne Struktur liefert wenige
Karten, gescannte PDFs brauchen OCR. Darum gibt es die **Prüf-/Bearbeiten-
Ansicht vor dem Speichern**.

| Variante | Qualität | Aufwand | Datenschutz/Kosten |
|---|---|---|---|
| Regelbasiert im Browser (**jetzt umgesetzt**) | gut bei Struktur | M | nichts verlässt das Gerät, kostenlos |
| KI-Generierung über das Backend (Claude-API, eigener Key) | sehr gut, auch Fließtext | M–L | Inhalte gehen an die API, Kosten pro Seite, Missbrauchsschutz nötig |
| **Material bereitstellen → Import-Skript → feste Inhalte** | am besten (geprüft) | je Quelle S–M | wie bisher, rechtlich prüfen (ADR-007) |

Empfehlung: für **gemeinsame, geprüfte Inhalte** weiter den Import-Weg nutzen
(Unterlagen bereitstellen, aufbereiten, als Lerneinheiten/Fragen einspielen).
Der PDF-Import ist für **persönliche** Unterlagen (Berufsschule, Betrieb) gedacht.
