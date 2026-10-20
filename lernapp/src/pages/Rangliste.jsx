import { useCallback, useEffect, useState } from 'react';
import { Trophy, Users, Copy, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ranglisteApi, gruppenApi } from '../lib/api';
import LeerZustand from '../components/LeerZustand';

/**
 * Wochen-Rangliste + Lerngruppen (nur mit Konto/Backend). Punkte = bewertete
 * Lernobjekte der letzten 7 Tage. Global sichtbar sind nur Konten mit Opt-in;
 * in einer Lerngruppe (Beitritt per Code) sehen sich die Mitglieder gegenseitig.
 * Angezeigt wird immer nur der Anzeigename – nie die E-Mail.
 */
export default function Rangliste() {
  const { user, ready } = useAuth();
  const [ansicht, setAnsicht] = useState(null); // null = global, sonst Gruppen-ID
  const [daten, setDaten] = useState(null);
  const [gruppen, setGruppen] = useState([]);
  const [fehler, setFehler] = useState('');
  const [hinweis, setHinweis] = useState('');
  const [name, setName] = useState('');
  const [oeffentlich, setOeffentlich] = useState(false);
  const [neuName, setNeuName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const anwenden = useCallback((d) => {
    setDaten(d);
    setName(d.profil.anzeigename || '');
    setOeffentlich(Boolean(d.profil.optIn));
    setFehler('');
  }, []);

  const laden = useCallback(
    async (gruppeId = ansicht) => {
      const [d, g] = await Promise.all([ranglisteApi.get(gruppeId), gruppenApi.liste()]);
      anwenden(d);
      setGruppen(g.gruppen || []);
    },
    [ansicht, anwenden]
  );

  useEffect(() => {
    if (!user) return undefined;
    let aktiv = true;
    Promise.all([ranglisteApi.get(ansicht), gruppenApi.liste()])
      .then(([d, g]) => {
        if (!aktiv) return;
        anwenden(d);
        setGruppen(g.gruppen || []);
      })
      .catch((e) => aktiv && setFehler(e.message || 'Rangliste nicht erreichbar.'));
    return () => {
      aktiv = false;
    };
  }, [user, ansicht, anwenden]);

  const ausfuehren = async (fn, erfolg) => {
    setBusy(true);
    setHinweis('');
    try {
      const r = await fn();
      if (erfolg) setHinweis(erfolg(r));
      await laden();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!user) {
    return (
      <LeerZustand
        emoji="🏆"
        titel="Rangliste nur mit Konto"
        text="Melde dich an, um freiwillig an der Wochen-Rangliste oder an Lerngruppen teilzunehmen. Ohne Konto bleibt alles lokal."
        cta={{ label: 'Zum Konto', to: '/konto' }}
      />
    );
  }

  const hatName = Boolean(daten?.profil.anzeigename);
  const aktiveGruppe = gruppen.find((g) => g.id === ansicht);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Trophy size={20} aria-hidden="true" className="text-accent" /> Wochen-Rangliste
        </h1>
        <p className="text-sm text-muted-foreground">
          Punkte = bewertete Lernobjekte der letzten 7 Tage. Sichtbar nur mit Anzeigenamen.
        </p>
      </div>

      {fehler && (
        <div role="alert" className="card border-red-300 p-3 text-sm text-red-700 dark:text-red-300">
          {fehler}
        </div>
      )}
      {hinweis && (
        <div role="status" className="card p-3 text-sm">
          {hinweis}
        </div>
      )}

      <section className="card p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium">Dein Profil</div>
          <span className="chip">{daten?.profil.optIn ? 'öffentlich sichtbar' : 'nicht öffentlich'}</span>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Anzeigename (für Rangliste und Lerngruppen)</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="z. B. fisi_42"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={oeffentlich} onChange={(e) => setOeffentlich(e.target.checked)} />
          In der öffentlichen Rangliste aller Nutzer zeigen
        </label>
        <button
          className="btn-primary"
          disabled={busy}
          onClick={() => ausfuehren(() => ranglisteApi.setProfil(oeffentlich, name), () => 'Profil gespeichert.')}
        >
          Profil speichern
        </button>
        <p className="text-xs text-muted-foreground">
          Andere sehen nur Anzeigename, Wochenpunkte und XP – nie deine E-Mail. In Lerngruppen sehen
          dich alle Mitglieder, auch ohne öffentliche Teilnahme.
        </p>
      </section>

      <section className="card p-4 space-y-3">
        <div className="font-medium flex items-center gap-2">
          <Users size={18} aria-hidden="true" /> Lerngruppen
        </div>
        {!hatName && (
          <p className="text-xs text-muted-foreground">Speichere zuerst einen Anzeigenamen, dann kannst du Gruppen nutzen.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ausfuehren(
                () => gruppenApi.anlegen(neuName),
                (r) => `Gruppe „${r.gruppe.name}" angelegt – Beitrittscode: ${r.gruppe.code}`
              ).then(() => setNeuName(''));
            }}
          >
            <input
              className="input flex-1 min-w-0"
              placeholder="Neue Gruppe, z. B. FISI 24a"
              value={neuName}
              onChange={(e) => setNeuName(e.target.value)}
              disabled={!hatName}
              aria-label="Name der neuen Gruppe"
            />
            <button className="btn-ghost" disabled={busy || !hatName || !neuName.trim()}>
              Anlegen
            </button>
          </form>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ausfuehren(
                () => gruppenApi.beitreten(code),
                (r) => `Du bist jetzt in „${r.gruppe.name}".`
              ).then(() => setCode(''));
            }}
          >
            <input
              className="input flex-1 min-w-0 font-mono"
              placeholder="Code XXXX-XXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!hatName}
              aria-label="Beitrittscode"
            />
            <button className="btn-ghost" disabled={busy || !hatName || !code.trim()}>
              Beitreten
            </button>
          </form>
        </div>
      </section>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Rangliste wählen">
        <button
          role="tab"
          aria-selected={ansicht === null}
          onClick={() => setAnsicht(null)}
          className={`chip cursor-pointer ${ansicht === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
        >
          Alle
        </button>
        {gruppen.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={ansicht === g.id}
            onClick={() => setAnsicht(g.id)}
            className={`chip cursor-pointer ${ansicht === g.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            {g.name} · {g.mitglieder}
          </button>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2 flex-wrap">
          <span className="font-medium">{aktiveGruppe ? aktiveGruppe.name : 'Alle'} · diese Woche</span>
          {aktiveGruppe ? (
            <div className="flex items-center gap-2">
              <span className="chip font-mono">{aktiveGruppe.code}</span>
              <button
                className="btn-ghost px-2.5"
                aria-label="Code kopieren"
                title="Code kopieren"
                onClick={() => navigator.clipboard?.writeText(aktiveGruppe.code).catch(() => {})}
              >
                <Copy size={14} aria-hidden="true" />
              </button>
              <button
                className="btn-ghost px-2.5"
                aria-label={`Gruppe ${aktiveGruppe.name} verlassen`}
                title="Gruppe verlassen"
                onClick={() => {
                  if (!window.confirm(`Gruppe „${aktiveGruppe.name}" verlassen?`)) return;
                  setAnsicht(null);
                  ausfuehren(() => gruppenApi.verlassen(aktiveGruppe.id));
                }}
              >
                <LogOut size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{daten?.teilnehmer ?? 0} Teilnehmende</span>
          )}
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
