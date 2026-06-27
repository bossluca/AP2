#!/usr/bin/env node
/**
 * Import: AP2-Übungsklausur → exam_data.json `exams`.
 *
 * WICHTIG (Urheberrecht, s. DECISIONS.md ADR-007): Dies sind **eigene,
 * KI-generierte Übungsfragen**, nur an die AP2-Prüfungsthemen *angelehnt* – KEINE
 * 1:1-Übernahme offizieller IHK/AKA-Aufgaben. So gibt es keinen Ärger mit der IHK.
 *
 * Struktur: thematisch in Aufgaben gegliedert, konsistente `thema_tags`, je Frage
 * Musterlösung + `schluesselwoerter` (Stämme/Synonyme) für den Klausur-Modus.
 *
 * Idempotent: ersetzt bei erneutem Lauf die Prüfung mit
 * `meta.quelle_dateiname === MARKER` bzw. Fragen mit ID-Präfix "ap2ki_".
 * Vorher `npm run backup` ausführen. Aufruf:
 *   node scripts/import/import-ap2-pruefungsfragen.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const MARKER = 'ki_ap2_uebung_2025';
const ID_PREFIX = 'ap2ki_';
const QUELLE = 'KI-generiert (an AP2-Prüfungsthemen angelehnt, nicht offiziell)';

/**
 * Aufgaben (thematisch). Jede Frage: { teil, frage_text, loesung_text, punkte,
 * tag, schluesselwoerter }. Schlagwörter als Stämme/Kurzformen + Synonyme, damit
 * die Antwortprüfung Formulierungen tolerant erkennt.
 */
const AUFGABEN = [
  {
    nr: 1,
    titel: 'Netzwerk planen',
    tag: 'Netzwerk/IP-Adressierung',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Ein Standort erhält das Netz **192.168.10.0/24** und benötigt **4 etwa gleich große** Subnetze für vier Abteilungen. Geben Sie die Subnetzmaske (CIDR und dezimal) an und wie viele Hosts je Subnetz nutzbar sind.',
        loesung_text:
          'Für 4 Subnetze werden 2 zusätzliche Netzbits benötigt → **/26** (255.255.255.192). Pro Subnetz: 64 Adressen, davon **62 nutzbare Hosts** (abzüglich Netz- und Broadcast-Adresse).',
        punkte: 6,
        schluesselwoerter: [
          { begriff: '/26', synonyme: ['26'] },
          { begriff: '255.255.255.192' },
          { begriff: '62', synonyme: ['62 Hosts', '62 nutzbare'] },
          { begriff: '4 Subnetze', synonyme: ['vier Subnetze'] },
        ],
      },
      {
        teil: 'b',
        frage_text: 'Erläutern Sie den Unterschied zwischen einem **Switch** und einem **Router**.',
        loesung_text:
          'Ein **Switch** verbindet Geräte innerhalb eines (V)LAN auf **Schicht 2** (Vermittlung anhand von MAC-Adressen). Ein **Router** verbindet **verschiedene Netze** auf **Schicht 3** und trifft anhand von IP-Adressen Routing-Entscheidungen.',
        punkte: 4,
        schluesselwoerter: [
          { begriff: 'Schicht 2', synonyme: ['Layer 2', 'Sicherungsschicht', 'MAC'] },
          { begriff: 'Schicht 3', synonyme: ['Layer 3', 'Vermittlungsschicht', 'IP-Adresse'] },
          { begriff: 'verschiedene Netze', synonyme: ['Netze verbinden', 'andere Netze'] },
        ],
      },
    ],
  },
  {
    nr: 2,
    titel: 'Virtualisierung & Server',
    tag: 'Virtualisierung',
    fragen: [
      {
        teil: 'a',
        frage_text: 'Nennen Sie **zwei Vorteile** der Servervirtualisierung gegenüber dedizierter Hardware.',
        loesung_text:
          'Z. B.: bessere **Auslastung**/Konsolidierung der Hardware, **Kostenersparnis** (Strom, Platz, weniger Geräte), schnelle **Bereitstellung** neuer Server, **Snapshots** und einfache Migration/**Hochverfügbarkeit**.',
        punkte: 4,
        mindest_treffer: 2, // „zwei Vorteile" – 2 von mehreren gültigen genügen
        schluesselwoerter: [
          { begriff: 'Auslastung', synonyme: ['Konsolidierung', 'ausgelastet'] },
          { begriff: 'Kosten', synonyme: ['Strom', 'Platz', 'spart', 'sparen'] },
          { begriff: 'Snapshot' },
          { begriff: 'bereitstell', synonyme: ['Bereitstellung', 'schnell verfügbar'] },
          { begriff: 'Hochverfügbar', synonyme: ['Migration', 'Failover', 'Verfügbarkeit'] },
        ],
      },
      {
        teil: 'b',
        frage_text: 'Worin unterscheiden sich eine **virtuelle Maschine** und ein **Container**?',
        loesung_text:
          'Eine **VM** enthält ein vollständiges **Gastbetriebssystem** und läuft auf einem **Hypervisor**. **Container** teilen sich den **Kernel** des Host-Betriebssystems, sind dadurch **leichtgewichtiger**, starten schneller und kapseln nur die Anwendung samt Abhängigkeiten.',
        punkte: 5,
        schluesselwoerter: [
          { begriff: 'Hypervisor' },
          { begriff: 'Gastbetriebssystem', synonyme: ['Gast-OS', 'eigenes Betriebssystem', 'vollständiges Betriebssystem'] },
          { begriff: 'Kernel', synonyme: ['teilen sich den Kernel', 'Host-Kernel'] },
          { begriff: 'leichtgewicht', synonyme: ['leichter', 'schlanker', 'schneller'] },
        ],
      },
    ],
  },
  {
    nr: 3,
    titel: 'IT-Sicherheit',
    tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Erläutern Sie die Funktion einer **Firewall** und den Unterschied zwischen **Paketfilter** und **Stateful Inspection**.',
        loesung_text:
          'Eine Firewall kontrolliert den Netzwerkverkehr anhand von **Regeln**. Ein **Paketfilter** prüft einzelne Pakete (IP/Port) **zustandslos**; **Stateful Inspection** verfolgt den **Verbindungszustand** und lässt nur Pakete zu, die zu einer bestehenden Verbindung gehören.',
        punkte: 6,
        schluesselwoerter: [
          { begriff: 'Regel', synonyme: ['Regelwerk'] },
          { begriff: 'Paketfilter', synonyme: ['Paket', 'Port'] },
          { begriff: 'Stateful', synonyme: ['Verbindungszustand', 'zustandsbehaftet', 'Zustand'] },
          { begriff: 'kontrolliert', synonyme: ['filtert', 'überwacht'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Was versteht man unter der **Härtung** eines Servers? Nennen Sie **zwei** konkrete Maßnahmen.',
        loesung_text:
          'Härtung = Reduzieren der **Angriffsfläche**. Maßnahmen: nicht benötigte **Dienste/Ports deaktivieren**, unnötige Software entfernen, aktuelle **Updates/Patches**, **minimale Rechte** (Least Privilege), starke Passwörter, sichere Konfiguration.',
        punkte: 4,
        mindest_treffer: 3, // Begriff „Angriffsfläche" + zwei konkrete Maßnahmen
        schluesselwoerter: [
          { begriff: 'Angriffsfläche', synonyme: ['Angriffsflaeche', 'reduzieren'] },
          { begriff: 'Dienste', synonyme: ['Ports', 'deaktivieren', 'abschalten'] },
          { begriff: 'Update', synonyme: ['Patch', 'patchen', 'aktuell'] },
          { begriff: 'Rechte', synonyme: ['Least Privilege', 'Berechtigung', 'minimale Rechte'] },
        ],
      },
    ],
  },
  {
    nr: 4,
    titel: 'Verfügbarkeit & Datensicherung',
    tag: 'Datensicherung/Storage',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Ein Server soll den **Ausfall einer Festplatte** ohne Datenverlust überstehen. Welches **RAID-Level** mit zwei Platten eignet sich und wie heißt das Verfahren?',
        loesung_text:
          '**RAID 1** – **Spiegelung** (Mirroring). Die Daten werden identisch auf beide Platten geschrieben; fällt eine Platte aus, läuft der Betrieb mit der zweiten weiter.',
        punkte: 3,
        schluesselwoerter: [
          { begriff: 'RAID 1', synonyme: ['RAID1'] },
          { begriff: 'Spiegel', synonyme: ['Mirroring', 'gespiegelt'] },
        ],
      },
      {
        teil: 'b',
        frage_text: 'Erklären Sie die Begriffe **RTO** und **RPO** im Rahmen einer Notfall-/Backup-Strategie.',
        loesung_text:
          '**RTO** (Recovery Time Objective): maximal tolerierbare **Wiederanlaufzeit** nach einem Ausfall. **RPO** (Recovery Point Objective): maximal tolerierbarer **Datenverlust**, also der Zeitraum seit dem letzten Backup.',
        punkte: 4,
        schluesselwoerter: [
          { begriff: 'Wiederanlauf', synonyme: ['Wiederherstellungszeit', 'Ausfallzeit', 'wie lange', 'Zeit bis Betrieb'] },
          { begriff: 'Datenverlust', synonyme: ['wie viel Daten', 'seit letztem Backup', 'Datenstand'] },
          { begriff: 'RTO' },
          { begriff: 'RPO' },
        ],
      },
    ],
  },
  {
    nr: 5,
    titel: 'Datenbanken & SQL',
    tag: 'Datenbank/SQL/ER-Modell',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Formulieren Sie eine **SQL-Abfrage**, die alle Kunden aus der Tabelle `kunde` mit Wohnort *Berlin* ausgibt, **sortiert nach Nachname**.',
        loesung_text: '```sql\nSELECT * FROM kunde WHERE ort = \'Berlin\' ORDER BY nachname;\n```',
        punkte: 5,
        schluesselwoerter: [
          { begriff: 'SELECT' },
          { begriff: 'FROM kunde' },
          { begriff: 'WHERE', synonyme: ['where ort'] },
          { begriff: 'ORDER BY', synonyme: ['sortier'] },
        ],
      },
      {
        teil: 'b',
        frage_text: 'Was bedeutet **referentielle Integrität** in einer relationalen Datenbank?',
        loesung_text:
          'Sie stellt sicher, dass ein **Fremdschlüssel** nur auf einen **existierenden Primärschlüssel** der referenzierten Tabelle verweist. So werden „verwaiste" Datensätze verhindert.',
        punkte: 4,
        schluesselwoerter: [
          { begriff: 'Fremdschlüssel', synonyme: ['Fremdschluessel', 'foreign key'] },
          { begriff: 'Primärschlüssel', synonyme: ['Primaerschluessel', 'primary key', 'existier'] },
          { begriff: 'verweis', synonyme: ['Bezug', 'zeigt auf'] },
        ],
      },
    ],
  },
  {
    nr: 6,
    titel: 'Wirtschaftlichkeit',
    tag: 'Wirtschaftlichkeit/Kosten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Angebotsvergleich über **5 Jahre**: Server **A** kostet 3.000 € Anschaffung + 150 €/Jahr Wartung, Server **B** kostet 2.400 € + 280 €/Jahr. Welcher ist nach **TCO** günstiger? Mit Rechnung.',
        loesung_text:
          'A: 3.000 + 5·150 = **3.750 €**. B: 2.400 + 5·280 = **3.800 €**. **Server A** ist über 5 Jahre um 50 € günstiger (niedrigere Gesamtkosten/TCO).',
        punkte: 6,
        schluesselwoerter: [
          { begriff: '3750', synonyme: ['3.750'] },
          { begriff: '3800', synonyme: ['3.800'] },
          { begriff: 'A', synonyme: ['Server A', 'A günstiger', 'A guenstiger'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **zwei Kriterien außer dem Preis**, die bei einer **Make-or-Buy**-Entscheidung für IT-Leistungen wichtig sind.',
        loesung_text:
          'Z. B.: vorhandenes **Know-how**/Personal, **Qualität**, **Zeit**/Verfügbarkeit, **Abhängigkeit** vom Dienstleister, **Datenschutz**/Sicherheit, Wartbarkeit.',
        punkte: 4,
        mindest_treffer: 2, // „zwei Kriterien" – 2 von mehreren gültigen genügen
        schluesselwoerter: [
          { begriff: 'Know-how', synonyme: ['Kompetenz', 'Wissen', 'Personal'] },
          { begriff: 'Qualität', synonyme: ['Qualitaet'] },
          { begriff: 'Abhängig', synonyme: ['Abhaengig', 'Dienstleister', 'Lieferant'] },
          { begriff: 'Datenschutz', synonyme: ['Sicherheit'] },
          { begriff: 'Zeit', synonyme: ['Verfügbarkeit', 'Verfuegbarkeit', 'schnell'] },
        ],
      },
    ],
  },
  {
    nr: 7,
    titel: 'Datenschutz',
    tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Was sind **technische und organisatorische Maßnahmen (TOM)** nach DSGVO? Nennen Sie je **ein Beispiel**.',
        loesung_text:
          'TOM schützen **personenbezogene Daten**. **Technisch**: z. B. Verschlüsselung, Zugriffskontrolle, Firewall. **Organisatorisch**: z. B. Berechtigungskonzept, Schulungen, Vier-Augen-Prinzip, Richtlinien.',
        punkte: 4,
        schluesselwoerter: [
          { begriff: 'personenbezogen', synonyme: ['personenbezogene Daten'] },
          { begriff: 'technisch', synonyme: ['Verschlüsselung', 'Verschluesselung', 'Zugriffskontrolle'] },
          { begriff: 'organisatorisch', synonyme: ['Berechtigungskonzept', 'Schulung', 'Richtlinie'] },
        ],
      },
    ],
  },
  {
    nr: 8,
    titel: 'WLAN & VPN',
    tag: 'Netzwerk/IP-Adressierung',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Erläutern Sie **zwei Vorteile**, die **WPA3** gegenüber **WPA2** bei der WLAN-Absicherung bietet.',
        loesung_text:
          'Z. B.: **SAE** (Simultaneous Authentication of Equals) statt einfachem PSK-Handshake → **Schutz vor Offline-Wörterbuchangriffen**; **Forward Secrecy** (mitgeschnittener Verkehr bleibt auch bei späterer Schlüssel-Kompromittierung geschützt); **individuelle Verschlüsselung** auch in offenen Netzen (OWE); stärkere Verschlüsselung (192 Bit im Enterprise-Modus).',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'SAE', synonyme: ['Simultaneous Authentication', 'Dragonfly'] },
          { begriff: 'Wörterbuch', synonyme: ['Woerterbuch', 'Brute-Force', 'Offline-Angriff', 'Dictionary'] },
          { begriff: 'Forward Secrecy', synonyme: ['Perfect Forward Secrecy', 'PFS'] },
          { begriff: 'Verschlüsselung', synonyme: ['Verschluesselung', '192 Bit', 'stärker', 'staerker', 'individuell', 'OWE'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Worin unterscheidet sich ein **Site-to-Site-VPN** von einem **Client-to-Site-(Remote-Access-)VPN**?',
        loesung_text:
          'Ein **Site-to-Site-VPN** koppelt dauerhaft **zwei ganze Netze/Standorte** über ihre **Gateways/Router** (die Endgeräte merken nichts davon). Ein **Client-to-Site-VPN** verbindet einen **einzelnen Client** (z. B. das Notebook eines Mitarbeiters im Homeoffice) per VPN-Software mit dem **Firmennetz** – typisch fürs **mobile Arbeiten**.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Standort', synonyme: ['Netze koppeln', 'zwei Netze', 'Niederlassung'] },
          { begriff: 'Gateway', synonyme: ['Router', 'Firewall'] },
          { begriff: 'einzeln', synonyme: ['einzelner Client', 'ein Client', 'einzelnes Gerät', 'einzelnes Geraet'] },
          { begriff: 'Homeoffice', synonyme: ['mobiles Arbeiten', 'Mitarbeiter', 'Remote'] },
        ],
      },
    ],
  },
  {
    nr: 9,
    titel: 'Monitoring & IT-Betrieb',
    tag: 'Monitoring/IT-Betrieb',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Wofür wird das Protokoll **SNMP** im Netzwerk-/Server-Monitoring eingesetzt? Geben Sie auch an, wie ein überwachtes Gerät bei einem Ereignis **von sich aus** die Zentrale informieren kann.',
        loesung_text:
          '**SNMP** (Simple Network Management Protocol) dient der **Überwachung und Verwaltung** von Netzwerkgeräten (Switches, Router, Server). Ein Management-System **fragt** Statuswerte regelmäßig **ab (Polling)**; umgekehrt kann ein Gerät bei einem Ereignis selbst eine **Trap** (unaufgeforderte Meldung) an die Zentrale senden.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Überwach', synonyme: ['Ueberwach', 'Monitoring', 'Verwaltung', 'Management'] },
          { begriff: 'Netzwerkgerät', synonyme: ['Netzwerkgeraet', 'Switch', 'Router', 'Server'] },
          { begriff: 'Polling', synonyme: ['Abfrage', 'abfragen', 'Pull', 'pollt'] },
          { begriff: 'Trap', synonyme: ['unaufgefordert', 'Benachrichtigung', 'Meldung'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **zwei Kennzahlen (Metriken)**, die ein Monitoring-System bei einem Server sinnvoll überwacht.',
        loesung_text:
          'Z. B.: **CPU-Auslastung**, **Arbeitsspeicher-(RAM-)Auslastung**, freier **Festplattenspeicher**, **Netzwerkauslastung**, **Temperatur**, **Erreichbarkeit/Verfügbarkeit** wichtiger Dienste, **Antwortzeit**.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'CPU', synonyme: ['Prozessor', 'CPU-Auslastung'] },
          { begriff: 'RAM', synonyme: ['Arbeitsspeicher', 'Speicherauslastung'] },
          { begriff: 'Festplatte', synonyme: ['Speicherplatz', 'Plattenplatz', 'Disk', 'freier Speicher'] },
          { begriff: 'Netzwerk', synonyme: ['Netzwerklast', 'Bandbreite', 'Netzauslastung'] },
          { begriff: 'Verfügbar', synonyme: ['Verfuegbar', 'Erreichbarkeit', 'Dienst', 'Antwortzeit', 'Temperatur'] },
        ],
      },
    ],
  },
  {
    nr: 10,
    titel: 'Algorithmen & Pseudocode',
    tag: 'Algorithmen/Pseudocode',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Schreiben Sie in **Pseudocode** einen Algorithmus, der die **Summe der Zahlen von 1 bis n** berechnet und anschließend ausgibt (n ist gegeben).',
        loesung_text:
          '```text\nsumme = 0\nFÜR i = 1 BIS n\n    summe = summe + i\nENDE FÜR\nAUSGABE summe\n```\nAlternativ über die Gauß-Formel: summe = n × (n + 1) / 2.',
        punkte: 6,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'summe', synonyme: ['sum', 'gesamtsumme'] },
          { begriff: 'schleife', synonyme: ['FOR', 'FÜR', 'FUER', 'WHILE', 'solange', 'wiederhol'] },
          { begriff: 'summe + i', synonyme: ['summe = summe', 'aufaddier', 'addier', 'gauß', 'gauss'] },
          { begriff: 'ausgabe', synonyme: ['ausgeben', 'AUSGEBEN', 'PRINT', 'gib aus'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Erklären Sie den Unterschied zwischen einer **kopfgesteuerten** (WHILE) und einer **fußgesteuerten** (REPEAT-UNTIL / do-while) Schleife.',
        loesung_text:
          'Bei der **kopfgesteuerten** Schleife (WHILE) wird die **Bedingung vor** jedem Durchlauf geprüft – der Schleifenkörper wird **ggf. gar nicht** ausgeführt. Bei der **fußgesteuerten** Schleife (REPEAT-UNTIL) wird die Bedingung **am Ende** geprüft – der Körper läuft **mindestens einmal**.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'vor', synonyme: ['am Anfang', 'vorher', 'kopfgesteuert', 'zu Beginn'] },
          { begriff: 'ende', synonyme: ['am Ende', 'danach', 'fußgesteuert', 'fussgesteuert', 'nach dem Durchlauf'] },
          { begriff: 'mindestens einmal', synonyme: ['mindestens 1', 'immer einmal', 'einmal ausgeführt', 'einmal ausgefuehrt'] },
          { begriff: 'Bedingung', synonyme: ['Abbruchbedingung', 'Prüfung', 'Pruefung'] },
        ],
      },
    ],
  },
  {
    nr: 11,
    titel: 'Projektplanung (Netzplan)',
    tag: 'Projektmanagement',
    fragen: [
      {
        teil: 'a',
        frage_text: 'Was versteht man im Netzplan eines Projekts unter dem **kritischen Pfad**?',
        loesung_text:
          'Der **kritische Pfad** ist die **längste** Kette von Vorgängen durch den Netzplan. Seine Vorgänge haben **keine Pufferzeit** (Puffer = 0); er bestimmt die **gesamte Projektdauer**. Eine **Verzögerung** auf dem kritischen Pfad verzögert das **gesamte Projekt**.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'längste', synonyme: ['laengste', 'längster Pfad', 'laengster Weg'] },
          { begriff: 'Puffer', synonyme: ['keine Pufferzeit', 'Puffer 0', 'puffer null'] },
          { begriff: 'Projektdauer', synonyme: ['Gesamtdauer', 'bestimmt die Dauer', 'Projektlaufzeit'] },
          { begriff: 'Verzöger', synonyme: ['Verzoeger', 'verspätet', 'verzögert das Projekt'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Ein Vorgang hat den **frühesten Anfangszeitpunkt (FAZ) = Tag 5** und den **spätesten Anfangszeitpunkt (SAZ) = Tag 8**. Berechnen Sie die **Gesamtpufferzeit (GP)** dieses Vorgangs.',
        loesung_text:
          'Die Gesamtpufferzeit ist **GP = SAZ − FAZ = 8 − 5 = 3 Tage**. Der Vorgang darf sich also um bis zu **3 Tage** verschieben, ohne das Projektende zu gefährden.',
        punkte: 3,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: '3', synonyme: ['3 Tage', 'drei Tage', 'drei'] },
          { begriff: 'SAZ', synonyme: ['SAZ - FAZ', 'spätester minus frühester', '8 - 5'] },
          { begriff: 'Puffer', synonyme: ['Gesamtpuffer', 'GP'] },
        ],
      },
    ],
  },
];

function baueFragen() {
  const fragen = [];
  for (const a of AUFGABEN) {
    for (const f of a.fragen) {
      fragen.push({
        id: `${ID_PREFIX}${a.nr}${f.teil}`,
        jahr: 2025,
        saison: 'Übungsklausur',
        fachrichtung: 'Fachinformatiker/in für Systemintegration',
        aufgabe_nr: a.nr,
        aufgabe_titel: a.titel,
        teilfrage: `${a.nr}${f.teil}`,
        ueberschrift: '',
        frage_text: f.frage_text,
        punkte: f.punkte,
        loesung_text: f.loesung_text,
        hat_offizielle_loesung: false,
        unverifiziert_markiert: false,
        thema_tags: [a.tag],
        ist_kontext_block: false,
        hat_antwort: true,
        schluesselwoerter: f.schluesselwoerter,
        // „Nennen Sie N …": N Treffer genügen (sonst Anteils-Bewertung). Optional.
        ...(f.mindest_treffer ? { mindest_treffer: f.mindest_treffer } : {}),
        kategorie: a.titel,
        quelle: QUELLE,
      });
    }
  }
  return fragen;
}

function main() {
  const fragen = baueFragen();
  const punkteGesamt = fragen.reduce((s, f) => s + (f.punkte || 0), 0);

  const exam = {
    meta: {
      jahr: 2025,
      saison: 'Übungsklausur',
      fachrichtung: 'Fachinformatiker/in für Systemintegration',
      teil: 'AP2 – Ganzheitliche Aufgabe (Übung)',
      titel: 'AP2 Übungsklausur (KI-generiert)',
      datum: null,
      dauer: '90 Minuten',
      punkte_gesamt: punkteGesamt,
      status: 'KI-generiert – an AP2-Prüfungsthemen angelehnt, nicht offiziell',
      quelle_dateiname: MARKER,
      pruefungsteil: 'AP2',
    },
    fragen,
  };

  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(data.exams)) data.exams = [];
  // Idempotent: bestehende KI-AP2-Prüfung entfernen.
  data.exams = data.exams.filter((e) => e?.meta?.quelle_dateiname !== MARKER);
  data.exams.push(exam);

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(
    `Import OK: AP2-Übungsklausur mit ${fragen.length} Fragen (${punkteGesamt} Punkte) ` +
      `in ${AUFGABEN.length} Aufgaben. Prüfungen gesamt jetzt: ${data.exams.length}.`
  );
}

main();
