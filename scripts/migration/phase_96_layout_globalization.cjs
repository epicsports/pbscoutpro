/**
 * § 96 Layout globalization — STAGE 3 migration.
 *
 * Splits each workspace layout into:
 *   • global  /layouts/{id}                     (BASE: geometry + preview + dims)
 *   • /workspaces/{slug}/layoutOverlays/{id}    (OVERLAY: zones + legacy mirror
 *                                                + tactics/insights subcols)
 * The doc id is PRESERVED (base id == overlay id == legacy id) so existing
 * tournament.layoutId references resolve unchanged.
 *
 * Idempotent: bases/overlays are written with full set() using a computed
 * stable createdAt (source's, else any existing dest's, else now); subcollection
 * docs are copied by id. Re-running converges to the same state.
 *
 * The legacy /workspaces/{slug}/layouts/{id} docs are NOT deleted (rollback
 * safety) — a later cleanup removes them once verified in prod.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node phase_96_layout_globalization.cjs        # --dry (default)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node phase_96_layout_globalization.cjs --live  # write
 */
const admin = require('firebase-admin');

const LIVE = process.argv.includes('--live');
const SLUG = process.env.WS_SLUG || 'ranger1996';
const SA = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA) { console.error('set GOOGLE_APPLICATION_CREDENTIALS'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(SA)) });
const db = admin.firestore();
const { Timestamp } = admin.firestore;

const BASE_FIELDS = ['name', 'league', 'year', 'fieldImage', 'discoLine',
  'zeekerLine', 'bunkers', 'fieldCalibration', 'mirrorMode', 'doritoSide'];

const pickBase = (src) => ({
  name: src.name ?? null,
  league: src.league ?? 'NXL',
  year: src.year ?? new Date().getFullYear(),
  fieldImage: src.fieldImage ?? null,
  discoLine: src.discoLine ?? 0.30,
  zeekerLine: src.zeekerLine ?? 0.80,
  bunkers: src.bunkers ?? [],
  fieldCalibration: src.fieldCalibration ?? null,
  mirrorMode: src.mirrorMode ?? 'y',
  doritoSide: src.doritoSide ?? 'top',
});

const pickOverlay = (id, src) => ({
  baseLayoutId: id,
  nameOverride: null,
  zones: src.zones ?? [],
  dangerZone: src.dangerZone ?? null,
  sajgonZone: src.sajgonZone ?? null,
  bigMoveZone: src.bigMoveZone ?? null,
});

async function stableCreatedAt(src, destRef) {
  if (src.createdAt) return src.createdAt;
  const dest = await destRef.get();
  if (dest.exists && dest.data().createdAt) return dest.data().createdAt;
  return Timestamp.now();
}

async function copySub(srcCol, dstCol, dry, log) {
  const snap = await srcCol.get();
  if (snap.empty) return 0;
  for (const d of snap.docs) {
    log(`        ${dry ? 'WOULD copy' : 'copy'} ${snap.size === 1 ? '' : ''}${dstCol.path}/${d.id}`);
    if (!dry) await dstCol.doc(d.id).set(d.data());
  }
  return snap.size;
}

(async () => {
  const dry = !LIVE;
  console.log(`\n§96 STAGE 3 migration — workspace=${SLUG} — mode=${dry ? 'DRY (no writes)' : 'LIVE'}\n`);

  const lays = await db.collection(`workspaces/${SLUG}/layouts`).get();
  console.log(`legacy layouts found: ${lays.size}\n`);
  const migratedIds = new Set();
  let tacticsTotal = 0, insightsTotal = 0;

  for (const l of lays.docs) {
    const id = l.id;
    const src = l.data();
    migratedIds.add(id);
    const base = pickBase(src);
    const overlay = pickOverlay(id, src);
    const baseRef = db.doc(`layouts/${id}`);
    const overlayRef = db.doc(`workspaces/${SLUG}/layoutOverlays/${id}`);
    const baseCreatedAt = await stableCreatedAt(src, baseRef);
    const overlayCreatedAt = await stableCreatedAt(src, overlayRef);

    console.log(`▸ ${id} "${src.name || '?'}" (${base.league}/${base.year})`);
    console.log(`    BASE → /layouts/${id}  bunkers=${base.bunkers.length} fieldImage=${base.fieldImage ? 'yes' : 'no'} calib=${base.fieldCalibration ? 'yes' : 'no'} mirror=${base.mirrorMode} dorito=${base.doritoSide}`);
    console.log(`    OVERLAY → /workspaces/${SLUG}/layoutOverlays/${id}  zones=${overlay.zones.length} danger=${overlay.dangerZone ? 'set' : '-'} sajgon=${overlay.sajgonZone ? 'set' : '-'} bigMove=${overlay.bigMoveZone ? 'set' : '-'}`);
    // warn on any source key NOT classified into base or overlay (drift guard)
    const known = new Set([...BASE_FIELDS, 'zones', 'dangerZone', 'sajgonZone', 'bigMoveZone', 'createdAt', 'updatedAt']);
    const unknown = Object.keys(src).filter(k => !known.has(k));
    if (unknown.length) console.log(`    ⚠ unclassified source keys (left on legacy doc, not migrated): ${unknown.join(', ')}`);

    if (!dry) {
      await baseRef.set({ ...base, createdAt: baseCreatedAt, migratedAt: Timestamp.now() });
      await overlayRef.set({ ...overlay, createdAt: overlayCreatedAt, migratedAt: Timestamp.now() });
    }

    const tCount = await copySub(
      db.collection(`workspaces/${SLUG}/layouts/${id}/tactics`),
      db.collection(`workspaces/${SLUG}/layoutOverlays/${id}/tactics`), dry, console.log);
    const iCount = await copySub(
      db.collection(`workspaces/${SLUG}/layouts/${id}/insights`),
      db.collection(`workspaces/${SLUG}/layoutOverlays/${id}/insights`), dry, console.log);
    tacticsTotal += tCount; insightsTotal += iCount;
    console.log(`    subcols: tactics=${tCount} insights=${iCount}`);
  }

  // ── Verify the 4 tournaments still resolve their layoutId post-split ──
  console.log(`\n── tournament.layoutId resolution check ──`);
  const trns = await db.collection(`workspaces/${SLUG}/tournaments`).get();
  let ok = 0, bad = 0;
  for (const t of trns.docs) {
    const lid = t.data().layoutId;
    if (!lid) { console.log(`  ${t.id} "${t.data().name}" — no layoutId (—)`); continue; }
    // post-split, base exists at /layouts/{lid} (or WILL after --live) AND
    // an overlay exists for the workspace.
    const baseWillExist = migratedIds.has(lid) || (await db.doc(`layouts/${lid}`).get()).exists;
    const overlayWillExist = migratedIds.has(lid) || (await db.doc(`workspaces/${SLUG}/layoutOverlays/${lid}`).get()).exists;
    const good = baseWillExist && overlayWillExist;
    console.log(`  ${t.id} "${t.data().name}" layoutId=${lid} → base=${baseWillExist ? 'Y' : 'N'} overlay=${overlayWillExist ? 'Y' : 'N'} ${good ? 'OK' : '❌ DANGLING'}`);
    good ? ok++ : bad++;
  }

  console.log(`\n── summary ──`);
  console.log(`  layouts ${dry ? 'to migrate' : 'migrated'}: ${lays.size} (bases + overlays)`);
  console.log(`  tactics copied: ${tacticsTotal} · insights copied: ${insightsTotal}`);
  console.log(`  tournaments resolving: ${ok} OK · ${bad} dangling`);
  console.log(`  legacy /workspaces/${SLUG}/layouts/* docs: PRESERVED (rollback safety)`);
  console.log(`\n${dry ? 'DRY RUN — no writes performed. Re-run with --live to apply.' : 'LIVE — migration applied.'}`);
  if (bad > 0) console.log('  ⚠ DANGLING tournaments above — investigate before/after --live.');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
