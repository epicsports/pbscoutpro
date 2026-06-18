// Pack the global /players + /teams catalogs into /catalog/{kind} (manifest) +
// /catalog/{kind}/chunks/{i} so the client cold-load reads ~3 docs instead of
// ~2,579. Stamped with the CURRENT /meta/catalogVersion so the client's
// version-gate serves it. Re-run after any super_admin catalog edit that bumped
// the version (the client also self-heals on a super_admin reload).
// See docs/CC_BRIEF_CATALOG_PACKED_LOAD.md.
//
// Usage:
//   node scripts/migration/pack-catalog.cjs            # DRY (report only)
//   node scripts/migration/pack-catalog.cjs --live     # write the packed docs
const admin = require('firebase-admin');
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
admin.initializeApp();
const db = admin.firestore();

const LIVE = process.argv.includes('--live');
const PACK_CHUNK = 1200; // must match dataService.js PACK_CHUNK

async function packKind(kind, version) {
  const snap = await db.collection(kind).orderBy('name', 'asc').get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const chunkCount = Math.max(1, Math.ceil(docs.length / PACK_CHUNK));
  const bytes = Buffer.byteLength(JSON.stringify(docs), 'utf8');
  console.log(`/${kind}: ${docs.length} docs → ${chunkCount} chunk(s), ~${(bytes / 1024).toFixed(0)} KB total (~${(bytes / chunkCount / 1024).toFixed(0)} KB/chunk)`);
  if (!LIVE) return;
  for (let i = 0; i < chunkCount; i++) {
    const items = docs.slice(i * PACK_CHUNK, (i + 1) * PACK_CHUNK);
    await db.doc(`catalog/${kind}/chunks/${i}`).set({ version, items });
  }
  // manifest LAST so a half-write is never read as complete
  await db.doc(`catalog/${kind}`).set({ version, chunkCount, count: docs.length, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`  ✓ wrote /catalog/${kind} (+${chunkCount} chunks) @ version ${version}`);
}

(async () => {
  const v = await db.doc('meta/catalogVersion').get();
  const version = v.exists ? v.data().version : null;
  if (version == null) { console.error('meta/catalogVersion missing — cannot stamp pack'); process.exit(1); }
  console.log(`catalogVersion=${version}  mode=${LIVE ? 'LIVE (writing)' : 'DRY (report only)'}\n`);
  await packKind('players', version);
  await packKind('teams', version);
  console.log(LIVE ? '\nDone. Client cold-loads now read the packed docs.' : '\nDry run — pass --live to write.');
  process.exit(0);
})().catch(e => { console.error('PACK FAILED:', e?.code || e?.stack || e?.message); process.exit(1); });
