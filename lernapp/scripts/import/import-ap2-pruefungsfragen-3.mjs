#!/usr/bin/env node
/**
 * Import: AP2-Übungsklausur **3** → exam_data.json `exams`.
 *
 * WICHTIG (Urheberrecht, s. DECISIONS.md ADR-007): Dies sind **eigene,
 * KI-generierte Übungsfragen**, nur an die AP2-Prüfungsthemen *angelehnt* – KEINE
 * 1:1-Übernahme offizieller IHK/AKA-Aufgaben.
 *
 * Drittes, **komplementäres** Set zu Set 1 (Subnetting, Virtualisierung, RAID,
 * SQL, TCO, WLAN/VPN, Monitoring, Netzplan) und Set 2 (DNS/DHCP, IPv6, AD,
 * PKI, Cloud, Normalisierung, ITIL, Ransomware, Verfügbarkeit, Verkabelung).
 * Themen hier: Routing/NAT, Firewall/DMZ, Container vs. VM, NAS/SAN/iSCSI,
 * USV, Lizenzen/Open Source, Automatisierung/Skripte, VoIP/QoS,
 * Nutzwertanalyse, OSI-Fehlersuche, Green IT/Stromkosten.
 *
 * Idempotent: ersetzt bei erneutem Lauf die Prüfung mit
 * `meta.quelle_dateiname === MARKER` (eigener Marker / ID-Präfix). Vorher
 * `npm run backup`. Aufruf:
 *   node scripts/import/import-ap2-pruefungsfragen-3.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const MARKER = 'ki_ap2_uebung3_2026';
const ID_PREFIX = 'ap2ki3_';
const QUELLE = 'KI-generiert (an AP2-Prüfungsthemen angelehnt, nicht offiziell)';

/**
 * Aufgaben (thematisch). Jede Frage: { teil, frage_text, loesung_text, punkte,
 * schluesselwoerter, mindest_treffer? }. Schlagwörter als Stämme/Kurzformen +
 * Synonyme, damit die Antwortprüfung Formulierungen tolerant erkennt (s.
 * docs/FRAGEN_SCHEMA.md §3).
 */
const AUFGABEN = [
  {
    nr: 1,
    titel: 'Routing & NAT',
    tag: 'Netzwerk/IP-Adressierung',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Die Systemhaus Falke GmbH betreibt zwei Standorte (Netz A: 192.168.10.0/24, Netz B: 192.168.20.0/24), verbunden über einen Router. Erläutern Sie, **wozu ein Router eine Routingtabelle nutzt** und was das **Default-Gateway** für einen Client bedeutet.',
        loesung_text:
          'Die **Routingtabelle** enthält je Zielnetz den **nächsten Hop** bzw. die Ausgangs-Schnittstelle – der Router entscheidet damit für jedes Paket anhand der **Ziel-IP**, **wohin es weitergeleitet** wird. Das **Default-Gateway** ist die Router-Adresse, an die ein Client alle Pakete schickt, deren Ziel **außerhalb des eigenen Netzes** liegt.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Routingtabelle', synonyme: ['Routing-Tabelle', 'Tabelle mit Routen'] },
          { begriff: 'weiterleit', synonyme: ['weitergeleitet', 'Weiterleitung', 'nächster Hop', 'naechster Hop', 'next hop'] },
          { begriff: 'Ziel-IP', synonyme: ['Zieladresse', 'Zielnetz', 'anhand des Ziels'] },
          { begriff: 'außerhalb des eigenen Netzes', synonyme: ['ausserhalb des eigenen Netzes', 'fremdes Netz', 'anderes Netz', 'nicht im eigenen Subnetz'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Der Internetanschluss der Firma hat nur **eine öffentliche IPv4-Adresse**. Erklären Sie, wie **NAT (genauer: PAT/Masquerading)** trotzdem allen internen Clients den Internetzugang ermöglicht.',
        loesung_text:
          'Der Router ersetzt beim Verlassen des Netzes die **private Quell-IP** jedes Clients durch seine **öffentliche Adresse** und merkt sich die Zuordnung über unterschiedliche **Ports** in einer **NAT-Tabelle**. Antworten aus dem Internet werden anhand des Ports wieder dem richtigen **internen Client** zugestellt – so teilen sich viele Clients eine öffentliche Adresse.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'private', synonyme: ['private IP', 'interne Adresse'] },
          { begriff: 'öffentliche Adresse', synonyme: ['oeffentliche Adresse', 'öffentliche IP', 'oeffentliche IP'] },
          { begriff: 'Port', synonyme: ['Ports', 'Portnummer', 'PAT'] },
          { begriff: 'Tabelle', synonyme: ['NAT-Tabelle', 'Zuordnung', 'merkt sich'] },
        ],
      },
    ],
  },
  {
    nr: 2,
    titel: 'Firewall & DMZ',
    tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Die Firma will ihren **Webserver** aus dem Internet erreichbar machen, ohne das interne Netz zu gefährden. Erläutern Sie das Konzept einer **DMZ (demilitarisierte Zone)** und warum der Webserver dort stehen sollte.',
        loesung_text:
          'Eine **DMZ** ist ein **eigenes, durch Firewalls abgetrenntes Zwischennetz** zwischen Internet und internem LAN. Öffentlich erreichbare Dienste (Webserver) stehen in der DMZ: Aus dem Internet ist **nur die DMZ** erreichbar, und aus der DMZ sind Verbindungen ins **interne Netz blockiert** bzw. streng begrenzt. Wird der Webserver **kompromittiert**, hat der Angreifer keinen direkten Zugriff auf das LAN.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Zwischennetz', synonyme: ['eigenes Netz', 'abgetrenntes Netz', 'eigene Zone', 'Pufferzone'] },
          { begriff: 'Firewall', synonyme: ['Firewalls', 'abgetrennt', 'gefiltert'] },
          { begriff: 'intern', synonyme: ['internes Netz', 'LAN geschützt', 'LAN geschuetzt', 'kein Zugriff auf LAN'] },
          { begriff: 'kompromittiert', synonyme: ['gehackt', 'übernommen', 'uebernommen', 'Angreifer kommt nicht weiter'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Eine Firewall arbeitet nach dem Prinzip **„Default Deny"** (Whitelist). Erklären Sie das Prinzip und geben Sie an, welche **Regel** für den Webserver (HTTPS) mindestens nötig ist.',
        loesung_text:
          '**Default Deny** bedeutet: **Alles ist verboten**, was nicht ausdrücklich **erlaubt** wurde – nur explizit freigegebene Verbindungen passieren die Firewall (sicherer als Blacklisting). Für den Webserver ist mindestens eine Regel nötig, die **eingehende** Verbindungen auf **Port 443 (HTTPS)** zur Server-IP **erlaubt**.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'verboten', synonyme: ['alles blockiert', 'standardmäßig gesperrt', 'standardmaessig gesperrt', 'deny'] },
          { begriff: 'erlaubt', synonyme: ['ausdrücklich freigegeben', 'ausdruecklich freigegeben', 'Whitelist', 'explizit'] },
          { begriff: '443', synonyme: ['Port 443', 'HTTPS-Port'] },
          { begriff: 'eingehend', synonyme: ['inbound', 'von außen', 'von aussen'] },
        ],
      },
    ],
  },
  {
    nr: 3,
    titel: 'Container & Virtualisierung',
    tag: 'Virtualisierung',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Die Entwicklungsabteilung überlegt, eine Anwendung statt in einer **virtuellen Maschine** künftig in einem **Container** (z. B. Docker) zu betreiben. Erläutern Sie den **grundlegenden Unterschied** zwischen VM und Container.',
        loesung_text:
          'Eine **VM** virtualisiert **komplette Hardware** und bringt ein **eigenes Betriebssystem** mit (Hypervisor). Ein **Container** teilt sich dagegen den **Kernel des Host-Betriebssystems** und kapselt nur die Anwendung mit ihren **Bibliotheken/Abhängigkeiten** – dadurch ist er deutlich **leichtgewichtiger**, startet in Sekunden und braucht weniger Ressourcen.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'eigenes Betriebssystem', synonyme: ['eigenes OS', 'komplettes Betriebssystem', 'Hypervisor'] },
          { begriff: 'Kernel', synonyme: ['teilt sich den Kernel', 'Host-Kernel', 'gemeinsamer Kernel'] },
          { begriff: 'leichtgewichtig', synonyme: ['weniger Ressourcen', 'schneller Start', 'startet in Sekunden', 'schlanker'] },
          { begriff: 'Abhängigkeiten', synonyme: ['Abhaengigkeiten', 'Bibliotheken', 'Libraries', 'gekapselt'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Was ist der Unterschied zwischen einem **Image** und einem **Container** und warum erleichtern Container den Weg **von der Entwicklung in den Betrieb**?',
        loesung_text:
          'Ein **Image** ist die **unveränderliche Vorlage** (Anwendung + Abhängigkeiten, in Schichten); ein **Container** ist eine **laufende Instanz** dieses Images. Weil das Image **überall identisch** läuft (Entwickler-Notebook, Test, Produktion), entfällt das „läuft bei mir"-Problem – die Umgebung ist **reproduzierbar** und Deployments werden einheitlich.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Vorlage', synonyme: ['Template', 'Blaupause', 'unveränderlich', 'unveraenderlich'] },
          { begriff: 'laufende Instanz', synonyme: ['Instanz', 'gestartetes Image', 'zur Laufzeit'] },
          { begriff: 'reproduzierbar', synonyme: ['überall identisch', 'ueberall identisch', 'gleiche Umgebung', 'läuft überall gleich', 'laeuft ueberall gleich'] },
        ],
      },
    ],
  },
  {
    nr: 4,
    titel: 'NAS, SAN & iSCSI',
    tag: 'Datensicherung/Storage',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Für einen wachsenden Speicherbedarf stehen **NAS** und **SAN** zur Auswahl. Erläutern Sie den Unterschied der beiden Konzepte (Zugriffsart, typischer Einsatz).',
        loesung_text:
          'Ein **NAS** (Network Attached Storage) stellt Speicher **dateibasiert** über Freigabeprotokolle wie **SMB/NFS** im normalen LAN bereit – einfach, ideal für Fileserver/Teamablagen. Ein **SAN** (Storage Area Network) stellt Speicher **blockbasiert** über ein (oft eigenes) Speichernetz bereit (Fibre Channel, iSCSI); Server sehen die LUNs wie **lokale Festplatten** – typisch für Datenbanken und Virtualisierungshosts.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'dateibasiert', synonyme: ['Datei-Ebene', 'File-Level', 'Freigabe'] },
          { begriff: 'SMB', synonyme: ['NFS', 'Freigabeprotokoll'] },
          { begriff: 'blockbasiert', synonyme: ['Block-Ebene', 'Block-Level'] },
          { begriff: 'lokale Festplatte', synonyme: ['wie eine Festplatte', 'LUN', 'eigenes Laufwerk'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Was ist **iSCSI** und welchen Vorteil bietet es gegenüber Fibre Channel beim Aufbau eines SAN?',
        loesung_text:
          '**iSCSI** transportiert **SCSI-Blockbefehle über normales TCP/IP-Ethernet**. Vorteil: Es nutzt die **vorhandene Netzwerk-Infrastruktur** (Switches, Kabel, Know-how) statt teurer spezieller **Fibre-Channel**-Hardware – dadurch deutlich **günstiger** und einfacher einzuführen.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'TCP/IP', synonyme: ['Ethernet', 'normales Netzwerk', 'IP-Netz'] },
          { begriff: 'vorhandene', synonyme: ['bestehende Infrastruktur', 'keine Spezialhardware', 'normale Switches'] },
          { begriff: 'günstiger', synonyme: ['guenstiger', 'billiger', 'kostengünstig', 'kostenguenstig', 'preiswerter'] },
        ],
      },
    ],
  },
  {
    nr: 5,
    titel: 'USV',
    tag: 'Hardware/Komponenten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Für den Serverraum soll eine **USV** beschafft werden. Nennen und unterscheiden Sie **zwei USV-Typen** (Klassen).',
        loesung_text:
          'Z. B.: **Offline-USV** (Standby): schaltet erst **bei Stromausfall** auf Batterie um (kurze Umschaltlücke, günstig). **Line-Interactive**: glättet zusätzlich **Spannungsschwankungen** über einen Spannungsregler. **Online-USV** (Doppelwandler): Verbraucher hängen **permanent** hinter Gleich-/Wechselrichter – **keine Umschaltzeit**, bester Schutz, für Server empfohlen.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Offline', synonyme: ['Standby', 'schaltet um', 'Umschaltlücke', 'Umschaltluecke'] },
          { begriff: 'Line-Interactive', synonyme: ['Spannungsschwankung', 'Spannungsregler'] },
          { begriff: 'Online', synonyme: ['Doppelwandler', 'permanent', 'keine Umschaltzeit'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Die Server ziehen zusammen **1.800 W**; die USV liefert **3.600 Wh** nutzbare Energie. Berechnen Sie die **Überbrückungszeit** in Stunden und Minuten (vereinfachte Rechnung, Wirkungsgrad vernachlässigt).',
        loesung_text:
          'Überbrückungszeit = Energie / Leistung = 3.600 Wh / 1.800 W = **2 Stunden** = **120 Minuten**.',
        punkte: 5,
        schluesselwoerter: [
          { begriff: '2 Stunden', synonyme: ['2h', '120 Minuten', '120 min', 'zwei Stunden'] },
        ],
      },
    ],
  },
  {
    nr: 6,
    titel: 'Lizenzen & Open Source',
    tag: 'Wirtschaftlichkeit/Kosten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Erläutern Sie den Unterschied zwischen **proprietärer Software** und **Open-Source-Software** hinsichtlich Quellcode und Nutzungsrechten.',
        loesung_text:
          'Bei **proprietärer** Software bleibt der **Quellcode geschlossen**; der Kunde erwirbt nur ein begrenztes **Nutzungsrecht** nach Lizenzvertrag (EULA), Anpassungen/Weitergabe sind untersagt. Bei **Open Source** ist der **Quellcode offen** – die Lizenz erlaubt es, die Software zu **nutzen, zu verändern und weiterzugeben** (je nach Lizenz mit Auflagen, z. B. Copyleft bei der GPL).',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Quellcode geschlossen', synonyme: ['geschlossener Quellcode', 'kein Quellcode', 'Quellcode nicht einsehbar'] },
          { begriff: 'Nutzungsrecht', synonyme: ['Lizenzvertrag', 'EULA', 'nur nutzen'] },
          { begriff: 'Quellcode offen', synonyme: ['offener Quellcode', 'einsehbar', 'open source'] },
          { begriff: 'verändern', synonyme: ['veraendern', 'anpassen', 'weitergeben', 'weiterentwickeln'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **zwei Chancen** und **ein Risiko** des Einsatzes von Open-Source-Software im Unternehmen.',
        loesung_text:
          'Chancen: **keine Lizenzkosten**, **Unabhängigkeit vom Hersteller** (kein Vendor-Lock-in), Quellcode **prüfbar** (Sicherheit/Transparenz), große Community. Risiken: **kein garantierter Support**/Gewährleistung (ggf. Support einkaufen), Weiterentwicklung ungewiss, ggf. **Lizenzauflagen** (Copyleft) bei eigener Weitergabe.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Lizenzkosten', synonyme: ['kostenlos', 'keine Kosten', 'gratis'] },
          { begriff: 'Unabhängigkeit', synonyme: ['Unabhaengigkeit', 'Vendor-Lock', 'Herstellerbindung'] },
          { begriff: 'prüfbar', synonyme: ['pruefbar', 'Transparenz', 'einsehbar', 'Community'] },
          { begriff: 'Support', synonyme: ['keine Gewährleistung', 'keine Gewaehrleistung', 'kein Anspruch auf Hilfe'] },
        ],
      },
    ],
  },
  {
    nr: 7,
    titel: 'Automatisierung & Skripte',
    tag: 'Algorithmen/Pseudocode',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Die Administration richtet wiederkehrend neue Arbeitsplätze ein (Benutzer anlegen, Software installieren, Laufwerke verbinden). Nennen Sie **drei Vorteile**, diese Schritte per **Skript zu automatisieren**, statt sie manuell auszuführen.',
        loesung_text:
          'Z. B.: **Zeitersparnis** bei Wiederholung, **weniger Fehler** (keine Tipp-/Flüchtigkeitsfehler), **einheitliche/reproduzierbare** Ergebnisse auf jedem Gerät, Schritte sind im Skript **dokumentiert** und versionierbar, Aufgaben sind **delegierbar/planbar** (z. B. zeitgesteuert).',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Zeit', synonyme: ['Zeitersparnis', 'schneller'] },
          { begriff: 'Fehler', synonyme: ['weniger Fehler', 'fehlerfrei', 'Flüchtigkeitsfehler', 'Fluechtigkeitsfehler'] },
          { begriff: 'einheitlich', synonyme: ['reproduzierbar', 'konsistent', 'gleich'] },
          { begriff: 'dokumentiert', synonyme: ['Dokumentation', 'nachvollziehbar', 'versionierbar'] },
          { begriff: 'planbar', synonyme: ['zeitgesteuert', 'delegierbar', 'automatisch ausführen', 'automatisch ausfuehren'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Ein Skript soll alle Dateien eines Ordners durchlaufen und Dateien **älter als 30 Tage** in ein Archiv verschieben. Beschreiben Sie den Ablauf als **Pseudocode** (Schleife + Bedingung).',
        loesung_text:
          'Beispiel:\n```\nFÜR JEDE datei IN ordner\n  WENN (heute - datei.aenderungsdatum) > 30 Tage DANN\n    VERSCHIEBE datei NACH archiv\n  ENDE WENN\nENDE FÜR\n```\nKern: eine **Schleife** über alle Dateien, je Datei eine **Bedingung** auf das Alter (> 30 Tage), im Wahr-Fall **verschieben**.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Schleife', synonyme: ['für jede', 'fuer jede', 'foreach', 'while', 'FÜR'] },
          { begriff: 'Bedingung', synonyme: ['wenn', 'if', '30 Tage', 'älter als', 'aelter als'] },
          { begriff: 'verschieben', synonyme: ['verschiebe', 'move', 'ins Archiv'] },
        ],
      },
    ],
  },
  {
    nr: 8,
    titel: 'VoIP & QoS',
    tag: 'Übertragung/Datenraten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Nach der Umstellung auf **VoIP-Telefonie** klagen Mitarbeiter über abgehackte Gespräche. Erklären Sie die Begriffe **Latenz**, **Jitter** und **Paketverlust** und warum sie für VoIP kritisch sind.',
        loesung_text:
          '**Latenz** = **Verzögerung** der Pakete auf dem Weg (spürbar als Gesprächsverzögerung, kritisch ab ~150 ms). **Jitter** = **Schwankung** der Latenz – Pakete kommen unregelmäßig an, die Sprache klingt abgehackt. **Paketverlust** = Pakete kommen **gar nicht an** → Aussetzer. Sprache ist ein **Echtzeit**-Dienst: verspätete Pakete sind wertlos und können nicht wie bei Downloads einfach erneut gesendet werden.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Verzögerung', synonyme: ['Verzoegerung', 'Laufzeit', 'Delay'] },
          { begriff: 'Schwankung', synonyme: ['schwankende Latenz', 'unregelmäßig', 'unregelmaessig'] },
          { begriff: 'Paketverlust', synonyme: ['Pakete verloren', 'kommen nicht an', 'Aussetzer'] },
          { begriff: 'Echtzeit', synonyme: ['Realtime', 'live', 'nicht wiederholbar'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Wie kann **QoS (Quality of Service)** im Firmennetz die VoIP-Qualität verbessern? Erläutern Sie das Prinzip.',
        loesung_text:
          'QoS **priorisiert** den Netzverkehr: VoIP-Pakete werden **markiert** (z. B. DSCP) und von Switches/Routern **bevorzugt** weitergeleitet, während unkritischer Verkehr (Downloads, Backups) warten muss. So bekommen Sprachpakete auch bei **Auslastung** genügend **Bandbreite** und geringe Verzögerung.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'priorisier', synonyme: ['Priorität', 'Prioritaet', 'bevorzugt'] },
          { begriff: 'markiert', synonyme: ['DSCP', 'Markierung', 'Klassifizierung', 'getaggt'] },
          { begriff: 'Bandbreite', synonyme: ['Auslastung', 'reserviert', 'garantiert'] },
        ],
      },
    ],
  },
  {
    nr: 9,
    titel: 'Nutzwertanalyse',
    tag: 'Kostenrechnung/Wirtschaft',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Für neue Firewalls liegen zwei Angebote vor. Kriterien und Gewichtung: **Sicherheit 50 %**, **Preis 30 %**, **Support 20 %**. Bewertung (1–10): Angebot A: Sicherheit 8, Preis 6, Support 4 · Angebot B: Sicherheit 6, Preis 9, Support 8. Führen Sie die **Nutzwertanalyse** durch und empfehlen Sie ein Angebot.',
        loesung_text:
          '**Angebot A:** 8·0,5 + 6·0,3 + 4·0,2 = 4,0 + 1,8 + 0,8 = **6,6**. **Angebot B:** 6·0,5 + 9·0,3 + 8·0,2 = 3,0 + 2,7 + 1,6 = **7,3**. Empfehlung: **Angebot B** (höherer Nutzwert 7,3 > 6,6).',
        punkte: 6,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: '6,6', synonyme: ['6.6'] },
          { begriff: '7,3', synonyme: ['7.3'] },
          { begriff: 'Angebot B', synonyme: ['B empfehlen', 'B ist besser'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **einen Vorteil** und **einen Nachteil** der Nutzwertanalyse als Entscheidungsverfahren.',
        loesung_text:
          'Vorteil: Auch **nicht-monetäre/qualitative** Kriterien werden **nachvollziehbar und strukturiert** vergleichbar gemacht; die Entscheidung ist dokumentiert. Nachteil: Gewichtung und Punktevergabe sind **subjektiv** – das Ergebnis lässt sich (bewusst oder unbewusst) **beeinflussen**.',
        punkte: 3,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'nachvollziehbar', synonyme: ['strukturiert', 'vergleichbar', 'qualitative Kriterien', 'nicht-monetär', 'nicht-monetaer'] },
          { begriff: 'subjektiv', synonyme: ['beeinflussbar', 'Gewichtung willkürlich', 'Gewichtung willkuerlich', 'manipulierbar'] },
        ],
      },
    ],
  },
  {
    nr: 10,
    titel: 'Strukturierte Fehlersuche',
    tag: 'OSI-Modell',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Ein Mitarbeiter erreicht eine interne Webanwendung nicht. Beschreiben Sie eine **strukturierte Fehlersuche entlang der Netzwerk-Schichten** (bottom-up) mit je einem konkreten Prüfschritt.',
        loesung_text:
          'Bottom-up entlang des **OSI-Modells**: 1) **Physik/Link**: Kabel/WLAN verbunden, Link-LED? 2) **Netzwerk**: eigene **IP-Konfiguration** prüfen (ipconfig), dann **ping** auf Gateway und Ziel. 3) **Namensauflösung**: **nslookup** – wird der Servername in die richtige IP aufgelöst? 4) **Transport/Anwendung**: Ist der **Port/Dienst** erreichbar (z. B. Browser, telnet auf 443), läuft der Dienst auf dem Server? So wird die Fehlerquelle Schicht für Schicht **eingegrenzt**.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Kabel', synonyme: ['Link', 'physisch', 'WLAN verbunden', 'LED'] },
          { begriff: 'ping', synonyme: ['Gateway anpingen', 'Erreichbarkeit testen'] },
          { begriff: 'ipconfig', synonyme: ['IP-Konfiguration', 'eigene IP', 'ifconfig'] },
          { begriff: 'nslookup', synonyme: ['DNS prüfen', 'DNS pruefen', 'Namensauflösung', 'Namensaufloesung'] },
          { begriff: 'Dienst', synonyme: ['Port', 'Anwendung läuft', 'Anwendung laeuft', 'Server-Dienst'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Wozu dient **traceroute/tracert** bei der Fehlersuche und was zeigt die Ausgabe?',
        loesung_text:
          '**tracert** zeigt den **Weg (alle Router-Hops)** eines Pakets zum Ziel inklusive **Laufzeit je Hop**. Damit lässt sich erkennen, **an welcher Station** die Verbindung abbricht oder ungewöhnlich **langsam** wird – die Fehlerquelle wird im Netzpfad lokalisiert.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Hop', synonyme: ['Hops', 'Router auf dem Weg', 'Stationen', 'Weg des Pakets', 'Pfad'] },
          { begriff: 'Laufzeit', synonyme: ['Zeit je Hop', 'Latenz', 'langsam'] },
          { begriff: 'abbricht', synonyme: ['bricht ab', 'wo es hängt', 'wo es haengt', 'lokalisieren', 'eingrenzen'] },
        ],
      },
    ],
  },
  {
    nr: 11,
    titel: 'Green IT & Stromkosten',
    tag: 'Wirtschaftlichkeit/Kosten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Ein Altserver läuft **24/7** mit durchschnittlich **400 W**; der Strompreis beträgt **0,30 €/kWh**. Berechnen Sie die **jährlichen Stromkosten** (365 Tage).',
        loesung_text:
          'Energie pro Jahr: 0,4 kW · 24 h · 365 = **3.504 kWh**. Kosten: 3.504 kWh · 0,30 €/kWh = **1.051,20 € pro Jahr**.',
        punkte: 5,
        mindest_treffer: 1,
        schluesselwoerter: [
          { begriff: '1.051,20', synonyme: ['1051,20', '1051.20', '1.051,2', 'rund 1.051', 'ca. 1050'] },
          { begriff: '3.504', synonyme: ['3504', '3.504 kWh'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **drei Maßnahmen**, mit denen ein Unternehmen den **Energieverbrauch seiner IT** senken kann (Green IT).',
        loesung_text:
          'Z. B.: Server **virtualisieren/konsolidieren** (weniger physische Maschinen), **energieeffiziente Hardware** beschaffen (80-PLUS-Netzteile, SSDs), **Energiesparfunktionen**/automatisches Abschalten ungenutzter Geräte, Kühlung optimieren (**Kalt-/Warmgang**, höhere Raumtemperatur), Lebenszyklus verlängern/Refurbished, Cloud-Ressourcen bedarfsgerecht skalieren.',
        punkte: 4,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'virtualisier', synonyme: ['konsolidier', 'weniger Server'] },
          { begriff: 'effizient', synonyme: ['energieeffizient', '80 PLUS', 'sparsame Hardware', 'SSD'] },
          { begriff: 'abschalten', synonyme: ['Energiesparfunktion', 'Standby', 'ausschalten', 'Ruhezustand'] },
          { begriff: 'Kühlung', synonyme: ['Kuehlung', 'Kaltgang', 'Warmgang', 'Klimatisierung', 'Raumtemperatur'] },
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
        jahr: 2026,
        saison: 'Übungsklausur 3',
        fachrichtung: 'Fachinformatiker/in für Systemintegration',
        aufgabe_nr: a.nr,
        aufgabe_titel: a.titel,
        teilfrage: `${a.nr}${f.teil}`,
        ueberschrift: '',
        frage_text: f.frage_text,
        punkte: f.punkte,
        // Schwierigkeit analog Migration 003 (aus Punkten abgeleitet).
        schwierigkeit: f.punkte <= 2 ? 1 : f.punkte <= 4 ? 2 : 3,
        loesung_text: f.loesung_text,
        hat_offizielle_loesung: false,
        unverifiziert_markiert: false,
        thema_tags: [a.tag],
        ist_kontext_block: false,
        hat_antwort: true,
        schluesselwoerter: f.schluesselwoerter,
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
      jahr: 2026,
      saison: 'Übungsklausur 3',
      fachrichtung: 'Fachinformatiker/in für Systemintegration',
      teil: 'AP2 – Ganzheitliche Aufgabe (Übung)',
      titel: 'AP2 Übungsklausur 3 (KI-generiert)',
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
  // Idempotent: bestehende KI-AP2-Übungsklausur 3 entfernen.
  data.exams = data.exams.filter((e) => e?.meta?.quelle_dateiname !== MARKER);
  data.exams.push(exam);

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(
    `Import OK: AP2-Übungsklausur 3 mit ${fragen.length} Fragen (${punkteGesamt} Punkte) ` +
      `in ${AUFGABEN.length} Aufgaben. Prüfungen gesamt jetzt: ${data.exams.length}.`
  );
}

main();
