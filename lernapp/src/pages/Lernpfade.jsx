import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getLerneinheiten } from '../data/useExamData';
import { useProgress } from '../context/ProgressContext';
import { baueLernpfade, findePfad } from '../lib/lernpfade';
import LernpfadNode from '../components/LernpfadNode';
import MarkdownContent from '../components/MarkdownContent';

/** Lucide-Icon per Name (aus dem lernpfade-Modul), mit Fallback. */
function PfadIcon({ name, ...props }) {
  const Cmp = Icons[name] || Icons.GraduationCap;
  return <Cmp {...props} />;
}

/** Schmaler Mastery-Balken (Terminal-Look). */
function Balken({ wert }) {
  return (
    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-[#1d271a] overflow-hidden">
      <div
        className="h-full rounded-full bg-accent transition-all duration-500"
        style={{ width: `${Math.round(wert * 100)}%` }}
      />
    </div>
  );
}

/* ----------------------------- Übersicht -------------------------------- */

function Uebersicht({ pfade }) {
  const erledigt = pfade.filter((p) => p.erledigt).length;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="font-mono text-xs text-gray-500 dark:text-[#6B7A66]">// lernpfade</div>
        <h1 className="text-xl font-bold">Lernpfade</h1>
        <p className="text-sm text-gray-500">
          Geführter Weg durch die AP1-Themen – ein Pfad je Kapitel, Schritt für Schritt.
          {erledigt > 0 && (
            <>
              {' '}
              <span className="text-accent font-medium">{erledigt}</span> von {pfade.length}{' '}
              abgeschlossen.
            </>
          )}
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        {pfade.map((p) => (
          <Link
            key={p.id}
            to={`/lernpfade/${p.id}`}
            className="card-interactive block p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="grid place-items-center w-10 h-10 rounded-xl bg-green-100 dark:bg-[#1d271a] text-accent shrink-0"
                aria-hidden="true"
              >
                <PfadIcon name={p.icon} size={18} />
              </span>
              {p.erledigt ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                  <CheckCircle2 size={14} /> fertig
                </span>
              ) : (
                <span className="font-mono text-xs text-gray-400 dark:text-[#6B7A66]">
                  {Math.round(p.mastery * 100)}%
                </span>
              )}
            </div>
            <div>
              <div className="font-mono text-[11px] text-gray-400 dark:text-[#6B7A66]">
                pfad_{String(p.nummer).padStart(2, '0')}
              </div>
              <div className="font-semibold leading-tight">{p.titel}</div>
            </div>
            <Balken wert={p.mastery} />
            <div className="text-[11px] text-gray-500 dark:text-[#6B7A66]">
              {p.fertigeModule} / {p.n} Module
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Detail --------------------------------- */

function Detail({ pfad, einheitenById, getStatus, setStatus }) {
  // Aufgeklapptes Modul – lokal, da `Detail` per `key={id}` beim Pfadwechsel
  // ohnehin frisch montiert wird (kein Reset-Effekt nötig).
  const [offeneId, setOffeneId] = useState(null);
  const onToggle = (mid) => setOffeneId((cur) => (cur === mid ? null : mid));

  // Linearer Fortschritt entlang des Pfads (für den Verlauf der Verbindungslinie).
  const fortschritt = pfad.n > 0 ? pfad.fertigeModule / pfad.n : 0;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/lernpfade"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-accent"
        >
          <ArrowLeft size={15} /> Alle Pfade
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <span
          className="grid place-items-center w-12 h-12 rounded-2xl bg-green-100 dark:bg-[#1d271a] text-accent shrink-0"
          aria-hidden="true"
        >
          <PfadIcon name={pfad.icon} size={22} />
        </span>
        <div className="min-w-0">
          <div className="font-mono text-xs text-gray-500 dark:text-[#6B7A66]">// lernpfad</div>
          <h1 className="text-xl font-bold truncate">{pfad.titel}</h1>
          <div className="text-xs text-gray-500 dark:text-[#6B7A66]">
            {pfad.fertigeModule} / {pfad.n} Module · {Math.round(pfad.mastery * 100)}%
          </div>
        </div>
      </header>

      {/* Vertikaler Pfad mit Verbindungslinie */}
      <div className="relative pl-[18px]">
        <div
          className="absolute top-4 bottom-4 left-[18px] w-0.5 rounded"
          style={{
            background: `linear-gradient(var(--accent) ${Math.round(
              fortschritt * 100
            )}%, var(--line-rest) ${Math.round(fortschritt * 100)}%)`,
          }}
          aria-hidden="true"
        />
        <ul className="space-y-1">
          {pfad.module.map((m) => {
            const einheit = einheitenById.get(m.einheitId);
            const offen = offeneId === m.id;
            return (
              <li key={m.id}>
                <LernpfadNode modul={m} offen={offen} onToggle={() => onToggle(m.id)} />
                {offen && einheit && (
                  <div className="ml-[52px] mb-2 rounded-xl border border-gray-200 dark:border-[#1d271a] bg-white dark:bg-[#0d120b] p-3.5 space-y-3 animate-in">
                    <MarkdownContent>{einheit.inhalt_text}</MarkdownContent>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setStatus(m.einheitId, 'ueben')}
                        className="btn-soft-amber px-3 py-1.5"
                      >
                        Muss ich üben
                      </button>
                      <button
                        onClick={() => setStatus(m.einheitId, 'gelernt')}
                        className="btn-soft-green px-3 py-1.5"
                      >
                        Verstanden
                      </button>
                    </div>
                    {getStatus(m.einheitId) && (
                      <div className="text-[11px] text-gray-400 text-right">
                        Status: {getStatus(m.einheitId)}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------- Seite --------------------------------- */

/**
 * Lernpfade: geführter, fortschrittsbasierter Lernweg über die nummerierten
 * AP1-Lernzettel. Übersicht (alle Pfade) und Detail (`/lernpfade/:id`) teilen
 * sich die aus `baueLernpfade()` abgeleiteten Daten. Beim Aufklappen eines
 * Moduls erscheint der Lernzettel-Inhalt inline (gleiche Daten wie auf der
 * Lernzettel-Seite); „Verstanden"/„Üben" speichern denselben Fortschritt.
 */
export default function Lernpfade() {
  const { id } = useParams();
  const navigate = useNavigate();
  const einheiten = useMemo(() => getLerneinheiten(), []);
  const { progress, getStatus, setStatus } = useProgress();

  // Pfade bei jeder Progress-Änderung neu ableiten (Status/Mastery aktuell).
  const pfade = useMemo(
    () => baueLernpfade(einheiten, progress),
    [einheiten, progress]
  );

  const einheitenById = useMemo(() => {
    const map = new Map();
    for (const e of einheiten) map.set(e.id, e);
    return map;
  }, [einheiten]);

  if (!id) return <Uebersicht pfade={pfade} />;

  const pfad = findePfad(pfade, id);
  if (!pfad) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Dieser Pfad existiert nicht.</p>
        <button onClick={() => navigate('/lernpfade')} className="btn-ghost px-3 py-2">
          Zur Übersicht
        </button>
      </div>
    );
  }

  return (
    <Detail
      key={pfad.id}
      pfad={pfad}
      einheitenById={einheitenById}
      getStatus={getStatus}
      setStatus={setStatus}
    />
  );
}
