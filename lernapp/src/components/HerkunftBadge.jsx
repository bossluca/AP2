import { herkunftsHinweis } from '../lib/herkunft';

/**
 * Zeigt – falls nötig – einen einheitlichen Herkunfts-Hinweis zu einem Inhalt
 * (KI-generiert / paraphrasiert / unverifiziert). Rendert nichts, wenn es nichts
 * zu kennzeichnen gibt. Quelle der Wahrheit ist `lib/herkunft`.
 *
 * @param {{ obj: object, className?: string }} props  `obj` = Frage/Lernobjekt.
 */
export default function HerkunftBadge({ obj, className = '' }) {
  const h = herkunftsHinweis(obj);
  if (!h) return null;
  const ton =
    h.ton === 'warnung'
      ? 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40'
      : 'text-zinc-600 bg-zinc-100 dark:text-muted-foreground dark:bg-muted';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${ton} ${className}`}
      title={h.label}
    >
      <span aria-hidden="true">{h.emoji}</span>
      {h.label}
    </span>
  );
}
