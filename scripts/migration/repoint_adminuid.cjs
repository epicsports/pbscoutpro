// One-shot: repoint workspaces/ranger1996.adminUid to the real super_admin
// (jacek@epicsports.pl), clear the dead-uid tombstone in userRoles, stamp
// adminTransferredAt. Idempotent — re-running is a no-op.
//
// RUN (Jacek, in a shell with creds):
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   node scripts/migration/repoint_adminuid.cjs
//
// Resolves Jacek's uid from email at run time — nothing to paste.

const admin = require('firebase-admin');
admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS

const SLUG = 'ranger1996';
const ADMIN_EMAIL = 'jacek@epicsports.pl';

(async () => {
  const db = admin.firestore();
  const ref = db.doc(`workspaces/${SLUG}`);

  // target = Jacek's real uid, resolved from his email (no hardcoded uid)
  const target = (await admin.auth().getUserByEmail(ADMIN_EMAIL)).uid;

  const snap = await ref.get();
  if (!snap.exists) throw new Error(`workspaces/${SLUG} not found`);
  const data = snap.data();
  const current = data.adminUid || null;

  console.log('BEFORE adminUid :', current);
  console.log('TARGET (email)  :', target);
  console.log('userRoles keys  :', Object.keys(data.userRoles || {}));

  if (current === target) {
    console.log('NO-OP: adminUid already == target. Exiting.');
    process.exit(0);
  }

  // updateDoc/admin .update() parses dot-notation correctly (setDoc/.set merge does NOT
  // — known footgun). Keep .update() so the tombstone delete and field path both apply.
  const update = {
    adminUid: target,
    adminTransferredAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (current && Object.prototype.hasOwnProperty.call(data.userRoles || {}, current)) {
    update[`userRoles.${current}`] = admin.firestore.FieldValue.delete();
  }

  await ref.update(update);

  const after = (await ref.get()).data();
  console.log('---');
  console.log('AFTER adminUid  :', after.adminUid);
  console.log('userRoles keys  :', Object.keys(after.userRoles || {}));
  console.log('adminTransferredAt set:', !!after.adminTransferredAt);
  console.log('DONE.');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
