import React, { useState } from 'react';
import { COLORS, FONT } from '../utils/theme';

/**
 * TeamBadge — the team analogue of PlayerAvatar (§ Team branding Phase 1).
 *
 * Display priority (mirrors PlayerAvatar's fallback chain):
 *   1. team.logoUrl  (URL ref on the doc — Phase 2; never base64. Broken/empty
 *      URL falls back gracefully to the swatch + monogram via onError.)
 *   2. monogram (1–2 letters from team.name) on a brand-color swatch.
 *
 * Swatch color = team.color (hex, set by the brand editor) when valid, else a
 * stable hash color from team.id — so a team without an explicit color always
 * gets the same fallback (visual continuity). NEVER amber: the swatch is
 * non-interactive identity, not a CTA (§ 27 color discipline).
 *
 * Shape: rounded square (a crest) — deliberately distinct from PlayerAvatar's
 * circle so team marks read differently from player avatars at a glance, and so
 * square/shield logos crop cleanly.
 *
 * Takes a RESOLVED team object (callers hold one via teamsById / teams.find).
 *
 * @param team - { id, name, color?, logoUrl? }
 * @param size - px (default 32)
 * @param ringColor - optional border highlight
 */
export default function TeamBadge({ team, size = 32, ringColor }) {
  const [imgErr, setImgErr] = useState(false);
  const name = (team?.name || '?').trim();
  const words = name.split(/\s+/).filter(Boolean);
  const monogram = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase() || '?';
  const bg = isHex(team?.color) ? team.color : TEAM_COLORS[Math.abs(hashCode(team?.id || name)) % TEAM_COLORS.length];

  const styleBase = {
    width: size, height: size, borderRadius: Math.max(4, Math.round(size * 0.25)),
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, overflow: 'hidden',
    border: ringColor ? `2px solid ${ringColor}` : `1px solid ${COLORS.border}`,
    background: bg,
  };

  if (team?.logoUrl && !imgErr) {
    return (
      <span style={styleBase}>
        <img src={team.logoUrl} alt=""
          onError={() => setImgErr(true)}
          // Logo files ship with padding + a thin white frame at the edges → scale up
          // so the badge's overflow:hidden CROPS the white frame + padding and the art
          // fills the tile. +50% — verified via a multi-scale render (1.4 clears the
          // white, 1.8 starts clipping the art; 1.5 fills without clipping). Jacek 2026-06-26.
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.5)' }} />
      </span>
    );
  }

  return (
    <span style={{ ...styleBase, color: '#fff', fontFamily: FONT, fontWeight: 800, fontSize: Math.max(9, Math.round(size * 0.4)), letterSpacing: '-0.5px' }}>
      {monogram}
    </span>
  );
}

// Curated brand palette — also the color-picker options on TeamDetailPage.
// Tailwind 600–800 family: saturated + dark enough for a white monogram (§27).
// Ordered by hue for a readable grid. Includes the original 12 so any team's
// existing color stays in-palette (its swatch keeps the active highlight).
export const TEAM_COLORS = [
  // reds → roses
  '#dc2626', '#b91c1c', '#e11d48', '#9f1239',
  // oranges / ambers
  '#ea580c', '#c2410c', '#b45309', '#a16207',
  // greens
  '#16a34a', '#15803d', '#166534', '#4d7c0f',
  // teals / cyans
  '#0d9488', '#0f766e', '#0891b2', '#0e7490',
  // blues
  '#0284c7', '#2563eb', '#1d4ed8', '#1e40af',
  // indigos / violets
  '#4f46e5', '#4338ca', '#7c3aed', '#5b21b6',
  // purples / fuchsias / pinks
  '#9333ea', '#a21caf', '#be185d', '#db2777',
  // neutrals (dark, white-text-safe)
  '#475569', '#334155',
];

export function isHex(c) {
  return typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}
