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

export const WS = 'demo-ws';
export const TRN = 'trn-demo';
export const MATCH = 'mat-demo';     // #2 single-coach log-a-point
export const MATCH_CC = 'mat-cc';    // #1 two-coach concurrent + merge
export const TEAM_A = 'team-a';
export const TEAM_B = 'team-b';

// Scout Team Alpha, fresh point (MatchPage requires ?scout to resolve a side).
export const matchScoutUrl = `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`;
// Review view (no ?scout) — reads points back.
export const matchReviewUrl = `#/tournament/${TRN}/match/${MATCH}`;
