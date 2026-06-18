// READ-ONLY prod diagnostic (admin-SDK; autonomous). No writes.
// Quantify the cold-load: how many global /players + /teams docs, total payload
// bytes, wall-clock to fetch the whole collection, and how much is "wasted"
// (non-canonical / alias docs that mergeByClass collapses). Grounds the
// pagination-vs-windowing-vs-shrink decision.
const admin = require('firebase-admin');
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
admin.initializeApp();
const db = admin.firestore();

const bytes = (o) => Buffer.byteLength(JSON.stringify(o), 'utf8');

(async () => {
  for (const col of ['players', 'teams']) {
    const t0 = Date.now();
    const snap = await db.collection(col).orderBy('name', 'asc').get();
    const ms = Date.now() - t0;
    let total = 0; let withAlias = 0; let aliasCount = 0; let maxDoc = 0;
    const fields = {};
    snap.forEach(d => {
      const data = d.data();
      const b = bytes(data); total += b; if (b > maxDoc) maxDoc = b;
      if (Array.isArray(data.aliasIds) && data.aliasIds.length) { withAlias++; aliasCount += data.aliasIds.length; }
      Object.keys(data).forEach(k => { fields[k] = (fields[k] || 0) + 1; });
    });
    console.log(`\n=== /${col} ===`);
    console.log(`docs=${snap.size}  fetch=${ms}ms (admin SDK, server-side)`);
    console.log(`payload≈${(total/1024).toFixed(0)} KB (${(total/1024/1024).toFixed(2)} MB) JSON  avg=${(total/snap.size).toFixed(0)}B/doc  max=${maxDoc}B`);
    console.log(`docs carrying aliasIds: ${withAlias}  (total collapsed aliases: ${aliasCount})`);
    // field frequency — spot heavy/rarely-needed fields bloating the list payload
    const heavy = Object.entries(fields).sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${k}:${n}`).join('  ');
    console.log(`fields: ${heavy}`);
  }
  const v = await db.doc('meta/catalogVersion').get();
  console.log(`\n/meta/catalogVersion:`, v.exists ? JSON.stringify(v.data()) : '(missing)');
  process.exit(0);
})().catch(e => { console.error('READ FAILED:', e?.code || e?.message); process.exit(1); });
