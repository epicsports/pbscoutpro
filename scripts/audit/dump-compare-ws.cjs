// Structural diff: demo-ws (works) vs audit-ws (hangs). Emulator only.
const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-pbscoutpro' });
const db = admin.firestore();

async function dump(slug) {
  const ref = db.doc(`workspaces/${slug}`);
  const snap = await ref.get();
  const out = { exists: snap.exists, doc: snap.exists ? snap.data() : null, subs: {} };
  if (snap.exists) { for (const c of await ref.listCollections()) { out.subs[c.id] = (await c.get()).size; } }
  return out;
}
(async () => {
  for (const slug of ['demo-ws', 'audit-ws']) {
    const d = await dump(slug);
    console.log(`\n=== workspaces/${slug} === exists:${d.exists}`);
    if (d.doc) {
      console.log('  doc keys:', Object.keys(d.doc).sort().join(', '));
      console.log('  members:', JSON.stringify(d.doc.members));
      console.log('  userRoles:', JSON.stringify(d.doc.userRoles));
      console.log('  rolesVersion:', d.doc.rolesVersion, '| adminUid:', d.doc.adminUid, '| pendingApprovals:', JSON.stringify(d.doc.pendingApprovals));
    }
    console.log('  subcollections:', JSON.stringify(d.subs));
  }
  console.log('\n=== /meta docs ===', (await db.collection('meta').get()).docs.map(d => d.id));
  for (const uid of ['test-coach', 'audit-coach']) {
    const u = await db.doc(`users/${uid}`).get();
    console.log(`user/${uid}:`, u.exists ? JSON.stringify(u.data()) : 'MISSING');
  }
  // catalog the coach reads: global players/teams counts
  console.log('global players:', (await db.collection('players').get()).size, '| teams:', (await db.collection('teams').get()).size);
  process.exit(0);
})().catch(e => { console.error('DUMP FAILED:', e); process.exit(1); });
