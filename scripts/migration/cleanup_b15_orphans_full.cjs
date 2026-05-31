// B15 full orphan cleanup — ranger1996 (brief 2026-05-31, scope CONFIRMED by Jacek).
//
// The named cleanup_dead_userroles.cjs keeps members[] and never checks Auth, so
// it strips only 1. This brief-faithful variant uses the stated criterion and is
// membership-agnostic:
//
//   An orphan uid is one where ALL hold:
//     (1) /users/{uid} does NOT exist
//     (2) the uid has NO Firebase Auth record (getUsers not-found)
//     (3) uid !== adminUid
//     (4) /users/{uid}.email (if any) NOT in ADMIN_EMAILS
//
// Orphans are stripped from userRoles{} AND members[] AND pendingApprovals[].
// Re-classifies fresh at run time → idempotent (a re-run finds none). Preserves
// every real member (has a /users doc OR an Auth record), the adminUid, and the
// authed-but-profileless user (has Auth → not an orphan).
//
// Safety: aborts if the freshly-computed orphan count diverges from the
// --dry-verified count by more than DRIFT (guards against a data shift between
// dry and live). DRY by default; set B15_FULL_CONFIRMED=1 to write.
//
//   GOOGLE_APPLICATION_CREDENTIALS=/path/sa.json B15_FULL_CONFIRMED=1 \
//     node scripts/migration/cleanup_b15_orphans_full.cjs

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

const SLUG = 'ranger1996';
const ADMIN_EMAILS = ['jacek@epicsports.pl'];
const EXPECTED = 565;      // from --dry 2026-05-31
const DRIFT = 25;          // abort if |fresh - EXPECTED| > DRIFT
const CONFIRMED = process.env.B15_FULL_CONFIRMED === '1';
const FV = admin.firestore.FieldValue;

(async () => {
  const wsRef = db.doc(`workspaces/${SLUG}`);
  const ws = (await wsRef.get()).data();
  if (!ws) throw new Error(`workspaces/${SLUG} not found`);
  const userRoles = ws.userRoles || {};
  const members = new Set(Array.isArray(ws.members) ? ws.members : []);
  const hasPending = Array.isArray(ws.pendingApprovals) && ws.pendingApprovals.length > 0;
  const adminUid = ws.adminUid || null;
  const keys = Object.keys(userRoles);
  const beforeUR = keys.length;
  const beforeM = members.size;

  // (1) /users docs
  const hasDoc = {}, email = {};
  for (let i = 0; i < keys.length; i += 50) {
    const chunk = keys.slice(i, i + 50);
    const snaps = await Promise.all(chunk.map(uid => db.doc(`users/${uid}`).get()));
    chunk.forEach((uid, idx) => { hasDoc[uid] = snaps[idx].exists; email[uid] = snaps[idx].exists ? (snaps[idx].data().email || '') : ''; });
  }
  // (2) Auth records
  const hasAuth = {};
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const res = await auth.getUsers(chunk.map(uid => ({ uid })));
    res.users.forEach(u => { hasAuth[u.uid] = true; });
  }
  const isProtected = (uid) => uid === adminUid || (email[uid] && ADMIN_EMAILS.includes(email[uid].toLowerCase()));
  const orphans = keys.filter(uid => !hasDoc[uid] && !hasAuth[uid] && !isProtected(uid));

  console.log(`\n=== B15 full orphan cleanup — ${SLUG} — ${CONFIRMED ? 'LIVE' : 'DRY'} ===`);
  console.log(`userRoles (before) : ${beforeUR}`);
  console.log(`members[] (before) : ${beforeM}`);
  console.log(`orphans (no doc AND no Auth, non-admin) : ${orphans.length}`);
  console.log(`  in members[]     : ${orphans.filter(u => members.has(u)).length}`);
  console.log(`  userRoles-only   : ${orphans.filter(u => !members.has(u)).length}`);

  if (Math.abs(orphans.length - EXPECTED) > DRIFT) {
    console.error(`\nSAFETY ABORT: fresh orphan count ${orphans.length} diverges from verified ${EXPECTED} (drift > ${DRIFT}). Re-run --dry and review.`);
    process.exit(3);
  }
  if (!orphans.length) { console.log('\nNO-OP: nothing to strip (idempotent — already clean).'); process.exit(0); }

  if (!CONFIRMED) {
    console.log('\nDRY — no write. Set B15_FULL_CONFIRMED=1 to strip.');
    console.log('sample (first 5):', orphans.slice(0, 5).join(', '));
    process.exit(0);
  }

  // Strip userRoles{} in chunks (field-mask deletes), then members[]/pending
  // via arrayRemove in chunks. Multiple small updates → safe + restartable.
  for (let i = 0; i < orphans.length; i += 300) {
    const chunk = orphans.slice(i, i + 300);
    const patch = {};
    chunk.forEach(uid => { patch[`userRoles.${uid}`] = FV.delete(); });
    await wsRef.update(patch);
  }
  for (let i = 0; i < orphans.length; i += 300) {
    const chunk = orphans.slice(i, i + 300);
    const patch = { members: FV.arrayRemove(...chunk) };
    if (hasPending) patch.pendingApprovals = FV.arrayRemove(...chunk);
    await wsRef.update(patch);
  }

  const after = (await wsRef.get()).data();
  const afterUR = Object.keys(after.userRoles || {}).length;
  const afterM = (after.members || []).length;
  console.log(`\n--- result ---`);
  console.log(`userRoles : ${beforeUR} -> ${afterUR}  (removed ${beforeUR - afterUR})`);
  console.log(`members[] : ${beforeM} -> ${afterM}  (removed ${beforeM - afterM})`);
  if (beforeUR - afterUR !== orphans.length) console.warn('⚠ userRoles delta != planned — investigate');
  console.log('\nDONE.');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
