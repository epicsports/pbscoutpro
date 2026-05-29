/**
 * EMULATOR-ONLY test bridge. Imported by main.jsx ONLY behind the
 * VITE_USE_EMULATOR flag (the guarded dynamic import is dead-eliminated from
 * prod/dev/CI builds — verified by a dist grep for `__pbtest`).
 *
 * Exposes the REAL dataService write/merge/read paths so the e2e suite can
 * exercise the concurrent-scouting + end-match-merge corruption class
 * (auto-ID `addPoint` + `endMatchAndMerge`) at the data layer, without brittle
 * canvas/bottom-sheet puppetry. The brief sanctions a "test-only hook" as an
 * alternative to coordinate clicks. Writes go through `bp()` (the active
 * workspace), which is set once login auto-enters the seeded workspace.
 */

import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import * as ds from './dataService';

export function installTestBridge() {
  if (typeof window === 'undefined') return;
  window.__pbtest = {
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),

    // Pin the dataService base path on THIS module instance. App sets it via
    // its own setBasePath on the main graph; the dynamically-imported bridge can
    // resolve to a separate dataService instance whose _bp is unset, so bp()
    // would throw "Workspace not set". Tests call this once after login.
    // Mirrors useWorkspace basePath = `workspaces/${slug}`.
    setWorkspace: (slug) => ds.setBasePath(`workspaces/${slug}`),

    // Mirror MatchPage.savePointAsNewStream: a new per-coach point doc with an
    // AUTO-GENERATED id + coachUid + a reactive index computed from the live
    // points (this is exactly the path the 2026-05-15 doc-ID-corruption fix
    // hardened — auto-ids instead of deterministic {mid}_{coach}_{NNN}).
    logStreamPoint: async (tid, mid, uid, data) => {
      const pts = await ds.getMatchPointsOnce(tid, mid);
      const mine = pts.filter(p => p.coachUid === uid);
      const index = mine.length ? Math.max(...mine.map(p => p.index || 0)) + 1 : 1;
      const ref = await ds.addPoint(tid, mid, {
        ...data, coachUid: uid, index, canonical: false, mergedInto: null,
      });
      return { id: ref.id, index };
    },

    endMatchAndMerge: (tid, mid) => ds.endMatchAndMerge(tid, mid),
    getPoints: (tid, mid) => ds.getMatchPointsOnce(tid, mid),
  };
}
