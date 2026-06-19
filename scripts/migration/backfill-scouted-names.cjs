// Backfill `name` onto scouted-team docs so the tournament roster renders even
// when the global team catalog is unavailable on the client (the consumer used
// to drop any scouted row whose teamId didn't resolve → whole list vanished).
// Stamps name from global /teams. Dry by default; pass --live to write.
//   node scripts/migration/backfill-scouted-names.cjs           (dry)
//   node scripts/migration/backfill-scouted-names.cjs --live    (write)
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)) });
const db = admin.firestore();
const LIVE = process.argv.includes('--live');
const WS = 'ranger1996';

(async () => {
  // team id -> name
  const teams = await db.collection('teams').get();
  const nameById = new Map(teams.docs.map(d => [d.id, d.data().name || null]));
  console.log(`teams catalog: ${nameById.size}`);

  const trs = await db.collection(`workspaces/${WS}/tournaments`).get();
  let scanned = 0, toWrite = 0, noTeam = 0, alreadySet = 0;
  const writes = [];
  for (const t of trs.docs) {
    const sc = await db.collection(`workspaces/${WS}/tournaments/${t.id}/scouted`).get();
    for (const s of sc.docs) {
      scanned++;
      const d = s.data();
      if (d.name) { alreadySet++; continue; }
      const nm = nameById.get(d.teamId);
      if (!nm) { noTeam++; continue; }
      toWrite++;
      writes.push({ ref: s.ref, name: nm, tournament: t.data().name || t.id });
    }
  }
  console.log(`\nscanned=${scanned} alreadySet=${alreadySet} toWrite=${toWrite} noResolvableTeam=${noTeam}`);
  writes.slice(0, 40).forEach(w => console.log(`  [${w.tournament}] ${w.ref.id} → "${w.name}"`));
  if (writes.length > 40) console.log(`  … +${writes.length - 40} more`);

  if (!LIVE) { console.log('\nDRY — pass --live to write.'); process.exit(0); }
  // batched writes
  let batch = db.batch(), n = 0;
  for (const w of writes) {
    batch.update(w.ref, { name: w.name });
    if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (n % 400 !== 0) await batch.commit();
  console.log(`\n✓ wrote name onto ${writes.length} scouted docs.`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
