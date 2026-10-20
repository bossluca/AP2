import { useMemo, useState } from 'react';
import { FileUp, Sparkles, Trash2, Play, ArrowLeft } from 'lucide-react';
import { generiereKarten, pdfZuText } from '../lib/kartenGenerator';
import { ladeStapel, speichereStapel, stapelHinzufuegen, stapelEntfernen, lernReihe } from '../lib/eigeneKarten';
import { useProgress } from '../context/ProgressContext';
import { useGamification } from '../context/GamificationContext';
import { xpFuerErgebnis } from '../lib/level';
import { useTastenkuerzel } from '../hooks/useTastenkuerzel';
import MarkdownContent from '../components/MarkdownContent';

const MAX_MB = 20;
const NOTEN = [
  { note: 1, label: 'Nochmal', cls: 'btn-soft-red' },
  { note: 2, label: 'Schwer', cls: 'btn-soft-amber' },
  { note: 3, label: 'Gut', cls: 'btn-soft-green' },
  { note: 4, label: 'Leicht', cls: 'btn-ghost' },
];

/**
 * Eigene Karten: PDF hochladen (oder Text einfügen) → regelbasiert Karten
 * vorschlagen (`lib/kartenGenerator`) → prüfen/bearbeiten → als Stapel speichern
 * → mit FSRS lernen. Alles bleibt im Browser; die Datei wird nirgends hochgeladen.
 */
export default function EigeneKarten() {
  const [stapel, setStapel] = useState(() => ladeStapel());
  const [lernId, setLernId] = useState(null);

  const aendern = (neu) => {
    setStapel(neu);
    return speichereStapel(neu);
  };

  const aktiv = stapel.find((s) => s.id === lernId);
  if (aktiv) return <StapelLernen stapel={aktiv} onZurueck={() => setLernId(null)} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Eigene Karten</h1>
        <p className="text-sm text-muted-foreground">
          Lade deine Unterlagen als PDF hoch oder füge Text ein – daraus entstehen Lernkarten.
          Die Datei bleibt auf deinem Gerät.
        </p>
      </div>
      <Generator onSpeichern={(name, karten) => aendern(stapelHinzufuegen(stapel, name, karten))} />
      <StapelListe
        stapel={stapel}
        onLernen={setLernId}
        onLoeschen={(id) => aendern(stapelEntfernen(stapel, id))}
      />
    </div>
  );
}

/** Upload/Einfügen → Vorschläge → Auswahl/Bearbeitung → Speichern. */
function Generator({ onSpeichern }) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [vorschlaege, setVorschlaege] = useState(null); // {front,back,an}[]
  const [status, setStatus] = useState('');
  const [laedt, setLaedt] = useState(false);

  const ladePdf = async (datei) => {
    if (!datei) return;
    if (datei.size > MAX_MB * 1024 * 1024) {
      setStatus(`Die Datei ist größer als ${MAX_MB} MB.`);
      return;
    }
    setLaedt(true);
    setStatus('PDF wird gelesen …');
    try {
      const { text: inhalt, seiten } = await pdfZuText(await datei.arrayBuffer());
      setText(inhalt);
      if (!name) setName(datei.name.replace(/\.pdf$/i, ''));
      setStatus(
        inhalt.trim().length < 50
          ? 'Kaum Text gefunden – ist das ein Scan? Gescannte PDFs brauchen erst eine Texterkennung (OCR).'
          : `${seiten} Seiten gelesen. Jetzt „Karten vorschlagen".`
      );
    } catch {
      setStatus('Die PDF konnte nicht gelesen werden (beschädigt oder passwortgeschützt?).');
    } finally {
      setLaedt(false);
    }
  };

  const vorschlagen = () => {
    const karten = generiereKarten(text).map((k) => ({ ...k, an: true }));
    setVorschlaege(karten);
    setStatus(
      karten.length
        ? `${karten.length} Vorschläge – prüfe und bearbeite sie vor dem Speichern.`
        : 'Keine Muster erkannt. Tipp: Zeilen wie „Begriff: Erklärung", Fragen mit „?" oder Überschriften mit Aufzählung funktionieren am besten.'
    );
  };

  const setze = (i, feld, wert) =>
    setVorschlaege((v) => v.map((k, j) => (j === i ? { ...k, [feld]: wert } : k)));

  const gewaehlt = (vorschlaege || []).filter((k) => k.an);

  return (
    <section className="card p-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-start">
        <label className="btn-ghost cursor-pointer">
          <FileUp size={16} aria-hidden="true" /> PDF wählen
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => ladePdf(e.target.files?.[0])}
            disabled={laedt}
          />
        </label>
        <textarea
          className="input min-h-32 w-full font-mono text-xs"
          placeholder={'…oder Text einfügen, z. B.\nSubnetzmaske: Trennt Netz- und Hostanteil.\nWas macht ein Switch?\nLeitet Frames anhand der MAC-Adresse weiter.'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Text für Lernkarten"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-primary" onClick={vorschlagen} disabled={laedt || !text.trim()}>
          <Sparkles size={16} aria-hidden="true" /> Karten vorschlagen
        </button>
        {status && (
          <p className="text-sm text-muted-foreground" role="status">
            {status}
          </p>
        )}
      </div>

      {vorschlaege && vorschlaege.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium">
              {gewaehlt.length} von {vorschlaege.length} ausgewählt
            </span>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={() => setVorschlaege((v) => v.map((k) => ({ ...k, an: true })))}>
                Alle
              </button>
              <button className="btn-ghost" onClick={() => setVorschlaege((v) => v.map((k) => ({ ...k, an: false })))}>
                Keine
              </button>
            </div>
          </div>
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {vorschlaege.map((k, i) => (
              <li key={i} className={`rounded-lg border p-3 grid gap-2 ${k.an ? '' : 'opacity-50'}`}>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={k.an} onChange={(e) => setze(i, 'an', e.target.checked)} />
                  Karte {i + 1} · {k.art}
                </label>
                <input
                  className="input text-sm font-medium"
                  value={k.front}
                  onChange={(e) => setze(i, 'front', e.target.value)}
                  aria-label={`Vorderseite Karte ${i + 1}`}
                />
                <textarea
                  className="input text-sm min-h-16"
                  value={k.back}
                  onChange={(e) => setze(i, 'back', e.target.value)}
                  aria-label={`Rückseite Karte ${i + 1}`}
                />
              </li>
            ))}
          </ul>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              className="input flex-1 min-w-48"
              placeholder="Name des Stapels"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Name des Stapels"
            />
            <button
              className="btn-primary"
              disabled={gewaehlt.length === 0}
              onClick={() => {
                const ok = onSpeichern(name, gewaehlt);
                setStatus(ok ? `Stapel mit ${gewaehlt.length} Karten gespeichert.` : 'Speicher voll – Stapel nicht gespeichert.');
                if (ok) {
                  setVorschlaege(null);
                  setText('');
                  setName('');
                }
              }}
            >
              {gewaehlt.length} Karten speichern
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Übersicht der gespeicherten Stapel mit Fälligkeiten. */
function StapelListe({ stapel, onLernen, onLoeschen }) {
  const { getEntry, isDue, progress } = useProgress();
  const infos = useMemo(
    () => Object.fromEntries(stapel.map((s) => [s.id, lernReihe(s, { getEntry, isDue })])),
    // progress: Fälligkeiten nach dem Lernen neu berechnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stapel, progress]
  );
  if (stapel.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">Deine Stapel</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {stapel.map((s) => (
          <li key={s.id} className="card p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground">
                {s.karten.length} Karten · {infos[s.id].faellig} fällig · {infos[s.id].neu} neu
              </div>
            </div>
            <button className="btn-primary" onClick={() => onLernen(s.id)}>
              <Play size={16} aria-hidden="true" /> Lernen
            </button>
            <button
              className="btn-ghost px-2.5"
              aria-label={`Stapel ${s.name} löschen`}
              onClick={() => {
                if (window.confirm(`Stapel „${s.name}" löschen?`)) onLoeschen(s.id);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lernrunde über einen Stapel (Flip + 4-stufige FSRS-Bewertung). */
function StapelLernen({ stapel, onZurueck }) {
  const { getEntry, isDue, recordReview } = useProgress();
  const { recordActivity, recordXp } = useGamification();
  // Reihe einmal beim Start festlegen (bleibt während der Runde stabil).
  const [reihe] = useState(() => lernReihe(stapel, { getEntry, isDue }).reihe);
  const [index, setIndex] = useState(0);
  const [offen, setOffen] = useState(false);
  const karte = reihe[index];

  const bewerte = (note) => {
    if (!karte || !offen) return;
    recordReview(karte.id, note);
    recordActivity(1);
    recordXp(xpFuerErgebnis(note >= 3 ? 'richtig' : note === 2 ? 'teilweise' : 'falsch'));
    setOffen(false);
    setIndex((i) => i + 1);
  };

  useTastenkuerzel({
    ' ': () => setOffen(true),
    1: () => bewerte(1),
    2: () => bewerte(2),
    3: () => bewerte(3),
    4: () => bewerte(4),
  });

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button className="btn-ghost" onClick={onZurueck}>
          <ArrowLeft size={16} aria-hidden="true" /> Stapel
        </button>
        <span className="text-sm text-muted-foreground font-mono">
          {Math.min(index + 1, reihe.length)} / {reihe.length}
        </span>
      </div>
      {!karte ? (
        <div className="card p-8 text-center space-y-3">
          <div className="text-4xl" aria-hidden="true">🎉</div>
          <h2 className="font-semibold">Runde geschafft</h2>
          <p className="text-sm text-muted-foreground">Fällige Karten kommen automatisch wieder.</p>
          <button className="btn-primary" onClick={onZurueck}>
            Zurück zu den Stapeln
          </button>
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          <div className="text-xs text-muted-foreground">{stapel.name}</div>
          <div className="font-medium">
            <MarkdownContent>{karte.front}</MarkdownContent>
          </div>
          {offen ? (
            <>
              <div className="border-t pt-4 text-sm">
                <MarkdownContent>{karte.back}</MarkdownContent>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {NOTEN.map((n) => (
                  <button key={n.note} className={n.cls} onClick={() => bewerte(n.note)}>
                    {n.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button className="btn-primary w-full" onClick={() => setOffen(true)}>
              Aufdecken
            </button>
          )}
          <p className="text-[11px] text-muted-foreground text-center">Leertaste = aufdecken · 1–4 = bewerten</p>
        </div>
      )}
    </div>
  );
}
