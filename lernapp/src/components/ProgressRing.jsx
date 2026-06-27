import { useEffect, useState } from 'react';

/**
 * Animierter Kreis-Fortschritt (SVG-Donut) mit Farbverlauf. Beim Mounten zählt
 * der Ring weich von 0 auf `value` hoch. `children` werden mittig überlagert
 * (z. B. die Prozentzahl). Reduced-Motion wird über den globalen CSS-Guard
 * respektiert (Transition wird dann praktisch zu 0).
 *
 * @param {Object} props
 * @param {number} props.value   Fortschritt in Prozent (0–100).
 * @param {number} [props.size]  Durchmesser in px.
 * @param {number} [props.stroke] Ringbreite in px.
 * @param {string} [props.gradientId] Eindeutige ID, falls mehrere Ringe auf einer Seite.
 * @param {import('react').ReactNode} [props.children] Zentrierter Inhalt.
 */
export default function ProgressRing({
  value,
  size = 128,
  stroke = 12,
  gradientId = 'progress-ring',
  children,
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  const r = (size - stroke) / 2;
  const umfang = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, shown));
  const offset = umfang - (clamped / 100) * umfang;

  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-200/70 dark:stroke-gray-700/60"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={`url(#${gradientId})`}
          strokeLinecap="round"
          strokeDasharray={umfang}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="text-center leading-tight">{children}</div>
    </div>
  );
}
