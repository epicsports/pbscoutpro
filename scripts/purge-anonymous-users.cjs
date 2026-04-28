/**
 * Bulk delete legacy anonymous Firebase Auth users via Admin SDK.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/purge-anonymous-users.cjs audit    # count only, no deletions
 *   node scripts/purge-anonymous-users.cjs delete   # IRREVERSIBLE bulk delete
 *
 * Anonymous = providerData.length === 0 (canonical Firebase check).
 * Service account JSON must NEVER be committed to the repo (.gitignore covers it).
 *
 * See docs/audits/SECURITY_AUDIT_2026-04-25.md for context.
 * See docs/ops/ADMIN_RUNBOOK.md for periodic re-run procedure.
 */

const admin = require('firebase-admin');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SA_PATH)),
});

const auth = admin.auth();

async function listAllAnonymous() {
  const anonymousUsers = [];
  let pageToken;

  do {
    const result = await auth.listUsers(1000, pageToken);

    for (const user of result.users) {
      const isAnonymous = user.providerData.length === 0;
      if (isAnonymous) {
        anonymousUsers.push({
          uid: user.uid,
          createdAt: user.metadata.creationTime,
          lastSignIn: user.metadata.lastSignInTime,
        });
      }
    }

    pageToken = result.pageToken;
  } while (pageToken);

  return anonymousUsers;
}

async function deleteUsers(uids) {
  const BATCH_SIZE = 1000;
  let totalDeleted = 0;
  let totalFailed = 0;

  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = uids.slice(i, i + BATCH_SIZE);
    const result = await auth.deleteUsers(batch);

    totalDeleted += result.successCount;
    totalFailed += result.failureCount;

    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: deleted ${result.successCount}, failed ${result.failureCount}`);

    if (result.errors.length > 0) {
      console.log('  First 3 errors:');
      result.errors.slice(0, 3).forEach((e) => console.log(`    uid=${e.index}: ${e.error.message}`));
    }
  }

  return { totalDeleted, totalFailed };
}

async function main() {
  const mode = process.argv[2];

  if (!['audit', 'delete'].includes(mode)) {
    console.error('Usage: node scripts/purge-anonymous-users.cjs [audit|delete]');
    process.exit(1);
  }

  console.log('Listing all anonymous users...');
  const anonymous = await listAllAnonymous();
  console.log(`Found ${anonymous.length} anonymous users.`);

  if (anonymous.length > 0) {
    const sorted = [...anonymous].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    console.log('\nOldest 3:');
    sorted.slice(0, 3).forEach((u) =>
      console.log(`  ${u.uid} created=${u.createdAt} lastSignIn=${u.lastSignIn}`)
    );
    console.log('\nNewest 3:');
    sorted.slice(-3).forEach((u) =>
      console.log(`  ${u.uid} created=${u.createdAt} lastSignIn=${u.lastSignIn}`)
    );
  }

  if (mode === 'audit') {
    console.log('\n--- AUDIT MODE — no deletions performed ---');
    process.exit(0);
  }

  // mode === 'delete'
  console.log('\n--- DELETE MODE ---');
  console.log(`About to delete ${anonymous.length} anonymous users.`);
  console.log('This is IRREVERSIBLE.');
  console.log('Press Ctrl-C in next 5 seconds to abort, or wait to proceed...');

  await new Promise((resolve) => setTimeout(resolve, 5000));

  console.log('\nProceeding with delete...');
  const uids = anonymous.map((u) => u.uid);
  const result = await deleteUsers(uids);

  console.log(`\n=== COMPLETE ===`);
  console.log(`Deleted: ${result.totalDeleted}`);
  console.log(`Failed: ${result.totalFailed}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
