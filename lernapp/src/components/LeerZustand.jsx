import { Link } from 'react-router-dom';

/**
 * Freundlicher Leerzustand (Empty State): statt eines nüchternen „Keine … gefunden"
 * ein klarer Hinweis mit optionaler Handlungs-Aufforderung. Wiederverwendbar,
 * Terminal-Optik (zentriert, dezent).
 *
 * @param {Object} props
 * @param {string} [props.emoji]   großes Symbol oben (z. B. '🎉', '🔍').
 * @param {string} props.titel     kurze Überschrift.
 * @param {string} [props.text]    erläuternder Satz.
 * @param {{label:string, to?:string, onClick?:()=>void}} [props.cta]  Handlungs-Button.
 */
export default function LeerZustand({ emoji = '🗂️', titel, text, cta }) {
  return (
    <div className="card p-8 text-center space-y-3 max-w-md mx-auto">
      <div className="text-4xl" aria-hidden="true">
        {emoji}
      </div>
      <h2 className="font-semibold">{titel}</h2>
      {text && <p className="text-sm text-gray-500">{text}</p>}
      {cta &&
        (cta.to ? (
          <Link to={cta.to} className="btn-primary px-4 py-2 inline-flex">
            {cta.label}
          </Link>
        ) : (
          <button onClick={cta.onClick} className="btn-primary px-4 py-2">
            {cta.label}
          </button>
        ))}
    </div>
  );
}
