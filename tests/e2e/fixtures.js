// Shared fixture constants for the emulator e2e suite.
// KEEP IN SYNC with scripts/test/seed-emulator.cjs.

export const TEST_ACCOUNT = {
  email: 'coach@test.local',
  password: 'test1234',
};

export const WS = 'demo-ws';
export const TRN = 'trn-demo';
export const MATCH = 'mat-demo';
export const TEAM_A = 'team-a';
export const TEAM_B = 'team-b';

// Scout a point for Team Alpha, fresh point.
export const matchScoutUrl = `#/tournament/${TRN}/match/${MATCH}?scout=${TEAM_A}&mode=new`;
