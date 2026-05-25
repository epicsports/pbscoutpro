/**
 * § 85 B2 (c) — one-shot migration: copy workspace `linkedUid` → global player.
 *
 * After § 85, link write/read paths in dataService and rules use GLOBAL
 * `/players/{pid}`. Existing workspace `linkedUid` values must be mirrored to
 * the corresponding global doc so already-linked users keep resolving on first
 * page load post-deploy (subscribeLinkedPlayer would otherwise return null).
 *
 * Per § 85 / Jacek decision: workspace `linkedUid` STAYS (backstop) — Phase
 * 2.2.d will collapse it. This script only COPIES (workspace → global), never
 * mutates the workspace side.
 *
 * Idempotent + additive:
 *   - Only writes global docs whose `linkedUid` differs from the workspace value.
 *   - Re-running yields zero writes after the first successful run.
 *   - Safe to run during the rules-deploy → code-deploy window: pre-§ 85 code
 *     reads workspace linkedUid (unaffected); post-§ 85 code reads global
 *     (which this script populated).
 *
 * Scope: ranger1996 only (single workspace today; loop over `/workspaces/` if
 * more workspaces exist when re-run).
 *
 * Gated by PHASE_85_EXECUTE_CONFIRMED env var. Service account via
 * GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   export PHASE_85_EXECUTE_CONFIRMED=1
 *   node scripts/migration/phase_85_linkeduid_to_global.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!process.env.PHASE_85_EXECUTE_CONFIRMED) {
  console.error('ERROR: Execute mode requires PHASE_85_EXECUTE_CONFIRMED=1 env var.');
  process.exit(1);
}

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();

const REPORTS_DIR = path.join(__dirname, 'reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_PATH = path.join(REPORTS_DIR, `phase_85_linkeduid_to_global_${timestamp}.json`);

async function migrate() {
  console.log('§ 85 B2 (c) — linkedUid workspace → global migration starting...');

  const workspacesSnap = await db.collection('workspaces').get();
  console.log(`Found ${workspacesSnap.size} workspace(s) to scan`);

  const report = {
    timestamp: new Date().toISOString(),
    workspacesScanned: 0,
    workspacePlayersScanned: 0,
    linkedFound: 0,
    globalUpdated: 0,
    alreadyMatched: 0,
    skippedNoGlobal: 0,
    skippedConflict: 0,
    failures: [],
  };

  for (const wsDoc of workspacesSnap.docs) {
    const slug = wsDoc.id;
    report.workspacesScanned += 1;
    console.log(`\nWorkspace: ${slug}`);

    const wsPlayersSnap = await db
      .collection('workspaces').doc(slug)
      .collection('players')
      .get();
    report.workspacePlayersScanned += wsPlayersSnap.size;

    const linkedDocs = wsPlayersSnap.docs.filter(d => {
      const linkedUid = d.data()?.linkedUid;
      return typeof linkedUid === 'string' && linkedUid.length > 0;
    });
    report.linkedFound += linkedDocs.length;
    console.log(`  workspace players: ${wsPlayersSnap.size}, with linkedUid: ${linkedDocs.length}`);

    for (const wsPlayer of linkedDocs) {
      const pid = wsPlayer.id;
      const wsLinkedUid = wsPlayer.data().linkedUid;
      const wsPbliIdFull = wsPlayer.data().pbliIdFull || null;
      const wsLinkedAt = wsPlayer.data().linkedAt || null;

      const globalRef = db.collection('players').doc(pid);
      const globalSnap = await globalRef.get();
      if (!globalSnap.exists) {
        report.skippedNoGlobal += 1;
        console.warn(`  ⚠ pid=${pid} has workspace linkedUid but no global doc — skipped`);
        continue;
      }
      const globalLinkedUid = globalSnap.data()?.linkedUid;
      if (globalLinkedUid === wsLinkedUid) {
        report.alreadyMatched += 1;
        continue;
      }
      // Conflict safety: if global has a DIFFERENT linkedUid already, do NOT
      // overwrite — surface for manual review.
      if (globalLinkedUid && globalLinkedUid !== wsLinkedUid) {
        report.skippedConflict += 1;
        const failure = {
          pid,
          workspaceLinkedUid: wsLinkedUid,
          globalLinkedUid,
          reason: 'global has different linkedUid — manual review required',
        };
        report.failures.push(failure);
        console.warn(`  ⚠ pid=${pid} conflict — workspace=${wsLinkedUid} global=${globalLinkedUid}`);
        continue;
      }
      // Standard case: global has null/missing linkedUid → copy from workspace.
      try {
        const patch = {
          linkedUid: wsLinkedUid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (wsPbliIdFull) patch.pbliIdFull = wsPbliIdFull;
        if (wsLinkedAt) patch.linkedAt = wsLinkedAt;
        await globalRef.update(patch);
        report.globalUpdated += 1;
        console.log(`  ✓ pid=${pid} linkedUid=${wsLinkedUid} copied to global`);
      } catch (e) {
        report.failures.push({ pid, workspaceLinkedUid: wsLinkedUid, error: e.message });
        console.error(`  ✗ pid=${pid} update failed: ${e.message}`);
      }
    }
  }

  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log('\n=== § 85 migration summary ===');
  console.log(`  workspaces scanned:           ${report.workspacesScanned}`);
  console.log(`  workspace players scanned:    ${report.workspacePlayersScanned}`);
  console.log(`  linked workspace players:     ${report.linkedFound}`);
  console.log(`  global docs updated:          ${report.globalUpdated}`);
  console.log(`  already matched (no-op):      ${report.alreadyMatched}`);
  console.log(`  skipped (no global doc):      ${report.skippedNoGlobal}`);
  console.log(`  skipped (conflict — review):  ${report.skippedConflict}`);
  console.log(`  failures:                     ${report.failures.length}`);
  console.log(`\nReport: ${REPORT_PATH}`);
}

migrate().then(() => process.exit(0)).catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
