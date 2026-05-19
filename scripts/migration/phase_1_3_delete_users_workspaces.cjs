/**
 * Phase 1.3 migration script — delete users.workspaces field from all /users/{uid} docs
 *
 * Per DESIGN_DECISIONS § 63.3 Option α — workspace.userRoles[uid] is sole source
 * of truth for user-workspace membership. users.workspaces field has been orphan
 * in code since Phase 1.2 (commit 6c9ad4f, 2026-05-19) — sole writer at
 * dataService.js:getOrCreateUserProfile removed. This script removes the field
 * from stored data on legacy user docs.
 *
 * Per Jacek 2026-05-19: data loss waiver in effect ("dane mogą zostać zaorane,
 * nowy import jako recovery"). Backup procedure skipped. Re-import is the
 * recovery path if anything goes wrong.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/migration/phase_1_3_delete_users_workspaces.cjs --dry-run
 *   node scripts/migration/phase_1_3_delete_users_workspaces.cjs --write
 *
 * Service account JSON must NEVER be committed to the repo (.gitignore covers it).
 * See scripts/purge-anonymous-users.cjs for the same Admin SDK init pattern.
 *
 * Idempotent: re-running --write on docs without the field is a no-op
 * (script skips docs that don't have `workspaces`).
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

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isWrite = args.includes('--write');

  if (!isDryRun && !isWrite) {
    console.error('Usage: node scripts/migration/phase_1_3_delete_users_workspaces.cjs [--dry-run | --write]');
    process.exit(1);
  }

  console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'WRITE'}`);
  console.log('Scanning /users collection...\n');

  const snap = await db.collection('users').get();
  const totalUsers = snap.size;
  let withWorkspaces = 0;
  let withoutWorkspaces = 0;
  let processed = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const hasField = 'workspaces' in data;

    if (!hasField) {
      withoutWorkspaces++;
      continue;
    }

    withWorkspaces++;

    if (isDryRun) {
      const preview = JSON.stringify(data.workspaces);
      console.log(`[DRY-RUN] Would delete workspaces from /users/${doc.id} (current value: ${preview})`);
      continue;
    }

    // WRITE mode
    try {
      await doc.ref.update({ workspaces: FieldValue.delete() });
      processed++;
      if (processed % 50 === 0) {
        console.log(`Progress: ${processed}/${withWorkspaces} processed`);
      }
    } catch (err) {
      errors++;
      console.error(`Error processing /users/${doc.id}: ${err.message}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total /users docs: ${totalUsers}`);
  console.log(`With workspaces field: ${withWorkspaces}`);
  console.log(`Without workspaces field: ${withoutWorkspaces}`);

  if (isWrite) {
    console.log(`Processed (deleted): ${processed}`);
    console.log(`Errors: ${errors}`);
    if (errors > 0) {
      console.log('\n⚠️  ERRORS occurred. Review log above. Re-run --write to retry (idempotent).');
      process.exit(1);
    } else {
      console.log('\n✅ Phase 1.3 migration complete. users.workspaces field deleted from all /users docs.');
    }
  } else {
    console.log(`\n[DRY-RUN] Would delete workspaces from ${withWorkspaces} docs. Re-run with --write to execute.`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
