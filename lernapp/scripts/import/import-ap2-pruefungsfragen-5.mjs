#!/usr/bin/env node
/**
 * AP2-Übungsklausur 5: eigenständig formuliertes Set für die in
 * docs/AP2_THEMENMATRIX.md als dünn markierten Themen (VPN, Monitoring,
 * Identitäten, Hochverfügbarkeit) plus Rechenaufgaben.
 * Idempotent über MARKER; vor dem Lauf npm run backup ausführen.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeAntwort } from '../../src/lib/antwortpruefung.js';

const hier = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(hier, '..', '..', 'src', 'data', 'exam_data.json');
const MARKER = 'ki_ap2_uebung5_2026';
const ID_PREFIX = 'ap2ki5_';
const QUELLE = 'KI-generiert (an AP2-Prüfungsthemen angelehnt, nicht offiziell)';

const q = (teil, frage_text, loesung_text, punkte, schluesselwoerter, mindest_treffer) => ({
  teil, frage_text, loesung_text, punkte, schluesselwoerter,
  ...(mindest_treffer ? { mindest_treffer } : {}),
});

const AUFGABEN = [
  {
    nr: 1, titel: 'Site-to-Site-VPN mit IPsec', tag: 'Netzwerk/VPN',
    fragen: [
      q('a',
        'Zwei Standorte sollen über das Internet per IPsec verbunden werden. Beschreiben Sie die beiden Phasen des Verbindungsaufbaus mit IKE.',
        'In **Phase 1** handeln die Gateways per IKE einen geschützten Verwaltungskanal aus (**IKE-SA**) und authentifizieren sich, z. B. per Pre-Shared Key oder **Zertifikat**. In **Phase 2** werden darüber die eigentlichen **IPsec-SAs** für die Nutzdaten (ESP) mit Verschlüsselung und Integritätsschutz vereinbart.',
        5, ['Phase 1', 'IKE-SA', 'Zertifikat', 'Phase 2', 'IPsec-SAs'], 4),
      q('b',
        'Erläutern Sie den Unterschied zwischen Tunnel- und Transportmodus und begründen Sie, welcher Modus für Site-to-Site geeignet ist.',
        'Im **Tunnelmodus** wird das komplette ursprüngliche IP-Paket verschlüsselt und mit einem **neuen IP-Header** versehen. Im **Transportmodus** wird nur die **Nutzlast** geschützt, der Original-Header bleibt. Für Site-to-Site zwischen Gateways ist der **Tunnelmodus** geeignet, weil ganze Netze hinter den Gateways verbunden werden.',
        4, ['Tunnelmodus', 'neuen IP-Header', 'Transportmodus', 'Nutzlast']),
    ],
  },
  {
    nr: 2, titel: 'Remote-Zugriff für Mitarbeitende', tag: 'Netzwerk/VPN',
    fragen: [
      q('a',
        'Ein Unternehmen überlegt zwischen Full-Tunnel und Split-Tunnel für das Client-VPN. Stellen Sie je einen Vor- und Nachteil gegenüber.',
        'Beim **Full-Tunnel** läuft der gesamte Verkehr über das Firmennetz: zentrale **Kontrolle** und Filterung, aber hohe **Last** auf der Firmenleitung. Beim **Split-Tunnel** geht nur Firmenverkehr durch das VPN: **entlastet** die Leitung, aber Internetverkehr umgeht die Sicherheitsrichtlinien des Unternehmens.',
        4, ['Full-Tunnel', 'Kontrolle', 'Last', 'Split-Tunnel', 'entlastet'], 4),
      q('b',
        'Nennen Sie drei Maßnahmen, um den VPN-Zugang gegen gestohlene Zugangsdaten abzusichern.',
        'Sinnvoll sind **MFA** beim Login, **Zertifikate** auf verwalteten Geräten, eine **Geräteprüfung** (Patchstand, Virenschutz) vor dem Zugriff sowie Kontosperrung und Protokollierung fehlgeschlagener Anmeldungen.',
        3, ['MFA', 'Zertifikate', 'Geräteprüfung', 'Protokollierung'], 3),
    ],
  },
  {
    nr: 3, titel: 'Kennzahlen & Schwellwerte im Monitoring', tag: 'Monitoring/IT-Betrieb',
    fragen: [
      q('a',
        'Für einen Fileserver sollen Warn- und Kritisch-Schwellwerte definiert werden. Nennen Sie vier sinnvolle Messgrößen und erklären Sie den Zweck zweistufiger Schwellwerte.',
        'Messgrößen sind z. B. **CPU-Last**, **Arbeitsspeicher**, **Festplattenbelegung** und Erreichbarkeit/Antwortzeit der Freigaben. Zwei Stufen trennen **Warnung** (frühzeitig reagieren, geplant handeln) von **kritisch** (sofortiges Eingreifen, Alarmierung der Bereitschaft).',
        5, ['CPU-Last', 'Arbeitsspeicher', 'Festplattenbelegung', 'Warnung', 'kritisch'], 4),
      q('b',
        'Das Monitoring meldet nachts dutzende Alarme, die sich morgens als harmlos erweisen. Nennen Sie zwei Ursachen und zwei Gegenmaßnahmen dieser Alarmmüdigkeit.',
        'Ursachen sind zu **niedrige Schwellwerte** und fehlende Abhängigkeiten, sodass ein Ausfall viele **Folgealarme** auslöst. Gegenmaßnahmen: Schwellwerte mit **Hysterese** bzw. Mindestdauer anpassen und **Abhängigkeiten** modellieren, damit nur die Ursache alarmiert.',
        4, ['niedrige Schwellwerte', 'Folgealarme', 'Hysterese', 'Abhängigkeiten'], 3),
    ],
  },
  {
    nr: 4, titel: 'Protokollierung & Datenschutz', tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      q('a',
        'Ein Webserver protokolliert IP-Adressen der Besucher. Erklären Sie, warum das datenschutzrelevant ist und wie die Speicherung DSGVO-konform gestaltet werden kann.',
        'IP-Adressen sind **personenbezogene Daten**, weil sie einer Person zugeordnet werden können. Konform wird die Speicherung durch einen klaren **Zweck** (z. B. Angriffserkennung), eine kurze **Speicherdauer** mit automatischer Löschung und **Kürzung** bzw. Pseudonymisierung der Adressen.',
        5, ['personenbezogene Daten', 'Zweck', 'Speicherdauer', 'Kürzung']),
      q('b',
        'Warum müssen Server für aussagekräftige Logs eine synchrone Uhrzeit haben, und wie wird das umgesetzt?',
        'Ohne gleiche Zeitbasis lassen sich Ereignisse mehrerer Systeme nicht **korrelieren** und Abläufe nicht rekonstruieren. Umgesetzt wird das mit **NTP**, das alle Systeme gegen einen gemeinsamen **Zeitserver** synchronisiert.',
        3, ['korrelieren', 'NTP', 'Zeitserver']),
    ],
  },
  {
    nr: 5, titel: 'Berechtigungen im Active Directory', tag: 'Betriebssysteme/Verzeichnisdienst',
    fragen: [
      q('a',
        'Erläutern Sie das AGDLP-Prinzip für die Vergabe von Dateirechten an einer Freigabe.',
        '**Accounts** (Benutzerkonten) werden **globalen Gruppen** nach Abteilung/Rolle zugeordnet. Diese werden Mitglied **domänenlokaler Gruppen**, die für eine Ressource stehen. Nur die domänenlokale Gruppe erhält die **Permissions** auf der Freigabe – Rechte bleiben übersichtlich und leicht änderbar.',
        5, ['Accounts', 'globalen Gruppen', 'domänenlokaler Gruppen', 'Permissions']),
      q('b',
        'Ein Benutzer hat auf eine Freigabe die Freigabeberechtigung „Lesen“ und die NTFS-Berechtigung „Ändern“. Welche Rechte hat er beim Zugriff über das Netzwerk? Begründen Sie.',
        'Er darf nur **lesen**. Beim Netzwerkzugriff gilt die **restriktivere** der beiden Berechtigungen; Freigabe- und **NTFS-Rechte** werden kombiniert und das Minimum zählt.',
        3, ['lesen', 'restriktivere', 'NTFS-Rechte']),
    ],
  },
  {
    nr: 6, titel: 'Hochverfügbarkeit & Lastverteilung', tag: 'Server/Virtualisierung',
    fragen: [
      q('a',
        'Vergleichen Sie einen Active-Passive- mit einem Active-Active-Cluster für einen Webdienst.',
        'Bei **Active-Passive** arbeitet ein Knoten, der zweite übernimmt erst beim Ausfall (**Failover**); Ressourcen bleiben im Normalbetrieb ungenutzt. Bei **Active-Active** bedienen alle Knoten gleichzeitig Anfragen, meist hinter einem **Load Balancer**; das erhöht Leistung und Auslastung, erfordert aber synchronisierte Daten.',
        5, ['Active-Passive', 'Failover', 'Active-Active', 'Load Balancer']),
      q('b',
        'Wozu dient ein Health Check beim Load Balancer, und was passiert bei einem fehlgeschlagenen Check?',
        'Der **Health Check** prüft regelmäßig, ob ein Backend-Server antwortet (z. B. HTTP-Status 200). Schlägt er fehl, nimmt der Load Balancer den Server **aus dem Pool** und verteilt Anfragen nur noch an **gesunde** Server, bis der Check wieder erfolgreich ist.',
        3, ['Health Check', 'aus dem Pool', 'gesunde']),
    ],
  },
  {
    nr: 7, titel: 'Verfügbarkeit berechnen', tag: 'Server/Virtualisierung',
    fragen: [
      q('a',
        'Zwei Komponenten mit je 99 % Verfügbarkeit sind in Reihe geschaltet (beide müssen laufen). Berechnen Sie die Gesamtverfügbarkeit.',
        'Bei **Reihenschaltung** werden die Verfügbarkeiten multipliziert: 0,99 × 0,99 = **0,9801**, also **98,01 %**. Die Gesamtverfügbarkeit ist damit geringer als die jeder einzelnen Komponente.',
        3, ['Reihenschaltung', '0,9801', '98,01']),
      q('b',
        'Die beiden Komponenten werden redundant parallel betrieben (eine genügt). Berechnen Sie die Gesamtverfügbarkeit und die maximale jährliche Ausfallzeit in Stunden (365 Tage).',
        'Bei **Parallelschaltung** gilt 1 − (0,01 × 0,01) = **0,9999**, also **99,99 %**. Ausfallzeit pro Jahr: 8760 h × 0,0001 = **0,876 h** (rund 53 Minuten).',
        4, ['Parallelschaltung', '0,9999', '99,99', '0,876']),
    ],
  },
  {
    nr: 8, titel: 'Leasing oder Kauf', tag: 'Kostenrechnung/Wirtschaft',
    fragen: [
      q('a',
        'Ein Server kostet 9.000 € in der Anschaffung, Nutzungsdauer 3 Jahre. Alternativ kostet Leasing 280 € pro Monat. Berechnen Sie die Gesamtkosten beider Varianten über 3 Jahre.',
        'Kauf: **9.000 €**. Leasing: 280 € × 36 Monate = **10.080 €**. Über drei Jahre ist der Kauf damit um **1.080 €** günstiger.',
        4, ['9.000', '10.080', '1.080']),
      q('b',
        'Nennen Sie zwei Gründe, warum ein Unternehmen trotz höherer Gesamtkosten leasen könnte.',
        'Leasing schont die **Liquidität**, weil keine hohe Einmalzahlung anfällt, die Raten sind gut **planbar** und als Betriebsausgaben absetzbar. Außerdem erleichtert es den regelmäßigen **Technologiewechsel** nach Laufzeitende.',
        3, ['Liquidität', 'planbar', 'Technologiewechsel'], 2),
    ],
  },
  {
    nr: 9, titel: 'Transaktionen in Datenbanken', tag: 'Datenbank/SQL/ER-Modell',
    fragen: [
      q('a',
        'Erklären Sie die ACID-Eigenschaften einer Datenbanktransaktion am Beispiel einer Überweisung.',
        '**Atomarität**: Abbuchung und Gutschrift erfolgen ganz oder gar nicht. **Konsistenz**: Nach der Transaktion gelten alle Regeln (z. B. Summe bleibt gleich). **Isolation**: Parallele Transaktionen beeinflussen sich nicht sichtbar. **Dauerhaftigkeit**: Nach dem Commit bleibt die Änderung auch bei Absturz erhalten.',
        6, ['Atomarität', 'Konsistenz', 'Isolation', 'Dauerhaftigkeit']),
      q('b',
        'Schreiben Sie eine SQL-Anweisung, die alle Kunden aus der Tabelle `kunde` mit dem Ort „Köln“ alphabetisch nach Nachname ausgibt.',
        'SELECT * FROM kunde WHERE ort = \'Köln\' ORDER BY nachname; – **SELECT** wählt die Spalten, **WHERE** filtert den Ort, **ORDER BY** sortiert aufsteigend nach Nachname.',
        3, ['SELECT', 'WHERE', 'ORDER BY']),
    ],
  },
  {
    nr: 10, titel: 'Linux-Administration', tag: 'Betriebssysteme/Linux',
    fragen: [
      q('a',
        'Ein Skript `/opt/backup.sh` soll vom Besitzer ausgeführt und bearbeitet, von der Gruppe nur gelesen und von anderen gar nicht genutzt werden. Geben Sie den chmod-Befehl in Oktalschreibweise an und erläutern Sie ihn.',
        'chmod **740** /opt/backup.sh – **7** = rwx für den Besitzer, **4** = r für die Gruppe, **0** = keine Rechte für andere.',
        3, ['740', 'rwx', 'Gruppe']),
      q('b',
        'Das Skript soll jede Nacht um 2:30 Uhr laufen. Geben Sie den passenden crontab-Eintrag an und erklären Sie die Felder.',
        '`30 2 * * * /opt/backup.sh` – die Felder sind **Minute** (30), **Stunde** (2), Tag des Monats, Monat und **Wochentag**; `*` steht für „jeder“.',
        4, ['Minute', 'Stunde', 'Wochentag']),
    ],
  },
  {
    nr: 11, titel: 'Incident, Problem & Change', tag: 'Projektmanagement',
    fragen: [
      q('a',
        'Grenzen Sie nach ITIL Incident Management und Problem Management voneinander ab.',
        '**Incident Management** stellt den gestörten Dienst so **schnell** wie möglich wieder her, notfalls per Workaround. **Problem Management** sucht die **Ursache** wiederkehrender Störungen und beseitigt sie dauerhaft, z. B. über einen Known Error und einen Change.',
        4, ['Incident Management', 'schnell', 'Problem Management', 'Ursache']),
      q('b',
        'Ein Firmware-Update der Firewall steht an. Nennen Sie vier Inhalte eines Change-Antrags.',
        'Ein Change-Antrag enthält **Beschreibung** und Begründung, eine **Risikobewertung**, den geplanten **Zeitraum** (Wartungsfenster) und einen **Rückfallplan** (Rollback) sowie betroffene Dienste und die Freigabe durch das CAB.',
        4, ['Beschreibung', 'Risikobewertung', 'Zeitraum', 'Rückfallplan'], 4),
    ],
  },
];

function baueFragen() {
  return AUFGABEN.flatMap((aufgabe) =>
    aufgabe.fragen.map((frage) => ({
      id: `${ID_PREFIX}${aufgabe.nr}${frage.teil}`,
      jahr: 2026,
      saison: 'Übungsklausur 5',
      fachrichtung: 'Fachinformatiker/in für Systemintegration',
      aufgabe_nr: aufgabe.nr,
      aufgabe_titel: aufgabe.titel,
      teilfrage: `${aufgabe.nr}${frage.teil}`,
      ueberschrift: '',
      frage_text: frage.frage_text,
      punkte: frage.punkte,
      schwierigkeit: frage.punkte <= 2 ? 1 : frage.punkte <= 4 ? 2 : 3,
      loesung_text: frage.loesung_text,
      hat_offizielle_loesung: false,
      unverifiziert_markiert: false,
      thema_tags: [aufgabe.tag],
      ist_kontext_block: false,
      hat_antwort: true,
      schluesselwoerter: frage.schluesselwoerter,
      ...(frage.mindest_treffer ? { mindest_treffer: frage.mindest_treffer } : {}),
      kategorie: aufgabe.titel,
      quelle: QUELLE,
    }))
  );
}

function pruefeMusterloesungen(fragen) {
  const fehler = fragen.filter((frage) => {
    const ergebnis = pruefeAntwort(frage.loesung_text, frage.schluesselwoerter, {
      erforderlich: frage.mindest_treffer,
    });
    return ergebnis.bewertung !== 'richtig';
  });
  if (fehler.length) {
    throw new Error(
      `Keyword-Selbsttest fehlgeschlagen: ${fehler.map((frage) => frage.id).join(', ')}`
    );
  }
}

function main() {
  const fragen = baueFragen();
  pruefeMusterloesungen(fragen);
  const punkteGesamt = fragen.reduce((summe, frage) => summe + frage.punkte, 0);
  const exam = {
    meta: {
      jahr: 2026,
      saison: 'Übungsklausur 5',
      fachrichtung: 'Fachinformatiker/in für Systemintegration',
      teil: 'AP2 – Ganzheitliche Aufgabe (Übung)',
      titel: 'AP2 Übungsklausur 5 (KI-generiert)',
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
  data.exams = (data.exams || []).filter((e) => e?.meta?.quelle_dateiname !== MARKER);
  data.exams.push(exam);
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(
    `Import OK: AP2-Übungsklausur 5 mit ${fragen.length} Fragen (${punkteGesamt} Punkte), Keyword-Selbsttest grün.`
  );
}

main();
