// Tactics PURGE — delete ALL tactics data across every store (admin-SDK).
// Jacek directive 2026-06-17: "Możemy wyrzucić wszystkie taktyki." All tactics
// live in his own `ranger1996` workspace (census: 26 layoutOverlays + 9 tournament,
// 0 customer docs), so this is data-only cleanup of his own data — NOT a feature
// removal (TacticPage / hooks / CRUD stay; the stores just go empty). This also
// supersedes OP1 (no migration of the 9 tournament docs — they're deleted too).
//
// Backup-first + idempotent. Sequence:
//   1. census via collectionGroup('tactics'); list every doc + its store.
//   2. BACKUP all docs (full data) to a gitignored sibling dir.
//   3. DELETE every tactics doc (all stores).
//   4. final census (expect 0).
//
// Usage: node tactics_purge_all.cjs --dry   (no writes; reports the plan)
//        node tactics_purge_all.cjs --live  (backup + delete all)
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
  return { ws: segs[1], store: segs[segs.length - 4], lid: segs[segs.length - 3], tid: segs[segs.length - 1] };
}

(async () => {
  const snap = await db.collectionGroup('tactics').get();
  const docs = [];
  const byStore = {}, byWs = {};
  snap.forEach((d) => {
    const c = classify(d.ref.path);
    byStore[c.store] = (byStore[c.store] || 0) + 1;
    byWs[c.ws] = (byWs[c.ws] || 0) + 1;
    docs.push({ ref: d.ref, data: d.data(), ...c });
  });

  console.log('=== census ===');
  console.log('  total :', snap.size);
  console.log('  store :', JSON.stringify(byStore));
  console.log('  ws    :', JSON.stringify(byWs));

  if (docs.length === 0) { console.log('\nNothing to purge — already empty.'); process.exit(0); }

  // SAFETY: this script is for ranger1996-only data. If any OTHER workspace has
  // tactics, ABORT — that would be customer data and needs an explicit decision.
  const otherWs = Object.keys(byWs).filter((w) => w !== 'ranger1996');
  if (otherWs.length) {
    console.error(`\n[ABORT] tactics found outside ranger1996: ${otherWs.join(', ')} — refusing to purge customer data. Re-scope the directive.`);
    process.exit(1);
  }

  // 2. backup (full data) → outside-repo, gitignored.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../../../pbscoutpro_backups_tactics/${stamp}-purge-all`);
  const backup = docs.map((d) => ({ path: d.ref.path, store: d.store, lid: d.lid, tid: d.tid, data: d.data }));
  if (LIVE) {
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'all_tactics_backup.json'), JSON.stringify(backup, null, 2));
    console.log(`\n[backup] wrote ${docs.length} docs → ${backupDir}\\all_tactics_backup.json`);
  } else {
    console.log(`\n[dry] WOULD back up ${docs.length} docs → ${backupDir}\\all_tactics_backup.json`);
  }

  // 3. delete all (chunked batches).
  if (LIVE) {
    let n = 0;
    while (n < docs.length) {
      const batch = db.batch();
      const slice = docs.slice(n, n + 400);
      slice.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      n += slice.length;
      console.log(`[delete] ${n}/${docs.length}`);
    }
  } else {
    console.log(`\n[dry] WOULD delete all ${docs.length} tactics docs (${JSON.stringify(byStore)})`);
  }

  // 4. final census.
  if (LIVE) {
    const after = await db.collectionGroup('tactics').get();
    console.log(`\n=== final census ===\n  total tactics: ${after.size} (expect 0)`);
  }
  console.log(`\n${LIVE ? 'LIVE done.' : 'DRY done — re-run with --live to execute.'}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
