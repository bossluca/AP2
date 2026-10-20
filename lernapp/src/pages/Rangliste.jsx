import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ranglisteApi } from '../lib/api';
import LeerZustand from '../components/LeerZustand';

/**
 * Opt-in Wochen-Rangliste (nur mit Konto/Backend). Punkte = bewertete
 * Lernobjekte der letzten 7 Tage. Sichtbar sind nur Konten, die zugestimmt und
 * einen Anzeigenamen gewählt haben – nie die E-Mail. Ein Opt-out blendet das
 * Konto sofort aus.
 */
export default function Rangliste() {
  const { user, ready } = useAuth();
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState('');
  const [name, setName] = useState('');
  const [speichert, setSpeichert] = useState(false);

  const anwenden = useCallback((d) => {
    setDaten(d);
    setName(d.profil.anzeigename || '');
    setFehler('');
  }, []);

  const laden = useCallback(
    () =>
      ranglisteApi
        .get()
        .then(anwenden)
        .catch((e) => setFehler(e.message || 'Rangliste nicht erreichbar.')),
    [anwenden]
  );

  useEffect(() => {
    if (!user) return undefined;
    let aktiv = true;
    ranglisteApi
      .get()
      .then((d) => aktiv && anwenden(d))
      .catch((e) => aktiv && setFehler(e.message || 'Rangliste nicht erreichbar.'));
    return () => {
      aktiv = false;
    };
  }, [user, anwenden]);

  const speichern = async (optIn) => {
    setSpeichert(true);
    try {
      await ranglisteApi.setProfil(optIn, name);
      await laden();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setSpeichert(false);
    }
  };

  if (!ready) return null;
  if (!user) {
    return (
      <LeerZustand
        emoji="🏆"
        titel="Rangliste nur mit Konto"
        text="Melde dich an, um freiwillig an der Wochen-Rangliste teilzunehmen. Ohne Konto bleibt alles lokal."
        cta={{ label: 'Zum Konto', to: '/konto' }}
      />
    );
  }

  const optIn = daten?.profil.optIn;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Trophy size={20} aria-hidden="true" className="text-accent" /> Wochen-Rangliste
        </h1>
        <p className="text-sm text-muted-foreground">
          Punkte = bewertete Lernobjekte der letzten 7 Tage. Freiwillig, nur mit Anzeigenamen.
        </p>
      </div>

      {fehler && (
        <div role="alert" className="card border-red-300 p-3 text-sm text-red-700 dark:text-red-300">
          {fehler}
        </div>
      )}

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium">Teilnahme</div>
          <span className="chip">{optIn ? 'sichtbar' : 'nicht sichtbar'}</span>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Anzeigename (öffentlich in der Liste)</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="z. B. fisi_42"
          />
        </label>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary" disabled={speichert} onClick={() => speichern(true)}>
            {optIn ? 'Namen speichern' : 'Teilnehmen'}
          </button>
          {optIn && (
            <button className="btn-ghost" disabled={speichert} onClick={() => speichern(false)}>
              Nicht mehr teilnehmen
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Andere sehen nur Anzeigename, Wochenpunkte und XP – nie deine E-Mail.
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <span className="font-medium">Diese Woche</span>
          <span className="text-xs text-muted-foreground">{daten?.teilnehmer ?? 0} Teilnehmende</span>
        </div>
        {daten && daten.eintraege.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Noch niemand dabei – sei die erste Person!</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left font-medium px-4 py-2 w-12">#</th>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-right font-medium px-4 py-2">Woche</th>
                <th className="text-right font-medium px-4 py-2">XP</th>
              </tr>
            </thead>
            <tbody>
              {(daten?.eintraege || []).map((e) => (
                <tr key={e.anzeigename} className={`border-b last:border-0 ${e.istIch ? 'bg-muted/60 font-medium' : ''}`}>
                  <td className="px-4 py-2 font-mono">{e.rang <= 3 ? ['🥇', '🥈', '🥉'][e.rang - 1] : e.rang}</td>
                  <td className="px-4 py-2">
                    {e.anzeigename}
                    {e.istIch && <span className="chip ml-2">du</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">{e.punkte}</td>
                  <td className="px-4 py-2 text-right font-mono text-muted-foreground">{e.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {daten?.ich && !daten.eintraege.some((e) => e.istIch) && (
          <div className="px-4 py-2 border-t text-sm bg-muted/60">
            Dein Platz: <span className="font-mono">{daten.ich.rang}</span> · {daten.ich.punkte} Punkte
          </div>
        )}
      </section>
    </div>
  );
}
