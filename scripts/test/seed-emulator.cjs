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
const LAYOUT = 'lay-demo';
const TRN = 'trn-demo';
const MATCH = 'mat-demo';     // #2 single-coach log-a-point
const MATCH_CC = 'mat-cc';    // #1 two-coach concurrent + merge (isolated)
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
const now = Date.now();

// UAT #4/#5/#6 (additive): a 2nd division team (Charlie, DIV1) + a cross-division
// bloated scouted doc + dedicated matches for stats + offline-sync.
const TEAM_C = 'team-c';
const SCT_BLEED = 'sct-bleed';
const MATCH_STATS = 'mat-stats';
const MATCH_OFFLINE = 'mat-offline';

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

async function main() {
  // 1. Auth users (delete-then-create for idempotency).
  for (const uid of [UID, UID2, UID3, UID_NEW1, UID_NEW2, UID_SUPER]) { try { await auth.deleteUser(uid); } catch (_) { /* not present */ } }
  await auth.createUser({ uid: UID, email: EMAIL, password: PASSWORD, displayName: 'Test Coach', emailVerified: true });
  await auth.createUser({ uid: UID2, email: EMAIL2, password: PASSWORD, displayName: 'Test Coach 2', emailVerified: true });
  await auth.createUser({ uid: UID3, email: EMAIL3, password: PASSWORD, displayName: 'Test Coach 3', emailVerified: true });
  // Outsiders — NO /users doc, NO membership (used to prove isolation + redeem).
  await auth.createUser({ uid: UID_NEW1, email: EMAIL_NEW1, password: PASSWORD, displayName: 'Newcomer 1', emailVerified: true });
  await auth.createUser({ uid: UID_NEW2, email: EMAIL_NEW2, password: PASSWORD, displayName: 'Newcomer 2', emailVerified: true });
  // Platform super_admin — NOT a demo-ws member (proves base writes ride
  // globalRole, not workspace membership).
  await auth.createUser({ uid: UID_SUPER, email: EMAIL_SUPER, password: PASSWORD, displayName: 'Super Admin', emailVerified: true });

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
  // Super admin — globalRole drives isSuperAdmin() in rules (no membership).
  batch.set(db.doc(`users/${UID_SUPER}`), {
    email: EMAIL_SUPER, displayName: 'Super Admin', globalRole: 'super_admin', createdAt: now,
  });

  // 3. Workspace — both coaches are members + admin + coach (admin bypasses the
  //    onboarding/pending AuthGate so login lands straight in the app).
  batch.set(db.doc(`workspaces/${WS}`), {
    name: 'Demo Workspace',
    members: [UID, UID2, UID3],
    userRoles: { [UID]: ['admin', 'coach'], [UID2]: ['admin', 'coach'], [UID3]: ['admin', 'coach'] },
    adminUid: UID,
    rolesVersion: 2,
    createdAt: now,
  });

  // 4. Global teams + players (usePlayers/useTeams read global ∪ workspace).
  batch.set(db.doc(`teams/${TEAM_A}`), { name: 'Team Alpha', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'PRO' } });
  batch.set(db.doc(`teams/${TEAM_B}`), { name: 'Team Bravo', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'PRO' } });
  // #4 — Team Charlie in a DIFFERENT division (NXL/DIV1) to prove no bleed.
  batch.set(db.doc(`teams/${TEAM_C}`), { name: 'Team Charlie', ownerWorkspaceId: WS, leagues: ['NXL'], divisions: { NXL: 'DIV1' } });
  [...rosterA, ...rosterB, ...rosterC].forEach(p => {
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
    fieldImage: null, discoLine: 0.30, zeekerLine: 0.80,
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

  // 7. Invite tokens (Stage 4) — admin-issued (createdBy = demo-ws admin UID).
  batch.set(db.doc(`invites/${INVITE_VALID}`), {
    workspaceSlug: WS, role: 'scout', createdBy: UID, createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000, redeemedBy: null, redeemedAt: null,
  });
  batch.set(db.doc(`invites/${INVITE_EXPIRED}`), {
    workspaceSlug: WS, role: 'scout', createdBy: UID, createdAt: now,
    expiresAt: now - 60 * 1000, redeemedBy: null, redeemedAt: null,
  });

  await batch.commit();
  console.log(`✅ Seeded emulator project '${PROJECT_ID}': user ${EMAIL}, workspace ${WS}, tournament ${TRN}, match ${MATCH}.`);
  process.exit(0);
}

main().catch(e => { console.error('SEED FAILED:', e); process.exit(1); });
