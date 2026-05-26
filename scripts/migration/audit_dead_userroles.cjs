// READ-ONLY audit: count "dead" entries in workspaces/ranger1996.userRoles.
//
// Context: B15 — the ranger1996 workspace doc's userRoles map carries ~569
// stragglers (per NEXT_TASKS B15 row). These accumulated when the anonymous-
// account purge removed `/users/{uid}` docs but left their entries in the
// workspace's userRoles map (Phase 1.3 deletion didn't sweep workspace
// references).
//
// Definition of "dead" (CANDIDATE — verify with Jacek before running the
// matching cleanup script):
//
//   A userRoles key uid is DEAD if ALL of:
//     (1) uid is NOT in workspaces/ranger1996.members[]  (not an active member)
//     (2) /users/{uid} does NOT exist                    (no user doc — purged)
//     (3) the user's email (if any from /users/{uid}.email) is NOT in
//         ADMIN_EMAILS (= jacek@epicsports.pl)            (not the bootstrap admin)
//
// Conservatively KEEP a key if ANY of (1)-(3) flips. Specifically:
//   - Active member with empty roles[]: kept (pending-approval shape, § 49).
//   - User doc exists, even if /users/.disabled === true: kept (soft-delete
//     trail — disabled users still hold roles).
//   - ADMIN_EMAILS uid: kept defensively even if /users/ doc missing.
//
// RUN (read-only, no writes):
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   node scripts/migration/audit_dead_userroles.cjs
//
// Or via the Windows wrapper:
//   scripts\migration\audit_dead_userroles.cmd

const admin = require('firebase-admin');
admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS

const SLUG = 'ranger1996';
const ADMIN_EMAILS = ['jacek@epicsports.pl'];

(async () => {
  const db = admin.firestore();
  const wsRef = db.doc(`workspaces/${SLUG}`);
  const wsSnap = await wsRef.get();
  if (!wsSnap.exists) throw new Error(`workspaces/${SLUG} not found`);
  const ws = wsSnap.data();

  const userRoles = ws.userRoles || {};
  const members = Array.isArray(ws.members) ? new Set(ws.members) : new Set();
  const adminUid = ws.adminUid || null;
  const keys = Object.keys(userRoles);

  console.log('');
  console.log('=== B15 audit — userRoles dead-key candidates (READ-ONLY) ===');
  console.log('');
  console.log(`workspace             : ${SLUG}`);
  console.log(`userRoles keys total  : ${keys.length}`);
  console.log(`members[] length      : ${members.size}`);
  console.log(`adminUid              : ${adminUid}`);
  console.log('');

  let keptMember = 0;
  let keptHasUserDoc = 0;
  let keptAdminEmail = 0;
  let keptAdminUid = 0;
  let dead = 0;
  const deadSamples = [];
  const adminEmailKept = [];

  // Process in chunks to avoid hammering Firestore.
  const CHUNK = 50;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    // Read /users/{uid} for each uid in the chunk in parallel.
    const userSnaps = await Promise.all(chunk.map(uid => db.doc(`users/${uid}`).get()));
    chunk.forEach((uid, idx) => {
      const isMember = members.has(uid);
      const isAdminUid = uid === adminUid;
      const userSnap = userSnaps[idx];
      const hasUserDoc = userSnap.exists;
      const email = hasUserDoc ? (userSnap.data().email || '') : '';
      const isAdminEmail = !!email && ADMIN_EMAILS.includes(email.toLowerCase());

      if (isMember) { keptMember++; return; }
      if (isAdminUid) { keptAdminUid++; return; }
      if (isAdminEmail) { keptAdminEmail++; adminEmailKept.push(uid); return; }
      if (hasUserDoc) { keptHasUserDoc++; return; }
      // All three "dead" conditions hold → candidate for removal.
      dead++;
      if (deadSamples.length < 12) deadSamples.push(uid);
    });
  }

  console.log('classification:');
  console.log('  ------------------------------------+------');
  console.log(`  kept: in members[]                  | ${String(keptMember).padStart(5)}`);
  console.log(`  kept: adminUid match                | ${String(keptAdminUid).padStart(5)}`);
  console.log(`  kept: ADMIN_EMAILS user             | ${String(keptAdminEmail).padStart(5)}`);
  console.log(`  kept: has /users/{uid} doc          | ${String(keptHasUserDoc).padStart(5)}`);
  console.log(`  ------------------------------------+------`);
  console.log(`  DEAD (candidate for removal)        | ${String(dead).padStart(5)}`);
  console.log(`  ------------------------------------+------`);
  console.log(`  TOTAL                               | ${String(keys.length).padStart(5)}`);
  console.log('');

  if (deadSamples.length) {
    console.log(`dead-uid samples (first ${deadSamples.length} of ${dead}):`);
    deadSamples.forEach(uid => console.log(`  - ${uid}`));
    console.log('');
  }
  if (adminEmailKept.length) {
    console.log('admin-email keys kept (sanity check — should be exactly Jacek):');
    adminEmailKept.forEach(uid => console.log(`  - ${uid}`));
    console.log('');
  }
  console.log('NEXT STEP: review criterion with Jacek. If approved, run');
  console.log('  scripts\\migration\\cleanup_dead_userroles.cmd');
  console.log('which uses the SAME criterion to remove only the keys');
  console.log('classified as DEAD above.');
  console.log('');
  console.log('DONE (read-only).');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
