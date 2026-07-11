#!/usr/bin/env node
/**
 * AP2-Übungsklausur 4: lückenorientiertes, eigenständig formuliertes Set.
 * Schwerpunkte wurden aus docs/AP2_THEMENMATRIX.md abgeleitet.
 * Idempotent über MARKER; vor dem Lauf npm run backup ausführen.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pruefeAntwort } from '../../src/lib/antwortpruefung.js';

const hier = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(hier, '..', '..', 'src', 'data', 'exam_data.json');
const MARKER = 'ki_ap2_uebung4_2026';
const ID_PREFIX = 'ap2ki4_';
const QUELLE = 'KI-generiert (an AP2-Prüfungsthemen angelehnt, nicht offiziell)';

const q = (teil, frage_text, loesung_text, punkte, schluesselwoerter, mindest_treffer) => ({
  teil, frage_text, loesung_text, punkte, schluesselwoerter,
  ...(mindest_treffer ? { mindest_treffer } : {}),
});

const AUFGABEN = [
  {
    nr: 1, titel: 'Kerberos & Single Sign-on', tag: 'Betriebssysteme/Verzeichnisdienst',
    fragen: [
      q('a',
        'Ein Domänenbenutzer soll mehrere interne Dienste ohne erneute Passworteingabe verwenden. Erklären Sie den Kerberos-Ablauf mit **TGT** und **Service-Ticket**.',
        'Nach der Anmeldung stellt das **KDC** nach erfolgreicher Authentifizierung ein **Ticket Granting Ticket (TGT)** aus. Für einen konkreten Dienst fordert der Client damit ein **Service-Ticket** an. Der Dienst prüft dieses Ticket; das Passwort wird nicht an jeden Dienst übertragen.',
        5, ['KDC', 'TGT', 'Service-Ticket', 'Passwort']),
      q('b',
        'Nennen Sie zwei Vorteile und ein Risiko von Single Sign-on im Unternehmen.',
        'Vorteile sind **weniger Passworteingaben**, eine zentrale **Kontosperrung** und weniger Passwort-Wildwuchs. Risiko: Ein kompromittiertes zentrales Konto ermöglicht Zugriff auf **mehrere Dienste**; deshalb sind MFA und kurze Sitzungen wichtig.',
        4, ['Passworteingaben', 'Kontosperrung', 'mehrere Dienste', 'MFA'], 3),
    ],
  },
  {
    nr: 2, titel: 'Backup-Strategie, GFS, RPO & RTO', tag: 'Datensicherung/Storage',
    fragen: [
      q('a',
        'Entwerfen Sie für einen Fileserver eine **GFS-Rotation** und erläutern Sie die Rollen von Großvater, Vater und Sohn.',
        'Bei GFS stehen **Sohn** für tägliche, **Vater** für wöchentliche und **Großvater** für monatliche Sicherungen. Mehrere Generationen werden getrennt aufbewahrt, sodass kurzfristige Fehler und ältere Datenstände wiederherstellbar bleiben.',
        5, ['tägliche', 'wöchentliche', 'monatliche', 'Generationen'], 3),
      q('b',
        'Ein Dienst hat RPO 4 Stunden und RTO 2 Stunden. Erklären Sie beide Werte und leiten Sie eine passende Sicherungsvorgabe ab.',
        '**RPO 4 Stunden** bedeutet höchstens vier Stunden tolerierten **Datenverlust**; Sicherungen oder Replikationen müssen daher mindestens alle vier Stunden erfolgen. **RTO 2 Stunden** bedeutet, dass der Dienst spätestens zwei Stunden nach dem Ausfall wieder **betriebsbereit** sein muss.',
        4, ['RPO', 'Datenverlust', 'RTO', 'betriebsbereit']),
    ],
  },
  {
    nr: 3, titel: 'SNMP, Syslog & Alarmierung', tag: 'Monitoring/IT-Betrieb',
    fragen: [
      q('a',
        'Vergleichen Sie SNMP-Polling und SNMP-Traps für die Überwachung eines Switches.',
        'Beim **Polling** fragt das Managementsystem regelmäßig Messwerte beim Gerät ab. Ein **Trap** wird vom Gerät bei einem **Ereignis** selbstständig gesendet. Polling erkennt Trends planbar, Traps melden Ereignisse schnell, können aber verloren gehen.',
        5, ['Polling', 'regelmäßig', 'Trap', 'Ereignis']),
      q('b',
        'Warum sollten Server und Netzwerkgeräte ihre Syslog-Meldungen an einen zentralen Logserver senden? Nennen Sie drei Gründe.',
        'Zentrale Logs ermöglichen **Korrelation** über mehrere Systeme, schnelle **Suche**, einheitliche **Aufbewahrung** und Alarmierung. Bei einem kompromittierten Gerät bleiben ausgelagerte Protokolle außerdem gegen lokale **Manipulation** geschützt.',
        4, ['Korrelation', 'Suche', 'Aufbewahrung', 'Manipulation'], 3),
    ],
  },
  {
    nr: 4, titel: 'Netzsegmentierung & Zero Trust', tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      q('a',
        'Ein Unternehmen trennt Clients, Server, Verwaltung und IoT in VLANs. Erläutern Sie den Sicherheitsgewinn und die notwendige Kommunikation zwischen den VLANs.',
        'VLANs bilden getrennte **Broadcast-Domänen** und begrenzen die **laterale Bewegung** eines Angreifers. Verkehr zwischen den Segmenten läuft über einen **Router oder eine Firewall** und wird dort mit expliziten **Regeln** nach dem Least-Privilege-Prinzip freigegeben.',
        5, ['Broadcast-Domänen', 'laterale Bewegung', 'Firewall', 'Regeln']),
      q('b',
        'Erklären Sie den Zero-Trust-Grundsatz „Never trust, always verify“ und nennen Sie zwei technische Maßnahmen.',
        'Zero Trust gewährt keinen pauschalen Vertrauensvorschuss. Jeder Zugriff wird anhand von **Identität**, Gerätezustand und Kontext **geprüft** und minimal autorisiert. Maßnahmen sind **MFA**, Geräte-Compliance, **Mikrosegmentierung** und zeitlich begrenzte Rechte.',
        4, ['Identität', 'geprüft', 'MFA', 'Mikrosegmentierung'], 3),
    ],
  },
  {
    nr: 5, titel: 'WLAN-Ausleuchtung & Sicherheit', tag: 'Netzwerk/IP-Adressierung',
    fragen: [
      q('a',
        'Beschreiben Sie vier Schritte einer professionellen WLAN-Ausleuchtung für ein neues Büro.',
        'Zuerst werden **Grundriss**, Materialien und Nutzerlast aufgenommen. Danach folgt eine Funkplanung. Vor Ort misst ein **Site Survey** Signalstärke, Störungen und Kanalbelegung. Anschließend werden AP-Positionen und **Kanäle** angepasst und durch eine **Nachmessung** validiert.',
        5, ['Grundriss', 'Site Survey', 'Kanäle', 'Nachmessung'], 3),
      q('b',
        'Warum sind überlappungsfreie Kanäle und WPA3-Enterprise für ein Firmen-WLAN sinnvoll?',
        'Überlappungsarme **Kanäle** reduzieren gegenseitige **Interferenzen**. **WPA3-Enterprise** authentifiziert Benutzer oder Geräte zentral über 802.1X/**RADIUS** und liefert individuelle Zugangsdaten statt eines gemeinsam genutzten Schlüssels.',
        4, ['Kanäle', 'Interferenzen', 'WPA3-Enterprise', 'RADIUS']),
    ],
  },
  {
    nr: 6, titel: 'SQL-Joins & Datenbankleistung', tag: 'Datenbank/SQL/ER-Modell',
    fragen: [
      q('a',
        'Die Tabellen Kunde(id, name) und Ticket(id, kunde_id, status) sollen alle Kunden inklusive Kunden ohne Ticket ausgeben. Welcher Join ist nötig? Geben Sie ein SQL-Beispiel an.',
        'Benötigt wird ein **LEFT JOIN**, weil alle Zeilen der linken Tabelle Kunde erhalten bleiben. Beispiel: SELECT Kunde.name, Ticket.status FROM Kunde LEFT JOIN Ticket **ON** Kunde.id = Ticket.**kunde_id**. Kunden ohne Ticket erhalten **NULL**.',
        5, ['LEFT JOIN', 'ON', 'kunde_id', 'NULL']),
      q('b',
        'Erläutern Sie Nutzen und Nachteil eines Index auf Ticket(kunde_id).',
        'Der **Index** **beschleunigt** Suche und Join über kunde_id. Er benötigt zusätzlichen **Speicher** und macht **INSERT**, UPDATE und DELETE langsamer, weil die Indexstruktur mitgepflegt werden muss.',
        4, ['Index', 'beschleunigt', 'Speicher', 'INSERT']),
    ],
  },
  {
    nr: 7, titel: 'TLS-Zertifikate & Widerruf', tag: 'Datenschutz/IT-Sicherheit',
    fragen: [
      q('a',
        'Welche Prüfungen sollte ein Browser an einem TLS-Serverzertifikat durchführen?',
        'Der Browser prüft die **Signaturkette** bis zu einer vertrauenswürdigen CA, den passenden **Hostnamen**, den **Gültigkeitszeitraum** und den **Widerruf**. Nur dann ist die Serveridentität plausibel.',
        5, ['Signaturkette', 'Hostname', 'Gültigkeitszeitraum', 'Widerruf']),
      q('b',
        'Vergleichen Sie CRL und OCSP für die Zertifikatsprüfung.',
        'Eine **CRL** ist eine regelmäßig geladene **Liste** widerrufener Zertifikate. **OCSP** fragt den **Status** eines einzelnen Zertifikats online ab und ist aktueller, erzeugt aber Verfügbarkeits- und Datenschutzabhängigkeiten.',
        4, ['CRL', 'Liste', 'OCSP', 'Status']),
    ],
  },
  {
    nr: 8, titel: 'Linux-Berechtigungen & Dienste', tag: 'Algorithmen/Pseudocode',
    fragen: [
      q('a',
        'Interpretieren Sie die Linux-Rechte -rwxr-x--- und nennen Sie eine passende chmod-Oktalzahl.',
        'Der **Besitzer** darf lesen, schreiben und ausführen. Die **Gruppe** darf lesen und ausführen. Andere besitzen **keine Rechte**. Die Oktalzahl lautet **750**.',
        5, ['Besitzer', 'Gruppe', 'keine Rechte', '750']),
      q('b',
        'Ein Dienst startet nicht. Nennen Sie drei systematische Prüfschritte mit systemd und Journal.',
        'Mit **systemctl status** wird der Zustand geprüft, mit **journalctl** werden die Dienstlogs gelesen. Danach werden **Konfiguration**, Rechte und belegte **Ports** geprüft; nach der Korrektur folgt ein kontrollierter Neustart.',
        4, ['systemctl status', 'journalctl', 'Konfiguration', 'Ports'], 3),
    ],
  },
  {
    nr: 9, titel: 'Hochverfügbarkeit & Load Balancing', tag: 'Virtualisierung',
    fragen: [
      q('a',
        'Erklären Sie Active/Passive-Failover und nennen Sie eine Voraussetzung für einen zustandsbehafteten Dienst.',
        'Beim **Active/Passive**-Betrieb verarbeitet der aktive Knoten Anfragen; ein passiver Knoten **übernimmt** beim **Ausfall**. Für zustandsbehaftete Dienste müssen Daten oder Sitzungen **repliziert** werden.',
        5, ['Active/Passive', 'übernimmt', 'Ausfall', 'repliziert']),
      q('b',
        'Welche Aufgaben übernimmt ein Load Balancer und wozu dient ein Healthcheck?',
        'Der **Load Balancer** **verteilt** Anfragen auf mehrere Backend-Systeme. Ein **Healthcheck** erkennt nicht funktionsfähige Backends und nimmt sie aus der Verteilung, damit Anfragen nur **gesunde Instanzen** erreichen.',
        4, ['Load Balancer', 'verteilt', 'Healthcheck', 'gesunde Instanzen']),
    ],
  },
  {
    nr: 10, titel: 'Incident Response & Forensik', tag: 'IT-Service-Management',
    fragen: [
      q('a',
        'Bringen Sie die Phasen Erkennen, Eindämmen, Beseitigen, Wiederherstellen und Nachbereiten in eine sinnvolle Incident-Response-Reihenfolge.',
        'Reihenfolge: **Erkennen** und bewerten, **Eindämmen** der Ausbreitung, Ursache **beseitigen**, Systeme sicher **wiederherstellen** und anschließend **nachbereiten**.',
        5, ['Erkennen', 'Eindämmen', 'beseitigen', 'wiederherstellen', 'nachbereiten']),
      q('b',
        'Warum sind Beweissicherung, Zeitstempel und Chain of Custody bei einem Sicherheitsvorfall wichtig?',
        '**Hashes** belegen die **Integrität**, konsistente **Zeitstempel** ordnen Ereignisse, und die **Chain of Custody** dokumentiert jede Übergabe. So bleiben Ergebnisse nachvollziehbar und belastbar.',
        4, ['Hashes', 'Integrität', 'Zeitstempel', 'Chain of Custody'], 3),
    ],
  },
  {
    nr: 11, titel: 'Kapazität, SLA & Kosten', tag: 'Wirtschaftlichkeit/Kosten',
    fragen: [
      q('a',
        'Ein Monitoring-System speichert täglich 80 GB Rohdaten. Kompression reduziert auf 40 %, Aufbewahrung 30 Tage, zusätzlich 20 % Reserve. Berechnen Sie den Speicherbedarf.',
        'Pro Tag bleiben **32 GB**. Für 30 Tage sind das **960 GB**. Mit 20 % Reserve: **1.152 GB**, also rund **1,15 TB**.',
        5, ['32 GB', '960 GB', '1.152 GB', '1,15 TB'], 2),
      q('b',
        'Ein SLA garantiert 99,9 % Verfügbarkeit pro 30-Tage-Monat. Berechnen Sie die maximal zulässige Ausfallzeit in Minuten.',
        '30 Tage entsprechen **43.200** Minuten. Der nicht verfügbare Anteil beträgt **0,1** Prozent. Daraus folgen **43,2 Minuten** maximale **Ausfallzeit**.',
        4, ['43.200', '0,1', '43,2 Minuten', 'Ausfallzeit'], 2),
    ],
  },
];

function baueFragen() {
  return AUFGABEN.flatMap((aufgabe) =>
    aufgabe.fragen.map((frage) => ({
      id: `${ID_PREFIX}${aufgabe.nr}${frage.teil}`,
      jahr: 2026,
      saison: 'Übungsklausur 4',
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
      saison: 'Übungsklausur 4',
      fachrichtung: 'Fachinformatiker/in für Systemintegration',
      teil: 'AP2 – Ganzheitliche Aufgabe (Übung)',
      titel: 'AP2 Übungsklausur 4 (KI-generiert)',
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
    `Import OK: AP2-Übungsklausur 4 mit ${fragen.length} Fragen (${punkteGesamt} Punkte), Keyword-Selbsttest grün.`
  );
}

main();
