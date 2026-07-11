# Produkt-Strategie — von „gute Lern-App" zu „beste Prüfungsvorbereitung"

> Stand: 2026-06-27 · Grundlage: vollständige Bestandsaufnahme der App + Vergleich
> mit führenden Lernplattformen (Anki/FSRS, Duolingo, Quizlet, Brilliant, IHK-Prep
> wie prozubi/AzubiWorld). Ergänzt `ROADMAP.md` (Phasen 0–5, erledigt) und das
> lebende Backlog `IMPROVEMENTS.md`. Top-Initiative am Ende im PRD-Format (Pocock
> `to-prd`). **Leitfrage:** Was macht ein Lernender *wirklich* besser/schneller fit
> für die AP2 – und bleibt dabei dran?

---

## 1. Wo wir stehen (ehrliche Einordnung)

Die App ist **bereits weit vorne** für ein Lernprojekt – viele „Plattform"-Features
sind da und sauber gebaut (tiefe, getestete Module; 117 Tests; PWA/offline; Backend-Sync):

| Bereich | Vorhanden |
|---|---|
| **Spaced Repetition** | Leitner (5 Boxen), `lib/srs.js` |
| **Übungsmodi** | Karteikarten, Quiz (Selbsteinschätzung), „Heute lernen"-Smart-Session, Schwächen-Training, Klausur-Simulation (Freitext + Schlagwort-Check + Timer) |
| **Gamification** | Streak + Tagesziel, XP/Level, GitHub-Heatmap, 10 Badges, Konfetti |
| **Statistik** | % gelernt, Box-Verteilung, Fälligkeit, **Schwachstellen je Tag**, Verlauf, Aufschlüsselung AP1/AP2 |
| **Inhalt** | 287 Prüfungseinträge (6 AP1 paraphrasiert + 4 AP2-Übungsklausuren), 278 Lernzettel |
| **Technik** | React 19/Vite 6/Tailwind 4, PWA/offline, Dark-Mode, Mobile-Bottom-Nav, Fastify-Backend mit Auth + Sync, reproduzierbare Import-Pipeline |

**Das ist eine starke Basis.** Der nächste Sprung kommt nicht aus „mehr vom Gleichen",
sondern aus drei gezielten Hebeln, die führende Plattformen vom Rest trennen:
**(1) ein echtes Gedächtnismodell, (2) aktives, objektiv geprüftes Abfragen,
(3) sichtbare Prüfungsreife.**

---

## 2. Vergleich mit den Besten — was sie können, was uns fehlt

### A. Lerneffektivität (das Wichtigste bei einem Prüfungs-Tool)

| Führende Plattform | Mechanik | Bei uns | Lücke / Hebel |
|---|---|---|---|
| **Anki (seit 2024 FSRS-Default)** | **FSRS**-Scheduler: modelliert *Stabilität*, *Schwierigkeit*, *Abrufwahrscheinlichkeit* je Karte und plant die Wiederholung exakt zum Vergessenszeitpunkt (Ziel-Retention z. B. 90 %). **4 Bewertungsstufen** (Nochmal/Schwer/Gut/Leicht). | **Leitner**, fixe Intervalle `[1,2,4,8,16]` Tage, **binär** richtig/falsch | **Größter Effizienz-Hebel.** Gleiche Retention bei deutlich weniger Wiederholungen; plant individuell statt pauschal. Wir speichern schon `box/due/history` → Migrationspfad da. |
| **Quizlet „Learn"** | Adaptiver Mix aus Wiedererkennen → Abrufen, steigert Schwierigkeit mit Sicherheit. | Quiz = **nur Selbsteinschätzung**, kein objektives Urteil | Objektiv geprüfte Formate fehlen (s. B). |
| **UWorld / GMAT/SAT-Prep / IHK-Prep** | **Prüfungsreife-Score** + Themen-Mastery, „du bist bei Thema X zu 62 %". | Schwachstellen je Tag (gut!), aber **keine** Reife-Prognose | Aus vorhandenen Daten ableitbar → **Killer-Feature** für Prüfungs-Prep. |

### B. Abfrage-Formate (aktives Erinnern schlägt passives Lesen)

| Format | Wer | Effekt | Bei uns |
|---|---|---|---|
| **Multiple Choice** (mit Distraktoren) | alle | schnell, objektiv, mobil, ideal für Drills | ❌ |
| **Lückentext / Cloze** | Anki, Quizlet | starkes aktives Abrufen; aus Lernzettel-Fettbegriffen generierbar | ❌ |
| **Matching/Paare** (Quizlet „Match") | Quizlet, Kahoot | spielerisch, schnell, Begriff ↔ Definition | ❌ |
| **Reihenfolge/Sortieren** | Brilliant | für Prozesse (OSI-Schichten, Subnetting-Schritte) | ❌ |
| **Freitext mit Auto-Bewertung** | – | echtes Formulieren | ✅ (Klausur, Schlagwort-Engine) |

> Heute prüft die App Wissen fast nur über **Selbsteinschätzung** oder
> **Schlagwort-Matching**. Beides ist ehrlich, aber: objektive, sofort-bewertete,
> abwechslungsreiche Formate erhöhen *active recall* **und** Spaßfaktor.

### C. Bindung / Motivation (Duolingo-Klasse — aber gesund für Erwachsene)

| Mechanik | Duolingo | Bei uns | Bewertung |
|---|---|---|---|
| Streak + Tagesziel | ✅ | ✅ | gut |
| **Streak-Freeze/Reparatur** | ✅ | ❌ | sinnvoll (verhindert „Streak weg → ich höre auf") |
| **Tages-Quests** | ✅ | ❌ | kleine, machbare Tagesziele |
| **Liga/Bestenliste** (opt-in) | ✅ | ❌ (P3) | stark motivierend – **nur opt-in & anonym** (erwachsenes Publikum) |
| Push-Erinnerung | ✅ | ❌ (PWA da) | opt-in, Uhrzeit wählbar |
| Hearts/Lives, FOMO-Druck | ✅ | ❌ | **bewusst NICHT** übernehmen (Dark Pattern) |

### D. Feedback-Tiefe & Politur

- **„Warum?"-Erklärung** zu jeder Antwort + Verknüpfung Übungsfrage → passender Lernzettel (Inhalt und Übung verzahnen) — heute getrennt.
- **KI-Erklärung bei falscher Antwort** (Backend + Claude-API, opt-in): erklärt den Fehler, erzeugt Varianten — echtes Differenzierungsmerkmal.
- Politur: CI, A11y-Pass, Command-Palette (Cmd-K), Toaster/Skeletons, Fortschritts-Export — meist schon im Backlog.

---

## 3. Die 6 größten Hebel (nach Nutzen-pro-Aufwand)

Reihenfolge = Lernerfolg-pro-Aufwand (so von der Best-Practice-Recherche bestätigt und
priorisiert). Alle sechs **verstärken sich gegenseitig**: FSRS plant, Cloze/Confidence
liefern bessere Erinnerungs-Signale, Mastery macht daraus eine Reife-Prognose, Streak-Freeze
hält die Schleife am Leben.

1. **FSRS-Scheduler** statt Leitner — modernes Gedächtnismodell (Stabilität/Schwierigkeit/
   Abrufwahrscheinlichkeit), 4 Bewertungsstufen. Lib **`ts-fsrs`** (FSRS-6, ~0 Deps,
   100 % clientseitig) oder ~100 Zeilen selbst. **~20–30 % weniger Wiederholungen** bei
   gleicher Retention; Anki-Default seit v23.10 (Nov 2023). *(größter Effizienz-Hebel)*
2. **Lückentext / Cloze** — günstigster Weg zu echtem *active recall*, automatisch aus
   Lernzettel-Fettbegriffen generierbar. MC + Matching folgen. *(Effektivität + Spaß)*
3. **Prüfungsreife: Mastery je Thema + prognostizierte Punktzahl** — „bist du bereit?",
   was als Nächstes lernen; reine Funktionen über vorhandene Daten (Punkte je Frage!). *(Killer-Feature)*
4. **Feedback-Quick-Wins** — bei falscher Freitext-Antwort die **verfehlten Schlagwörter**
   zeigen (Engine kennt sie schon) + **Übung ↔ Lernzettel-Deeplink** (`quelle`/IDs vorhanden). *(billig, hoher Hebel)*
5. **Streak-Freeze + nachträgliche Reparatur** — macht den Streak motivierend statt
   stressig (Harm-Reduction), ohne Hearts/FOMO. *(gesunde Bindung)*
6. **Confidence-based Answering** („wie sicher?" vor dem Aufdecken) — bestraft *sicher-falsch*
   am stärksten, deckt gefährliche Fehl-Sicherheit auf, speist FSRS/Schwächen-Training. *(für Erwachsene besonders wertvoll)*

> Danach als Differenzierer: **KI-Erklärung bei Fehlern** (opt-in, Backend; Erklärungen
> in SQLite **cachen** = 1× generieren statt pro Nutzer) und **opt-in Wochen-Liga**.

**Bewusst NICHT:** Framework-Wechsel (Stack reicht, s. IMPROVEMENTS §6), Hearts/Lives,
schuld-/FOMO-getriebene Notifications, Pay-to-unfreeze, 1:1-Originalprüfungen (Urheberrecht, ADR-007).

---

## 4. Plan: sinnvolle Reihenfolge mit Best Practices

Durchgängige Prinzipien (wie bisher): **reine, getestete Module** hinter kleinen
Schnittstellen; **additive** Datenfelder; **reproduzierbare Import-Skripte**;
`prefers-reduced-motion`; vor Datenänderung `npm run backup`; Tests grün; kleine Commits.

### Sprint 0 — Schutznetz + Quick Wins (sofort, S) · **vorab**
- **GitHub Actions CI**: `npm test` (Frontend + Backend) + `npm run build` + `validate-data` bei jedem Push. Hält alles Folgende grün.
- **`schwierigkeit` (1–3)** als optionales Frage-/Objektfeld einführen (additiv) — Voraussetzung für FSRS-Initialschwierigkeit und adaptive Auswahl.
- **Feedback-Quick-Wins** (billig, sofort spürbar, reine UI über vorhandene Daten):
  - bei falscher Freitext-Antwort die **verfehlten Pflicht-/Schlagwörter** anzeigen (die Engine `antwortpruefung.js` kennt sie bereits),
  - **Übung → passender Lernzettel** als Deeplink (`quelle`/IDs vorhanden) — Inhalt und Übung verzahnen,
  - **farb-unabhängiges** Richtig/Falsch (Icon + Text, nicht nur rot/grün) in `bewertung.js` (A11y).

### Sprint 1 — Gedächtnismodell: FSRS (M–L) · *Hebel #1*
- Neues reines Modul `lib/fsrs.js` **hinter der bestehenden SRS-Naht** (gleiche
  Schnittstelle wie `bewerten`/`istFaellig`, intern FSRS statt Leitner) → austauschbar,
  voll testbar. **Zwei Adapter = echte Naht** (Leitner-Altdaten ↔ FSRS).
- Umsetzung via **`ts-fsrs`** (FSRS-6, ~0 Deps, clientseitig) oder schlanker Eigenport
  (~100 Zeilen reine Mathematik, analog `lib/level.js`). Standardgewichte zuerst;
  **personalisierte Optimierung** (braucht ~1000 Reviews) bewusst später.
- **4-stufige Bewertung** (Nochmal/Schwer/Gut/Leicht) in Wiederholen/„Heute lernen";
  binär bleibt als Fallback (Quiz-Selbsteinschätzung mappt darauf).
- **Migration** vorhandener `box/due` → FSRS-State (`stability`/`difficulty`/`reps`/
  `last_review`, additiv, idempotent, getestet). Backend-`progress`-Schema additiv erweitern.
- **Ziel-Retention** konfigurierbar (Default 90 %; Intervall ≈ Stabilität).
  Forgetting-Curve-Mini-Viz in Statistik.

### Sprint 2 — Aktives Abfragen: neue Formate (M–L) · *Hebel #2 & #4*
- **Schema additiv erweitern**: `typ` (`freitext`|`mc`|`cloze`|`matching`|`reihenfolge`),
  `optionen`/`loesung_index` (MC), `luecken` (Cloze), Paare (Matching). Dokumentiert in `FRAGEN_SCHEMA.md`.
- **Ein Renderer je Typ** + gemeinsame, getestete Auswerte-Funktion (Single Source).
- **Glossar/Begriffskarten** per Import-Skript aus Lernzettel-Fettbegriffen erzeugen
  → speist **Matching-Spiel** und **Lückentext** (viel Material mit wenig Aufwand).
- **Cloze zuerst** (höchster Nutzen/Aufwand), dann MC/Matching/Reihenfolge.
- **Confidence-based Answering**: vor dem Aufdecken „wie sicher?" abfragen; *sicher-falsch*
  am stärksten gewichten und gezielt ins FSRS-/Schwächen-Training einspeisen. *(Hebel #6)*
- Neuer **„Drill/Match"-Modus** (schnell, mobil, spielerisch); Quiz um Typen erweitern.

### Sprint 3 — Prüfungsreife sichtbar machen (M) · *Hebel #3*
- **Mastery je Thema** (0–100 %) aus FSRS-Abrufwahrscheinlichkeit + jüngster Trefferquote je Tag (baut auf `statistik.js`).
- **Mastery-Schwelle**: „prüfungsbereit" erst bei z. B. ≥ 80 % über ≥ N jüngste Items
  aus ≥ 2 Schwierigkeitsstufen (kein Bestehen durch eine zufällige leichte Frage).
- **Prognostizierte AP2-Punktzahl / Bestehenswahrscheinlichkeit** — Themen-Mastery
  **gewichtet mit der offiziellen Punkteverteilung** (Daten haben Punkte je Frage; IRT-lite:
  Schwierigkeit je Frage + laufende Fähigkeitsschätzung, kein volles psychometrisches Modell).
- **Prüfungsreife-Gauge** gesamt + „lerne als Nächstes diese 3 Themen".
- **Prüfungstermin setzen → Countdown + Tagesplan** („bis zur AP2 noch N Tage,
  heute X Karten für Ziel-Retention"). Sehr motivierend, terminbezogen.

### Sprint 4 — Gesunde Bindung (S–M) · *Hebel #5*
- **Streak-Freeze** (1–2 „Joker"), **Tages-Quests** (3 kleine Aufgaben), **„Weiterlernen"/Resume**, **Push-Erinnerung** (PWA, opt-in, Uhrzeit wählbar).
- **Opt-in Wochen-Liga** (Backend, anonym) — bewusst ohne Druck/Dark Patterns.

### Sprint 5 — Tiefe & Politur (laufend) · *Differenzierer + Qualität*
- **KI-Erklärung bei Fehlern** (Backend + Claude-API, opt-in, Kosten/Key bewusst): erklärt
  Fehler, erzeugt Übungsvarianten, beantwortet „warum". **Erklärungen in SQLite cachen**
  → je Frage 1× generieren statt pro Nutzer (Kosten/Latenz). Klar als „KI-generiert" labeln.
- **Worked Examples** für Rechenthemen (Subnetting/Netzplan/TCO) — Schritt für Schritt.
- A11y-Pass (Fokus-Management bei Routen-/Modalwechsel, ARIA-Live für Antwort-Feedback),
  Command-Palette (Cmd-K), Toaster/Skeletons, Fortschritts-Export/-Import, E2E (Playwright) für Kern-Flows.

**Empfohlener Start:** Sprint 0 → Sprint 1 (FSRS). Das ist der größte Hebel auf den
eigentlichen Zweck (Prüfung bestehen) und schafft die Datenbasis (Abrufwahrscheinlichkeit)
für Sprint 3 (Reife) und Sprint 2 (adaptive Format-Auswahl).

---

## 5. Top-Initiative als PRD (Pocock `to-prd`-Format)

### Problem Statement
Lernende wollen die AP2 **effizient** bestehen, müssen aber heute selbst raten, *was*
und *wann* sie wiederholen sollen. Der Leitner-Algorithmus plant pauschal (fixe
Intervalle, nur richtig/falsch) und das Quiz urteilt nicht objektiv — die App weiß
nicht, *wie sicher* etwas wirklich sitzt, und kann darum weder optimal timen noch
„du bist bereit" sagen.

### Solution
Ein **echtes Gedächtnismodell (FSRS)** im Kern, das je Lernobjekt Abrufwahrscheinlichkeit
schätzt und Wiederholungen individuell zum richtigen Zeitpunkt plant — mit **4
Bewertungsstufen**. Darauf aufbauend ein **Prüfungsreife-Score** je Thema, der aus den
FSRS-Daten ableitet, was als Nächstes dran ist und ob man (relativ zum Prüfungstermin)
auf Kurs ist.

### User Stories
1. Als Lernender möchte ich eine Karte mit **Nochmal/Schwer/Gut/Leicht** bewerten, damit die Wiederholung zu meinem tatsächlichen Gedächtnis passt.
2. Als Lernender möchte ich nur die Objekte sehen, die ich **heute** wiederholen sollte, damit ich weder zu früh noch zu spät übe.
3. Als Lernender möchte ich, dass mein **bisheriger Leitner-Stand** automatisch übernommen wird, damit ich keinen Fortschritt verliere.
4. Als Lernender möchte ich pro Thema eine **Reife in %** sehen, damit ich weiß, wo ich stehe.
5. Als Lernender möchte ich „**lerne als Nächstes diese 3 Themen**", damit ich nicht selbst priorisieren muss.
6. Als Lernender möchte ich meinen **Prüfungstermin** setzen und einen **Countdown + Tagesplan** sehen, damit ich rechtzeitig fertig werde.
7. Als Lernender möchte ich eine **Ziel-Retention** wählen (z. B. 90 %), damit ich Aufwand und Sicherheit selbst steuere.
8. Als Lernender möchte ich, dass die **Selbsteinschätzung im Quiz** weiterhin funktioniert (auf die 4 Stufen gemappt), damit kein Modus bricht.
9. Als Nutzer ohne Konto möchte ich, dass FSRS **rein lokal** funktioniert, damit die App offline voll nutzbar bleibt.

### Implementation Decisions
- Neues Modul **`lib/fsrs.js`** an der **bestehenden SRS-Naht**; Schnittstelle bleibt
  klein (`bewerten(entry, note, jetzt) → {…fsrsState, due}`, `istFaellig(entry, jetzt)`).
  Leitner bleibt als zweiter Adapter erhalten → die Naht ist real (zwei Adapter), Auswahl
  per Feature-Flag/Migration.
- **Datenfelder additiv** (`stability`, `difficulty`, `last_review`, `reps`, optional
  `state`); `box/due/history` bleiben für Rückwärtskompatibilität. Backend-Schema
  (`progress`) additiv erweitern; localStorage-`_v1` ohne Key-Bump (nur additive Felder).
- **Bewertung 4-stufig**; vorhandene `richtig/teilweise/falsch` mappen deterministisch
  auf FSRS-Noten. XP/Streak/Statistik konsumieren weiter denselben Fortschritt.
- **Mastery/Reife** als reine Funktion über (FSRS-Retrievability je Objekt + Tag-Aggregat),
  erweitert `lib/statistik.js`; **Prüfungstermin** als lokale Einstellung (Theme-/Settings-Context).
- Kein Framework-Wechsel; keine schwere Lib (FSRS-Kurve via reiner JS-Mathematik,
  analog `lib/level.js`).

### Testing Decisions
- Nur **externes Verhalten** testen: `fsrs.js` über seine Schnittstelle (Intervalle
  wachsen mit „Gut", kollabieren bei „Nochmal", Determinismus bei injiziertem `jetzt`),
  **Migration** Leitner→FSRS (idempotent, kein Datenverlust), **Mastery** (Grenzwerte 0/100,
  Monotonie). Prior Art: `srs.test.js`, `level.test.js`, `statistik.test.js`, `antwortpruefung.test.js`.
- Reduced-motion- und Offline-Pfade wie bei `useCountUp`/PWA mitprüfen.

### Out of Scope (dieser Initiative)
Neue Abfrage-Formate (Sprint 2), Liga/Quests (Sprint 4), KI-Erklärungen (Sprint 5),
OCR alter Zwischenprüfungen. FSRS-**Parameter-Optimierung** aus Nutzerdaten (später;
zunächst Standardgewichte).

### Further Notes
FSRS schafft die **Datenbasis** (Abrufwahrscheinlichkeit) für Prüfungsreife (Sprint 3)
und adaptive Format-Auswahl (Sprint 2) — deshalb zuerst. Urheberrecht/Privatsphäre
unverändert: Repo privat, keine 1:1-Originalinhalte (ADR-007).

---

## 6. Verweise & Quellen
**Intern:** `ROADMAP.md` (Phasen 0–5) · `IMPROVEMENTS.md` (Backlog, viele Punkte hier
konkretisiert) · `DECISIONS.md` (ADRs) · `lernapp/docs/FRAGEN_SCHEMA.md` (Schema, in Sprint 2 zu erweitern).

**Best-Practice-Recherche (Stand Juni 2026):**
[FSRS (open-spaced-repetition)](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) ·
[ts-fsrs](https://open-spaced-repetition.github.io/ts-fsrs/) ·
[FSRS in 100 Zeilen](https://borretti.me/article/implementing-fsrs-in-100-lines) ·
[Anki-FAQ: Algorithmus](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) ·
[Duolingo-Streak-Teardown](https://apptitude.io/blog/how-duolingos-streak-mechanic-actually-works/) ·
[Cloze vs. Flashcards](https://www.clozemaster.com/blog/cloze-deletion-vs-flashcards/) ·
[Quizlet Active Recall](https://quizlet.com/gb/features/try-active-recall).
