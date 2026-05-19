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
  const constantsData = useMemo(() => buildLeaguesFromConstants(), []);
  const [leagues, setLeagues] = useState(constantsData);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'leagues'));
        if (cancelled) return;
        const firestoreData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (firestoreData.length === 0) return; // keep constants fallback
        const ordered = sortLeaguesLegacyOrder(firestoreData);
        setLeagues(ordered);
      } catch (err) {
        if (cancelled) return;
        console.error('useLeagues fetch failed, using constants fallback:', err);
        captureException(err, { tags: { hook: 'useLeagues' } });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return leagues;
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
