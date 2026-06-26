import React, { useState, useEffect } from 'react';
import { COLORS, FONT } from '../utils/theme';
import { hasFlag, flagDataUri, COUNTRY_NAMES } from '../utils/flags';

/**
 * CrestBand — the team-identity BAND (prototype `RdCrestBg`, redesign.jsx 119-131).
 *
 * A heavy, full-bleed identity background for catalog/list rows + the team-detail
 * header. Mirrors the Crest 3-tier fallback (logo → country flag → initials) but,
 * instead of a small circular badge, the mark BLEEDS in from the LEFT and FADES to
 * the right behind the row content. It is purely decorative identity — absolutely
 * positioned, `pointerEvents:'none'`, `aria-hidden` — so the row's single touch
 * target + name/stats sit ON TOP of it. NEVER amber (§ 27 identity, not a CTA).
 *
 *   Tier 1 — uploaded logo (`team.logoUrl`): bled in from the left, masked/faded
 *            to the right (RDWM gradient), opacity .68.
 *   Tier 2 — country flag (`team.country` via flags.js): a flag band, opacity .46,
 *            RDWM_FLAG mask, slightly desaturated.
 *   Tier 3 — a giant faint monogram watermark, opacity .12.
 *
 * Positioning/opacity/mask are ported 1:1 from the prototype. `imgH` (px) drives the
 * logo height (the prototype sizes the band by the row height); the flag/monogram
 * derive from it. `dim` (hidden-team rows) softens the whole band slightly.
 *
 * @param team  - { name, logoUrl?, country?, color? }  (resolved team object)
 * @param imgH  - logo height in px (prototype: ~1.6× the row height so it bleeds)
 * @param dim   - hidden-team variant (slightly lower opacity)
 */
// Prototype masks — left-bleed → fade-right. The logo gets a longer reveal than the
// flag (the flag/monogram fade sooner so the row content stays legible).
const WM_LOGO = 'linear-gradient(90deg, #000 0%, #000 48%, transparent 84%)';
const WM_FLAG = 'linear-gradient(90deg, #000 0%, #000 30%, transparent 66%)';

export default function CrestBand({ team, imgH = 114, dim = false }) {
  const [imgErr, setImgErr] = useState(false);
  useEffect(() => { setImgErr(false); }, [team?.logoUrl]);

  const dimFactor = dim ? 0.85 : 1;

  // Tier 1 — uploaded logo, bled from the left + faded right.
  if (team?.logoUrl && !imgErr) {
    return (
      <img src={team.logoUrl} alt="" aria-hidden="true" onError={() => setImgErr(true)}
        style={{
          position: 'absolute', left: -18, top: '50%', height: imgH, width: 'auto',
          flexShrink: 0, transform: 'translateY(-50%)', objectFit: 'contain',
          opacity: 0.68 * dimFactor, pointerEvents: 'none',
          WebkitMaskImage: WM_LOGO, maskImage: WM_LOGO,
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.5))',
        }} />
    );
  }

  // Tier 2 — country flag band (premium inline SVG via flags.js).
  if (hasFlag(team?.country)) {
    const h = Math.round(imgH * 0.6);
    const w = Math.round(h * 1.5);
    return (
      <img src={flagDataUri(team.country)} alt="" aria-hidden="true"
        title={COUNTRY_NAMES[team.country] || ''}
        style={{
          position: 'absolute', left: -14, top: '50%', height: h, width: w,
          transform: 'translateY(-50%)', objectFit: 'cover', borderRadius: 11,
          opacity: 0.46 * dimFactor, pointerEvents: 'none',
          WebkitMaskImage: WM_FLAG, maskImage: WM_FLAG,
          filter: 'saturate(.82) drop-shadow(0 4px 12px rgba(0,0,0,.5))',
        }} />
    );
  }

  // Tier 3 — giant faint monogram watermark.
  const name = (team?.name || '').trim();
  const words = name.split(/\s+/).filter(Boolean);
  const mono = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
  if (!mono) return null;
  return (
    <span aria-hidden="true" style={{
      position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
      fontFamily: FONT, fontWeight: 800, fontSize: Math.round(imgH * 0.5), lineHeight: 1,
      color: COLORS.white, opacity: 0.12 * dimFactor, letterSpacing: '-3px',
      textTransform: 'uppercase', pointerEvents: 'none',
      WebkitMaskImage: WM_FLAG, maskImage: WM_FLAG,
    }}>{mono}</span>
  );
}
