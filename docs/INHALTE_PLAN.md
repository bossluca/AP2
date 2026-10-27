# Lerninhalte – Bestandsaufnahme und Plan (2026-10-27)

Grundlage: `lernapp/src/data/exam_data.json` (Stand `main`), ausgewertet per Skript.
Alles Folgende sind **Vorschläge**; Inhalte werden nie von Hand in der JSON geändert,
sondern über die Import-/Migrationsskripte (`scripts/import/`, `scripts/migrations/`).

## 1. Bestand

| Was | Zahl |
|---|---|
| Lerneinheiten (Lernzettel) | 278 (AP1 111, AP2 167) |
| Lernzettel-Länge (Zeichen) | Minimum 87, **Median 575**, Maximum 5701; **17 unter 300**, 148 unter 600, 14 über 2000 |
| Prüfungstermine | 11 (6 AP1 paraphrasiert, 5 AP2-Übungsklausuren KI-generiert) |
| Fragen (ohne Kontextblöcke) | 287 (AP1 178, **AP2 109**) |
| Fragen mit Lösungstext / Schlagwörtern (Auto-Auswertung) | 286 / 286 |
| Fragen mit offizieller Lösung | **0** (alles paraphrasiert oder KI-generiert) |

**Fragen je Themen-Tag:** am dichtesten Datenschutz/IT-Sicherheit (49), Netzwerk/IP (34),
Kostenrechnung (32), Hardware (29), Projektmanagement (28). **Am dünnsten:** Cloud/Servicemodelle (2),
Betriebssysteme/Linux (2), QR-Code/Zahlungsverkehr (3), Datenformate (4), IT-Service-Management (4),
Netzwerk/VPN (4), Server/Virtualisierung (4), Übertragung/Datenraten (5).
13 Fragen-Tags haben **keinen** Lernzettel mit demselben Tag (z. B. Virtualisierung, Monitoring,
Cloud, ITSM, VPN, Linux) → `Modul-Training`/`Lernpfade` können dort nichts verknüpfen.

## 2. Wichtigster Befund: Herkunft und Rechte

- **111 Lernzettel (alle AP1)** stammen laut Feld `quelle` aus **„AP1-Lernzettel (u/DeFyuseOW, 2025)“**,
  also von einer **fremden Person** (Reddit-Nutzer/in), und wurden **wörtlich** importiert.
- Die 167 AP2-Lernzettel haben als Quelle nur Dateinamen der AP2-Lernzettel (DOCX); wer sie
  geschrieben hat, steht im Repo nicht. **Das musst du klären** (eigene? aus der Berufsschule? von Mitschülern?).
- Seit der Login-Pflicht sind die Inhalte nur noch für eingeladene Nutzer abrufbar, das mindert das
  Risiko, löst die Rechtefrage aber nicht. Optionen, in dieser Reihenfolge:
  1. **Autor/in anschreiben** und um Erlaubnis bitten (Quelle nennen, nicht kommerziell, nur für
     einen geschlossenen Lernkreis). Zusage schriftlich aufbewahren.
  2. Lizenz des Originals prüfen (steht oft im Post/Repo).
  3. Falls keine Erlaubnis: die 111 Einheiten **neu formulieren** (wie bei den AP1-Prüfungen,
     ADR-007) oder aus dem Datenbestand nehmen und nur eigene Texte ausliefern.
- Bis dahin die Instanz **nicht öffentlich bewerben** und nur Leute einladen, die du kennst.

## 3. Verbesserungsvorschläge (nach Nutzen für die Prüfung)

1. **AP2-Fragen ausbauen (größter Hebel).** AP2 hat 109 Fragen gegenüber 178 bei AP1, obwohl AP2
   das Ziel ist. Weitere Übungsklausuren (Set 6/7) mit Schwerpunkt auf den dünnen Tags oben und mit
   realistischen Szenarien (Netzplan, Subnetting, Konfigurationsauszug, Fehlersuche, Angebotsvergleich).
2. **Dünne Lernzettel anreichern.** 17 Einheiten unter 300 Zeichen (u. a. NoSQL, Mitarbeitersensibilisierung,
   Domäne, Linux-Berechtigungen) und der Median von 575 Zeichen sind für AP2-Niveau knapp: je Einheit
   Definition, Abgrenzung, typische Prüfungsfrage, Merksatz, kleines Beispiel.
3. **Tags vereinheitlichen.** Eine Taxonomie (`lib/themen.js` mit 16 AP2-Themen) und alle Fragen und
   Lernzettel darauf abbilden; die 13 Tags ohne Lernzettel bekommen entweder einen Lernzettel oder
   werden auf vorhandene Tags gemappt (Migration). Verbessert Lernpfade, Schwächen-Training und Statistik.
4. **Qualitätssicherung statt Menge.** Es gibt keine offiziellen Lösungen: KI-Lösungen können falsch
   sein. Vorschlag: Button „Frage melden“ (Server-Tabelle `meldungen`, Ansicht im Admin-Bereich),
   Status `geprüft` je Frage, Stichprobenprüfung der Musterlösungen durch dich oder Fachleute vor der Prüfung.
5. **Aktualität prüfen.** Themenliste gegen den aktuellen **IHK-Prüfungskatalog** bzw. die
   Prüfungsbeschreibung für FISI (AP2) halten. Mögliche Lücken, die du prüfen solltest: Container/Docker,
   Infrastructure as Code und Automatisierung (PowerShell/Bash), Identitäts- und Zugriffsmanagement
   (MFA, Zero Trust, Entra ID), NIS2/KRITIS, Notfall-/Kontinuitätsmanagement, ITIL/Change/Patch-Management.
6. **Lernformen.** Druckbare Kurzfassung (ein Blatt je Thema) und echte Prüfungssimulation mit Zeitlimit
   und Punkteverteilung wie in der Prüfung; für Rechenaufgaben den vorhandenen Rechen-Trainer um
   Datenmengen/Übertragung, Wirtschaftlichkeit (Amortisation) und Netzauslastung erweitern.

## 4. Tickets (jeweils eigener Branch/PR, Opus mit mittlerem Aufwand für I1–I3, Sonnet für I4–I5)

| Nr | Inhalt | Modell |
|---|---|---|
| I1 | Neue AP2-Übungsklausuren Set 6 und 7 für dünne Tags (Import-Skripte nach Muster `import-ap2-pruefungsfragen-5.mjs`, Schlagwort-Selbsttest, Marker/ID-Präfix) | Opus |
| I2 | Lernzettel-Anreicherung der 17 kürzesten und der 30 wichtigsten kurzen Einheiten (Import-Korrekturen in `scripts/import/lib/`, nie JSON von Hand) | Opus |
| I3 | Tag-Taxonomie: Mapping der 13 verwaisten Tags, Migration, Test „jeder Frage-Tag hat Lernzettel“ | Opus |
| I4 | „Frage melden“ (Backend-Tabelle, Route mit Rate-Limit, Admin-Ansicht) | Sonnet |
| I5 | Rechte-Hinweise: Autor/Quelle je Lernzettel in der UI anzeigen (`herkunft.js`), Info-Seite um Urheberrechts-Abschnitt ergänzen | Sonnet |

I1–I3 setzen voraus, dass die Rechtefrage aus Abschnitt 2 geklärt ist oder die Inhalte neu formuliert werden.
