/**
 * Crest/identity color + name helpers — ported 1:1 from the redesign prototype
 * (redesign.jsx 30-44, 86). Used by the premium team-row crest gradients
 * (CoachTabContent TeamRow) and the team-detail header (ScoutedTeamPage).
 *
 * These are pure string transforms on a hex team color; they intentionally
 * return `rgb(...)` strings (not hex) so they compose directly into a CSS
 * `linear-gradient(...)`.
 */

/**
 * Darken a hex color toward black by `amt` (0..1). 0 = unchanged, 1 = black.
 * @param {string} hex  e.g. '#3b82f6' (3- or 6-digit); falsy → slate fallback
 * @param {number} amt  0..1 darken amount
 * @returns {string} 'rgb(r,g,b)'
 */
export function rdShade(hex, amt = 0.42) {
  const h = (hex || '#475569').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * (1 - amt)); g = Math.round(g * (1 - amt)); b = Math.round(b * (1 - amt));
  return `rgb(${r},${g},${b})`;
}

/**
 * Lighten a hex color toward white by `amt` (0..1). 0 = unchanged, 1 = white.
 * @param {string} hex  e.g. '#3b82f6' (3- or 6-digit); falsy → slate fallback
 * @param {number} amt  0..1 lighten amount
 * @returns {string} 'rgb(r,g,b)'
 */
export function rdTint(hex, amt = 0.4) {
  const h = (hex || '#475569').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return `rgb(${r},${g},${b})`;
}

/**
 * Split a team name into a `{ city, nick }` pair for the city-eyebrow / nick-wordmark
 * row layout. The LAST whitespace-token is the nick; everything before is the city
 * (single-word names → city falls back to the nick so the eyebrow isn't empty).
 * @param {string} n  team name e.g. 'San Diego Dynasty'
 * @returns {{ city: string, nick: string }}
 */
export function splitTeamName(n) {
  const p = String(n || '').trim().split(' ');
  const nick = p.pop() || n;
  return { city: p.join(' ') || nick, nick };
}
