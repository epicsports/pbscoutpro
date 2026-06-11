// READ-ONLY prod probe: do scouted docs carry createdAt? (subscribeScoutedTeams
// orderBy('createdAt') silently drops docs missing it → eternal Loading.) Confirms
// the audit scouted-team hang is a SEED artifact, not a prod bug.
const admin = require('firebase-admin');
admin.initializeApp();
(async () => {
  const db = admin.firestore();
  const SLUG = 'ranger1996';
  const tourns = await db.collection(`workspaces/${SLUG}/tournaments`).get();
  let total = 0, withCreated = 0; const missing = [];
  for (const t of tourns.docs) {
    const sc = await t.ref.collection('scouted').get();
    for (const s of sc.docs) { total++; if (s.data().createdAt) withCreated++; else missing.push(`${t.id}/${s.id}`); }
  }
  console.log(`prod ${SLUG}: scouted docs=${total}  with createdAt=${withCreated}  MISSING=${total - withCreated}`);
  if (missing.length) console.log('  missing: ' + missing.slice(0, 15).join(', '));
  process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
