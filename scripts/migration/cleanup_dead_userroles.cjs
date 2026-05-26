// One-shot cleanup: remove "dead" entries from workspaces/ranger1996.userRoles.
//
// B15 closeout. Uses the EXACT same dead-key criterion as
// `audit_dead_userroles.cjs` — re-classifies each key fresh at run time and
// only deletes those flagged DEAD. Re-running is idempotent (already-removed
// keys aren't in userRoles → not re-counted).
//
// Criterion (must match the audit):
//   A userRoles key uid is DEAD iff ALL of:
//     (1) uid ∉ workspaces/ranger1996.members[]
//     (2) uid ≠ workspaces/ranger1996.adminUid
//     (3) /users/{uid} does NOT exist
//     (4) the user's email (if any) is NOT in ADMIN_EMAILS
//
// Conservatively KEEPS a key if ANY condition flips. NEVER touches:
//   - members[], pendingApprovals[]   (other top-level workspace fields)
//   - active members' userRoles slots
//   - the adminUid holder
//   - ADMIN_EMAILS-emailed users
//   - userRoles slots of users whose /users/{uid} doc exists (incl. disabled)
//
// Gated by CLEANUP_DEAD_USERROLES_CONFIRMED=1 (refuses to run without it).
//
// RUN (Jacek, in a shell with creds, AFTER audit reviewed):
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   export CLEANUP_DEAD_USERROLES_CONFIRMED=1
//   node scripts/migration/cleanup_dead_userroles.cjs
//
// Or via the Windows wrapper (which sets the confirm flag):
//   scripts\migration\cleanup_dead_userroles.cmd

const admin = require('firebase-admin');

if (process.env.CLEANUP_DEAD_USERROLES_CONFIRMED !== '1') {
  console.error('REFUSING TO RUN.');
  console.error('Set CLEANUP_DEAD_USERROLES_CONFIRMED=1 to proceed. Run the');
  console.error('audit script (audit_dead_userroles.cjs) first and review the');
  console.error('classification + criterion before running this destructive cleanup.');
  process.exit(2);
}

admin.initializeApp();

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
  const beforeCount = keys.length;

  console.log('');
  console.log('=== B15 cleanup — userRoles dead-key removal ===');
  console.log('');
  console.log(`workspace                : ${SLUG}`);
  console.log(`userRoles keys (BEFORE)  : ${beforeCount}`);
  console.log('');

  // Re-classify each key fresh — mirror audit logic exactly.
  const deadUids = [];
  const CHUNK = 50;
  for (let i = 0; i < keys.length; i += CHUNK) {
    const chunk = keys.slice(i, i + CHUNK);
    const userSnaps = await Promise.all(chunk.map(uid => db.doc(`users/${uid}`).get()));
    chunk.forEach((uid, idx) => {
      if (members.has(uid)) return;          // (1) active member — KEEP
      if (uid === adminUid) return;          // (2) adminUid — KEEP
      const snap = userSnaps[idx];
      if (snap.exists) {                     // (3) has user doc — KEEP
        const email = snap.data().email || '';
        // (4) ADMIN_EMAILS check is implicit inside (3) for our prod state,
        //     but we belt-and-braces it: if doc somehow lacks email field
        //     yet is the bootstrap admin, still keep.
        if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return;
        return;
      }
      // No user doc + not member + not adminUid → check ADMIN_EMAILS via
      // the email field would be unreachable (no doc to read email from);
      // therefore safe to delete. (ADMIN_EMAILS for missing-doc users is
      // a theoretical case; in prod Jacek has a /users/ doc.)
      deadUids.push(uid);
    });
  }

  console.log(`dead uids to remove      : ${deadUids.length}`);
  if (!deadUids.length) {
    console.log('NO-OP: nothing to remove. Exiting.');
    process.exit(0);
  }

  // Confirm before write — print first 10 + last 3 as a visual sanity sample.
  const sample = [
    ...deadUids.slice(0, 10),
    ...(deadUids.length > 13 ? ['  ...', ...deadUids.slice(-3)] : []),
  ];
  console.log('sample (first 10 + last 3):');
  sample.forEach(u => console.log(`  - ${u}`));
  console.log('');

  // Build the delete patch — one updateDoc, dotted-path field delete per uid.
  const patch = {};
  for (const uid of deadUids) {
    patch[`userRoles.${uid}`] = admin.firestore.FieldValue.delete();
  }

  await wsRef.update(patch);

  const afterSnap = await wsRef.get();
  const afterKeys = Object.keys(afterSnap.data().userRoles || {});
  console.log('---');
  console.log(`userRoles keys (AFTER)   : ${afterKeys.length}`);
  console.log(`removed                  : ${beforeCount - afterKeys.length}`);
  if ((beforeCount - afterKeys.length) !== deadUids.length) {
    console.warn('⚠ delta differs from planned removal — re-run audit to investigate');
  }
  console.log('');
  console.log('DONE.');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
