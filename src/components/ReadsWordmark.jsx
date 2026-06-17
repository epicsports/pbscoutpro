import React from 'react';
import { COLORS, FONT } from '../utils/theme';

/**
 * Reads brand lockup — the "reads" wordmark + amber dot + dark seam (+ optional
 * tagline). Geometry is the approved asset (reads_welcome_animation.html, viewBox
 * 320×120). Per the brand rule the small/static rendition uses a FLAT amber dot
 * (the rich radial is reserved for the large splash below). Replaces the old
 * logo.png above the login/register form.
 */
export function ReadsWordmark({ width = 220, tagline = true }) {
  const h = tagline ? 120 : 86;
  return (
    <svg width={width} height={Math.round(width * (h / 320))} viewBox={`0 0 320 ${h}`}
      role="img" aria-label="reads" style={{ display: 'block' }}>
      <text x="40" y="64" fontFamily={FONT} fontSize="70" fontWeight="500" letterSpacing="-2"
        fill={COLORS.text} textLength="190" lengthAdjust="spacing">reads</text>
      <circle cx="257" cy="46" r="9" fill={COLORS.accent} />
      <rect x="246" y="44.9" width="22" height="2.2" fill={COLORS.bg} />
      {tagline && (
        <text x="40" y="102" fontFamily={FONT} fontSize="11" fill={COLORS.textMuted}
          textLength="226" lengthAdjust="spacing">PAINTBALL INTELLIGENCE</text>
      )}
    </svg>
  );
}

/**
 * ReadsWelcomeSplash — the login intro (asset reads_welcome_animation.html). A
 * fixed overlay that animates the lockup (track draws → dot pops in the rich-B
 * radial → seam → word + tagline rise) then fades out (~1.35s, pure CSS in
 * global.css `.reads-splash`), revealing the login form underneath. The fade is a
 * one-shot CSS animation → it plays once per LoginPage mount (i.e. each time the
 * logged-out screen appears). Decorative + pointer-events:none → never blocks the
 * form. prefers-reduced-motion → fade-only (handled in global.css). No JS gate:
 * a side-effecting useState initializer is StrictMode-unsafe (double-mount hides it).
 */
export function ReadsWelcomeSplash() {
  return (
    <div className="reads-splash" role="presentation" aria-hidden="true" data-testid="reads-splash">
      <svg width="512" height="192" viewBox="0 0 320 120" style={{ maxWidth: '80vw', height: 'auto' }}>
        <defs>
          <radialGradient id="readsRichB" cx="0.35" cy="0.28" r="1.0">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="45%" stopColor={COLORS.accent} />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#b45309" />
          </radialGradient>
        </defs>
        <line id="track" x1="-30" y1="46" x2="257" y2="46" stroke={COLORS.accent} strokeWidth="2" strokeLinecap="round" />
        <text id="word" x="40" y="64" fontFamily={FONT} fontSize="70" fontWeight="500" letterSpacing="-2"
          fill={COLORS.text} textLength="190" lengthAdjust="spacing">reads</text>
        <circle id="dot" cx="257" cy="46" r="9" fill="url(#readsRichB)" />
        <rect id="seam" x="246" y="44.9" width="22" height="2.2" fill={COLORS.bg} />
        <text id="desc" x="40" y="102" fontFamily={FONT} fontSize="11" fill={COLORS.textMuted}
          textLength="226" lengthAdjust="spacing">PAINTBALL INTELLIGENCE</text>
      </svg>
    </div>
  );
}
