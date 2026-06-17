// Tactics orphan cleanup (OP2 of the tactics-consolidation brief) — admin-SDK.
// Retires the dead `layouts/{lid}/tactics/{tid}` path: the §96 STAGE-3 "later
// cleanup" the copy-not-move migration explicitly anticipated. NO CODE reads this
// path since 67b95df5 (writer retargeted to layoutOverlays), so deletion is
// code-safe. Tournament store (tournaments/{tid}/tactics, 9 live) = OP1, NOT
// touched here (it has a live reader; separate code+data brief).
//
// Sequence (idempotent, backup-first):
//   1. census via collectionGroup('tactics'); classify by ref.path.
//   2. for each of the 24 orphans, twin-check at layoutOverlays/{lid}/tactics/{tid}.
//   3. BACKUP all orphan docs (full data) to a gitignored sibling dir.
//   4. MIGRATE the uncovered (no-twin) orphans forward: copy-by-id to the overlay
//      path (raw .set(data) — same as §96 copySub; legacy `steps` shape is a clean
//      subset the overlay reader already renders). Recovers stranded user tactics.
//   5. verify every orphan now has a twin (post-migrate coverage == 100%).
//   6. DELETE all 24 orphan docs.
//   7. final census.
//
// Usage: node tactics_orphan_cleanup.cjs --dry   (no writes; reports the plan)
//        node tactics_orphan_cleanup.cjs --live  (backup + migrate + delete)
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const LIVE = process.argv.includes('--live');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();

function classify(p) {
  const segs = p.split('/');
  return {
    tid: segs[segs.length - 1],
    lid: segs[segs.length - 3],
    parentCol: segs[segs.length - 4],
    // prefix = everything up to and including the parent doc id, e.g.
    // workspaces/{slug}/layouts/{lid}  →  swap 'layouts'→'layoutOverlays' for the twin.
    prefixSegs: segs.slice(0, segs.length - 2),
  };
}

(async () => {
  const snap = await db.collectionGroup('tactics').get();
  const orphans = [];
  const census = { layouts: 0, layoutOverlays: 0, tournaments: 0, other: 0 };
  snap.forEach((d) => {
    const c = classify(d.ref.path);
    census[c.parentCol] = (census[c.parentCol] || 0) + 1;
    if (c.parentCol === 'layouts') orphans.push({ ref: d.ref, data: d.data(), ...c });
  });

  console.log('=== census ===');
  console.log(`  layouts/{id}/tactics       : ${census.layouts}  (orphans)`);
  console.log(`  layoutOverlays/{id}/tactics: ${census.layoutOverlays}  (live)`);
  console.log(`  tournaments/{id}/tactics   : ${census.tournaments}  (live, OP1 — NOT touched)`);

  // twin path = same prefix with 'layouts' → 'layoutOverlays', + /tactics/{tid}
  const twinRef = (o) => {
    const segs = o.prefixSegs.slice();
    segs[segs.length - 2] = 'layoutOverlays';     // parent collection name
    return db.doc([...segs, 'tactics', o.tid].join('/'));
  };

  const covered = [], uncovered = [];
  for (const o of orphans) {
    const twin = await twinRef(o).get();
    (twin.exists ? covered : uncovered).push(o);
  }
  console.log(`\n=== coverage ===\n  orphans: ${orphans.length} · twin-exists (delete-able): ${covered.length} · no-twin (migrate-first): ${uncovered.length}`);
  uncovered.forEach((o) => console.log(`    MIGRATE  ${o.lid}/${o.tid}`));

  if (orphans.length === 0) { console.log('\nNothing to do — orphan path already empty.'); process.exit(0); }

  // 3. backup ALL orphans (full data) — gitignored sibling dir.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../../../pbscoutpro_backups_tactics/${stamp}`);
  const backup = orphans.map((o) => ({ path: o.ref.path, lid: o.lid, tid: o.tid, data: o.data }));
  if (LIVE) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'orphan_tactics_backup.json'), JSON.stringify(backup, null, 2));
    console.log(`\n[backup] wrote ${orphans.length} orphan docs → ${backupDir}\\orphan_tactics_backup.json`);
  } else {
    console.log(`\n[dry] WOULD back up ${orphans.length} orphan docs → ${backupDir}\\orphan_tactics_backup.json`);
  }

  // 4. migrate the uncovered forward (copy-by-id, raw shape).
  for (const o of uncovered) {
    if (LIVE) {
      await twinRef(o).set(o.data);
      console.log(`[migrate] copied ${o.lid}/${o.tid} → layoutOverlays`);
    } else {
      console.log(`[dry] WOULD copy ${o.lid}/${o.tid} → layoutOverlays`);
    }
  }

  // 5. verify post-migrate coverage (live only).
  if (LIVE) {
    let stillMissing = 0;
    for (const o of uncovered) { if (!(await twinRef(o).get()).exists) stillMissing++; }
    if (stillMissing > 0) { console.error(`\n[ABORT] ${stillMissing} migrated twins not found — NOT deleting. Investigate.`); process.exit(1); }
    console.log('[verify] all uncovered orphans now have twins ✓');
  }

  // 6. delete all orphans.
  if (LIVE) {
    let n = 0;
    for (const o of orphans) { await o.ref.delete(); n++; }
    console.log(`\n[delete] removed ${n} orphan docs from layouts/{id}/tactics`);
  } else {
    console.log(`\n[dry] WOULD delete ${orphans.length} orphan docs from layouts/{id}/tactics`);
  }

  // 7. final census.
  if (LIVE) {
    const after = await db.collectionGroup('tactics').get();
    const c2 = { layouts: 0, layoutOverlays: 0, tournaments: 0 };
    after.forEach((d) => { const c = classify(d.ref.path); c2[c.parentCol] = (c2[c.parentCol] || 0) + 1; });
    console.log(`\n=== final census ===\n  layouts: ${c2.layouts} (expect 0) · layoutOverlays: ${c2.layoutOverlays} (expect ${census.layoutOverlays + uncovered.length}) · tournaments: ${c2.tournaments} (expect ${census.tournaments}, untouched)`);
  }
  console.log(`\n${LIVE ? 'LIVE done.' : 'DRY done — re-run with --live to execute.'}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
