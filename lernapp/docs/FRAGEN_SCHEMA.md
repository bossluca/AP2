# Fragen-Schema & Schlagwörter für den Klausur-Modus

Diese Datei beschreibt, **wie AP2-Prüfungen (oder beliebige Prüfungen) als Daten
formatiert werden** und wie die **flexible Antwort-Prüfung per Schlagwörtern**
funktioniert. Sie ist die Referenz, wenn du eigene Prüfungsfragen einpflegst.

Datenquelle ist [`src/data/exam_data.json`](../src/data/exam_data.json), Schlüssel
`exams`. Vor jeder Datenänderung: `npm run backup`.

---

## 1. Aufbau einer Prüfung (`exams[]`)

Jeder Eintrag in `exams` ist **ein Prüfungstermin** mit `meta` + `fragen`:

```jsonc
{
  "meta": {
    "jahr": 2024,
    "saison": "Frühjahr",              // "Frühjahr" | "Herbst"
    "fachrichtung": "Fachinformatiker Systemintegration",
    "teil": "AP2",
    "titel": "Ganzheitliche Aufgabe …",
    "datum": "…",                       // optional
    "dauer": "90 Minuten",             // wird vom Timer im Klausur-Modus gelesen
    "punkte_gesamt": 100,
    "pruefungsteil": "AP2"             // WICHTIG: "AP1" oder "AP2"
  },
  "fragen": [ /* siehe unten */ ]
}
```

> Der Klausur-Modus zeigt automatisch jede Prüfung an, die **mindestens eine
> lernbare Frage** hat. Die Reihenfolge der Fragen bleibt wie im Array.

## 2. Aufbau einer Frage (`fragen[]`)

```jsonc
{
  "id": "2024_Frühjahr_1a",       // eindeutig! Schema: <jahr>_<saison>_<aufgabe><teil>
  "jahr": 2024,
  "saison": "Frühjahr",
  "aufgabe_nr": 1,
  "aufgabe_titel": "Netzwerk planen", // optional, Überschrift der Aufgabe
  "teilfrage": "1a",
  "ueberschrift": "",                  // optional
  "frage_text": "Was ist ein Server?", // Markdown erlaubt
  "punkte": 5,                          // Gewicht in der Auswertung (Default 1)
  "loesung_text": "Ein Rechner, der zentral Dienste bereitstellt …", // Markdown
  "hat_antwort": true,
  "hat_offizielle_loesung": true,
  "unverifiziert_markiert": false,      // true → Warnhinweis „nicht offiziell"
  "thema_tags": ["Server", "Virtualisierung"],
  "ist_kontext_block": false,           // true = reiner Situationstext, keine Frage
  "mindest_treffer": 2,                 // OPTIONAL: "Nennen Sie N …" – N Treffer genügen (§3)
  "schluesselwoerter": [ /* OPTIONAL – siehe §3 */ ]
}
```

### Kontext-/Situationsblöcke
Eine längere Handlungssituation, die für mehrere Teilfragen gilt, wird als eigener
Eintrag mit `"ist_kontext_block": true` und derselben `aufgabe_nr` geführt. Im
Klausur-Modus erscheint sie als aufklappbarer **„Situation / Kontext"**-Block über
den Fragen dieser Aufgabe.

---

## 3. Schlagwörter (`schluesselwoerter`) – flexible Antwortprüfung

Im Klausur-Modus beantwortest du Fragen im **Freitext**. Sind Schlagwörter
hinterlegt, prüft die App automatisch, **welche** davon (oder gleichwertige
Synonyme) in deiner Antwort vorkommen – **die Formulierung darf abweichen.**

Beispiel „Was ist ein Server?" – beide Antworten gelten als (teil-)richtig:
- *„Hardware für Unternehmen mit großer Rechenleistung"*
- *„eine virtuelle Maschine, die Dienste bereitstellt"*

### Format
Ein Schlagwort ist entweder ein **String** oder ein **Objekt**:

```jsonc
"schluesselwoerter": [
  "Dienst",                                    // Kurzform: einfacher String
  { "begriff": "virtuelle Maschine",
    "synonyme": ["VM", "Hardware"] },          // Begriff + gleichwertige Alternativen
  { "begriff": "zentral", "pflicht": true,     // pflicht: muss vorkommen, sonst nie „richtig"
    "label": "zentrale Bereitstellung" }       // label: Anzeigename im Feedback
]
```

| Feld       | Pflicht | Bedeutung                                                        |
|------------|---------|-----------------------------------------------------------------|
| `begriff`  | ja      | Haupt-Schlagwort/Phrase, nach der gesucht wird.                 |
| `synonyme` | nein    | Gleichwertige Formulierungen – **eine** genügt für den Treffer. |
| `pflicht`  | nein    | `true` = ohne dieses Schlagwort nie Gesamtbewertung „richtig".  |
| `label`    | nein    | Anzeigename im Feedback (Default: `begriff`).                   |

### Wie gematcht wird (wichtig fürs Formulieren guter Schlagwörter)
- **Groß-/Kleinschreibung egal**, Umlaute werden gefaltet: „ü" = „ue", „ß" = „ss".
  → Lernende dürfen auch ohne Sonderzeichen tippen.
- **Längere Begriffe** (> 3 Zeichen) matchen als **Teilstring** – gut für Komposita.
- **Kurze Begriffe** (≤ 3 Zeichen, z. B. „VM", „IP", „OS") matchen nur an
  **Wortgrenzen**, damit sie nicht zufällig in längeren Wörtern auftauchen.
- **Kein unscharfes Stemming.** Verwende daher **Wortstämme/Kurzformen** als
  Begriff, damit Flexionen mitmatchen:
  - ✅ `"bereitstell"` trifft „bereitstellen" **und** „bereitstellt".
  - ⚠️ `"bereitstellen"` trifft **nicht** „bereitstellt".
  - ✅ `"Dienst"` trifft „Dienst", „Dienste", „Dienstleistung".

### Bewertungs-Logik (Vorschlag)
Aus dem Anteil getroffener Schlagwörter (`Treffer / Gesamt`) schlägt die App vor:

| Anteil      | + Pflicht erfüllt | Vorschlag    |
|-------------|-------------------|--------------|
| ≥ 80 %      | ja                | **richtig**  |
| ≥ 40 %      | –                 | **teilweise**|
| < 40 %      | –                 | **falsch**   |

Der Vorschlag ist **nur ein Vorschlag** – die finale Selbsteinschätzung
(richtig/teilweise/falsch) triffst du immer selbst und kannst ihn überschreiben.
Ohne `schluesselwoerter` entfällt die Auto-Prüfung; dann zählt reine
Selbsteinschätzung (wie im Quiz).

#### „Nennen Sie N …"-Fragen (`mindest_treffer`)
Bei Aufzählungsfragen („Nennen Sie **zwei** Vorteile …") ist die Schlagwortliste
eine **Auswahl gleichwertiger** richtiger Antworten – es genügen **N** davon. Setze
dafür `"mindest_treffer": N` auf der Frage. Dann zählt die **Trefferzahl** statt des
Anteils: ab `N` Treffern (und erfüllter Pflicht) → **richtig**, ≥ 1 → **teilweise**,
0 → **falsch**. Ohne das Feld bleibt es bei der Anteils-Bewertung oben (gut für „alle
Aspekte nötig"-Fragen). Die Engine erhält den Wert als `optionen.erforderlich`.

Die Engine ist rein und getestet:
[`src/lib/antwortpruefung.js`](../src/lib/antwortpruefung.js) ·
Tests: [`src/lib/antwortpruefung.test.js`](../src/lib/antwortpruefung.test.js).

---

## 4. Struktur-Konventionen (für gut sortierte Fragen)

- **Thematisch in Aufgaben gliedern:** `aufgabe_nr` + `aufgabe_titel` bündeln zusammen-
  gehörige Teilfragen (`teilfrage` = `1a`, `1b`, …). So bleibt eine Klausur übersichtlich.
- **Konsistentes Tag-Vokabular** in `thema_tags` (gleiche Schreibweise wie bei den
  Lernzetteln), z. B.: `Netzwerk/IP-Adressierung`, `Virtualisierung`,
  `Datenschutz/IT-Sicherheit`, `Datensicherung/Storage`, `Datenbank/SQL/ER-Modell`,
  `Wirtschaftlichkeit/Kosten`, `Projektmanagement`, `Hardware/Komponenten`. Gute Tags
  steuern Filter, SRS-Gruppierung und die Schwachstellen-Statistik.
- **Punkte realistisch** (`punkte`) – fließen gewichtet in die Klausur-Auswertung.
- **Schlagwörter als Stämme/Synonyme** (siehe §3), damit Formulierungen abweichen dürfen.
- **KI-/Eigeninhalte kennzeichnen:** `quelle` z. B. `"KI-generiert (an AP2-Prüfungs-
  themen angelehnt, nicht offiziell)"`, `meta.status` entsprechend. **Nie** offizielle
  Aufgaben 1:1 übernehmen (Urheberrecht, `DECISIONS.md` ADR-007).

**Referenz-Beispiele:** [`scripts/import/import-ap2-pruefungsfragen.mjs`](../scripts/import/import-ap2-pruefungsfragen.mjs)
baut eine komplette, strukturierte AP2-Übungsklausur (7 Aufgaben, Schlagwörter) –
idempotent, als Vorlage für weitere Sets nutzbar. Set 4 unter
[`scripts/import/import-ap2-pruefungsfragen-4.mjs`](../scripts/import/import-ap2-pruefungsfragen-4.mjs)
zeigt zusätzlich den verpflichtenden Keyword-Selbsttest.

Die reproduzierbare Abdeckungsanalyse wird mit `npm run analyse-ap2` erzeugt und
nach [`AP2_THEMENMATRIX.md`](AP2_THEMENMATRIX.md) geschrieben.

## 5. Empfohlener Weg zum Einpflegen

1. `npm run backup` (Sicherung von `exam_data.json`).
2. Neues Prüfungsobjekt in `exams` ergänzen (am besten per **Import-Skript** unter
   `scripts/import/` analog zu `import-ap2-pruefungsfragen.mjs` – reproduzierbar &
   idempotent). `pruefungsteil: "AP2"` setzen.
3. `npm run validate-data` und `npm test` ausführen.
4. `schluesselwoerter` je Frage ergänzen (kann auch später nachgezogen werden –
   der Klausur-Modus funktioniert ohne sie).
5. Ein Commit pro Quelle/Prüfungstermin.
