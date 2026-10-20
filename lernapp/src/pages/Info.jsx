import { Link } from 'react-router-dom';
import { ShieldCheck, BookOpenCheck, Info as InfoIcon, Database } from 'lucide-react';

/**
 * „Über & Datenschutz": transparente, ehrliche Hinweise zu (a) gespeicherten
 * Daten und (b) der Herkunft der Lerninhalte. Rein statisch.
 *
 * WICHTIG: Dies ist eine **klar gekennzeichnete Vorlage/Information**, kein
 * rechtsverbindlicher Datenschutztext. Vor öffentlichem Betrieb muss der
 * Betreiber sie prüfen/finalisieren (Impressum, Verantwortlicher, ggf. AVV).
 */
export default function Info() {
  return (
    <div className="space-y-6 max-w-2xl">
      <header className="space-y-1">
        <div className="font-mono text-xs text-muted-foreground">// über &amp; datenschutz</div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <InfoIcon size={20} className="text-accent" aria-hidden="true" />
          Über FiSi.dev
        </h1>
        <p className="text-sm text-muted-foreground">
          Lern-Web-App zur Vorbereitung auf die Abschlussprüfung Teil 2 (AP2),
          Fachinformatiker/in für Systemintegration.
        </p>
      </header>

      {/* Datenspeicherung */}
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Database size={18} className="text-accent" aria-hidden="true" />
          Welche Daten werden gespeichert?
        </h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Ohne Konto</strong> bleibt alles <strong>lokal in deinem Browser</strong>{' '}
            (localStorage): Lernfortschritt, Streak/XP, Lernplan, eigene Kartenstapel, Theme- und
            Komfort-Einstellungen. Diese Daten verlassen dein Gerät nicht und werden nicht an einen
            Server übertragen. Hochgeladene PDFs werden nur im Browser gelesen, nie hochgeladen.
          </p>
          <p>
            <strong>Mit Konto</strong> (optional) werden zusätzlich gespeichert, damit dein
            Fortschritt geräteübergreifend verfügbar ist:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>deine <strong>E-Mail-Adresse</strong> (zur Anmeldung),</li>
            <li>
              dein <strong>Passwort nur als kryptografischer Hash</strong> (argon2id) – im
              Klartext kennt es niemand, auch der Server nicht,
            </li>
            <li>dein <strong>Lernfortschritt</strong>, XP/Level und Streak,</li>
            <li>dein <strong>Lernplan</strong> (Einstufungsergebnis) und deine <strong>eigenen Kartenstapel</strong> (nur der Text der Karten, nie die PDF-Datei),</li>
            <li>
              nur bei <strong>freiwilliger Teilnahme an der Rangliste oder an Lerngruppen</strong>: ein
              selbst gewählter Anzeigename. Öffentlich bzw. für die Gruppenmitglieder sichtbar sind
              dann Name, Wochenpunkte und XP – nie die E-Mail. Austritt jederzeit möglich.
            </li>
          </ul>
          <p>
            Die Anmeldung nutzt ein technisch notwendiges <strong>Session-Cookie</strong>{' '}
            (httpOnly, SameSite). Es gibt <strong>kein Tracking, keine Werbung, keine Analyse-Cookies</strong>.
          </p>
          <p>
            <strong>Zweck &amp; Sparsamkeit:</strong> Daten werden ausschließlich zum Bereitstellen
            und Synchronisieren deines Lernstands verarbeitet. Das Konto ist freiwillig – die App
            funktioniert vollständig auch ohne.
          </p>
          <p>
            <strong>Löschung:</strong> Du kannst deinen Fortschritt jederzeit auf der Startseite
            zurücksetzen und dein <strong>Konto samt aller Serverdaten</strong> im{' '}
            <Link to="/konto" className="text-accent hover:underline">Konto-Bereich</Link>{' '}
            unwiderruflich löschen.
          </p>
        </div>
        <p className="text-xs text-muted-foreground border-t border-zinc-100 dark:border-border pt-2">
          Hinweis: Diese Übersicht ist eine Information, kein vollständiger Rechtstext. Für den
          öffentlichen Betrieb ergänzt der Betreiber Impressum und verantwortliche Stelle.
        </p>
      </section>

      {/* Inhalts-Herkunft */}
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <BookOpenCheck size={18} className="text-accent" aria-hidden="true" />
          Woher kommen die Inhalte?
        </h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>AP1-Übungsprüfungen</strong> sind <strong>KI-überarbeitet (paraphrasiert)</strong>:
            an die ursprünglichen Kompetenzen und Themen angelehnt, aber mit{' '}
            <strong>eigenem Wortlaut, eigenen Szenarien und Zahlen</strong> neu formuliert – keine
            wortgetreuen Originalaufgaben.
          </p>
          <p>
            <strong>AP2-Übungsklausuren</strong> sind <strong>KI-generiert</strong> und an die
            typischen AP2-Prüfungsthemen angelehnt. Es sind <strong>keine offiziellen
            IHK-/AKA-Aufgaben</strong>.
          </p>
          <p>
            Einzelne Lösungen sind als <strong>„unverifiziert"</strong> gekennzeichnet, wenn keine
            offizielle Musterlösung vorliegt. Solche Hinweise erscheinen direkt an der jeweiligen
            Frage.
          </p>
          <p>
            <strong>Urheberrecht:</strong> Originale IHK-/AKA-Prüfungsaufgaben und deren
            Musterlösungen sind urheberrechtlich geschützt und werden hier{' '}
            <strong>nicht 1:1 verbreitet</strong>. Inhalte wurden eigenständig umformuliert.
          </p>
          <p className="text-xs text-muted-foreground border-t border-zinc-100 dark:border-border pt-2">
            <ShieldCheck size={13} className="inline mr-1 -mt-0.5" aria-hidden="true" />
            Keine Gewähr: Diese App ist eine Lernhilfe. Für Richtigkeit, Vollständigkeit und
            Prüfungsrelevanz der Inhalte wird keine Garantie übernommen.
          </p>
        </div>
      </section>
    </div>
  );
}
