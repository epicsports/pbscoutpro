// READ-ONLY count: how often is opponent movement (bumpStop) actually
// recorded in tournament points? Drives the v1.1 "transit %" decision —
// if a meaningful share of player-in-point records carry a bumpStop,
// segment∩polygon transit detection is worth building. If it's ~0,
// transit folds into the bigger movement/shot-by-zone pass.
//
// Scope:
//   - Iterates /workspaces/{slug}/tournaments/* — SKIPS tournaments
//     flagged `isTest: true`.
//   - Per point: counts slots in BOTH sides (concurrent shape:
//     homeData/awayData; legacy shape: teamA/teamB), only where
//     a player position is actually placed (`players[i] != null`).
//   - "Has movement" = bumpStops[i] != null on the same slot.
//
// Output: total / with-bump / static-only counts + percentages,
// broken out by shape (concurrent vs legacy) for sanity.
//
// NO writes. NO commits. Pure read.
//
// RUN (Jacek, in a shell with creds):
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   node scripts/migration/count_opponent_movement.cjs
//
// Or on Windows via the wrapper:
//   scripts\migration\count_opponent_movement.cmd

const admin = require('firebase-admin');
admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS

const SLUG = 'ranger1996';

function countSide(side, agg, label) {
  if (!side || typeof side !== 'object') return;
  const players = Array.isArray(side.players) ? side.players : [];
  const bumps = Array.isArray(side.bumpStops) ? side.bumpStops : (Array.isArray(side.bumps) ? side.bumps : []);
  // Only count slots where a player was actually placed.
  for (let i = 0; i < 5; i++) {
    if (players[i] && typeof players[i].x === 'number' && typeof players[i].y === 'number') {
      agg[label].total++;
      if (bumps[i] && typeof bumps[i].x === 'number' && typeof bumps[i].y === 'number') {
        agg[label].withBump++;
      } else {
        agg[label].staticOnly++;
      }
    }
  }
}

function pct(num, denom) {
  if (!denom) return '—';
  return (Math.round((num / denom) * 1000) / 10).toFixed(1) + '%';
}

(async () => {
  const db = admin.firestore();
  const tournRef = db.collection(`workspaces/${SLUG}/tournaments`);
  const tournSnap = await tournRef.get();

  const agg = {
    concurrent: { total: 0, withBump: 0, staticOnly: 0 },
    legacy:     { total: 0, withBump: 0, staticOnly: 0 },
  };

  let tournamentsScanned = 0;
  let tournamentsSkippedTest = 0;
  let matchesScanned = 0;
  let pointsScanned = 0;

  for (const tDoc of tournSnap.docs) {
    const tData = tDoc.data() || {};
    if (tData.isTest === true) { tournamentsSkippedTest++; continue; }
    tournamentsScanned++;

    const matchesSnap = await tournRef.doc(tDoc.id).collection('matches').get();
    for (const mDoc of matchesSnap.docs) {
      matchesScanned++;
      const pointsSnap = await mDoc.ref.collection('points').get();
      for (const pDoc of pointsSnap.docs) {
        pointsScanned++;
        const p = pDoc.data() || {};
        // Concurrent shape (current)
        countSide(p.homeData, agg, 'concurrent');
        countSide(p.awayData, agg, 'concurrent');
        // Legacy shape (pre-§18)
        countSide(p.teamA, agg, 'legacy');
        countSide(p.teamB, agg, 'legacy');
      }
    }
  }

  const combined = {
    total: agg.concurrent.total + agg.legacy.total,
    withBump: agg.concurrent.withBump + agg.legacy.withBump,
    staticOnly: agg.concurrent.staticOnly + agg.legacy.staticOnly,
  };

  console.log('');
  console.log('=== Opponent movement fill rate — read-only count ===');
  console.log('');
  console.log(`tournaments scanned : ${tournamentsScanned}`);
  console.log(`isTest skipped       : ${tournamentsSkippedTest}`);
  console.log(`matches scanned      : ${matchesScanned}`);
  console.log(`points scanned       : ${pointsScanned}`);
  console.log('');
  console.log('player-in-point records (only counted where players[i] != null):');
  console.log('');
  console.log('  shape       | total | with bump | static only | bump rate');
  console.log('  ------------+-------+-----------+-------------+----------');
  console.log(`  concurrent  | ${String(agg.concurrent.total).padStart(5)} | ${String(agg.concurrent.withBump).padStart(9)} | ${String(agg.concurrent.staticOnly).padStart(11)} | ${pct(agg.concurrent.withBump, agg.concurrent.total).padStart(8)}`);
  console.log(`  legacy      | ${String(agg.legacy.total).padStart(5)} | ${String(agg.legacy.withBump).padStart(9)} | ${String(agg.legacy.staticOnly).padStart(11)} | ${pct(agg.legacy.withBump, agg.legacy.total).padStart(8)}`);
  console.log(`  COMBINED    | ${String(combined.total).padStart(5)} | ${String(combined.withBump).padStart(9)} | ${String(combined.staticOnly).padStart(11)} | ${pct(combined.withBump, combined.total).padStart(8)}`);
  console.log('');
  console.log('avg bumpStops per record where present: 1.00 (single position per slot, not a waypoint array — see § 79 / § 2.5)');
  console.log('');
  console.log('DONE (read-only).');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
