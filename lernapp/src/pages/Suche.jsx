import { useMemo, useState } from 'react';
import { getLernobjekte, filterLernobjekte, defaultLernfilter } from '../data/lernobjekte';
import { useProgress } from '../context/ProgressContext';
import MarkdownContent from '../components/MarkdownContent';

/** Entfernt einfache Markdown-Zeichen für lesbare Snippets. */
function plain(text) {
  return text.replace(/[*#`>_]/g, '').replace(/\s+/g, ' ').trim();
}

/** Schneidet einen Textausschnitt rund um den ersten Treffer und hebt ihn hervor. */
function Snippet({ text, query }) {
  const clean = plain(text);
  const idx = clean.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span className="text-gray-500">{clean.slice(0, 140)}…</span>;
  const start = Math.max(0, idx - 60);
  const end = Math.min(clean.length, idx + query.length + 80);
  return (
    <span className="text-gray-600 dark:text-gray-400">
      {start > 0 && '…'}
      {clean.slice(start, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700/60 dark:text-gray-100 rounded px-0.5">
        {clean.slice(idx, idx + query.length)}
      </mark>
      {clean.slice(idx + query.length, end)}
      {end < clean.length && '…'}
    </span>
  );
}

/**
 * Globale Volltextsuche über alle Lernobjekte (Prüfungsfragen + Lernzettel).
 * Treffer mit Snippet + Hervorhebung, optional nach Art/Prüfungsteil gefiltert,
 * aufklappbar zur vollständigen Vorder-/Rückseite.
 */
export default function Suche() {
  const objekte = useMemo(() => getLernobjekte(), []);
  const { getStatus, isDue } = useProgress();

  const [query, setQuery] = useState('');
  const [art, setArt] = useState('alle');
  const [teil, setTeil] = useState('alle');
  const [openId, setOpenId] = useState(null);

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (trimmed.length < 2) return [];
    return filterLernobjekte(
      objekte,
      { ...defaultLernfilter, query: trimmed, art, pruefungsteil: teil },
      { getStatus, isDue }
    );
  }, [objekte, trimmed, art, teil, getStatus, isDue]);

  const selectClass =
    'input';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">🔍 Suche</h1>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Begriff in Fragen, Lösungen und Lernzetteln…"
          className={`${selectClass} flex-1 min-w-[14rem]`}
        />
        <select value={art} onChange={(e) => setArt(e.target.value)} className={selectClass} aria-label="Art filtern">
          <option value="alle">Alles</option>
          <option value="frage">Fragen</option>
          <option value="lernzettel">Lernzettel</option>
        </select>
        <select value={teil} onChange={(e) => setTeil(e.target.value)} className={selectClass} aria-label="Prüfungsteil filtern">
          <option value="alle">AP1 + AP2</option>
          <option value="AP1">AP1</option>
          <option value="AP2">AP2</option>
        </select>
      </div>

      {trimmed.length < 2 ? (
        <p className="text-sm text-gray-500">Mindestens 2 Zeichen eingeben.</p>
      ) : (
        <p className="text-sm text-gray-500">
          {results.length} Treffer für „{trimmed}"
        </p>
      )}

      <ul className="space-y-2">
        {results.slice(0, 60).map((o) => {
          const isOpen = openId === o.id;
          const hay = `${o.titel} ${o.front} ${o.back || ''}`;
          return (
            <li
              key={o.id}
              className="card overflow-hidden"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : o.id)}
                className="w-full text-left px-4 py-3 space-y-1 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs chip">
                    {o.art === 'frage' ? '📄 Frage' : '📝 Lernzettel'}
                  </span>
                  <span className="text-xs chip">
                    {o.pruefungsteil}
                  </span>
                  <span className="font-medium flex-1">{o.titel}</span>
                  <span className="text-xs text-gray-400 hidden sm:inline">{o.kategorie}</span>
                </div>
                <div className="text-xs">
                  <Snippet text={hay} query={trimmed} />
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-200 dark:border-gray-800 space-y-3">
                  <MarkdownContent>{o.front}</MarkdownContent>
                  {o.back && (
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-2">
                      <MarkdownContent>{o.back}</MarkdownContent>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {results.length > 60 && (
        <p className="text-xs text-gray-500">… nur die ersten 60 Treffer werden angezeigt.</p>
      )}
    </div>
  );
}
