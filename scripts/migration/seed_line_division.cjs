/**
 * § 98 STAGE 2 — seed `lineDivision` on each workspace layout overlay.
 *
 * The 2 field-division thresholds (discoLine / zeekerLine) relocate from the
 * global BASE /layouts/{id} to the per-team OVERLAY
 * /workspaces/{slug}/layoutOverlays/{id}.lineDivision. The useLayouts merge
 * already falls back to base disco/zeeker when lineDivision is absent
 * (§88-style read-time fallback), so this seeding is NOT required for
 * correctness — it makes the values explicit/editable for the Stage-4 Linie UI.
 *
 *   lineDivision: {
 *     disco:  { y: <base.discoLine>,  name: 'Dorito side', color: '#fb923c' },
 *     zeeker: { y: <base.zeekerLine>, name: 'Snake side',  color: '#22d3ee' },
 *   }
 *
 * disco→'Dorito side', zeeker→'Snake side' per the coachingStats orientation
 * (doritoSide='top' → disco at y=discoLine near the dorito half). Seed colors =
 * the CURRENT drawZones render colors (disco #fb923c, zeeker #22d3ee) for visual
 * continuity; Stage 4 lets the admin recolor from COLORS.zonePalette.
 *
 * Idempotent: skips any overlay that already has `lineDivision`. Re-running
 * converges to the same state. Base discoLine/zeekerLine are left untouched
 * (kept readable ~1 ship cycle as the merge fallback; a later follow-up drops
 * them).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=... node seed_line_division.cjs         # --dry (default)
 *   GOOGLE_APPLICATION_CREDENTIALS=... node seed_line_division.cjs --live  # write
 *   WS_SLUG=ranger1996 (default)
 */
const admin = require('firebase-admin');

const LIVE = process.argv.includes('--live');
const SLUG = process.env.WS_SLUG || 'ranger1996';
const SA = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA) { console.error('set GOOGLE_APPLICATION_CREDENTIALS'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(SA)) });
const db = admin.firestore();
const { Timestamp } = admin.firestore;

const DISCO_DEFAULT = 0.30;
const ZEEKER_DEFAULT = 0.80;
const DISCO_COLOR = '#fb923c';   // current drawZones disco render color
const ZEEKER_COLOR = '#22d3ee';  // current drawZones zeeker render color

const buildDivision = (base) => ({
  disco:  { y: base.discoLine ?? DISCO_DEFAULT,  name: 'Dorito side', color: DISCO_COLOR },
  zeeker: { y: base.zeekerLine ?? ZEEKER_DEFAULT, name: 'Snake side',  color: ZEEKER_COLOR },
});

(async () => {
  const dry = !LIVE;
  console.log(`\n§98 STAGE 2 — seed lineDivision — workspace=${SLUG} — mode=${dry ? 'DRY (no writes)' : 'LIVE'}\n`);

  const overlays = await db.collection(`workspaces/${SLUG}/layoutOverlays`).get();
  console.log(`overlays found: ${overlays.size}\n`);

  let seeded = 0, skipped = 0, orphan = 0;
  for (const o of overlays.docs) {
    const id = o.id;
    const ov = o.data();
    if (ov.lineDivision) {
      console.log(`  ⏭  ${id} — lineDivision already present (skip)`);
      skipped++;
      continue;
    }
    const baseId = ov.baseLayoutId || id;
    const baseSnap = await db.doc(`layouts/${baseId}`).get();
    if (!baseSnap.exists) {
      console.log(`  ⚠  ${id} — base /layouts/${baseId} missing (orphan overlay) — skip`);
      orphan++;
      continue;
    }
    const base = baseSnap.data();
    const division = buildDivision(base);
    console.log(`  ${dry ? 'WOULD seed' : 'seed'} ${id}  disco.y=${division.disco.y} ("${division.disco.name}") · zeeker.y=${division.zeeker.y} ("${division.zeeker.name}")`);
    if (!dry) {
      await o.ref.set({ lineDivision: division, lineDivisionSeededAt: Timestamp.now() }, { merge: true });
    }
    seeded++;
  }

  console.log(`\n── summary ──`);
  console.log(`  overlays: ${overlays.size} · ${dry ? 'to seed' : 'seeded'}: ${seeded} · already-present: ${skipped} · orphan(base-missing): ${orphan}`);
  console.log(`  base discoLine/zeekerLine: UNTOUCHED (merge fallback for un-seeded overlays)`);
  console.log(`\n${dry ? 'DRY RUN — no writes. Re-run with --live to apply.' : 'LIVE — seeding applied.'}`);
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
