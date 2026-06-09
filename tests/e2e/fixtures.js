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
export const BASE_LAYOUT = 'base-demo';

// A3 self-leave regression — a plain coach member used only by the leave spec.
export const LEAVER_ACCOUNT = { email: 'leaver@test.local', password: 'test1234' };
export const UID_LEAVER = 'test-leaver';

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
export const hitabilityUrl = `#/training/${TRN_HIT}/hitability`;
export const MATCH = 'mat-demo';     // #2 single-coach log-a-point
export const MATCH_CC = 'mat-cc';    // #1 two-coach concurrent + merge
export const TEAM_A = 'team-a';
export const TEAM_B = 'team-b';

// UAT #4/#5/#6 fixtures.
export const TEAM_C = 'team-c';                 // NXL/DIV1 (different division)
export const SCT_BLEED = 'sct-bleed';           // scouted Alpha doc bloated with DIV1 players
export const MATCH_STATS = 'mat-stats';         // #5 stats-kills
export const MATCH_OFFLINE = 'mat-offline';     // #6 offline-sync
export const ROSTER_A_IDS = ['pa1', 'pa2', 'pa3', 'pa4', 'pa5'];   // PRO
export const ROSTER_C_IDS = ['pc1', 'pc2', 'pc3', 'pc4', 'pc5'];   // DIV1 (the bleed)
export const FIELD = { discoLine: 0.30, zeekerLine: 0.80, doritoSide: 'top' };

// Scout Team Alpha, fresh point (MatchPage requires ?scout to resolve a side).
export const matchScoutUrl = `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`;
// Review view (no ?scout) — reads points back.
export const matchReviewUrl = `#/tournament/${TRN}/match/${MATCH}`;
