#!/usr/bin/env node
/**
 * Import: AP2-Übungsklausur **2** → exam_data.json `exams`.
 *
 * WICHTIG (Urheberrecht, s. DECISIONS.md ADR-007): Dies sind **eigene,
 * KI-generierte Übungsfragen**, nur an die AP2-Prüfungsthemen *angelehnt* – KEINE
 * 1:1-Übernahme offizieller IHK/AKA-Aufgaben.
 *
 * Zweites, **komplementäres** Set zu `import-ap2-pruefungsfragen.mjs`: andere
 * Szenarien/Zahlen, gleiche AP2-Kompetenzen, ergänzende Themen (DNS/DHCP, AD &
 * Berechtigungen, PKI/Verschlüsselung, Cloud-Modelle, Normalisierung, ITIL/Change,
 * Lasten-/Pflichtenheft, Schadsoftware, Verfügbarkeitsrechnung, IPv6).
 *
 * Idempotent: ersetzt bei erneutem Lauf die Prüfung mit
 * `meta.quelle_dateiname === MARKER` (eigener Marker / ID-Präfix → kollidiert nicht
 * mit Set 1). Vorher `npm run backup`. Aufruf:
 *   node scripts/import/import-ap2-pruefungsfragen-2.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, '..', '..', 'src', 'data', 'exam_data.json');

const MARKER = 'ki_ap2_uebung2_2025';
const ID_PREFIX = 'ap2ki2_';
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
    titel: 'DNS & DHCP',
    tag: 'Netzwerk/IP-Adressierung',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Ein Client startet neu und hat keine IP-Konfiguration. Erläutern Sie, **wie er per DHCP** automatisch eine Adresse erhält, und nennen Sie die **vier** beteiligten Nachrichten in der richtigen Reihenfolge.',
        loesung_text:
          'Der Client durchläuft den **DORA**-Ablauf: **Discover** (Broadcast-Suche nach DHCP-Servern) → **Offer** (Server bietet eine Adresse an) → **Request** (Client fordert das Angebot an) → **Acknowledge** (Server bestätigt; der Client erhält IP, Subnetzmaske, Gateway, DNS für die **Lease**-Dauer).',
        punkte: 6,
        mindest_treffer: 4,
        schluesselwoerter: [
          { begriff: 'Discover' },
          { begriff: 'Offer' },
          { begriff: 'Request' },
          { begriff: 'Acknowledge', synonyme: ['ACK', 'Ack'] },
          { begriff: 'Lease', synonyme: ['Leasezeit', 'Gültigkeitsdauer'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Wofür ist **DNS** zuständig und was unterscheidet einen **A-Record** von einem **MX-Record**?',
        loesung_text:
          '**DNS** löst **Namen in IP-Adressen** auf (Namensauflösung). Ein **A-Record** ordnet einem Hostnamen eine **IPv4-Adresse** zu; ein **MX-Record** benennt den für eine Domain zuständigen **Mailserver** (mit Priorität).',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Namensauflösung', synonyme: ['Namensaufloesung', 'Name in IP', 'Name zu IP', 'auflös', 'aufloes'] },
          { begriff: 'IPv4', synonyme: ['IP-Adresse', 'A-Record zeigt auf IP'] },
          { begriff: 'Mailserver', synonyme: ['Mail', 'E-Mail-Server', 'zuständiger Server', 'zustaendiger Server'] },
        ],
      },
    ],
  },
  {
    nr: 2,
    titel: 'IPv6',
    tag: 'Netzwerk/IP-Adressierung',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Nennen Sie **zwei wesentliche Vorteile** von **IPv6** gegenüber IPv4.',
        loesung_text:
          'Z. B.: **deutlich größerer Adressraum** (128 statt 32 Bit → praktisch unbegrenzt viele Adressen, kein NAT mehr nötig), **automatische Adresskonfiguration** (SLAAC), vereinfachter/festerer **Header**, eingebaute Unterstützung für **IPsec**, besseres Multicast.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Adressraum', synonyme: ['128 Bit', 'mehr Adressen', 'großer Adressraum', 'grosser Adressraum'] },
          { begriff: 'NAT', synonyme: ['kein NAT', 'ohne NAT'] },
          { begriff: 'SLAAC', synonyme: ['Autokonfiguration', 'automatische Konfiguration', 'autoconfig'] },
          { begriff: 'IPsec', synonyme: ['Sicherheit eingebaut'] },
          { begriff: 'Header', synonyme: ['vereinfachter Header', 'fester Header'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Kürzen Sie die IPv6-Adresse **2001:0db8:0000:0000:0000:0000:0000:0001** nach den Regeln der Adressverkürzung.',
        loesung_text:
          'Führende Nullen je Block streichen und die längste Folge von Null-Blöcken durch **::** ersetzen → **2001:db8::1**.',
        punkte: 4,
        schluesselwoerter: [
          { begriff: '2001:db8::1' },
        ],
      },
    ],
  },
  {
    nr: 3,
    titel: 'Active Directory & Berechtigungen',
    tag: 'Betriebssysteme/Verzeichnisdienst',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'In einem Windows-Netz sollen Zugriffsrechte zentral verwaltet werden. Erläutern Sie das Prinzip **„Benutzer in Gruppen, Rechte an Gruppen"** und welchen Vorteil es bringt.',
        loesung_text:
          'Benutzerkonten werden **Gruppen** zugeordnet, und die **Berechtigungen** auf Ressourcen werden den **Gruppen** (nicht einzelnen Benutzern) erteilt. Vorteil: **zentrale, wartbare** Rechtevergabe – neue Mitarbeiter erben durch die Gruppenmitgliedschaft sofort die passenden Rechte, Änderungen wirken für alle Mitglieder gleichzeitig.',
        punkte: 5,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Gruppe', synonyme: ['Gruppen', 'Sicherheitsgruppe'] },
          { begriff: 'zentral', synonyme: ['zentrale Verwaltung', 'einheitlich'] },
          { begriff: 'wartbar', synonyme: ['pflegeleicht', 'weniger Aufwand', 'einfacher zu verwalten'] },
          { begriff: 'erben', synonyme: ['Vererbung', 'automatisch Rechte', 'Mitgliedschaft'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Was bewirkt eine **Gruppenrichtlinie (GPO)** im Active Directory? Nennen Sie **ein** Beispiel.',
        loesung_text:
          'Eine **GPO** verteilt zentrale **Einstellungen/Richtlinien** automatisch an Benutzer und Computer einer Domäne/OU. Beispiel: erzwungene **Passwortrichtlinie**, gemappte Netzlaufwerke, gesperrte USB-Ports, Desktop-/Sicherheitsvorgaben, Software-Verteilung.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Einstellung', synonyme: ['Richtlinie', 'Vorgabe', 'Konfiguration'] },
          { begriff: 'zentral', synonyme: ['automatisch verteilt', 'domänenweit', 'domaenenweit'] },
          { begriff: 'Passwort', synonyme: ['Passwortrichtlinie', 'Netzlaufwerk', 'USB', 'Software-Verteilung', 'Desktop'] },
        ],
      },
    ],
  },
  {
    nr: 4,
    titel: 'Verschlüsselung & PKI',
    tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Erläutern Sie den Unterschied zwischen **symmetrischer** und **asymmetrischer** Verschlüsselung und nennen Sie je ein typisches Einsatzgebiet.',
        loesung_text:
          'Bei **symmetrischer** Verschlüsselung nutzen beide Seiten **denselben geheimen Schlüssel** (schnell, z. B. AES für große Datenmengen). Bei **asymmetrischer** Verschlüsselung gibt es ein **Schlüsselpaar** aus **öffentlichem** und **privatem** Schlüssel (z. B. RSA für Schlüsselaustausch, Signaturen, TLS-Handshake). Oft kombiniert (Hybridverfahren).',
        punkte: 6,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'gleicher Schlüssel', synonyme: ['gleicher Schluessel', 'derselbe Schlüssel', 'ein Schlüssel', 'geheimer Schlüssel', 'geheimer Schluessel'] },
          { begriff: 'Schlüsselpaar', synonyme: ['Schluesselpaar', 'zwei Schlüssel', 'zwei Schluessel'] },
          { begriff: 'öffentlich', synonyme: ['oeffentlich', 'public key', 'Public Key'] },
          { begriff: 'privat', synonyme: ['private key', 'privater Schlüssel', 'privater Schluessel'] },
          { begriff: 'AES', synonyme: ['schnell', 'große Datenmengen', 'grosse Datenmengen'] },
          { begriff: 'RSA', synonyme: ['TLS', 'Signatur', 'Schlüsselaustausch', 'Schluesselaustausch'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Wozu dient ein **digitales Zertifikat** und welche Rolle spielt die **Zertifizierungsstelle (CA)**?',
        loesung_text:
          'Ein **Zertifikat** bindet einen **öffentlichen Schlüssel** verlässlich an eine **Identität** (z. B. eine Webseite) und stellt so **Authentizität** sicher. Die **CA** prüft die Identität und **signiert** das Zertifikat; Clients vertrauen dem Zertifikat, weil sie der CA (dem Aussteller) vertrauen.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'öffentlicher Schlüssel', synonyme: ['oeffentlicher Schluessel', 'public key', 'Schlüssel an Identität', 'Schluessel an Identitaet'] },
          { begriff: 'Identität', synonyme: ['Identitaet', 'Echtheit', 'Authentizität', 'Authentizitaet'] },
          { begriff: 'signier', synonyme: ['Signatur', 'unterschreibt', 'beglaubigt'] },
          { begriff: 'vertrau', synonyme: ['Vertrauen', 'vertrauenswürdig', 'vertrauenswuerdig'] },
        ],
      },
    ],
  },
  {
    nr: 5,
    titel: 'Cloud-Modelle',
    tag: 'Cloud/Servicemodelle',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Unterscheiden Sie die Cloud-Servicemodelle **IaaS**, **PaaS** und **SaaS** anhand dessen, **was der Anbieter** und **was der Kunde** jeweils verwaltet. Geben Sie je ein Beispiel.',
        loesung_text:
          '**IaaS** (Infrastructure as a Service): Anbieter stellt **virtuelle Infrastruktur** (Server, Storage, Netz), der Kunde verwaltet **Betriebssystem und Anwendungen** (z. B. AWS EC2). **PaaS** (Platform as a Service): Anbieter stellt zusätzlich die **Laufzeit-/Entwicklungsplattform**, der Kunde bringt nur seine **Anwendung/Code** ein (z. B. Azure App Service). **SaaS** (Software as a Service): Anbieter betreibt die **fertige Anwendung**, der Kunde **nutzt sie nur** (z. B. Microsoft 365).',
        punkte: 6,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'Infrastruktur', synonyme: ['Server', 'Storage', 'IaaS', 'virtuelle Hardware'] },
          { begriff: 'Plattform', synonyme: ['PaaS', 'Laufzeitumgebung', 'Entwicklungsplattform'] },
          { begriff: 'fertige Anwendung', synonyme: ['SaaS', 'nutzt nur', 'Software nutzen', 'Anwendung nutzen'] },
          { begriff: 'Betriebssystem', synonyme: ['OS verwaltet Kunde', 'Kunde verwaltet'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **zwei Risiken oder Nachteile**, die beim Umzug von Unternehmensdaten in eine **Public Cloud** zu bedenken sind.',
        loesung_text:
          'Z. B.: **Abhängigkeit** vom Anbieter (Vendor Lock-in), **Datenschutz/DSGVO** und Speicherort der Daten, **Internet-Abhängigkeit** (keine Verbindung → kein Zugriff), **laufende Kosten**, Kontrollverlust über die Infrastruktur, Sicherheitsvorfälle beim Anbieter.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Abhängig', synonyme: ['Abhaengig', 'Lock-in', 'Anbieterabhängigkeit', 'Vendor Lock'] },
          { begriff: 'Datenschutz', synonyme: ['DSGVO', 'Speicherort', 'Datenstandort'] },
          { begriff: 'Internet', synonyme: ['Verbindung nötig', 'Verbindung noetig', 'ohne Internet kein Zugriff', 'Leitung'] },
          { begriff: 'Kosten', synonyme: ['laufende Kosten', 'teuer'] },
          { begriff: 'Kontrollverlust', synonyme: ['weniger Kontrolle', 'Kontrolle abgeben'] },
        ],
      },
    ],
  },
  {
    nr: 6,
    titel: 'Datenbank-Normalisierung',
    tag: 'Datenbank/SQL/ER-Modell',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Was ist das Ziel der **Normalisierung** in relationalen Datenbanken? Nennen Sie ein Problem, das durch sie vermieden wird.',
        loesung_text:
          'Ziel ist das **Vermeiden von Redundanz** (mehrfach gespeicherte Daten) und der dadurch entstehenden **Anomalien** beim Einfügen, Ändern und Löschen. Beispiel: Ändert sich eine Adresse, müsste sie sonst an vielen Stellen geändert werden – Vergisst man eine, entstehen **inkonsistente** Daten.',
        punkte: 5,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Redundanz', synonyme: ['mehrfach gespeichert', 'doppelte Daten', 'Doppelung'] },
          { begriff: 'Anomalie', synonyme: ['Änderungsanomalie', 'Aenderungsanomalie', 'Einfügeanomalie', 'Löschanomalie'] },
          { begriff: 'inkonsistent', synonyme: ['widersprüchlich', 'widerspruechlich', 'Konsistenz', 'Inkonsistenz'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Eine Tabelle `bestellung(BestellNr, Datum, KundenNr, KundenName, KundenOrt)` ist nicht normalisiert, weil Kundendaten je Bestellung wiederholt werden. Beschreiben Sie, **wie** Sie das auflösen.',
        loesung_text:
          'Die Kundendaten in eine **eigene Tabelle** `kunde(KundenNr, KundenName, KundenOrt)` auslagern und in `bestellung` nur noch die **KundenNr als Fremdschlüssel** belassen. Damit stehen die Kundendaten **nur einmal** und werden über die Beziehung referenziert.',
        punkte: 5,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'eigene Tabelle', synonyme: ['neue Tabelle', 'Kundentabelle', 'auslagern', 'zweite Tabelle', 'aufteilen'] },
          { begriff: 'Fremdschlüssel', synonyme: ['Fremdschluessel', 'foreign key', 'KundenNr verweist', 'Beziehung'] },
          { begriff: 'nur einmal', synonyme: ['einmal speichern', 'keine Wiederholung', 'redundanzfrei'] },
        ],
      },
    ],
  },
  {
    nr: 7,
    titel: 'ITIL & Change-Management',
    tag: 'IT-Service-Management',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Unterscheiden Sie im IT-Service-Management einen **Incident** von einem **Problem**.',
        loesung_text:
          'Ein **Incident** (Störung) ist die **einzelne, akute Beeinträchtigung** eines Dienstes; Ziel ist die **schnelle Wiederherstellung** des Betriebs (auch per Workaround). Ein **Problem** ist die **zugrunde liegende Ursache** eines oder mehrerer Incidents; das Problem-Management sucht und beseitigt die **Ursache dauerhaft**.',
        punkte: 5,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Störung', synonyme: ['Stoerung', 'akut', 'einzelner Vorfall', 'Beeinträchtigung', 'Beeintraechtigung'] },
          { begriff: 'Wiederherstellung', synonyme: ['schnell beheben', 'Betrieb wiederherstellen', 'Workaround'] },
          { begriff: 'Ursache', synonyme: ['Grundursache', 'Root Cause', 'dahinter'] },
          { begriff: 'dauerhaft', synonyme: ['nachhaltig', 'endgültig', 'endgueltig', 'beseitigen'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Warum durchläuft eine Änderung an einem produktiven System ein **Change-Management**? Nennen Sie **zwei** Gründe.',
        loesung_text:
          'Z. B.: **Risiken** der Änderung bewertbar machen und minimieren, **Genehmigung/Nachvollziehbarkeit** (wer hat wann was warum geändert), **Planung** von Zeitfenster und **Rollback**, Vermeidung von **Ausfällen**/Konflikten, Information der Betroffenen.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Risiko', synonyme: ['Risiken', 'Risikobewertung', 'Auswirkung bewerten'] },
          { begriff: 'Genehmigung', synonyme: ['Freigabe', 'Nachvollziehbar', 'Dokumentation', 'wer was wann'] },
          { begriff: 'Rollback', synonyme: ['Rückrollung', 'Rueckrollung', 'rückgängig', 'ruecksetzen', 'Plan B'] },
          { begriff: 'Ausfall', synonyme: ['Ausfälle vermeiden', 'Ausfaelle vermeiden', 'Störung vermeiden', 'Stoerung vermeiden'] },
        ],
      },
    ],
  },
  {
    nr: 8,
    titel: 'Anforderungen: Lasten- & Pflichtenheft',
    tag: 'Projektmanagement',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Erklären Sie den Unterschied zwischen **Lastenheft** und **Pflichtenheft** und geben Sie an, **wer** sie jeweils erstellt.',
        loesung_text:
          'Das **Lastenheft** beschreibt **was** gefordert ist (die Anforderungen aus Sicht des **Auftraggebers/Kunden**) – es wird vom **Kunden** erstellt. Das **Pflichtenheft** beschreibt **wie** der **Auftragnehmer** diese Anforderungen umsetzt (Lösungskonzept) – es wird vom **Auftragnehmer** erstellt und vom Kunden abgenommen.',
        punkte: 5,
        mindest_treffer: 3,
        schluesselwoerter: [
          { begriff: 'was', synonyme: ['Anforderung', 'Forderung', 'Ziel'] },
          { begriff: 'Auftraggeber', synonyme: ['Kunde', 'Besteller'] },
          { begriff: 'wie', synonyme: ['Umsetzung', 'Lösung', 'Loesung', 'Realisierung'] },
          { begriff: 'Auftragnehmer', synonyme: ['Lieferant', 'Anbieter', 'Dienstleister'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Unterscheiden Sie **funktionale** von **nicht-funktionalen** Anforderungen mit je einem Beispiel.',
        loesung_text:
          '**Funktionale** Anforderungen beschreiben, **was das System können** muss (eine konkrete Funktion, z. B. „Nutzer kann sich anmelden"). **Nicht-funktionale** Anforderungen beschreiben **Qualität/Rahmenbedingungen** (z. B. Antwortzeit < 2 s, Verfügbarkeit 99,9 %, Sicherheit, Bedienbarkeit).',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Funktion', synonyme: ['was das System kann', 'Leistung', 'konkrete Aufgabe'] },
          { begriff: 'Qualität', synonyme: ['Qualitaet', 'Rahmenbedingung', 'Performance', 'Antwortzeit', 'Verfügbarkeit', 'Verfuegbarkeit', 'Sicherheit', 'Bedienbarkeit'] },
        ],
      },
    ],
  },
  {
    nr: 9,
    titel: 'Schadsoftware & Angriffe',
    tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Was ist **Ransomware** und welche **organisatorische** Maßnahme schützt am wirksamsten vor Datenverlust durch sie?',
        loesung_text:
          '**Ransomware** (Erpressungstrojaner) **verschlüsselt** die Daten des Opfers und fordert **Lösegeld** für die Freigabe. Wirksamster Schutz vor Datenverlust: regelmäßige, **getrennt aufbewahrte Backups** (offline/Offsite, 3-2-1-Regel), die nicht mitverschlüsselt werden können – so kann man die Daten wiederherstellen, ohne zu zahlen.',
        punkte: 5,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'verschlüssel', synonyme: ['verschluessel', 'sperrt Daten', 'macht Daten unbrauchbar'] },
          { begriff: 'Lösegeld', synonyme: ['Loesegeld', 'Erpressung', 'Zahlung', 'erpresst'] },
          { begriff: 'Backup', synonyme: ['Datensicherung', 'Sicherung'] },
          { begriff: 'getrennt', synonyme: ['offline', 'Offsite', 'ausgelagert', '3-2-1', 'nicht erreichbar'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Erklären Sie, was ein **Phishing**-Angriff ist und nennen Sie **zwei** Merkmale, an denen Mitarbeitende eine Phishing-Mail erkennen können.',
        loesung_text:
          'Beim **Phishing** versucht ein Angreifer, über gefälschte Nachrichten (oft E-Mail) an **Zugangsdaten** oder andere sensible Informationen zu gelangen, indem er sich als **vertrauenswürdiger Absender** ausgibt. Merkmale: gefälschte **Absenderadresse**/Linkziel, **Dringlichkeit/Drohung**, **Rechtschreibfehler**, unpersönliche Anrede, **Aufforderung zur Eingabe** von Daten/Anhang.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Zugangsdaten', synonyme: ['Passwort', 'Anmeldedaten', 'sensible Daten', 'Login'] },
          { begriff: 'vorgetäuscht', synonyme: ['vorgetaeuscht', 'gefälschter Absender', 'gefaelschter Absender', 'gibt sich aus', 'vertrauenswürdig', 'vertrauenswuerdig'] },
          { begriff: 'Absenderadresse', synonyme: ['falscher Link', 'Linkziel', 'gefälschter Link', 'gefaelschter Link', 'Domain'] },
          { begriff: 'Dringlichkeit', synonyme: ['Drohung', 'Zeitdruck', 'Druck'] },
          { begriff: 'Rechtschreibfehler', synonyme: ['Fehler', 'unpersönliche Anrede', 'unpersoenliche Anrede'] },
        ],
      },
    ],
  },
  {
    nr: 10,
    titel: 'Verfügbarkeit berechnen',
    tag: 'Wirtschaftlichkeit/Kosten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Ein Dienst hatte in einem **30-Tage-Monat** (720 Stunden geplante Laufzeit) insgesamt **3,6 Stunden** ungeplanten Ausfall. Berechnen Sie die **Verfügbarkeit in Prozent**.',
        loesung_text:
          'Verfügbarkeit = (Sollzeit − Ausfallzeit) / Sollzeit = (720 − 3,6) / 720 = 716,4 / 720 = **0,995 = 99,5 %**.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: '99,5', synonyme: ['99.5', '99,5 %', '99,5%', '0,995'] },
          { begriff: '716,4', synonyme: ['716.4', '720 - 3,6'] },
          { begriff: 'Sollzeit', synonyme: ['geplante Zeit', 'Gesamtzeit', '720'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Erklären Sie, warum eine zugesicherte Verfügbarkeit von **99,9 %** in einem **SLA** trotzdem mehrere Stunden Ausfall pro Jahr erlauben kann.',
        loesung_text:
          '99,9 % bezieht sich auf die **gesamte Jahreslaufzeit** (8.760 Stunden). 0,1 % davon sind **erlaubte Ausfallzeit**: 8.760 · 0,001 ≈ **8,76 Stunden pro Jahr**. Eine scheinbar hohe Prozentzahl lässt also durchaus relevante Ausfallzeit zu – deshalb sind im **SLA** auch Reaktions-/Wiederherstellungszeiten wichtig.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: '8,76', synonyme: ['8.76', 'rund 8,8', 'ca. 9 Stunden', 'fast 9 Stunden'] },
          { begriff: '0,1', synonyme: ['0.1', '0,1 Prozent', '0,1 %'] },
          { begriff: 'Jahr', synonyme: ['8760', 'Jahreslaufzeit', 'pro Jahr'] },
        ],
      },
    ],
  },
  {
    nr: 11,
    titel: 'Strukturierte Verkabelung',
    tag: 'Hardware/Komponenten',
    fragen: [
      {
        teil: 'a',
        frage_text:
          'Warum ist bei einer **strukturierten Gebäudeverkabelung** die **Länge eines Kupfer-Patchkabels (Twisted Pair) auf 100 m** begrenzt? Was passiert bei Überschreitung?',
        loesung_text:
          'Mit zunehmender Länge steigt die **Signaldämpfung** (Abschwächung) und Störanfälligkeit; ab ca. **100 m** ist das Signal so schwach/gestört, dass keine zuverlässige Übertragung mehr garantiert ist (Norm EN 50173). Folge: **Übertragungsfehler**, Paketverluste, geringerer Durchsatz. Für größere Distanzen nutzt man **Lichtwellenleiter (Glasfaser)** oder setzt aktive Komponenten (Switch) dazwischen.',
        punkte: 5,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Dämpfung', synonyme: ['Daempfung', 'Signal schwächer', 'Signal schwaecher', 'Abschwächung', 'Abschwaechung'] },
          { begriff: 'Störung', synonyme: ['Stoerung', 'störanfällig', 'stoeranfaellig', 'Fehler', 'Paketverlust'] },
          { begriff: 'Glasfaser', synonyme: ['Lichtwellenleiter', 'LWL', 'Switch dazwischen', 'aktive Komponente'] },
        ],
      },
      {
        teil: 'b',
        frage_text:
          'Nennen Sie **zwei Vorteile** von **Glasfaser (LWL)** gegenüber Kupferkabel.',
        loesung_text:
          'Z. B.: **höhere Reichweite** (km statt 100 m), **größere Bandbreite**, **unempfindlich gegen elektromagnetische Störungen** (EMV), **keine Erdungs-/Potenzialprobleme**, abhörsicherer.',
        punkte: 4,
        mindest_treffer: 2,
        schluesselwoerter: [
          { begriff: 'Reichweite', synonyme: ['größere Distanz', 'groessere Distanz', 'km', 'weiter'] },
          { begriff: 'Bandbreite', synonyme: ['mehr Geschwindigkeit', 'schneller', 'höherer Durchsatz', 'hoeherer Durchsatz'] },
          { begriff: 'elektromagnetisch', synonyme: ['EMV', 'Störungen', 'Stoerungen', 'unempfindlich', 'kein Übersprechen', 'kein Uebersprechen'] },
          { begriff: 'abhörsicher', synonyme: ['abhoersicher', 'sicherer', 'schwer abzuhören'] },
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
        saison: 'Übungsklausur 2',
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
      saison: 'Übungsklausur 2',
      fachrichtung: 'Fachinformatiker/in für Systemintegration',
      teil: 'AP2 – Ganzheitliche Aufgabe (Übung)',
      titel: 'AP2 Übungsklausur 2 (KI-generiert)',
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
  // Idempotent: bestehende KI-AP2-Übungsklausur 2 entfernen.
  data.exams = data.exams.filter((e) => e?.meta?.quelle_dateiname !== MARKER);
  data.exams.push(exam);

  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(
    `Import OK: AP2-Übungsklausur 2 mit ${fragen.length} Fragen (${punkteGesamt} Punkte) ` +
      `in ${AUFGABEN.length} Aufgaben. Prüfungen gesamt jetzt: ${data.exams.length}.`
  );
}

main();
