import { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getLerneinheiten } from '../data/useExamData';
import { findeLernzettel } from '../lib/nachlesen';

/**
 * „Zum Nachlesen"-Zeile unter einer Musterlösung: verlinkt die passendsten
 * Lernzettel zur Frage (über gemeinsame `thema_tags`, `lib/nachlesen`) per
 * Deeplink `/lernzettel?einheit=<id>` – Übung und Inhalt verzahnt, besonders
 * wertvoll direkt nach einer falschen Antwort.
 *
 * @param {{frage: {thema_tags?:string[], pruefungsteil?:string}}} props
 */
export default function NachlesenLinks({ frage }) {
  const einheiten = useMemo(() => getLerneinheiten(), []);
  const treffer = useMemo(() => findeLernzettel(einheiten, frage), [einheiten, frage]);
  if (treffer.length === 0) return null;
  return (
    <p className="text-xs text-gray-500 flex items-center flex-wrap gap-1">
      <BookOpen size={13} className="text-accent shrink-0" aria-hidden="true" />
      Zum Nachlesen:{' '}
      {treffer.map((l, i) => (
        <Fragment key={l.id}>
          {i > 0 && ' · '}
          <Link
            to={`/lernzettel?einheit=${encodeURIComponent(l.id)}`}
            className="text-accent hover:underline"
          >
            {l.titel}
          </Link>
        </Fragment>
      ))}
    </p>
  );
}
