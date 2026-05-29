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
const LAYOUT = 'lay-demo';
const TRN = 'trn-demo';
const MATCH = 'mat-demo';     // #2 single-coach log-a-point
const MATCH_CC = 'mat-cc';    // #1 two-coach concurrent + merge (isolated)
const TEAM_A = 'team-a';
const TEAM_B = 'team-b';
const now = Date.now();

const playersFor = (team, prefix) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `${prefix}${i + 1}`,
    name: `${team} Player ${i + 1}`,
    number: String(i + 1),
    teamId: team === 'A' ? TEAM_A : TEAM_B,
    ownerWorkspaceId: WS,
  }));
const rosterA = playersFor('A', 'pa');
const rosterB = playersFor('B', 'pb');

async function main() {
  // 1. Auth users (delete-then-create for idempotency).
  for (const uid of [UID, UID2]) { try { await auth.deleteUser(uid); } catch (_) { /* not present */ } }
  await auth.createUser({ uid: UID, email: EMAIL, password: PASSWORD, displayName: 'Test Coach', emailVerified: true });
  await auth.createUser({ uid: UID2, email: EMAIL2, password: PASSWORD, displayName: 'Test Coach 2', emailVerified: true });

  const batch = db.batch();

  // 2. User profiles — defaultWorkspace drives WorkspaceProvider auto-entry.
  batch.set(db.doc(`users/${UID}`), {
    email: EMAIL, displayName: 'Test Coach', defaultWorkspace: WS, createdAt: now,
  });
  batch.set(db.doc(`users/${UID2}`), {
    email: EMAIL2, displayName: 'Test Coach 2', defaultWorkspace: WS, createdAt: now,
  });

  // 3. Workspace — both coaches are members + admin + coach (admin bypasses the
  //    onboarding/pending AuthGate so login lands straight in the app).
  batch.set(db.doc(`workspaces/${WS}`), {
    name: 'Demo Workspace',
    members: [UID, UID2],
    userRoles: { [UID]: ['admin', 'coach'], [UID2]: ['admin', 'coach'] },
    adminUid: UID,
    rolesVersion: 2,
    createdAt: now,
  });

  // 4. Global teams + players (usePlayers/useTeams read global ∪ workspace).
  batch.set(db.doc(`teams/${TEAM_A}`), { name: 'Team Alpha', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'PRO' } });
  batch.set(db.doc(`teams/${TEAM_B}`), { name: 'Team Bravo', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'PRO' } });
  [...rosterA, ...rosterB].forEach(p => {
    batch.set(db.doc(`players/${p.id}`), {
      name: p.name, number: p.number, teamId: p.teamId, ownerWorkspaceId: WS,
    });
  });

  // 5. Layout (minimal — name only; canvas renders an empty field).
  batch.set(db.doc(`workspaces/${WS}/layouts/${LAYOUT}`), { name: 'Demo Field', createdAt: now });

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
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now, createdAt: now,
  });
  // #1 keystone — separate match so the merge test is isolated from #2.
  batch.set(db.doc(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH_CC}`), {
    teamA: TEAM_A, teamB: TEAM_B, status: 'live', order: now + 1, createdAt: now,
  });

  await batch.commit();
  console.log(`✅ Seeded emulator project '${PROJECT_ID}': user ${EMAIL}, workspace ${WS}, tournament ${TRN}, match ${MATCH}.`);
  process.exit(0);
}

main().catch(e => { console.error('SEED FAILED:', e); process.exit(1); });
