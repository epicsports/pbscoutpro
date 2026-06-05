/**
 * B24 (b) — --live repair of double-encoded UTF-8 in global /players names.
 *
 * Mirrors b24_mojibake_audit.cjs detection + the app-side repairMojibake util
 * (fatal latin1→utf8 round-trip). Re-detects LIVE, backs up every original to a
 * LOCAL file (outside the repo), rewrites the corrupt name/nickname fields, bumps
 * /meta/catalogVersion so clients refresh, and verifies 0 remain.
 *
 * Safety: DRY by default. Aborts if the live hit count drifts from EXPECTED by
 * more than DRIFT. Reversible via the JSON backup (id + field + original value).
 *
 * RUN:
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\...\adminsdk.json
 *   node scripts/migration/b24_mojibake_repair.cjs                 # dry
 *   set B24_REPAIR_CONFIRMED=1 && node ...                          # live
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) { console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();
const FV = admin.firestore.FieldValue;

const CONFIRMED = process.env.B24_REPAIR_CONFIRMED === '1';
const EXPECTED = 16;     // from the 2026-06-05 audit
const DRIFT = 8;

const MARKER = /[À-ß�]/;
function repair(input) {
  if (typeof input !== 'string' || !input) return null;
  if (!MARKER.test(input)) return null;
  const codes = [];
  for (const ch of input) { const c = ch.codePointAt(0); if (c > 0xFF) return null; codes.push(c); }
  let d;
  try { d = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(codes)); }
  catch { return null; }
  if (d === input || d.includes('�')) return null;
  return d;
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TS = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.resolve(REPO_ROOT, '..', 'pbscoutpro_backups_b24', TS);

(async () => {
  console.log(`\n=== B24 (b) name repair — ${CONFIRMED ? 'LIVE' : 'DRY'} ===\n`);
  const snap = await db.collection('players').get();
  const fixes = []; // { id, ref, patch:{}, before:{}, after:{} }
  snap.forEach(d => {
    const x = d.data();
    const patch = {}, before = {}, after = {};
    for (const field of ['name', 'nickname']) {
      const rep = repair(x[field]);
      if (rep) { patch[field] = rep; before[field] = x[field]; after[field] = rep; }
    }
    if (Object.keys(patch).length) fixes.push({ id: d.id, ref: d.ref, patch, before, after });
  });

  console.log(`global /players scanned : ${snap.size}`);
  console.log(`docs needing repair     : ${fixes.length} (expected ~${EXPECTED})\n`);
  fixes.forEach(f => Object.keys(f.patch).forEach(k => console.log(`   ${f.id} [${k}] "${f.before[k]}" -> "${f.after[k]}"`)));

  if (Math.abs(fixes.length - EXPECTED) > DRIFT) {
    console.error(`\nSAFETY ABORT: count ${fixes.length} drifts from ${EXPECTED} (> ${DRIFT}). Re-run the audit + review.`);
    process.exit(3);
  }
  if (!fixes.length) { console.log('NO-OP — nothing to repair (idempotent).'); process.exit(0); }

  // Always write the backup (even in dry) so it's ready before any write.
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFile = path.join(BACKUP_DIR, 'b24_name_originals.json');
  fs.writeFileSync(backupFile, JSON.stringify(fixes.map(f => ({ id: f.id, before: f.before, after: f.after })), null, 2), 'utf8');
  console.log(`\nbackup of originals -> ${backupFile}`);

  if (!CONFIRMED) { console.log('\nDRY — no writes. Set B24_REPAIR_CONFIRMED=1 to repair.'); process.exit(0); }

  let n = 0;
  for (const f of fixes) { await f.ref.update(f.patch); n++; }
  await db.doc('meta/catalogVersion').set({ version: Date.now(), updatedAt: FV.serverTimestamp() }, { merge: true });
  console.log(`\nrepaired ${n} docs; bumped /meta/catalogVersion.`);

  // Verify
  let remain = 0;
  const after = await db.collection('players').get();
  after.forEach(d => { const x = d.data(); if (repair(x.name) || repair(x.nickname)) remain++; });
  console.log(`post-repair mojibake remaining: ${remain}${remain ? '  ⚠ NON-ZERO' : '  ✓'}`);
  console.log('\nDONE.');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
