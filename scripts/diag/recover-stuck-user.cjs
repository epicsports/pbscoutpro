// PROD recovery (admin-SDK). DRY by default; pass --live to write.
// Stamps users/{UID}.defaultWorkspace = <slug> (+ mirrors roles from the
// workspace's userRoles) so auto-enter targets the role-bearing workspace on the
// next open — robust across ALL bundle versions (every build since 2026-04-24
// enters via the defaultWorkspace pointer). The users self-update rule blocks the
// CLIENT from writing these fields; admin SDK bypasses rules. Idempotent merge.
//
// Usage:
//   node scripts/diag/recover-stuck-user.cjs <UID> <slug>          # dry-run (read + plan)
//   node scripts/diag/recover-stuck-user.cjs <UID> <slug> --live   # apply
const admin = require('firebase-admin');
const path = require('path');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();

const [UID, SLUG] = process.argv.slice(2);
const LIVE = process.argv.includes('--live');
if (!UID || !SLUG) { console.error('usage: node recover-stuck-user.cjs <UID> <slug> [--live]'); process.exit(1); }

(async () => {
  const wsRef = db.doc(`workspaces/${SLUG}`);
  const ws = await wsRef.get();
  if (!ws.exists) { console.error(`workspace ${SLUG} does not exist — aborting`); process.exit(1); }
  const wd = ws.data() || {};
  const member = Array.isArray(wd.members) && wd.members.includes(UID);
  const wsRoles = (wd.userRoles || {})[UID];
  console.log(`workspace ${SLUG}: member=${member}  userRoles[uid]=${JSON.stringify(wsRoles ?? null)}`);
  if (!member || !Array.isArray(wsRoles) || wsRoles.length === 0) {
    console.error('GUARD: user is not a role-bearing member of this workspace — refusing to stamp a default they cannot enter.');
    process.exit(1);
  }

  const uRef = db.doc(`users/${UID}`);
  const u = await uRef.get();
  console.log('BEFORE users/{uid}:', u.exists ? JSON.stringify({ roles: u.data().roles ?? '(none)', defaultWorkspace: u.data().defaultWorkspace ?? null }) : '(missing)');

  const patch = { defaultWorkspace: SLUG, roles: [...wsRoles] };
  console.log(`PLAN: merge into users/${UID}:`, JSON.stringify(patch));

  if (!LIVE) { console.log('\nDRY-RUN — no write performed. Re-run with --live to apply.'); process.exit(0); }
  await uRef.set(patch, { merge: true });
  const after = await uRef.get();
  console.log('AFTER  users/{uid}:', JSON.stringify({ roles: after.data().roles, defaultWorkspace: after.data().defaultWorkspace }));
  console.log('\n✅ LIVE write applied.');
  process.exit(0);
})().catch((e) => { console.error('RECOVERY FAILED:', e?.code || e?.message); process.exit(1); });
