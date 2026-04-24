/**
 * PBLI ID matcher — multi-priority cascade for self-claim flow.
 *
 * Why this exists: real users enter PBLeagues IDs in many shapes:
 *   "61114"            ← bare first segment (canonical DB form)
 *   "61114-8236"       ← full form (pbliIdFull)
 *   "#61114"           ← with hash prefix
 *   "#61114-8236"      ← hash + full
 *   " 61114 "          ← whitespace
 *   "61114-8236A"      ← alpha suffix some divisions use
 *
 * The legacy LinkProfileModal substring search failed several of these
 * because (a) it didn't strip `#` from input and (b) the
 * `(p.pbliId || p.pbliIdFull)` short-circuit hid pbliIdFull when pbliId
 * was set. This module replaces that with a 4-priority cascade:
 *
 *   P1  exact pbliId after normalization
 *   P2  exact pbliIdFull after normalization
 *   P3  first-segment match when user gave dash form
 *   P4  substring search on either field (≥6 chars)
 *
 * `matchPlayers(query, players)` is the single entry point used by the
 * modal — also handles the empty-query case (return all unlinked,
 * sorted) and the alpha-only-input case (substring on nickname/name).
 *
 * Confirmation gate is enforced by the caller, not here — this module
 * is pure ranking, no side effects.
 */

import { normalizePbliId } from './roleUtils';

/**
 * Normalize a PBLI input for matching: strip `#`, remove all whitespace,
 * lowercase. Stricter than `normalizePbliId` (which only strips leading `#`
 * + trims) because the user might type `# 61114-8236A` with internal spaces
 * and casing. DB-side values go through the same normalization so both
 * sides agree.
 */
export function normalizePbliInput(raw) {
  if (raw == null) return '';
  return String(raw)
    .replace(/^#/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

/**
 * If the input contains a `-`, return the first segment. Otherwise return
 * the input unchanged. Both already passed through normalizePbliInput.
 */
export function extractPbliFirstSegment(normalized) {
  const dashIdx = normalized.indexOf('-');
  return dashIdx === -1 ? normalized : normalized.substring(0, dashIdx);
}

/**
 * Detect whether a query looks like a PBLI ID (mostly digits, optional
 * dash + suffix). Used to switch the matcher between PBLI-cascade mode and
 * name-substring mode. Loose on purpose — `61114a` and `61114-8` both
 * pass; only pure-alphabetic input is excluded.
 */
function looksLikePbli(normalized) {
  if (!normalized) return false;
  return /^[0-9]/.test(normalized);
}

/**
 * 4-priority PBLI cascade. Returns matches in priority order, capped at 5.
 *
 * @param {string} normalized — already normalized via normalizePbliInput
 * @param {Array} players      — full workspace player list
 */
export function matchPlayersByPbli(normalized, players) {
  if (!normalized || !Array.isArray(players)) return [];

  const exactPbli = players.filter(p =>
    normalizePbliInput(p.pbliId) === normalized
  );
  if (exactPbli.length > 0) return exactPbli.slice(0, 5);

  const exactFull = players.filter(p =>
    normalizePbliInput(p.pbliIdFull) === normalized
  );
  if (exactFull.length > 0) return exactFull.slice(0, 5);

  if (normalized.includes('-')) {
    const firstSegment = extractPbliFirstSegment(normalized);
    const segMatch = players.filter(p =>
      normalizePbliInput(p.pbliId) === firstSegment
    );
    if (segMatch.length > 0) return segMatch.slice(0, 5);
  }

  if (normalized.length >= 6) {
    const sub = players.filter(p => {
      const a = normalizePbliInput(p.pbliId);
      const b = normalizePbliInput(p.pbliIdFull);
      return (a && a.includes(normalized)) || (b && b.includes(normalized));
    });
    if (sub.length > 0) return sub.slice(0, 5);
  }

  return [];
}

/**
 * Substring fallback on display fields when the input doesn't look PBLI-ish
 * (e.g. someone types "Jacek" or "ranger"). Mirrors the legacy modal
 * behavior so users keep the "type my name" path.
 */
function matchPlayersByName(query, players) {
  const q = String(query || '').trim().toLowerCase();
  if (!q || !Array.isArray(players)) return [];
  return players.filter(p => {
    const nick = (p.nickname || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return nick.includes(q) || name.includes(q);
  }).slice(0, 20); // generous — name search is browse-y, not pinpoint
}

/**
 * Return all unlinked players sorted alphabetically by display name. Used
 * when the input is empty so the user gets a browsable initial list rather
 * than nothing.
 */
function unlinkedPlayersAlpha(players) {
  if (!Array.isArray(players)) return [];
  return players
    .filter(p => !p.linkedUid)
    .slice()
    .sort((a, b) => {
      const an = (a.nickname || a.name || '').toLowerCase();
      const bn = (b.nickname || b.name || '').toLowerCase();
      return an.localeCompare(bn);
    });
}

/**
 * Single entry point used by LinkProfileModal. Picks the right strategy
 * based on input shape:
 *
 *   empty query                → all unlinked players, alphabetical
 *   PBLI-shaped query (P1-P4)  → cascade hits (capped 5)
 *   PBLI-shaped, no hits       → empty array (caller shows skip-fallback UI)
 *   alpha query                → substring on nickname/name (capped 20)
 *
 * Returns plain Array — no metadata, no priority labels. The caller
 * doesn't need to know which priority matched, only that the list is
 * relevant + ordered.
 */
export function matchPlayers(query, players) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return unlinkedPlayersAlpha(players);

  const normalized = normalizePbliInput(trimmed);
  if (looksLikePbli(normalized)) {
    return matchPlayersByPbli(normalized, players);
  }

  return matchPlayersByName(trimmed, players);
}
