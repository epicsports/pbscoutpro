/**
 * Seed the Firebase emulator with a minimal, deterministic fixture for the
 * Playwright e2e suite (Stage 1: login + log-a-point).
 *
 * Runs against the EMULATOR ONLY. `firebase emulators:exec` sets
 * FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST for the child process,
 * so the admin SDK auto-targets the emulator. A hard guard below refuses to run
 * if those are unset (never touch a real project).
 *
 * Fixture (keep IDs in sync with tests/e2e/fixtures.js):
 *   - auth user  coach@test.local / test1234  (uid test-coach)
 *   - /users/test-coach  { email, displayName, defaultWorkspace: demo-ws }
 *   - /workspaces/demo-ws  (member+admin+coach, rolesVersion 2)
 *   - 1 layout, 2 teams (+5 players each, global), 1 tournament, 2 scouted
 *     teams (rosters), 1 match (live).
 *
 * Idempotent: uses fixed doc IDs + set() (overwrite), and recreates the auth
 * user (delete-then-create) so re-running yields the same clean state.
 */

const admin = require('firebase-admin');

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-pbscoutpro';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'REFUSING TO SEED: FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST not set.\n' +
    'Run via `firebase emulators:exec` (which sets them), never against a real project.'
  );
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();

// ── Fixture constants (mirror tests/e2e/fixtures.js) ──
const WS = 'demo-ws';
const UID = 'test-coach';
const EMAIL = 'coach@test.local';
const PASSWORD = 'test1234';
// Coach #2 — second concurrent scout for the #1 end-match-merge keystone.
const UID2 = 'test-coach-2';
const EMAIL2 = 'coach2@test.local';
// Coach #3 — REGRESSION GUARD: a member of demo-ws whose /users doc has NO
// explicit defaultWorkspace (the class broken by 5f69dc04). Must enter via
// membership, not hit NoWorkspaceScreen.
const UID3 = 'test-coach-3';
const EMAIL3 = 'coach3@test.local';
// B4 role-aware home — FRESH workspaces (zero events/overlays). b4-ws has the
// admin as its ONLY member (all 3 checklist signals false); b4-roles-ws hosts
// the scout + unlinked player for their B4 empty states.
const B4_WS = 'b4-ws';
const B4_ROLES_WS = 'b4-roles-ws';
const UID_B4ADMIN = 'test-b4admin';
const EMAIL_B4ADMIN = 'b4admin@test.local';
const UID_B4SCOUT = 'test-b4scout';
const EMAIL_B4SCOUT = 'b4scout@test.local';
const UID_B4PLAYER = 'test-b4player';
const EMAIL_B4PLAYER = 'b4player@test.local';
const LAYOUT = 'lay-demo';
const TRN = 'trn-demo';
// ITEM-1 drawing unify — a tournament tactic carrying LEGACY points-only
// freehandStrokes (`{"0":[{x,y},...]}`, the bespoke pre-unify shape). The
// TacticPage normalizer must wrap these as canonical {color,size,pts} so the
// drawing survives the shared-stack swap (no data loss on the page render).
const TACTIC_LEGACY = 'tac-legacy';
const MATCH = 'mat-demo';     // #2 single-coach log-a-point
const MATCH_CC = 'mat-cc';    // #1 two-coach concurrent + merge (isolated)
// § 112 Hitability responsive — dedicated training + config node/target ids.
const TRN_HIT = 'trn-hit';
const HIT_POS = 'pos-1';
const HIT_TGT = 'tgt-A';
// Isolated marker-delete fixture (own layout so the destructive delete spec never
// mutates TRN_HIT's shared, layout-keyed hitability config — §C, shared-state rule).
const TRN_HIT_DEL = 'trn-hit-del';
const LAYOUT_HIT_DEL = 'lay-hit-del';
// Isolated marker-popup fixture (STEP 2 — the popup spec renames/recolors the
// config + creates the link itself, so it gets its own layout; NO seeded link).
const TRN_HIT_POP = 'trn-hit-pop';
const LAYOUT_HIT_POP = 'lay-hit-pop';
// Isolated track-mode per-target-shots fixture (own layout — the spec records a
// hit then long-presses the target to list+delete it; net-zero but isolated so a
// mid-test failure never strands a hit on a shared config — §C shared-state rule).
const TRN_HIT_TRACK = 'trn-hit-track';
const LAYOUT_HIT_TRACK = 'lay-hit-track';
const TEAM_A = 'team-a';
const TEAM_B = 'team-b';
// Invite-isolation guards (Stage 4): two OUTSIDERS (not members of demo-ws) +
// seeded invite tokens (valid + expired) for demo-ws, role scout.
const UID_NEW1 = 'test-newcomer-1';
const EMAIL_NEW1 = 'newcomer1@test.local';
const UID_NEW2 = 'test-newcomer-2';
const EMAIL_NEW2 = 'newcomer2@test.local';
const INVITE_VALID = 'validtokenseeded01';
const INVITE_EXPIRED = 'expiredtokenseeded01';
// § 96 layout-globalization (Stage 4): a platform super_admin (globalRole, NOT a
// demo-ws member) + a global base layout + a demo-ws overlay referencing it.
const UID_SUPER = 'test-super';
const EMAIL_SUPER = 'super@test.local';
const BASE_LAYOUT = 'base-demo';
// Admin-UI <Screen>-migration harness: super's OWN isolated workspace so the app
// shell renders (membership-gated). Separate from demo-ws — non-member invariant holds.
const ADMIN_WS = 'admin-ws';
// Maks pending-gate repro (CC_BRIEF Maks permission-gate): a PENDING member —
// in members[] + pendingApprovals, userRoles[uid]=[] (no role) → hits the
// "poczekaj aż admin" gate. linkSkippedAt so onboarding doesn't interpose first.
// admin = super (grants via isSuperAdmin, no membership needed). Isolated ws.
const UID_PENDING = 'test-pending';
const EMAIL_PENDING = 'pending@test.local';
const PENDING_WS = 'pending-ws';
// Role source-of-truth strand (2026-06-15): a member of TWO workspaces — one
// where userRoles[uid] is still EMPTY (slug sorts FIRST, so it is docs[0] for the
// array-contains query), and one where the admin already granted roles (slug
// sorts later). users/{uid}.roles empty, defaultWorkspace null, linkSkippedAt set
// — the exact ranger1996 live shape. The old auto-enter picked docs[0] (empty) →
// PendingApproval even though the granted ws held the roles; the fix enters the
// role-bearing ws (userRoles authoritative for entry, not just for the gate).
const UID_SPLIT = 'test-split';
const EMAIL_SPLIT = 'split@test.local';
const WS_SPLIT_EMPTY = 'split-aaa-empty-ws';  // sorts first → old code's docs[0]
const WS_SPLIT_ROLES = 'split-zzz-roles-ws';  // holds the granted roles
// Invite register-flow repro (Maks #3): a seeded UNREDEEMED invite + its target
// workspace, so an e2e can open #/invite/{token} → "Załóż konto" → register and
// verify the new account gets ASSOCIATED (members + role), not stranded on
// NoWorkspaceScreen. The registered account's email is deleted each seed run.
const INVITE_WS = 'invite-ws';
const INVITE_SIGNUP_TOKEN = 'invitetokenseededsignup01';
const INVITE_SIGNUP_EMAIL = 'invite-signup@test.local';
// Email-keyed self-claim repro (durable invite, no backend): a user with NO
// membership + NO invite token, but a PENDING invites/{email} → on login the app
// self-claims membership purely from the email. claimee carries linkSkippedAt so
// post-claim they land in the app (nav-ball), not the onboarding gate.
const UID_CLAIMEE = 'test-claimee';
const EMAIL_CLAIMEE = 'claimee@test.local';
const CLAIM_WS = 'claim-ws';
// Bulk email-invite proof (STEP 3, 2026-06-15): TWO invitees with PENDING invites
// to a shared workspace both self-claim on login — proves the multi-account
// activation window (the class that stranded Maks + 3) doesn't cross-contaminate.
// emailVerified + linkSkippedAt so they land in the app (nav-ball), like claimee.
const BULK_WS = 'bulk-ws';
const UID_BULK1 = 'test-bulk1';
const EMAIL_BULK1 = 'bulk1@test.local';
const UID_BULK2 = 'test-bulk2';
const EMAIL_BULK2 = 'bulk2@test.local';
// Already-member self-claim (2026-06-15, biuro repro): a member of a ws with EMPTY
// roles (the old pending-approval state) who ALSO has a PENDING email-invite for
// that ws. On login the self-claim must GRANT the invited role even though they're
// already in members[] (the old rule's `!(uid in members)` denied this → biuro
// stranded). emailVerified + linkSkippedAt so post-claim they reach the app.
const PCLAIM_WS = 'pclaim-ws';
const UID_PCLAIM = 'test-pclaim';
const EMAIL_PCLAIM = 'pclaim@test.local';
// §85 player self-edit (2026-06-15, Maks repro): a non-super player linked to a
// player they own (via membership) edits their roster identity via /profile. The
// REAL path (updatePlayer) bumps the super-only /meta catalogVersion — that bump
// must be best-effort so a non-super self-edit doesn't throw "can't save". Isolated
// ws + dedicated linked player so no other spec is touched.
const SELFEDIT_WS = 'selfedit-ws';
const UID_SELFEDIT = 'test-selfedit';
const EMAIL_SELFEDIT = 'selfedit@test.local';
const PLAYER_SELFEDIT = 'p-selfedit';
// A3 regression — a plain coach member (not adminUid, not super) used ONLY by the
// self-leave spec (so removing them never affects other specs).
const UID_LEAVER = 'test-leaver';
const EMAIL_LEAVER = 'leaver@test.local';
// § read-volume C 2 (CG tenant-isolation gate): a SECOND tenant + a member of
// ONLY that tenant. Proves selfReports/shots CG rules isolate cross-tenant and
// that the shots playerLinkedUid carve-out lets a player read their OWN self-log
// shots even in a workspace they're not a member of.
const OTHER_WS = 'other-ws';
const UID_OTHER = 'test-other';
const EMAIL_OTHER = 'other@test.local';
const TRN_OTHER = 'trn-other';
// §C nav drawer — ISOLATED fixtures (own workspaces, never mutate demo-ws):
//   - test-nav: member of TWO workspaces (nav-ws-1 admin+coach, nav-ws-2 coach)
//     → the drawer's workspace-switcher row must render (>1 membership).
//   - test-viewer: viewer-only in nav-ws-1 → zero content tabs → §C4 terminal
//     workspace-summary home. Both carry linkSkippedAt so the PBLeagues
//     onboarding gate never interposes (deterministic specs).
const UID_NAV = 'test-nav';
const EMAIL_NAV = 'nav@test.local';
const UID_VIEWER = 'test-viewer';
const EMAIL_VIEWER = 'viewer@test.local';
const NAV_WS_1 = 'nav-ws-1';
const NAV_WS_2 = 'nav-ws-2';
const now = Date.now();

// UAT #4/#5/#6 (additive): a 2nd division team (Charlie, DIV1) + a cross-division
// bloated scouted doc + dedicated matches for stats + offline-sync.
const TEAM_C = 'team-c';
const SCT_BLEED = 'sct-bleed';
const MATCH_STATS = 'mat-stats';
const MATCH_OFFLINE = 'mat-offline';
const MATCH_PSTATS = 'mat-pstats';   // PlayerStats landscape-hero e2e (Stage 4.1)
const TRN_PSTATS = 'trn-pstats';     // dedicated tournament on the base layout (with fieldImage)
const TRN_PHASE = 'trn-phase';       // §B phase-view fixture (timeline-bearing points)
const MATCH_PHASE = 'mat-phase';
// Post-night STEP 3 — a TRAINING + matchup on the base layout (fieldImage →
// landscape rail renders), so the rail-compact scoreboard shows the training
// "Quick ›" CTA (valid in training, removed only in tournaments). Isolated.
const TRN_TRAIN_REVIEW = 'trn-train-review';
const MATCHUP_REVIEW = 'matchup-review';
// A 160×100 (16:10) SVG field image — non-degenerate aspect so BaseCanvas's
// fit-sizing renders a real <canvas> (the PlayerStats breakout-heatmap HERO).
const DEMO_FIELD_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100'%3E%3Crect width='160' height='100' fill='%230a1410'/%3E%3C/svg%3E";

const playersFor = (team, prefix, teamId) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    name: `${team} Player ${i + 1}`,
    number: String(i + 1),
    teamId: teamId || (team === 'A' ? TEAM_A : TEAM_B),
    ownerWorkspaceId: WS,
  }));
const rosterA = playersFor('A', 'pa');
const rosterB = playersFor('B', 'pb');
const rosterC = playersFor('C', 'pc', TEAM_C);   // DIV1 players (cross-division bleed source for #4)
// Pagination fixture (admin-pagination.spec): 40 padding players push the GLOBAL
// /players pool past AdminPlayersPage's PAGE_SIZE (50) → totalPages > 1 so the
// "Strona N z M" pager renders (the crash class was unreachable in e2e at 15).
// teamId:null keeps them OFF every team/roster-scoped view — they surface ONLY in
// the two unfiltered global lists (PlayersPage + AdminPlayersPage), bounding blast
// radius to those baselines. 15 + 40 = 55 → 2 pages (50 + 5).
const rosterPad = Array.from({ length: 40 }, (_, i) => ({
  id: `pad${i + 1}`,
  name: `Pad Player ${String(i + 1).padStart(2, '0')}`,
  number: String(100 + i),
  teamId: null,
  ownerWorkspaceId: WS,
}));

async function main() {
  // 1. Auth users (delete-then-create for idempotency).
  for (const uid of [UID, UID2, UID3, UID_NEW1, UID_NEW2, UID_SUPER, UID_LEAVER, UID_OTHER, UID_B4ADMIN, UID_B4SCOUT, UID_B4PLAYER, UID_NAV, UID_VIEWER, UID_PENDING, UID_SPLIT, UID_CLAIMEE, UID_BULK1, UID_BULK2, UID_PCLAIM, UID_SELFEDIT]) { try { await auth.deleteUser(uid); } catch (_) { /* not present */ } }
  await auth.createUser({ uid: UID, email: EMAIL, password: PASSWORD, displayName: 'Test Coach', emailVerified: true });
  await auth.createUser({ uid: UID2, email: EMAIL2, password: PASSWORD, displayName: 'Test Coach 2', emailVerified: true });
  await auth.createUser({ uid: UID3, email: EMAIL3, password: PASSWORD, displayName: 'Test Coach 3', emailVerified: true });
  // Outsiders — NO /users doc, NO membership (used to prove isolation + redeem).
  await auth.createUser({ uid: UID_NEW1, email: EMAIL_NEW1, password: PASSWORD, displayName: 'Newcomer 1', emailVerified: true });
  await auth.createUser({ uid: UID_NEW2, email: EMAIL_NEW2, password: PASSWORD, displayName: 'Newcomer 2', emailVerified: true });
  // Platform super_admin — NOT a demo-ws member (proves base writes ride
  // globalRole, not workspace membership).
  await auth.createUser({ uid: UID_SUPER, email: EMAIL_SUPER, password: PASSWORD, displayName: 'Super Admin', emailVerified: true });
  await auth.createUser({ uid: UID_PENDING, email: EMAIL_PENDING, password: PASSWORD, displayName: 'Pending User', emailVerified: true });
  // Role source-of-truth strand — member of two workspaces (empty-roles + granted).
  await auth.createUser({ uid: UID_SPLIT, email: EMAIL_SPLIT, password: PASSWORD, displayName: 'Split Member', emailVerified: true });
  // Invite register-flow repro — the e2e REGISTERS this email; delete any prior
  // run's account (uid is random, so delete by email) for idempotency.
  try { const u = await auth.getUserByEmail(INVITE_SIGNUP_EMAIL); await auth.deleteUser(u.uid); } catch (_) { /* not present */ }
  // Email-link e2e creates this account via signInWithEmailLink — delete by email.
  try { const u = await auth.getUserByEmail('newinvite@test.local'); await auth.deleteUser(u.uid); } catch (_) { /* not present */ }
  await auth.createUser({ uid: UID_CLAIMEE, email: EMAIL_CLAIMEE, password: PASSWORD, displayName: 'Claimee', emailVerified: true });
  // Bulk email-invite proof — two verified invitees, no membership yet.
  await auth.createUser({ uid: UID_BULK1, email: EMAIL_BULK1, password: PASSWORD, displayName: 'Bulk One', emailVerified: true });
  await auth.createUser({ uid: UID_BULK2, email: EMAIL_BULK2, password: PASSWORD, displayName: 'Bulk Two', emailVerified: true });
  // Already-member self-claim (biuro repro) — verified, member with empty roles.
  await auth.createUser({ uid: UID_PCLAIM, email: EMAIL_PCLAIM, password: PASSWORD, displayName: 'Pending Claim', emailVerified: true });
  // §85 player self-edit — non-super player linked to their own roster player.
  await auth.createUser({ uid: UID_SELFEDIT, email: EMAIL_SELFEDIT, password: PASSWORD, displayName: 'Self Edit', emailVerified: true });
  // A3 self-leave regression — a plain coach member.
  await auth.createUser({ uid: UID_LEAVER, email: EMAIL_LEAVER, password: PASSWORD, displayName: 'Leaver', emailVerified: true });
  // § read-volume C 2 — second-tenant member (other-ws only).
  await auth.createUser({ uid: UID_OTHER, email: EMAIL_OTHER, password: PASSWORD, displayName: 'Other Tenant', emailVerified: true });
  // B4 role-aware home — fresh-workspace fixtures.
  await auth.createUser({ uid: UID_B4ADMIN, email: EMAIL_B4ADMIN, password: PASSWORD, displayName: 'B4 Admin', emailVerified: true });
  await auth.createUser({ uid: UID_B4SCOUT, email: EMAIL_B4SCOUT, password: PASSWORD, displayName: 'B4 Scout', emailVerified: true });
  await auth.createUser({ uid: UID_B4PLAYER, email: EMAIL_B4PLAYER, password: PASSWORD, displayName: 'B4 Player', emailVerified: true });
  // §C nav drawer — multi-workspace member + viewer-only member.
  await auth.createUser({ uid: UID_NAV, email: EMAIL_NAV, password: PASSWORD, displayName: 'Nav Multi', emailVerified: true });
  await auth.createUser({ uid: UID_VIEWER, email: EMAIL_VIEWER, password: PASSWORD, displayName: 'Nav Viewer', emailVerified: true });

  const batch = db.batch();

  // 2. User profiles — defaultWorkspace drives WorkspaceProvider auto-entry.
  batch.set(db.doc(`users/${UID}`), {
    email: EMAIL, displayName: 'Test Coach', defaultWorkspace: WS, createdAt: now,
  });
  batch.set(db.doc(`users/${UID2}`), {
    email: EMAIL2, displayName: 'Test Coach 2', defaultWorkspace: WS, createdAt: now,
  });
  // Coach #3 — NO defaultWorkspace (regression class). Membership is the only
  // signal that they belong to demo-ws.
  batch.set(db.doc(`users/${UID3}`), {
    email: EMAIL3, displayName: 'Test Coach 3', createdAt: now,
  });
  // Super admin — globalRole drives isSuperAdmin() in rules (no demo-ws
  // membership; layout-globalization proves base writes ride globalRole). The
  // admin-UI <Screen>-migration harness needs the app shell to render, which is
  // gated on workspace membership, so super also owns an ISOLATED single-member
  // workspace (admin-ws) + defaultWorkspace for auto-entry. This is a SEPARATE
  // workspace — the "not a demo-ws member" invariant above is untouched.
  // linkSkippedAt so the PBLeagues onboarding gate never interposes.
  batch.set(db.doc(`users/${UID_SUPER}`), {
    email: EMAIL_SUPER, displayName: 'Super Admin', globalRole: 'super_admin',
    // FIXED createdAt (not `now`): UserDetailPage renders "Dołączył {createdAt}",
    // and the migration-diff gate reseeds per run — a live `now` would change that
    // row every run → flaky pixel diff. Fixed epoch keeps user-detail deterministic.
    defaultWorkspace: ADMIN_WS, linkSkippedAt: now, createdAt: 1700000000000,
  });
  // Maks pending-gate repro — pending member's /users doc. linkSkippedAt so the
  // PBLeagues onboarding gate doesn't interpose before the pending-approval gate.
  batch.set(db.doc(`users/${UID_PENDING}`), {
    email: EMAIL_PENDING, displayName: 'Pending User', defaultWorkspace: PENDING_WS,
    linkSkippedAt: now, createdAt: now,
  });
  // Role source-of-truth strand — roles EMPTY on /users, defaultWorkspace null
  // (omitted), linkSkippedAt set (profile-link skipped). The authoritative roles
  // live in WS_SPLIT_ROLES.userRoles; the gate + auto-enter must read THAT, not
  // users/{uid}.roles. Mirrors getOrCreateUserProfile's non-bootstrap default.
  batch.set(db.doc(`users/${UID_SPLIT}`), {
    email: EMAIL_SPLIT, displayName: 'Split Member', roles: [], linkSkippedAt: now, createdAt: now,
  });
  // Email-keyed self-claim repro — claimee has NO defaultWorkspace + NO membership.
  batch.set(db.doc(`users/${UID_CLAIMEE}`), {
    email: EMAIL_CLAIMEE, displayName: 'Claimee', linkSkippedAt: now, createdAt: now,
  });
  // Already-member self-claim (biuro repro) — empty roles on /users, linkSkippedAt
  // so the gate skips onboarding and lands on the pending-approval branch UNTIL the
  // self-claim grants the role from the pending email-invite.
  batch.set(db.doc(`users/${UID_PCLAIM}`), {
    email: EMAIL_PCLAIM, displayName: 'Pending Claim', roles: [], defaultWorkspace: PCLAIM_WS, linkSkippedAt: now, createdAt: now,
  });
  // §85 player self-edit — linked player; defaultWorkspace=SELFEDIT_WS for auto-entry.
  batch.set(db.doc(`users/${UID_SELFEDIT}`), {
    email: EMAIL_SELFEDIT, displayName: 'Self Edit', roles: [], defaultWorkspace: SELFEDIT_WS, linkSkippedAt: now, createdAt: now,
  });
  // Bulk email-invite proof — verified invitees, linkSkippedAt so they land in the
  // app (nav-ball) post-claim. No defaultWorkspace, roles empty (claim writes ws.userRoles).
  batch.set(db.doc(`users/${UID_BULK1}`), {
    email: EMAIL_BULK1, displayName: 'Bulk One', roles: [], linkSkippedAt: now, createdAt: now,
  });
  batch.set(db.doc(`users/${UID_BULK2}`), {
    email: EMAIL_BULK2, displayName: 'Bulk Two', roles: [], linkSkippedAt: now, createdAt: now,
  });
  // A3 leaver — /users doc (leaveWorkspaceSelf reads it for the super-admin guard).
  batch.set(db.doc(`users/${UID_LEAVER}`), {
    email: EMAIL_LEAVER, displayName: 'Leaver', defaultWorkspace: WS, createdAt: now,
  });
  // § read-volume C 2 — second-tenant member.
  batch.set(db.doc(`users/${UID_OTHER}`), {
    email: EMAIL_OTHER, displayName: 'Other Tenant', defaultWorkspace: OTHER_WS, createdAt: now,
  });
  // B4 — fresh-workspace fixtures.
  batch.set(db.doc(`users/${UID_B4ADMIN}`), {
    email: EMAIL_B4ADMIN, displayName: 'B4 Admin', defaultWorkspace: B4_WS, createdAt: now,
  });
  batch.set(db.doc(`users/${UID_B4SCOUT}`), {
    email: EMAIL_B4SCOUT, displayName: 'B4 Scout', defaultWorkspace: B4_ROLES_WS, roles: ['scout'], createdAt: now,
  });
  batch.set(db.doc(`users/${UID_B4PLAYER}`), {
    email: EMAIL_B4PLAYER, displayName: 'B4 Player', defaultWorkspace: B4_ROLES_WS, roles: ['player'], createdAt: now,
  });
  // §C nav drawer — linkSkippedAt pre-set: these specs exercise nav chrome,
  // not the PBLeagues onboarding flow (which would otherwise gate non-admins).
  batch.set(db.doc(`users/${UID_NAV}`), {
    email: EMAIL_NAV, displayName: 'Nav Multi', defaultWorkspace: NAV_WS_1, linkSkippedAt: now, createdAt: now,
  });
  batch.set(db.doc(`users/${UID_VIEWER}`), {
    email: EMAIL_VIEWER, displayName: 'Nav Viewer', defaultWorkspace: NAV_WS_1, linkSkippedAt: now, createdAt: now,
  });

  // 3. Workspace — both coaches are members + admin + coach (admin bypasses the
  //    onboarding/pending AuthGate so login lands straight in the app).
  batch.set(db.doc(`workspaces/${WS}`), {
    name: 'Demo Workspace',
    members: [UID, UID2, UID3, UID_LEAVER],
    userRoles: { [UID]: ['admin', 'coach'], [UID2]: ['admin', 'coach'], [UID3]: ['admin', 'coach'], [UID_LEAVER]: ['coach'] },
    adminUid: UID,
    rolesVersion: 2,
    // ReviewRolesModal (§49 migration nudge) pre-dismissed: rolesVersion 2
    // without this stamp full-screen-scrims EVERY admin session, and UI specs
    // only survived it incidentally (coordinate mouse.clicks landing on the
    // scrim). Seeded as already-reviewed — the nudge is not under test here
    // (b4-ws keeps the live nudge; b4-home.spec exercises the dismissal).
    migrationReviewedAt: admin.firestore.Timestamp.now(),
    createdAt: now,
    // Fresh Timestamp (real Timestamp, not the numeric `now`) so the auto-enter
    // throttle (skip lastAccess write if <24h old) engages deterministically for
    // the existing-member read-only-cold-load spec (auto-enter-nonblocking).
    lastAccess: admin.firestore.Timestamp.now(),
  });

  // 3b. § read-volume C 2 — second tenant (other-ws). UID_OTHER is its ONLY
  //     member; test-coach is NOT a member here (and vice-versa). The CG
  //     isolation matrix reads across the two.
  batch.set(db.doc(`workspaces/${OTHER_WS}`), {
    name: 'Other Workspace',
    members: [UID_OTHER],
    userRoles: { [UID_OTHER]: ['admin', 'coach'] },
    adminUid: UID_OTHER,
    rolesVersion: 2,
    createdAt: now,
  });

  // 3c. B4 — FRESH workspaces: NO tournaments/trainings, NO layout overlays.
  //     b4-ws: admin is the ONLY member → all 3 checklist signals false (1/5).
  //     b4-roles-ws: scout + player members for their B4 empty states.
  batch.set(db.doc(`workspaces/${B4_WS}`), {
    name: 'B4 Fresh',
    members: [UID_B4ADMIN],
    userRoles: { [UID_B4ADMIN]: ['admin', 'coach'] },
    adminUid: UID_B4ADMIN,
    rolesVersion: 2,
    createdAt: now,
  });
  batch.set(db.doc(`workspaces/${B4_ROLES_WS}`), {
    name: 'B4 Roles',
    members: [UID_B4ADMIN, UID_B4SCOUT, UID_B4PLAYER],
    userRoles: { [UID_B4ADMIN]: ['admin', 'coach'], [UID_B4SCOUT]: ['scout'], [UID_B4PLAYER]: ['player'] },
    adminUid: UID_B4ADMIN,
    rolesVersion: 2,
    createdAt: now,
  });

  // 3d. §C nav drawer — two isolated workspaces. test-nav belongs to BOTH
  //     (switcher row must render); test-viewer is viewer-only in nav-ws-1
  //     (zero content tabs → §C4 terminal home).
  batch.set(db.doc(`workspaces/${NAV_WS_1}`), {
    name: 'Nav One',
    members: [UID_NAV, UID_VIEWER],
    userRoles: { [UID_NAV]: ['admin', 'coach'], [UID_VIEWER]: ['viewer'] },
    adminUid: UID_NAV,
    rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(), // nudge not under test
    createdAt: now,
  });
  batch.set(db.doc(`workspaces/${NAV_WS_2}`), {
    name: 'Nav Two',
    members: [UID_NAV],
    userRoles: { [UID_NAV]: ['coach'] },
    adminUid: UID_NAV,
    rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(), // nudge not under test
    createdAt: now,
  });

  // 3e. Admin-UI harness — super's isolated single-member workspace. Lets the
  //     app shell render so /admin/* pages (global collections) are reachable in
  //     the e2e <Screen>-migration pixel gate. super is admin → bypasses onboarding.
  batch.set(db.doc(`workspaces/${ADMIN_WS}`), {
    name: 'Admin WS',
    members: [UID_SUPER],
    userRoles: { [UID_SUPER]: ['admin', 'coach'] },
    adminUid: UID_SUPER,
    rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(), // nudge not under test
    createdAt: now,
  });

  // 3f. Maks pending-gate repro — pending member is in members[] + pendingApprovals
  //     with an EMPTY role array (→ isPendingApproval true → "poczekaj aż admin").
  //     adminUid = super (grants the role in the e2e via isSuperAdmin, no membership
  //     needed). userRoles[uid]=[] (defined-but-empty) lands the EXISTING-MEMBER
  //     auto-enter path → pending gate, no first-ever membership write.
  batch.set(db.doc(`workspaces/${PENDING_WS}`), {
    name: 'Pending WS',
    members: [UID_PENDING],
    userRoles: { [UID_PENDING]: [] },
    pendingApprovals: [UID_PENDING],
    adminUid: UID_SUPER,
    rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(),
    createdAt: now,
  });

  // Role source-of-truth strand — member of BOTH. The empty-roles ws sorts FIRST
  // by slug (split-aaa-…) so it is docs[0] for the array-contains query (what the
  // old auto-enter wrongly entered → PendingApproval); the role-bearing ws sorts
  // later (split-zzz-…). The fix enters the one where userRoles[uid] is non-empty.
  batch.set(db.doc(`workspaces/${WS_SPLIT_EMPTY}`), {
    name: 'Split Empty WS', members: [UID_SPLIT], userRoles: { [UID_SPLIT]: [] },
    pendingApprovals: [UID_SPLIT], adminUid: UID_SUPER, rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS_SPLIT_ROLES}`), {
    name: 'Split Roles WS', members: [UID_SPLIT],
    userRoles: { [UID_SPLIT]: ['coach', 'scout', 'player'] },
    adminUid: UID_SUPER, rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });

  // Invite register-flow repro — empty target workspace + an unredeemed invite.
  // members: [] (a list, so the invite-grant rule's `uid in members` is provable).
  batch.set(db.doc(`workspaces/${INVITE_WS}`), {
    name: 'Invite WS', members: [], userRoles: {}, adminUid: UID_SUPER,
    rolesVersion: 2, migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });
  batch.set(db.doc(`invites/${INVITE_SIGNUP_TOKEN}`), {
    workspaceSlug: INVITE_WS, role: 'coach', createdBy: UID_SUPER,
    createdAt: now, expiresAt: now + 365 * 24 * 60 * 60 * 1000,
    redeemedBy: null, redeemedAt: null,
  });

  // Email-keyed self-claim repro — empty target ws + a PENDING email-invite.
  batch.set(db.doc(`workspaces/${CLAIM_WS}`), {
    name: 'Claim WS', members: [], userRoles: {}, adminUid: UID_SUPER,
    rolesVersion: 2, migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });
  batch.set(db.doc(`invites/${EMAIL_CLAIMEE}`), {
    workspaceSlug: CLAIM_WS, role: 'coach', email: EMAIL_CLAIMEE,
    invitedBy: UID_SUPER, status: 'pending', createdAt: now,
  });
  // Already-member self-claim (biuro repro) — pclaim is in members[] with EMPTY
  // roles + in pendingApprovals (the old pending-approval state) AND has a PENDING
  // email-invite. The self-claim must grant the invited role despite membership.
  batch.set(db.doc(`workspaces/${PCLAIM_WS}`), {
    name: 'Pending Claim WS', members: [UID_PCLAIM], userRoles: { [UID_PCLAIM]: [] },
    pendingApprovals: [UID_PCLAIM], adminUid: UID_SUPER, rolesVersion: 2,
    migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });
  batch.set(db.doc(`invites/${EMAIL_PCLAIM}`), {
    workspaceSlug: PCLAIM_WS, role: 'coach', email: EMAIL_PCLAIM,
    invitedBy: UID_SUPER, status: 'pending', createdAt: now,
  });
  // §85 player self-edit — isolated ws (player role) + a global player owned by it
  // and linked to the user, so the §85 self-edit carve-out applies.
  batch.set(db.doc(`workspaces/${SELFEDIT_WS}`), {
    name: 'Self Edit WS', members: [UID_SELFEDIT], userRoles: { [UID_SELFEDIT]: ['player'] },
    adminUid: UID_SUPER, rolesVersion: 2, migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });
  batch.set(db.doc(`players/${PLAYER_SELFEDIT}`), {
    name: 'Self Edit', number: '199', teamId: null,
    ownerWorkspaceId: SELFEDIT_WS, linkedUid: UID_SELFEDIT,
  });
  // Bulk email-invite proof — shared target ws + two PENDING email-invites.
  batch.set(db.doc(`workspaces/${BULK_WS}`), {
    name: 'Bulk WS', members: [], userRoles: {}, adminUid: UID_SUPER,
    rolesVersion: 2, migrationReviewedAt: admin.firestore.Timestamp.now(), createdAt: now,
  });
  batch.set(db.doc(`invites/${EMAIL_BULK1}`), {
    workspaceSlug: BULK_WS, role: 'coach', email: EMAIL_BULK1,
    invitedBy: UID_SUPER, status: 'pending', createdAt: now,
  });
  batch.set(db.doc(`invites/${EMAIL_BULK2}`), {
    workspaceSlug: BULK_WS, role: 'scout', email: EMAIL_BULK2,
    invitedBy: UID_SUPER, status: 'pending', createdAt: now,
  });
  // Part 3 admin pending-invites view — a never-claimed email invite on ADMIN_WS
  // (super's own ws) so the e2e can assert the "Zaproszenia e-mail" list renders.
  batch.set(db.doc('invites/adminview@test.local'), {
    workspaceSlug: ADMIN_WS, role: 'scout', email: 'adminview@test.local',
    invitedBy: UID_SUPER, status: 'pending', createdAt: now,
  });

  // 4. Global teams + players (usePlayers/useTeams read global ∪ workspace).
  batch.set(db.doc(`teams/${TEAM_A}`), { name: 'Team Alpha', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'PRO' } });
  batch.set(db.doc(`teams/${TEAM_B}`), { name: 'Team Bravo', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'PRO' } });
  // #4 — Team Charlie in a DIFFERENT division (NXL/DIV1) to prove no bleed.
  batch.set(db.doc(`teams/${TEAM_C}`), { name: 'Team Charlie', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'DIV1' } });
  [...rosterA, ...rosterB, ...rosterC, ...rosterPad].forEach(p => {
    batch.set(db.doc(`players/${p.id}`), {
      name: p.name, number: p.number, teamId: p.teamId, ownerWorkspaceId: WS,
    });
  });

  // 5. Layout (minimal — name only; canvas renders an empty field).
  batch.set(db.doc(`workspaces/${WS}/layouts/${LAYOUT}`), { name: 'Demo Field', createdAt: now });

  // 5b. § 96 — global base layout (geometry) + demo-ws overlay (zones) that
  //     references it. Mirrors the post-migration shape (base id == overlay id).
  batch.set(db.doc(`layouts/${BASE_LAYOUT}`), {
    name: 'Library Field', league: 'NXL', year: 2026,
    bunkers: [{ id: 'b1', x: 0.5, y: 0.5, positionName: 'Center', type: 'can' }],
    // fieldImage set so a base-layout tournament (trn-pstats) renders the
    // PlayerStats breakout-heatmap HERO. useLayouts reads /layouts (base) + overlays,
    // NOT workspace /layouts — so the hero field must live on the BASE layout.
    fieldImage: DEMO_FIELD_IMG, discoLine: 0.30, zeekerLine: 0.80,
    mirrorMode: 'y', doritoSide: 'top', fieldCalibration: null, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/layoutOverlays/${BASE_LAYOUT}`), {
    baseLayoutId: BASE_LAYOUT, nameOverride: null,
    zones: [{ id: 'z1', name: 'Snake', type: 'snake', polygon: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.2, y: 0.2 }] }],
    dangerZone: null, sajgonZone: null, bigMoveZone: null, createdAt: now,
  });

  // 6. Tournament + scouted teams (rosters) + match.
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}`), {
    name: 'Demo Cup', eventType: 'tournament', league: 'NXL', year: 2026,
    division: 'PRO', status: 'active', layoutId: LAYOUT, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/scouted/${TEAM_A}`), {
    teamId: TEAM_A, name: 'Team Alpha', league: 'NXL', division: 'PRO', roster: rosterA.map(p => p.id),
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/scouted/${TEAM_B}`), {
    teamId: TEAM_B, name: 'Team Bravo', league: 'NXL', division: 'PRO', roster: rosterB.map(p => p.id),
  });
  // ITEM-1 — tactic with LEGACY points-only freehand (bespoke pre-unify shape).
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/tactics/${TACTIC_LEGACY}`), {
    name: 'Legacy Draw', players: [null, null, null, null, null],
    bumps: [null, null, null, null, null],
    runners: [false, false, false, false, false],
    freehandStrokes: { '0': [{ x: 0.2, y: 0.3 }, { x: 0.5, y: 0.4 }, { x: 0.7, y: 0.6 }] },
    createdAt: now,
  });
  // #4 — a scouted doc for Team Alpha (PRO) whose roster is BLOATED with DIV1
  // (Charlie) players → cross-division bleed. repairScoutedRostersForTournament
  // must narrow it back to PRO-only (rosterA), dropping the Charlie ids.
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/scouted/${SCT_BLEED}`), {
    teamId: TEAM_A, name: 'Team Alpha', league: 'NXL', division: 'PRO',
    roster: [...rosterA.map(p => p.id), ...rosterC.map(p => p.id)],
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now, createdAt: now,
  });
  // #1 keystone — separate match so the merge test is isolated from #2.
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH_CC}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now + 1, createdAt: now,
  });
  // #5 stats + #6 offline-sync — dedicated matches so point counts stay isolated.
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH_STATS}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now + 2, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH_OFFLINE}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now + 3, createdAt: now,
  });
  // PlayerStats HERO fixture (Stage 4.1) — a DEDICATED tournament on the BASE
  // layout (base-demo carries the fieldImage; useLayouts only resolves base+overlay
  // layouts) with a scouted Team Alpha + one heatmap-bearing point, so pa1's
  // PlayerStats renders the breakout heatmap. Isolated → no other spec affected.
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PSTATS}`), {
    name: 'Stats Cup', eventType: 'tournament', league: 'NXL', year: 2026,
    division: 'PRO', status: 'active', layoutId: BASE_LAYOUT, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PSTATS}/scouted/${TEAM_A}`), {
    teamId: TEAM_A, name: 'Team Alpha', league: 'NXL', division: 'PRO',
    roster: rosterA.map(p => p.id), createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PSTATS}/matches/${MATCH_PSTATS}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PSTATS}/matches/${MATCH_PSTATS}/points/pt-ps`), {
    order: now, createdAt: now, fieldSide: 'left', outcome: 'win_a',
    homeData: {
      players: [{ x: 0.4, y: 0.5 }, null, null, null, null],
      assignments: [rosterA[0].id, null, null, null, null],
      zoneShots: { 0: ['z1'] },
      bumpStops: [null, null, null, null, null],
      eliminations: [false, false, false, false, false],
      runners: [false, false, false, false, false],
      fieldSide: 'left',
    },
  });

  // Phase-view fixture (§B 2026-06-12) — DEDICATED tournament on the base
  // layout (fieldImage → landscape hero renders) with TWO points:
  //   pt-ph1 — full point.timeline[] (settle + mid keyframes, moved positions,
  //            per-stage quickShots) → phases playable, direction arrows render.
  //   pt-ph2 — keyframe #0 only (no timeline) → previewing it must DISABLE the
  //            Settle/Mid segments + play (scope rule B2).
  // Isolated: no other spec reads TRN_PHASE.
  const PH_SLOTS_H = ['ph-h1', 'ph-h2', 'ph-h3', 'ph-h4', 'ph-h5'];
  const PH_SLOTS_A = ['ph-a1', 'ph-a2', 'ph-a3', 'ph-a4', 'ph-a5'];
  const E5F = [false, false, false, false, false];
  const E5N = [null, null, null, null, null];
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PHASE}`), {
    name: 'Phase Cup', eventType: 'tournament', league: 'NXL', year: 2026,
    division: 'PRO', status: 'active', layoutId: BASE_LAYOUT, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PHASE}/scouted/${TEAM_A}`), {
    teamId: TEAM_A, name: 'Team Alpha', league: 'NXL', division: 'PRO',
    roster: rosterA.map(p => p.id), createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PHASE}/matches/${MATCH_PHASE}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PHASE}/matches/${MATCH_PHASE}/points/pt-ph1`), {
    order: now, createdAt: now, fieldSide: 'left', outcome: 'win_a', status: 'scouted',
    homeData: {
      players: [{ x: 0.25, y: 0.3 }, { x: 0.2, y: 0.7 }, null, null, null],
      assignments: [rosterA[0].id, rosterA[1].id, null, null, null],
      quickShots: { 0: ['snake'] },
      bumpStops: E5N, eliminations: E5F, runners: E5F,
      slotIds: PH_SLOTS_H, fieldSide: 'left',
    },
    awayData: {
      players: [{ x: 0.75, y: 0.4 }, null, null, null, null],
      assignments: E5N,
      quickShots: { 0: ['dorito'] },
      bumpStops: E5N, eliminations: E5F, runners: E5F,
      slotIds: PH_SLOTS_A, fieldSide: 'right',
    },
    timeline: [
      {
        seq: 1, stage: 'settle', annotations: {},
        home: {
          players: [{ x: 0.4, y: 0.35 }, { x: 0.3, y: 0.65 }, null, null, null],
          assignments: [rosterA[0].id, rosterA[1].id, null, null, null],
          quickShots: { 0: ['center'], 1: ['snake'] },
          bumpStops: E5N, eliminations: E5F, runners: E5F,
          slotIds: PH_SLOTS_H,
        },
        away: {
          players: [{ x: 0.6, y: 0.45 }, null, null, null, null],
          assignments: E5N,
          quickShots: { 0: ['snake'] },
          bumpStops: E5N, eliminations: E5F, runners: E5F,
          slotIds: PH_SLOTS_A,
        },
      },
      {
        seq: 2, stage: 'mid', annotations: {},
        home: {
          players: [{ x: 0.5, y: 0.5 }, { x: 0.35, y: 0.6 }, null, null, null],
          assignments: [rosterA[0].id, rosterA[1].id, null, null, null],
          quickShots: {},
          bumpStops: E5N, eliminations: [false, true, false, false, false], runners: E5F,
          slotIds: PH_SLOTS_H,
        },
        away: null,
      },
    ],
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN_PHASE}/matches/${MATCH_PHASE}/points/pt-ph2`), {
    order: now + 1, createdAt: now, fieldSide: 'left', outcome: 'win_b', status: 'scouted',
    homeData: {
      players: [{ x: 0.3, y: 0.5 }, null, null, null, null],
      assignments: [rosterA[0].id, null, null, null, null],
      bumpStops: E5N, eliminations: E5F, runners: E5F, fieldSide: 'left',
    },
  });

  // Post-night STEP 3 — training-matchup review fixture (base layout w/ fieldImage
  // → landscape rail; rail-compact scoreboard must show the training Quick › CTA).
  batch.set(db.doc(`workspaces/${WS}/trainings/${TRN_TRAIN_REVIEW}`), {
    name: 'Quick Review Training', eventType: 'training', layoutId: BASE_LAYOUT,
    teamId: TEAM_A, status: 'active', createdAt: now,
    squads: { red: rosterA.map(p => p.id), blue: rosterB.map(p => p.id) },
    squadNames: { red: 'Red Squad', blue: 'Blue Squad' },
  });
  batch.set(db.doc(`workspaces/${WS}/trainings/${TRN_TRAIN_REVIEW}/matchups/${MATCHUP_REVIEW}`), {
    homeSquad: 'red', awaySquad: 'blue',
    homeRoster: rosterA.map(p => p.id), awayRoster: rosterB.map(p => p.id),
    scoreA: 0, scoreB: 0, status: 'playing', order: now, createdAt: now,
  });

  // 7. Invite tokens (Stage 4) — admin-issued (createdBy = demo-ws admin UID).
  batch.set(db.doc(`invites/${INVITE_VALID}`), {
    workspaceSlug: WS, role: 'scout', createdBy: UID, createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000, redeemedBy: null, redeemedAt: null,
  });
  batch.set(db.doc(`invites/${INVITE_EXPIRED}`), {
    workspaceSlug: WS, role: 'scout', createdBy: UID, createdAt: now,
    expiresAt: now - 60 * 1000, redeemedBy: null, redeemedAt: null,
  });

  // 8. § read-volume C 2 — selfReports + shots CG fixtures for the isolation
  //    matrix. Flat selfReports (§ 90 path) carry workspaceSlug + trainingId;
  //    shots are nested under a point (CG rule matches any depth) and carry
  //    workspaceSlug + tournamentId + playerLinkedUid.
  //
  //    demo-ws: 2 selfReports (trn-demo) + 2 shots — one owned by test-coach
  //    (playerLinkedUid=UID), one owned by the OTHER tenant's player
  //    (playerLinkedUid=UID_OTHER) → the carve-out target: test-other must read
  //    THEIR OWN shot here despite not being a demo-ws member.
  batch.set(db.doc(`workspaces/${WS}/selfReports/sr-demo-1`), {
    workspaceSlug: WS, trainingId: TRN, layoutId: LAYOUT,
    breakout: { bunker: 'Snake' }, shots: [{ target: 'Dorito', result: 'hit' }],
    playerLinkedUid: UID, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/selfReports/sr-demo-2`), {
    workspaceSlug: WS, trainingId: TRN, layoutId: LAYOUT,
    breakout: { bunker: 'Dorito' }, shots: [{ target: 'Snake', result: 'miss' }],
    playerLinkedUid: UID, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH}/points/pt-sl/shots/sh-demo-coach`), {
    workspaceSlug: WS, tournamentId: TRN, playerId: 'pa1', playerLinkedUid: UID,
    source: 'self', breakout: 'Snake', target: 'Dorito', result: 'hit', createdAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH}/points/pt-sl/shots/sh-demo-other`), {
    workspaceSlug: WS, tournamentId: TRN, playerId: 'pa2', playerLinkedUid: UID_OTHER,
    source: 'self', breakout: 'Dorito', target: 'Snake', result: 'miss', createdAt: now,
  });

  //    other-ws: 1 selfReport + 1 shot (both owned by UID_OTHER) — the
  //    cross-tenant target a demo-ws member must NOT be able to sweep.
  batch.set(db.doc(`workspaces/${OTHER_WS}/selfReports/sr-other-1`), {
    workspaceSlug: OTHER_WS, trainingId: TRN_OTHER, layoutId: LAYOUT,
    breakout: { bunker: 'Snake' }, shots: [{ target: 'Dorito', result: 'hit' }],
    playerLinkedUid: UID_OTHER, createdAt: now,
  });
  batch.set(db.doc(`workspaces/${OTHER_WS}/tournaments/${TRN_OTHER}/matches/m-other/points/pt-o/shots/sh-other`), {
    workspaceSlug: OTHER_WS, tournamentId: TRN_OTHER, playerId: 'px1', playerLinkedUid: UID_OTHER,
    source: 'self', breakout: 'Snake', target: 'Dorito', result: 'hit', createdAt: now,
  });

  // § 112 Hitability responsive — a TRAINING doc (useTrainings reads the
  // `trainings` subcollection; the tournament above is NOT returned there) +
  // a hitability config under the layout overlay: ONE target linked to ONE
  // position, so a track-mode tap on the target auto-attributes (count == taps,
  // no chooser) → deterministic coordinate-across-orientation assertions.
  batch.set(db.doc(`workspaces/${WS}/trainings/${TRN_HIT}`), {
    type: 'training', name: 'Hitability Demo', layoutId: LAYOUT,
    status: 'open', attendees: [], squads: {}, createdAt: now, updatedAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/layoutOverlays/${LAYOUT}/hitability/config`), {
    players: [{ id: HIT_POS, x: 0.3, y: 0.5, color: '#22d3ee', label: '1' }],
    targets: [{ id: HIT_TGT, x: 0.7, y: 0.5, label: 'A' }],
    links: [{ playerId: HIT_POS, targetId: HIT_TGT }],
    updatedAt: now,
  });

  // § C Hitability marker-delete — ISOLATED fixture on its OWN layout so the
  // destructive spec (record hit → delete target ⇒ confirm ⇒ cascade) never
  // touches TRN_HIT's shared config (config is keyed by LAYOUT). Same one
  // target + one position + link so a track tap auto-attributes (count == taps).
  batch.set(db.doc(`workspaces/${WS}/trainings/${TRN_HIT_DEL}`), {
    type: 'training', name: 'Hitability Delete', layoutId: LAYOUT_HIT_DEL,
    status: 'open', attendees: [], squads: {}, createdAt: now, updatedAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/layoutOverlays/${LAYOUT_HIT_DEL}/hitability/config`), {
    players: [{ id: HIT_POS, x: 0.3, y: 0.5, color: '#22d3ee', label: '1' }],
    targets: [{ id: HIT_TGT, x: 0.7, y: 0.5, label: 'A' }],
    links: [{ playerId: HIT_POS, targetId: HIT_TGT }],
    updatedAt: now,
  });

  // Track-mode per-target-shots fixture — own layout; one position + one target
  // + link so a track tap auto-attributes (count == taps). The spec records a
  // hit, long-presses the target → per-target shot sheet → deletes it.
  batch.set(db.doc(`workspaces/${WS}/trainings/${TRN_HIT_TRACK}`), {
    type: 'training', name: 'Hitability Track', layoutId: LAYOUT_HIT_TRACK,
    status: 'open', attendees: [], squads: {}, createdAt: now, updatedAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/layoutOverlays/${LAYOUT_HIT_TRACK}/hitability/config`), {
    players: [{ id: HIT_POS, x: 0.3, y: 0.5, color: '#22d3ee', label: '1' }],
    targets: [{ id: HIT_TGT, x: 0.7, y: 0.5, label: 'A' }],
    links: [{ playerId: HIT_POS, targetId: HIT_TGT }],
    updatedAt: now,
  });

  // STEP 2 marker-popup fixture — own layout (the spec renames a marker AND
  // creates the first link via plain taps, so it must never touch the shared
  // TRN_HIT config). NO seeded link: the plain-tap regression test creates it.
  batch.set(db.doc(`workspaces/${WS}/trainings/${TRN_HIT_POP}`), {
    type: 'training', name: 'Hitability Popup', layoutId: LAYOUT_HIT_POP,
    status: 'open', attendees: [], squads: {}, createdAt: now, updatedAt: now,
  });
  batch.set(db.doc(`workspaces/${WS}/layoutOverlays/${LAYOUT_HIT_POP}/hitability/config`), {
    players: [{ id: HIT_POS, x: 0.3, y: 0.5, color: '#22d3ee', label: '1' }],
    targets: [{ id: HIT_TGT, x: 0.7, y: 0.5, label: 'A' }],
    links: [],
    updatedAt: now,
  });

  await batch.commit();
  console.log(`✅ Seeded emulator project '${PROJECT_ID}': user ${EMAIL}, workspace ${WS}, tournament ${TRN}, match ${MATCH}.`);
  process.exit(0);
}

main().catch(e => { console.error('SEED FAILED:', e); process.exit(1); });
