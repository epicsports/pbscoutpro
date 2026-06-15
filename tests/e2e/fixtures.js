// Shared fixture constants for the emulator e2e suite.
// KEEP IN SYNC with scripts/test/seed-emulator.cjs.

export const TEST_ACCOUNT = { email: 'coach@test.local', password: 'test1234' };
export const TEST_ACCOUNT_2 = { email: 'coach2@test.local', password: 'test1234' };
// Member of demo-ws but NO explicit defaultWorkspace (regression guard for 5f69dc04).
export const TEST_ACCOUNT_3 = { email: 'coach3@test.local', password: 'test1234' };

export const UID = 'test-coach';
export const UID2 = 'test-coach-2';
export const UID3 = 'test-coach-3';

// Invite-isolation (Stage 4): outsiders (no membership) + seeded tokens.
export const NEWCOMER_1 = { email: 'newcomer1@test.local', password: 'test1234' };
export const NEWCOMER_2 = { email: 'newcomer2@test.local', password: 'test1234' };
export const INVITE_VALID = 'validtokenseeded01';
export const INVITE_EXPIRED = 'expiredtokenseeded01';

// § 96 layout-globalization (Stage 4): a platform super_admin (NOT a member) +
// a seeded global base layout with a demo-ws overlay.
export const SUPER_ACCOUNT = { email: 'super@test.local', password: 'test1234' };
export const UID_SUPER = 'test-super';
export const BASE_LAYOUT = 'base-demo';

// Maks pending-gate repro: a PENDING member (in members[], empty roles) of an
// isolated workspace whose admin is super (grants the role in-test).
export const PENDING_ACCOUNT = { email: 'pending@test.local', password: 'test1234' };
export const UID_PENDING = 'test-pending';
export const PENDING_WS = 'pending-ws';

// Invite register-flow repro (Maks #3): an unredeemed invite + its target ws.
// The e2e registers INVITE_SIGNUP_EMAIL (deleted each seed run for idempotency).
export const INVITE_WS = 'invite-ws';
export const INVITE_SIGNUP_TOKEN = 'invitetokenseededsignup01';
export const INVITE_SIGNUP_EMAIL = 'invite-signup@test.local';

// Email-keyed self-claim: a user with a pending invites/{email} but NO token /
// NO membership → self-claims on login (browser-agnostic durable fix).
export const CLAIMEE_ACCOUNT = { email: 'claimee@test.local', password: 'test1234' };
export const CLAIM_WS = 'claim-ws';
// Admin-UI <Screen>-migration harness: super's isolated workspace (clears the
// membership gate so AppShell + /admin/* render). NOT demo-ws.
export const ADMIN_WS = 'admin-ws';

// Role source-of-truth strand (2026-06-15): member of two workspaces — empty
// roles in one (slug sorts first), granted roles in the other. users/{uid}.roles
// empty, defaultWorkspace null, linkSkippedAt set. Must auto-enter the
// ROLE-BEARING workspace, not strand on pending-approval.
export const SPLIT_ACCOUNT = { email: 'split@test.local', password: 'test1234' };
export const WS_SPLIT_ROLES = 'split-zzz-roles-ws';
export const WS_SPLIT_EMPTY = 'split-aaa-empty-ws';

// A3 self-leave regression — a plain coach member used only by the leave spec.
export const LEAVER_ACCOUNT = { email: 'leaver@test.local', password: 'test1234' };
export const UID_LEAVER = 'test-leaver';

// B4 role-aware home — fresh workspaces + per-role accounts (zero events).
export const B4_ADMIN_ACCOUNT = { email: 'b4admin@test.local', password: 'test1234' };
export const B4_SCOUT_ACCOUNT = { email: 'b4scout@test.local', password: 'test1234' };
export const B4_PLAYER_ACCOUNT = { email: 'b4player@test.local', password: 'test1234' };
export const B4_WS = 'b4-ws';
export const B4_ROLES_WS = 'b4-roles-ws';

// §C nav drawer — isolated nav fixtures: a TWO-workspace member (switcher row
// renders) + a viewer-only member (terminal summary home). Both seeded with
// linkSkippedAt so the onboarding gate never interposes.
export const NAV_ACCOUNT = { email: 'nav@test.local', password: 'test1234' };
export const VIEWER_ACCOUNT = { email: 'viewer@test.local', password: 'test1234' };
export const NAV_WS_1 = 'nav-ws-1';
export const NAV_WS_2 = 'nav-ws-2';

// § read-volume C 2 — second tenant + its sole member (CG isolation matrix).
export const OTHER_ACCOUNT = { email: 'other@test.local', password: 'test1234' };
export const UID_OTHER = 'test-other';
export const OTHER_WS = 'other-ws';
export const TRN_OTHER = 'trn-other';

export const WS = 'demo-ws';
export const TRN = 'trn-demo';
export const LAYOUT = 'lay-demo';
// § 112 Hitability responsive — a TRAINING (useTrainings reads `trainings`, not
// `tournaments`) + a config with ONE target linked to ONE position at a KNOWN
// normalized position, so a track-mode tap auto-attributes (count == taps).
export const TRN_HIT = 'trn-hit';
export const HIT_TGT_POS = { x: 0.7, y: 0.5 };
export const HIT_TGT_ID = 'tgt-A';   // seeded target id (scripts/test/seed-emulator.cjs HIT_TGT)
export const HIT_POS_ID = 'pos-1';   // seeded position id (HIT_POS)
export const hitabilityUrl = `#/training/${TRN_HIT}/hitability`;
// Isolated marker-delete fixture (own layout — never mutates TRN_HIT's config).
export const TRN_HIT_DEL = 'trn-hit-del';
export const LAYOUT_HIT_DEL = 'lay-hit-del';
export const hitabilityDelUrl = `#/training/${TRN_HIT_DEL}/hitability`;
// Isolated marker-popup fixture (STEP 2 — the spec renames + links, own layout).
export const TRN_HIT_POP = 'trn-hit-pop';
export const LAYOUT_HIT_POP = 'lay-hit-pop';
export const HIT_POS_XY = { x: 0.3, y: 0.5 }; // seeded position coords (HIT_POS)
export const hitabilityPopUrl = `#/training/${TRN_HIT_POP}/hitability`;
// Isolated track-mode per-target-shots fixture (target+position+link seeded).
export const TRN_HIT_TRACK = 'trn-hit-track';
export const hitabilityTrackUrl = `#/training/${TRN_HIT_TRACK}/hitability`;
export const MATCH = 'mat-demo';     // #2 single-coach log-a-point
export const MATCH_CC = 'mat-cc';    // #1 two-coach concurrent + merge
export const TEAM_A = 'team-a';
export const TEAM_B = 'team-b';

// UAT #4/#5/#6 fixtures.
export const TEAM_C = 'team-c';                 // NXL/DIV1 (different division)
export const SCT_BLEED = 'sct-bleed';           // scouted Alpha doc bloated with DIV1 players
export const MATCH_STATS = 'mat-stats';         // #5 stats-kills
export const MATCH_OFFLINE = 'mat-offline';     // #6 offline-sync
export const MATCH_PSTATS = 'mat-pstats';       // Stage 4.1 PlayerStats landscape-hero fixture
export const TRN_PSTATS = 'trn-pstats';         // dedicated base-layout tournament for that fixture
// §B phase-view fixture — pt-ph1 carries timeline[] (settle+mid, quickShots),
// pt-ph2 is keyframe-#0-only (scope-rule disable case). Isolated.
export const TRN_PHASE = 'trn-phase';
export const MATCH_PHASE = 'mat-phase';
export const matchPhaseReviewUrl = `#/tournament/${TRN_PHASE}/match/${MATCH_PHASE}`;
// Post-night STEP 3 — training-matchup review (base layout w/ fieldImage) for the
// rail-compact training Quick › CTA assertion.
export const TRN_TRAIN_REVIEW = 'trn-train-review';
export const MATCHUP_REVIEW = 'matchup-review';
export const matchupReviewUrl = `#/training/${TRN_TRAIN_REVIEW}/matchup/${MATCHUP_REVIEW}`;
export const ROSTER_A_IDS = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];   // PRO
export const ROSTER_C_IDS = ['pc1', 'pc2', 'pc3', 'pc4', 'pc5'];   // DIV1 (the bleed)
export const FIELD = { discoLine: 0.30, zeekerLine: 0.80, doritoSide: 'top' };

// Scout Team Alpha, fresh point (MatchPage requires ?scout to resolve a side).
export const matchScoutUrl = `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`;
// Review view (no ?scout) — reads points back.
export const matchReviewUrl = `#/tournament/${TRN}/match/${MATCH}`;
