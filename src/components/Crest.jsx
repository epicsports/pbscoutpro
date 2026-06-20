import React from 'react';
import { COLORS, ELEV, FONT } from '../utils/theme';

// Darken a hex for the crest gradient depth (handoff rdShade).
function rdShade(hex, amt = 0.42) {
  const h = (hex || COLORS.borderLight).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * (1 - amt)); g = Math.round(g * (1 - amt)); b = Math.round(b * (1 - amt));
  return `rgb(${r},${g},${b})`;
}

/**
 * Crest — the single team-logo primitive (premium "North Star" redesign). A square
 * tile with the team's two-letter `short`, a 150° gradient from the team color to a
 * darkened shade, an inner top sheen + a soft color-tinted shadow. Radius is ALWAYS
 * derived from size (`max(7, round(size×0.3))`) so every crest matches everywhere.
 * Use anywhere a team is shown — never ad-hoc logos.
 *
 * Props: `team` ({ color, short }), `size` (default 40).
 */
export default function Crest({ team, size = 40 }) {
  const c = (team && team.color) || COLORS.borderLight;
  const radius = Math.max(7, Math.round(size * 0.3));
  const short = (team && team.short) || (team && team.name ? team.name.slice(0, 2).toUpperCase() : '?');
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(150deg, ${c}, ${rdShade(c)})`,
      boxShadow: `${ELEV.innerTop}, 0 2px 8px ${c}33`,
      fontFamily: FONT, fontWeight: 800, fontSize: Math.round(size * 0.34), color: '#fff',
      letterSpacing: '-.5px',
    }}>{short}</div>
  );
}
