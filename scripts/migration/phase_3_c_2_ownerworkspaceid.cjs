/**
 * Phase 3.c.2 — Backfill ownerWorkspaceId on canonical /teams/ and /players/.
 *
 * Per DESIGN_DECISIONS § 65.2 single-owner model + § 67. Sets
 * ownerWorkspaceId = originWorkspace (fallback "ranger1996") on every doc
 * that does not already have the field. Idempotent — re-run safe (docs with
 * ownerWorkspaceId already set are skipped).
 *
 * Service account via GOOGLE_APPLICATION_CREDENTIALS (repo migration pattern,
 * mirrors phase_3_a_globalrole.cjs — NOT a committed serviceAccount.json).
 *
 * Usage:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
 *   node scripts/migration/phase_3_c_2_ownerworkspaceid.cjs            # dry-run (default)
 *   node scripts/migration/phase_3_c_2_ownerworkspaceid.cjs --commit   # writes
 */

const admin = require('firebase-admin');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS to the service account JSON path');
  process.exit(1);
}

const COMMIT = process.argv.includes('--commit');
const FALLBACK_WORKSPACE = 'ranger1996';

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();

async function backfill(collectionName) {
  const snap = await db.collection(collectionName).get();
  let updated = 0, skipped = 0, errors = 0, missingOrigin = 0;
  const errorDocs = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.ownerWorkspaceId) { skipped++; continue; }
    if (!data.originWorkspace) missingOrigin++;
    const target = data.originWorkspace || FALLBACK_WORKSPACE;
    if (!COMMIT) {
      if (updated < 8) {
        console.log(`  [DRY] ${collectionName}/${doc.id} -> ownerWorkspaceId="${target}" `
          + `(originWorkspace=${data.originWorkspace || 'MISSING'})`);
      }
      updated++;
    } else {
      try {
        await doc.ref.update({ ownerWorkspaceId: target });
        updated++;
        if (updated % 100 === 0) console.log(`  ...${updated} updated in ${collectionName}`);
      } catch (e) {
        console.error(`  ERR ${collectionName}/${doc.id}: ${e.message}`);
        errorDocs.push({ id: doc.id, error: e.message });
        errors++;
      }
    }
  }
  return { collectionName, total: snap.size, updated, skipped, errors, errorDocs, missingOrigin };
}

(async () => {
  console.log(`Phase 3.c.2 ownerWorkspaceId backfill — ${COMMIT ? 'COMMIT' : 'DRY RUN'}\n`);
  const teams = await backfill('teams');
  const players = await backfill('players');

  console.log('\n=== Summary ===');
  for (const r of [teams, players]) {
    console.log(`${r.collectionName}: total=${r.total} would-set=${r.updated} `
      + `already-set=${r.skipped} errors=${r.errors} missing-originWorkspace=${r.missingOrigin}`);
  }

  const totalMissing = teams.missingOrigin + players.missingOrigin;
  if (totalMissing > 0) {
    console.warn(`\nWARNING: ${totalMissing} doc(s) lack originWorkspace — `
      + `would fall back to "${FALLBACK_WORKSPACE}". Review before --commit.`);
  }

  const totalErrors = teams.errors + players.errors;
  if (totalErrors > 0) {
    console.error('\nErrored docs:');
    [...teams.errorDocs, ...players.errorDocs].forEach(d => console.error(`  - ${d.id}: ${d.error}`));
    process.exit(1);
  }

  console.log(`\n${COMMIT ? 'Backfill complete.' : 'Dry run complete — no writes. Re-run with --commit to apply.'}`);
  process.exit(0);
})();
