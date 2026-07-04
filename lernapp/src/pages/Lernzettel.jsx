import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getLerneinheiten } from '../data/useExamData';
import { useProgress } from '../context/ProgressContext';
import MarkdownContent from '../components/MarkdownContent';
import LeerZustand from '../components/LeerZustand';

/** Status-Badge für eine markierte Lerneinheit. */
function StatusBadge({ status }) {
  if (status === 'gelernt') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
        gelernt
      </span>
    );
  }
  if (status === 'ueben') {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
        üben
      </span>
    );
  }
  return null;
}

/**
 * Lernzettel-Seite: durchsuchbare, nach Kategorie/Tag filterbare Sammlung der
 * Lerneinheiten (Cheatsheets). Getrennt von den Prüfungsfragen, nutzt aber den
 * bestehenden Fortschritt (gelernt / üben) über die Lerneinheit-ID.
 */
export default function Lernzettel() {
  const einheiten = useMemo(() => getLerneinheiten(), []);
  const { setStatus, getStatus, progress } = useProgress();

  // Deeplink „Zum Nachlesen" (aus Quiz/Klausur): ?einheit=<id> öffnet den
  // Lernzettel direkt und scrollt hin.
  const [searchParams] = useSearchParams();
  const zielId = searchParams.get('einheit');

  const [teil, setTeil] = useState('all');
  const [kategorie, setKategorie] = useState('all');
  const [tag, setTag] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set(zielId ? [zielId] : []));

  useEffect(() => {
    if (!zielId) return undefined;
    // Aufklappen + Hinscrollen nach dem Rendern (best-effort; asynchron, damit
    // kein synchroner setState im Effect-Body läuft).
    const t = setTimeout(() => {
      setExpanded((prev) => (prev.has(zielId) ? prev : new Set([...prev, zielId])));
      document.getElementById(`lz-${zielId}`)?.scrollIntoView({ block: 'start' });
    }, 50);
    return () => clearTimeout(t);
  }, [zielId]);

  const teile = useMemo(() => {
    const set = new Set();
    for (const e of einheiten) if (e.pruefungsteil) set.add(e.pruefungsteil);
    return Array.from(set).sort();
  }, [einheiten]);

  // Kategorien hängen vom gewählten Prüfungsteil ab (vermeidet leere Auswahl).
  const kategorien = useMemo(() => {
    const set = new Set();
    for (const e of einheiten) {
      if (teil !== 'all' && e.pruefungsteil !== teil) continue;
      if (e.kategorie) set.add(e.kategorie);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de', { numeric: true }));
  }, [einheiten, teil]);

  const tags = useMemo(() => {
    const set = new Set();
    for (const e of einheiten) for (const t of e.thema_tags || []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [einheiten]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return einheiten.filter((e) => {
      if (teil !== 'all' && e.pruefungsteil !== teil) return false;
      if (kategorie !== 'all' && e.kategorie !== kategorie) return false;
      if (tag !== 'all' && !(e.thema_tags || []).includes(tag)) return false;
      if (statusFilter !== 'all') {
        const s = getStatus(e.id);
        if (statusFilter === 'neu' && s) return false;
        if (statusFilter !== 'neu' && s !== statusFilter) return false;
      }
      if (q && !`${e.titel} ${e.inhalt_text}`.toLowerCase().includes(q)) return false;
      return true;
    });
    // progress als Abhängigkeit, damit der Status-Filter nach Markieren aktualisiert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [einheiten, teil, kategorie, tag, statusFilter, query, progress, getStatus]);

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectClass =
    'input';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">📝 Lernzettel</h1>
        <span className="text-sm text-gray-500">
          {filtered.length} von {einheiten.length}
        </span>
      </div>

      {einheiten.length === 0 ? (
        <p className="text-sm text-gray-500">Noch keine Lernzettel importiert.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Suche in Titel und Inhalt…"
              className={`${selectClass} flex-1 min-w-[12rem]`}
            />
            {teile.length > 1 && (
              <select
                value={teil}
                onChange={(e) => {
                  setTeil(e.target.value);
                  setKategorie('all');
                }}
                className={selectClass}
                aria-label="Prüfungsteil filtern"
              >
                <option value="all">AP1 + AP2</option>
                {teile.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
            <select
              value={kategorie}
              onChange={(e) => setKategorie(e.target.value)}
              className={selectClass}
              aria-label="Kategorie filtern"
            >
              <option value="all">Alle Kategorien</option>
              {kategorien.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={selectClass}
              aria-label="Thema filtern"
            >
              <option value="all">Alle Themen</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
              aria-label="Status filtern"
            >
              <option value="all">Alle</option>
              <option value="neu">Neu</option>
              <option value="ueben">Üben</option>
              <option value="gelernt">Gelernt</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <LeerZustand
              emoji="📝"
              titel="Keine Lernzettel für diese Filter"
              text="Setze die Filter zurück oder probier einen anderen Prüfungsteil/Kategorie."
            />
          ) : (
            <ul className="space-y-2">
              {filtered.map((e) => {
                const isOpen = expanded.has(e.id);
                const status = getStatus(e.id);
                return (
                  <li
                    key={e.id}
                    id={`lz-${e.id}`}
                    className="card overflow-hidden scroll-mt-16"
                  >
                    <button
                      onClick={() => toggle(e.id)}
                      aria-expanded={isOpen}
                      className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <span className="text-gray-400 text-xs w-3">{isOpen ? '▾' : '▸'}</span>
                      <span className="font-medium flex-1">{e.titel}</span>
                      <StatusBadge status={status} />
                      <span className="text-xs text-gray-400 hidden sm:inline">{e.kategorie}</span>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-800">
                        <div className="text-xs text-gray-500 flex flex-wrap gap-2 pt-3">
                          <span className="chip">
                            {e.kategorie}
                          </span>
                          {(e.thema_tags || []).map((t) => (
                            <span
                              key={t}
                              className="chip"
                            >
                              {t}
                            </span>
                          ))}
                        </div>

                        <MarkdownContent>{e.inhalt_text}</MarkdownContent>

                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                          {e.quelle && (
                            <span className="text-xs text-gray-400">Quelle: {e.quelle}</span>
                          )}
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => setStatus(e.id, 'ueben')}
                              className="btn-soft-amber px-3 py-1.5"
                            >
                              Muss ich üben
                            </button>
                            <button
                              onClick={() => setStatus(e.id, 'gelernt')}
                              className="btn-soft-green px-3 py-1.5"
                            >
                              Gelernt
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
