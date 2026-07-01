// STAGE 2 — wire relative logoUrl onto the canonical EU Pro team docs.
// Canonical doc = externalId-preferred pick from the STAGE 1 reconciliation
// (explicit IDs, not a heuristic, so we never write to the wrong duplicate).
// Replicates updateTeam: setDoc(merge){logoUrl, updatedAt} + one catalogVersion
// bump (else the 30d cache hides the new logo). Drift-guarded + idempotent.
//   node scripts/logos/wire_eu_logos.cjs          # DRY (prints plan)
//   node scripts/logos/wire_eu_logos.cjs --live   # writes
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault() });
const db = admin.firestore();
const LIVE = process.argv.includes('--live');

// [teamId, expected-name-substring (drift guard), avif file]
const PLAN = [
  ['Iz5WYI18ja8Pbsnqv3ui', 'Austin FSU',   'AustinFSU.avif'],
  ['CusIr5u82uC11f6SutHf', 'Ballistics',   'BallisticsGoettingen.avif'],
  ['sG5XH5bY6ErJJd2SAU07', 'Droogs',       'DroogsFrankfurt.avif'],
  ['cYmUUrKz7Hd2v4XO1pIX', 'Fivestar',     'FiveStar.avif'],
  ['culE7ynoj7hODMud1zez', 'Joy Division', 'JoyDivisionStockholm.avif'],
  ['IfxmyXw14UDf7N80X96O', 'London Attrition', 'LondonAttrition.avif'],
  ['T5UCgJwvtZlHeekZ3GVW', 'Manchester Firm',  'ManchesterFirm.avif'],
  ['q4C1u4R4wM66k716XXRi', 'Comin',        'CominAtYa.avif'],
  ['yXYg5HSaqZM3KpF5ffnZ', 'OUTRAGE',      'Outrage.avif'],
  ['39qys8Fi5qreNmymamz5', 'Ronholt',      'RonholtDynamite.avif'],
  ['HAog18BdKMcIYUMY1QON', 'Breakout',     'Breakout.avif'],
  ['5hFFcVi03eLfk0VlRbr5', 'SCALP',        'Scalp.avif'],
  ['7JNZJNlaSmRk4BVTfaJK', 'Ranger Warsaw', 'RangerWarsaw.avif'],
];

(async () => {
  console.log(`mode: ${LIVE ? 'LIVE' : 'DRY'}\n`);
  let ok = 0, skip = 0, drift = 0;
  for (const [id, expect, file] of PLAN) {
    const ref = db.collection('teams').doc(id);
    const snap = await ref.get();
    if (!snap.exists) { console.log(`[MISSING] ${id} (${expect}) — SKIP`); drift++; continue; }
    const t = snap.data();
    const nameOk = (t.name || '').toLowerCase().includes(expect.toLowerCase());
    if (!nameOk) { console.log(`[DRIFT] ${id} expected "${expect}" got "${t.name}" — SKIP`); drift++; continue; }
    const target = `team-logos/${file}`;
    if (t.logoUrl && t.logoUrl !== target) {
      console.log(`[HAS-LOGO] ${t.name} already="${t.logoUrl}" — SKIP (no overwrite)`); skip++; continue;
    }
    if (t.logoUrl === target) { console.log(`[IDEMPOTENT] ${t.name} = ${target}`); ok++; continue; }
    console.log(`[SET] ${t.name}  →  logoUrl = ${target}`);
    if (LIVE) await ref.set({ logoUrl: target, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    ok++;
  }
  if (LIVE && ok) {
    await db.collection('meta').doc('catalogVersion').set(
      { version: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    console.log('\ncatalogVersion bumped (cache invalidated)');
  }
  console.log(`\n${LIVE ? 'wrote' : 'would write'}: ${ok} | skipped: ${skip} | drift/missing: ${drift}`);
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
