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

import { auth, db } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getDocs, setDoc, collection, collectionGroup, query, where, increment, arrayUnion, waitForPendingWrites } from 'firebase/firestore';
import * as ds from './dataService';
import { buildPlayerPointsFromMatch, computePlayerStats } from '../utils/playerStats';

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

    // Maks pending-gate repro — admin grants a role to a pending member (the
    // exact updateUserRoles path UserDetailPage/MemberCard use). The granting
    // page must be signed in as an admin/super of `slug`.
    grantRole: (slug, uid, roles) => ds.updateUserRoles(slug, uid, roles),

    endMatchAndMerge: (tid, mid) => ds.endMatchAndMerge(tid, mid),
    getPoints: (tid, mid) => ds.getMatchPointsOnce(tid, mid),

    // B4 — checklist-progression probe: create a minimal tournament in the
    // CURRENT workspace (setWorkspace first) so the hasEvent signal flips.
    addTournament: (data) => ds.addTournament(data),

    // ── Invite-isolation probes (Stage 4) — exercise the rules directly ──
    createInvite: (slug, role) => ds.createInvite(slug, role),
    redeem: (token) => ds.redeemInvite(token, auth.currentUser.uid),
    // The OLD self-join envelope (Stage 3 removes it → must be DENIED).
    rawSelfJoin: (slug) => setDoc(doc(db, 'workspaces', slug), {
      members: arrayUnion(auth.currentUser.uid),
      userRoles: { [auth.currentUser.uid]: ['player'] },
      pendingApprovals: arrayUnion(auth.currentUser.uid),
    }, { merge: true }),
    // Cross-tenant read probes (must be DENIED for a non-member post-Stage-3).
    readWorkspaceDoc: (slug) => getDoc(doc(db, 'workspaces', slug)).then(s => (s.exists() ? s.data() : null)),
    readPointsRaw: (slug, tid, mid) =>
      getDocs(collection(db, 'workspaces', slug, 'tournaments', tid, 'matches', mid, 'points'))
        .then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))),

    // ── § 96 layout-globalization probes (Stage 4) — exercise the rules ──
    // Global base: read = authed; write = super_admin only.
    readBaseLayout: (id) => getDoc(doc(db, 'layouts', id)).then(s => (s.exists() ? s.data() : null)),
    writeBaseLayout: (id, patch) => setDoc(doc(db, 'layouts', id), patch, { merge: true }),
    // Workspace overlay: read/write = isMember/isCoach (tenant-local).
    readOverlay: (slug, id) => getDoc(doc(db, 'workspaces', slug, 'layoutOverlays', id)).then(s => (s.exists() ? s.data() : null)),
    writeOverlay: (slug, id, patch) => setDoc(doc(db, 'workspaces', slug, 'layoutOverlays', id), patch, { merge: true }),

    // ── UAT #4 roster division-correctness — the REAL §83 narrowing path ──
    repairRosters: (tid, league) => ds.repairScoutedRostersForTournament(tid, league),
    readScouted: (slug, tid, sid) =>
      getDoc(doc(db, 'workspaces', slug, 'tournaments', tid, 'scouted', sid)).then(s => (s.exists() ? s.data() : null)),

    // ── UAT #5 stats kills — real aggregation (buildPlayerPointsFromMatch →
    //    computePlayerStats), the same path PlayerStatsPage uses ──
    playerKills: async (slug, tid, mid, playerId, field) => {
      const points = await ds.getMatchPointsOnce(tid, mid);
      const mSnap = await getDoc(doc(db, 'workspaces', slug, 'tournaments', tid, 'matches', mid));
      const match = { id: mid, ...(mSnap.exists() ? mSnap.data() : {}) };
      const pp = buildPlayerPointsFromMatch({ points, match, playerId });
      return computePlayerStats(pp, field).kills;
    },

    // ── UAT #6 offline write-queue — addPoint queues offline; waitForSync
    //    (waitForPendingWrites) resolves only when the backend acks it ──
    // Return a plain {id} (a raw DocumentReference isn't Playwright-serializable).
    addPointRaw: (tid, mid, data) => ds.addPoint(tid, mid, data).then(ref => ({ id: ref.id })),
    waitForSync: () => waitForPendingWrites(db),

    // ── § read-volume C 2 — CG tenant-isolation probes. Each runs the EXACT
    //    collectionGroup query shape the app uses against the REAL rules, and
    //    resolves to the doc count (the spec asserts OK-with-count vs DENIED). ──
    // selfReports CG — coach/PPT read (getEventShotFrequencies / getTrainingSelfReports).
    cgSelfReportsByWs: (slug, trainingId) => getDocs(query(
      collectionGroup(db, 'selfReports'),
      where('workspaceSlug', '==', slug),
      where('trainingId', '==', trainingId),
    )).then(s => s.size),
    // shots CG — member read (fetchSelfLogShotsForPlayer).
    cgShotsByWs: (slug, tournamentId) => getDocs(query(
      collectionGroup(db, 'shots'),
      where('workspaceSlug', '==', slug),
      where('tournamentId', '==', tournamentId),
    )).then(s => s.size),
    // shots CG — player self-read carve-out (usePlayerBreakoutHistory).
    cgShotsByUid: (uid) => getDocs(query(
      collectionGroup(db, 'shots'),
      where('playerLinkedUid', '==', uid),
    )).then(s => s.size),
    // /layoutAggregates increment-only write (Stage 2.4 shared-write surface).
    bumpLayoutAgg: (layoutId) => setDoc(
      doc(db, 'layoutAggregates', layoutId),
      { shots: { Snake: { total: increment(1) } } },
      { merge: true },
    ),

    // ── A3 self-leave regression — leaveWorkspaceSelf threw a ReferenceError
    //    (undefined userSnap) for non-admins since 2026-05-27; this proves it
    //    resolves now. Returns nothing meaningful; the spec asserts no throw. ──
    leaveSelf: () => ds.leaveWorkspaceSelf(auth.currentUser.uid).then(() => true),

    // ── § 112 Hitability responsive — count hits for a training via the app's
    //    own read path (fetchHitabilityHits), so the coordinate-tap spec can
    //    assert tap→write WITHOUT polling the live subscription. ──
    hitabilityHitCount: async (layoutId, trainingId) => {
      const all = await ds.fetchHitabilityHits(layoutId);
      return all.filter(h => h.trainingId === trainingId).length;
    },
  };
}
