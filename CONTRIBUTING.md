# Weiterentwicklung

## Vor jeder Änderung

1. `git status --short --branch` prüfen und fremde/lokale Änderungen erhalten.
2. Relevante Anweisungen in `AGENTS.md` und der betroffenen Dokumentation lesen.
3. Ziel und Akzeptanzkriterien kurz festhalten.
4. Bei Änderungen an `exam_data.json`: zuerst `cd lernapp && npm run backup`.

## Implementierungsregeln

- Reine Logik nach `lernapp/src/lib/` auslagern und mit Vitest testen.
- UI-Klassen des Terminal-Designsystems aus `src/index.css` wiederverwenden.
- Fortschritt ausschließlich über die Context-APIs ändern; keine zweite lokale
  Wahrheit einführen.
- Lernzettel und Prüfungsdaten nicht direkt in `exam_data.json` reparieren. Import,
  Migration oder zentrale Korrekturfunktion verwenden.
- Neue Prüfungsinhalte eigenständig formulieren und Herkunft transparent markieren;
  keine geschützten Originalprüfungen veröffentlichen (ADR-007).
- Änderungen klein und thematisch zusammenhängend halten.

## Pflichtprüfungen

Frontend:

```powershell
cd lernapp
npm install
npm test
npm run lint
npm run validate-data
npm run build
```

Backend bei Änderungen unter `server/`:

```powershell
cd server
npm install
npm test
```

## Dokumentation jeder Änderung

- Immer einen Eintrag unter `CHANGELOG.md` → „Unveröffentlicht“ ergänzen.
- Den aktuellen Plan in `PROJECT_STATUS.md` nur ändern, wenn Priorität oder Status
  tatsächlich wechselt.
- Neue Grundsatzentscheidungen als ADR in `DECISIONS.md` dokumentieren.
- Datenformatänderungen zusätzlich in `lernapp/docs/FRAGEN_SCHEMA.md` erklären.
- Offene Ideen mit Priorität und Aufwand in `IMPROVEMENTS.md` eintragen.
- Historisch abgeschlossene Phasen in `ROADMAP.md` nicht nachträglich umschreiben.

## Commit-Stil

Kurze deutsche Betreffzeile mit Bereich, zum Beispiel:

```text
Content: AP2-Set 4 mit Netzwerk- und Backup-Aufgaben ergänzen
Feat: Tagesplan nach schwachen Themen priorisieren
Fix: Offline-Outbox beim erneuten Login leeren
Doku: Projektstatus und nächste Roadmap aktualisieren
```
