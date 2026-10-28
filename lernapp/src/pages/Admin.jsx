import { useCallback, useEffect, useState } from 'react';
import { Shield, UserX, UserCheck, Trash2, Copy, Ticket, ScrollText, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';
import LeerZustand from '../components/LeerZustand';

const datum = (iso) => (iso ? new Date(iso).toLocaleDateString('de-DE') : '–');

const zeitpunkt = (iso) =>
  iso
    ? new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })
    : '–';

/** Lesbare Namen der Audit-Ereignisse (Reihenfolge = Filter-Auswahl). */
const EREIGNIS_TEXT = {
  login_ok: 'Login erfolgreich',
  login_fehlgeschlagen: 'Login fehlgeschlagen',
  login_gebremst: 'Login gebremst (429)',
  registrierung: 'Registrierung',
  registrierung_abgelehnt: 'Registrierung abgelehnt',
  registrierung_gebremst: 'Registrierung gebremst (429)',
  recovery_ok: 'Passwort-Reset erfolgreich',
  recovery_fehlgeschlagen: 'Passwort-Reset fehlgeschlagen',
  recovery_gebremst: 'Passwort-Reset gebremst (429)',
  recovery_code_erneuert: 'Recovery-Code erneuert',
  passwort_bestaetigung_fehlgeschlagen: 'Passwort-Bestätigung fehlgeschlagen',
  passwort_bestaetigung_gebremst: 'Passwort-Bestätigung gebremst (429)',
  konto_geloescht: 'Konto gelöscht',
  konto_gesperrt: 'Konto gesperrt',
  konto_entsperrt: 'Konto entsperrt',
  einladung_erzeugt: 'Einladung erzeugt',
  einladung_geloescht: 'Einladung gelöscht',
};

const MODUS_TEXT = {
  open: 'offen – jede/r kann sich registrieren',
  invite: 'nur mit Einladungscode',
  closed: 'geschlossen – keine neuen Konten',
};

/**
 * Admin-Bereich (nur Konten aus `ADMIN_EMAILS`): Konten sperren/entsperren/
 * löschen und Einladungs-Codes erzeugen. Der Klartext eines Codes wird nur
 * direkt nach dem Erzeugen angezeigt (serverseitig liegt nur der Hash).
 */
export default function Admin() {
  const { user, ready } = useAuth();
  const [daten, setDaten] = useState(null);
  const [fehler, setFehler] = useState('');
  const [neu, setNeu] = useState(null); // frisch erzeugte Einladung {code, laeuftAb}
  const [form, setForm] = useState({ maxUses: 1, gueltigTage: 14, notiz: '' });
  const [protokoll, setProtokoll] = useState(null); // Audit-Einträge oder null (lädt)
  const [protokollFehler, setProtokollFehler] = useState('');
  const [filter, setFilter] = useState('');

  const laden = useCallback(
    () =>
      adminApi
        .uebersicht()
        .then((d) => {
          setDaten(d);
          setFehler('');
        })
        .catch((e) => setFehler(e.message || 'Admin-Daten nicht erreichbar.')),
    []
  );

  // Sicherheitsprotokoll getrennt laden: Ein Fehler dort blockiert die
  // Konten-Verwaltung nicht.
  const protokollLaden = useCallback(
    (ereignis) =>
      adminApi
        .audit(100, ereignis)
        .then((d) => {
          setProtokoll(d?.eintraege || []);
          setProtokollFehler('');
        })
        .catch((e) => setProtokollFehler(e.message || 'Sicherheitsprotokoll nicht erreichbar.')),
    []
  );

  useEffect(() => {
    if (!user?.admin) return undefined;
    let aktiv = true;
    adminApi
      .audit(100, filter)
      .then((d) => {
        if (!aktiv) return;
        setProtokoll(d?.eintraege || []);
        setProtokollFehler('');
      })
      .catch((e) => aktiv && setProtokollFehler(e.message || 'Sicherheitsprotokoll nicht erreichbar.'));
    return () => {
      aktiv = false;
    };
  }, [user, filter]);

  useEffect(() => {
    if (!user?.admin) return undefined;
    let aktiv = true;
    adminApi
      .uebersicht()
      .then((d) => aktiv && setDaten(d))
      .catch((e) => aktiv && setFehler(e.message || 'Admin-Daten nicht erreichbar.'));
    return () => {
      aktiv = false;
    };
  }, [user]);

  const aktion = async (fn, frage) => {
    if (frage && !window.confirm(frage)) return;
    try {
      await fn();
      await Promise.all([laden(), protokollLaden(filter)]);
    } catch (e) {
      setFehler(e.message);
    }
  };

  const einladen = async (e) => {
    e.preventDefault();
    try {
      setNeu(await adminApi.einladen(Number(form.maxUses), Number(form.gueltigTage), form.notiz));
      setForm((f) => ({ ...f, notiz: '' }));
      await Promise.all([laden(), protokollLaden(filter)]);
    } catch (err) {
      setFehler(err.message);
    }
  };

  if (!ready) return null;
  if (!user?.admin) {
    return (
      <LeerZustand
        emoji="🔒"
        titel="Nur für Admins"
        text="Der Admin-Bereich ist Konten vorbehalten, die der Betreiber in ADMIN_EMAILS eingetragen hat."
        cta={{ label: 'Zum Konto', to: '/konto' }}
      />
    );
  }

  const link = neu ? `${window.location.origin}${window.location.pathname}#/konto?einladung=${neu.code}` : '';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield size={22} className="text-accent" aria-hidden="true" /> Admin
        </h1>
        {daten && (
          <p className="text-sm text-muted-foreground">
            Registrierung: <strong>{MODUS_TEXT[daten.registrierung]}</strong> (Env{' '}
            <code>REGISTRATION</code>)
          </p>
        )}
      </div>

      {fehler && (
        <div role="alert" className="card p-3 text-sm text-red-700 dark:text-red-300">
          {fehler}
        </div>
      )}

      <section className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Ticket size={18} aria-hidden="true" /> Einladungen
        </h2>
        <form onSubmit={einladen} className="grid gap-3 sm:grid-cols-[auto_auto_1fr_auto] sm:items-end">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Nutzungen
            <input
              type="number"
              min="1"
              max="100"
              className="input w-24"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Gültig (Tage, 0 = ∞)
            <input
              type="number"
              min="0"
              max="365"
              className="input w-28"
              value={form.gueltigTage}
              onChange={(e) => setForm({ ...form, gueltigTage: e.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Notiz
            <input
              className="input"
              maxLength={80}
              placeholder="z. B. Klasse FISI 24a"
              value={form.notiz}
              onChange={(e) => setForm({ ...form, notiz: e.target.value })}
            />
          </label>
          <button type="submit" className="btn-primary">
            Einladung erzeugen
          </button>
        </form>

        {daten?.registrierung !== 'invite' && (
          <p className="text-xs text-muted-foreground">
            Hinweis: Einladungscodes werden erst mit <code>REGISTRATION=invite</code> abgefragt.
          </p>
        )}
        {neu && (
          <div className="rounded-lg border border-accent p-4 space-y-2" role="status">
            <div className="text-sm font-medium">Neuer Code – wird nur jetzt angezeigt:</div>
            <div className="font-mono text-lg tracking-wider select-all">{neu.code}</div>
            <div className="flex gap-2 items-center flex-wrap">
              <input className="input flex-1 min-w-48 font-mono text-xs" readOnly value={link} aria-label="Einladungslink" />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => navigator.clipboard?.writeText(link).catch(() => {})}
              >
                <Copy size={16} aria-hidden="true" /> Link kopieren
              </button>
            </div>
          </div>
        )}

        {daten?.einladungen?.length > 0 && (
          <ul className="divide-y text-sm">
            {daten.einladungen.map((e) => (
              <li key={e.id} className="py-2 flex items-center gap-3">
                <span className="font-mono">{e.hinweis}…</span>
                <span className="flex-1 min-w-0 truncate text-muted-foreground">{e.notiz}</span>
                <span className="text-xs text-muted-foreground">
                  {e.uses}/{e.maxUses} · bis {e.laeuftAb ? datum(e.laeuftAb) : '∞'}
                </span>
                <span className="chip">{e.gueltig ? 'aktiv' : 'verbraucht/abgelaufen'}</span>
                <button
                  className="btn-ghost px-2.5"
                  aria-label={`Einladung ${e.hinweis} löschen`}
                  onClick={() => aktion(() => adminApi.einladungLoeschen(e.id))}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-3 border-b font-semibold">Konten ({daten?.konten?.length ?? 0})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left font-medium px-4 py-2">E-Mail</th>
                <th className="text-left font-medium px-4 py-2">Seit</th>
                <th className="text-right font-medium px-4 py-2">XP</th>
                <th className="text-right font-medium px-4 py-2">Einträge</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {(daten?.konten || []).map((k) => (
                <tr key={k.id} className={`border-b last:border-0 ${k.gesperrt ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2">
                    {k.email}
                    {k.admin && <span className="chip ml-2">admin</span>}
                    {k.gesperrt && <span className="chip ml-2">gesperrt</span>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{datum(k.erstellt)}</td>
                  <td className="px-4 py-2 text-right font-mono">{k.xp}</td>
                  <td className="px-4 py-2 text-right font-mono">{k.eintraege}</td>
                  <td className="px-4 py-2">
                    {k.id !== user.id && (
                      <div className="flex justify-end gap-1">
                        <button
                          className="btn-ghost px-2.5"
                          aria-label={`${k.email} ${k.gesperrt ? 'entsperren' : 'sperren'}`}
                          title={k.gesperrt ? 'Entsperren' : 'Sperren'}
                          onClick={() => aktion(() => adminApi.sperren(k.id, !k.gesperrt))}
                        >
                          {k.gesperrt ? <UserCheck size={16} aria-hidden="true" /> : <UserX size={16} aria-hidden="true" />}
                        </button>
                        {/* Admin-Konten nie löschen: die Rolle hängt an der E-Mail (S18). */}
                        {!k.admin && (
                          <button
                            className="btn-ghost px-2.5"
                            aria-label={`${k.email} löschen`}
                            title="Löschen"
                            onClick={() =>
                              aktion(
                                () => adminApi.loeschen(k.id),
                                `Konto ${k.email} mit allen Daten endgültig löschen?`
                              )
                            }
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden" aria-labelledby="protokoll-titel">
        <div className="px-5 py-3 border-b flex flex-wrap items-center gap-3">
          <h2 id="protokoll-titel" className="font-semibold flex items-center gap-2 flex-1 min-w-48">
            <ScrollText size={18} aria-hidden="true" /> Sicherheitsprotokoll
          </h2>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Ereignis
            <select className="input w-auto py-1" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">alle</option>
              {Object.entries(EREIGNIS_TEXT).map(([wert, text]) => (
                <option key={wert} value={wert}>
                  {text}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-ghost px-2.5" onClick={() => protokollLaden(filter)}>
            <RefreshCw size={16} aria-hidden="true" /> Neu laden
          </button>
        </div>
        <p className="px-5 pt-3 text-xs text-muted-foreground">
          Die letzten 100 sicherheitsrelevanten Ereignisse, neueste zuerst. Aufbewahrung 90 Tage; Passwörter,
          Codes, Tokens und E-Mail-Adressen werden nie protokolliert (die E-Mail wird hier nur zur Anzeige
          zugeordnet).
        </p>
        {protokollFehler && (
          <p role="alert" className="px-5 pt-2 text-sm text-red-700 dark:text-red-300">
            {protokollFehler}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Sicherheitsprotokoll: Zeit, Ereignis, Konto, IP-Adresse, Detail</caption>
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="text-left font-medium px-4 py-2">Zeit</th>
                <th scope="col" className="text-left font-medium px-4 py-2">Ereignis</th>
                <th scope="col" className="text-left font-medium px-4 py-2">Konto</th>
                <th scope="col" className="text-left font-medium px-4 py-2">IP</th>
                <th scope="col" className="text-left font-medium px-4 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {protokoll === null && !protokollFehler && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-muted-foreground">
                    Lädt …
                  </td>
                </tr>
              )}
              {protokoll?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-muted-foreground">
                    Keine Einträge.
                  </td>
                </tr>
              )}
              {(protokoll || []).map((z) => (
                <tr key={z.id} className="border-b last:border-0 align-top">
                  <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">
                    <time dateTime={z.zeit}>{zeitpunkt(z.zeit)}</time>
                  </td>
                  <td className="px-4 py-2">{EREIGNIS_TEXT[z.ereignis] || z.ereignis}</td>
                  <td className="px-4 py-2 break-all">
                    {z.email || (z.kontoId ? `#${z.kontoId}` : <span className="text-muted-foreground">–</span>)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{z.ip || '–'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{z.detail || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
