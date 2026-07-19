"use client";

import "./ornament-margins.css";

/**
 * Symmetric gold mandala used to fill the empty side gutters of
 * narrow-centered pages (FAQ, forum). Purely decorative.
 */
function Mandala() {
  const petals = Array.from({ length: 16 });
  const dots = Array.from({ length: 24 });
  const inner = Array.from({ length: 8 });

  return (
    <svg
      viewBox="0 0 240 240"
      className="ornament-mandala"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" fill="none" strokeWidth="1.1">
        {/* outer rings */}
        <circle cx="120" cy="120" r="116" />
        <circle cx="120" cy="120" r="108" strokeWidth="0.5" />

        {/* dotted ring */}
        {dots.map((_, i) => (
          <circle
            key={`d${i}`}
            cx="120"
            cy="20"
            r="1.8"
            fill="currentColor"
            stroke="none"
            transform={`rotate(${(360 / 24) * i} 120 120)`}
          />
        ))}

        {/* outer petal ring */}
        {petals.map((_, i) => (
          <g key={`p${i}`} transform={`rotate(${(360 / 16) * i} 120 120)`}>
            <ellipse cx="120" cy="58" rx="10" ry="28" strokeWidth="0.8" />
            <line x1="120" y1="30" x2="120" y2="20" strokeWidth="0.6" />
          </g>
        ))}

        {/* mid rings */}
        <circle cx="120" cy="120" r="66" />
        <circle cx="120" cy="120" r="58" strokeWidth="0.5" />

        {/* inner diamond/petal motif */}
        {inner.map((_, i) => (
          <path
            key={`i${i}`}
            d="M120 62 C128 82 128 98 120 118 C112 98 112 82 120 62 Z"
            strokeWidth="0.9"
            transform={`rotate(${(360 / 8) * i} 120 120)`}
          />
        ))}

        {/* centre */}
        <circle cx="120" cy="120" r="20" strokeWidth="0.8" />
        <circle cx="120" cy="120" r="8" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

/**
 * Decorative gold ornaments in the left & right gutters.
 * Only shown on very wide screens (>= 1440px); hidden otherwise.
 * aria-hidden + pointer-events:none — never interactive.
 *
 * - default: `position: fixed` with a navy wash — for standalone navy-gutter
 *   pages (/faq, /forum).
 * - `contained`: `position: absolute` inside a relative section, no navy wash
 *   (muted gold on the section's own cream background) — for the home-page
 *   FAQ / forum sections.
 */
export function OrnamentMargins({ contained = false }: { contained?: boolean }) {
  return (
    <div
      className={`ornament-margins ${
        contained ? "ornament-margins--contained" : ""
      }`}
      aria-hidden="true"
    >
      <div className="ornament-panel ornament-panel--left">
        <Mandala />
      </div>
      <div className="ornament-panel ornament-panel--right">
        <Mandala />
      </div>
    </div>
  );
}

export default OrnamentMargins;
