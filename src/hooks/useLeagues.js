import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { LEAGUES } from '../utils/theme';
import { buildLeaguesFromConstants } from '../utils/buildLeaguesFromConstants';
import { captureException } from '../services/sentry';

// Phase 2.1b of multi-tenant migration (DESIGN_DECISIONS § 63.15.1 +
// MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 1 sub-task b).
//
// Returns the list of leagues with their divisions, sourced from
// /leagues/ Firestore collection (populated by Phase 2.1a bootstrap)
// with synchronous theme.js constants fallback.
//
// Pattern: additive with constants fallback.
//   - Initial value: built synchronously from constants (zero loading
//     state needed in consumers).
//   - useEffect fires Firestore fetch in background. On success: state
//     upgrades to Firestore data (super admin edits become visible).
//     On failure: state stays at constants fallback + Sentry capture.
//
// Output shape matches /leagues/{leagueId} docs:
//   { id, name, shortName, region, parentLeagueFamily,
//     divisions: [{ id, name, order }], active, createdBy }
//
// IMPORTANT: stored value format is preserved as `name` string (not
// `id`). Consumer dropdowns should use `option.value = d.name` so new
// writes match legacy data (`tournament.division = 'PRO'`, not 'pro').
//
// Sort order matches legacy LEAGUES array ['NXL', 'DPL', 'PXL'] so
// display is stable across data sources.
export function useLeagues() {
  const all = useAllLeagues();
  // Default consumers see only active leagues (Phase 2.1c soft-delete
  // surfaces — deactivated leagues hidden from tournament/team creation
  // dropdowns and similar UIs). Admin view uses useAllLeagues directly.
  return useMemo(() => all.filter(L => L.active !== false), [all]);
}

// Admin-facing variant — returns ALL leagues including inactive.
// Used by /admin/leagues page (Phase 2.1c) for the "All" filter.
// Identical fetch logic + fallback; differs only in lack of active filter.
// Module-level cache — the first successful /leagues fetch serves every
// subsequent caller. The § 71 resolution layer mounts useLeagueName widely
// (LeagueBadge + ~10 sites); without the cache each instance fires its own
// getDocs('leagues').
let cachedLeagues = null;

export function useAllLeagues() {
  const constantsData = useMemo(() => buildLeaguesFromConstants(), []);
  const [leagues, setLeagues] = useState(cachedLeagues || constantsData);

  useEffect(() => {
    if (cachedLeagues) return undefined; // already fetched this session
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'leagues'));
        if (cancelled) return;
        const firestoreData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (firestoreData.length === 0) return; // keep constants fallback
        const ordered = sortLeaguesLegacyOrder(firestoreData);
        cachedLeagues = ordered;
        setLeagues(ordered);
      } catch (err) {
        if (cancelled) return;
        console.error('useAllLeagues fetch failed, using constants fallback:', err);
        captureException(err, { tags: { hook: 'useAllLeagues' } });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return leagues;
}

// § 71 — league display-name resolver. Refs store the league `shortName` (the
// frozen KEY); the human-facing label is the /leagues doc `name`. Returns a
// `(shortName) => displayName` fn — falls back to the raw string for custom /
// 'Other' leagues with no doc. No-op while shortName === name (today).
export function useLeagueName() {
  const leagues = useAllLeagues();
  return useMemo(() => {
    const byShort = {};
    leagues.forEach(L => { if (L.shortName) byShort[L.shortName] = L.name || L.shortName; });
    return (shortName) => (shortName && byShort[shortName]) || shortName || '';
  }, [leagues]);
}

// One-shot /leagues fetch into the module cache. Idempotent.
let leaguesFetchStarted = false;
function ensureLeaguesFetched() {
  if (leaguesFetchStarted || cachedLeagues) return;
  leaguesFetchStarted = true;
  getDocs(collection(db, 'leagues'))
    .then(snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (data.length > 0) cachedLeagues = sortLeaguesLegacyOrder(data);
    })
    .catch(() => { /* constants fallback — resolver returns the raw string */ });
}

// § 71 — non-reactive league display-name resolver, for sites outside a clean
// hook spot (option text, memo-built labels, helper strings). shortName (the
// frozen KEY in every ref) → display `name`. Warms the module cache on first
// call; until it lands returns the raw string — identical to `name` today
// (shortName === name), so it is a visible no-op until the first rename.
export function leagueDisplayName(shortName) {
  if (!shortName) return shortName || '';
  ensureLeaguesFetched();
  if (cachedLeagues) {
    const L = cachedLeagues.find(x => x.shortName === shortName);
    if (L) return L.name || shortName;
  }
  return shortName;
}

// Sort Firestore-fetched leagues to match legacy display order from
// the LEAGUES constant (NXL → DPL → PXL). Leagues not in the legacy
// list fall to the end in their original order.
function sortLeaguesLegacyOrder(arr) {
  const indexFor = (sn) => {
    const i = LEAGUES.indexOf(sn);
    return i >= 0 ? i : LEAGUES.length;
  };
  return [...arr].sort((a, b) => indexFor(a.shortName) - indexFor(b.shortName));
}
