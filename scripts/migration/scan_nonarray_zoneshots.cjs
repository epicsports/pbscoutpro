// READ-ONLY scan: are there any prod point docs whose zoneShots-family fields
// carry a NON-ARRAY per-slot inner value? This is the shape that crashed
// ScoutedTeamPage (generateInsights computeCalloutZoneTargets: tags[i].forEach
// is not a function). The guard now treats a non-array inner as empty — so if
// such docs exist, they are NOT crashing anymore but their tags are SILENTLY
// DROPPED. This scan tells us whether any real data is affected.
//
// Verdict context: every current WRITE path (quickShotsToFirestore — guarded by
// Array.isArray(a) && a.length; makeTeamData kf#0 + timeline settle/mid;
// self-log propagator — [...new Set()]) emits string[] inners only. The crash
// shape ({slot: {zoneId, kill}}) was a SEED-authoring error. This scan checks
// whether any LEGACY/historical write left the bad shape on disk.
//
// Fields checked (per side homeData/awayData/teamA/teamB AND per timeline
// keyframe .home/.away): zoneShots, zoneObstacleShots, quickShots, obstacleShots
// (the whole quick/zone family — all read the same way via quickShotsFromFirestore).
//
// Scope: ALL workspaces × (tournaments/matches/points + trainings/matchups/points).
// Skips isTest tournaments/trainings (they are throwaway). NO writes. Pure read.
//
// RUN:
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   node scripts/migration/scan_nonarray_zoneshots.cjs
//   (Windows: $env:GOOGLE_APPLICATION_CREDENTIALS="...json"; node ...)

const admin = require('firebase-admin');
admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS

const FIELDS = ['zoneShots', 'zoneObstacleShots', 'quickShots', 'obstacleShots'];

const agg = {
  workspaces: 0,
  pointsTournament: 0,
  pointsTraining: 0,
  badDocs: 0,        // distinct point docs with ≥1 bad inner
  badInners: 0,      // total non-array inner values
  byField: {},       // field -> count of bad inners
  samples: [],       // up to 25 example offenders
};
FIELDS.forEach(f => { agg.byField[f] = 0; });

// Inspect one quick/zone-family container (map {slot:val} OR array [val,...]).
// Returns array of { slot, type, sample } for each NON-ARRAY, NON-NULL inner.
function badInnersIn(container) {
  if (container == null) return [];
  const out = [];
  const entries = Array.isArray(container)
    ? container.map((v, i) => [String(i), v])
    : (typeof container === 'object' ? Object.entries(container) : null);
  if (!entries) {
    // The whole field is itself a non-array, non-object scalar — also wrong.
    return [{ slot: '*', type: typeof container, sample: String(container).slice(0, 40) }];
  }
  for (const [slot, val] of entries) {
    if (val == null) continue;            // null/undefined slot = empty, fine
    if (Array.isArray(val)) continue;     // string[] = correct
    out.push({ slot, type: typeof val, sample: JSON.stringify(val).slice(0, 60) });
  }
  return out;
}

function scanContainerObject(obj, label, path) {
  if (!obj || typeof obj !== 'object') return;
  for (const f of FIELDS) {
    const bad = badInnersIn(obj[f]);
    for (const b of bad) {
      agg.badInners++;
      agg.byField[f]++;
      if (agg.samples.length < 25) {
        agg.samples.push({ path: `${path} › ${label}.${f}[${b.slot}]`, type: b.type, sample: b.sample });
      }
    }
  }
}

// Scan a point doc: both sides + every timeline keyframe's two sides.
function scanPoint(p, path) {
  let hadBad = false;
  const before = agg.badInners;
  scanContainerObject(p.homeData, 'homeData', path);
  scanContainerObject(p.awayData, 'awayData', path);
  scanContainerObject(p.teamA, 'teamA', path);
  scanContainerObject(p.teamB, 'teamB', path);
  if (Array.isArray(p.timeline)) {
    p.timeline.forEach((e, i) => {
      if (!e || typeof e !== 'object') return;
      scanContainerObject(e.home, `timeline[${i}:${e.stage || '?'}].home`, path);
      scanContainerObject(e.away, `timeline[${i}:${e.stage || '?'}].away`, path);
    });
  }
  if (agg.badInners > before) hadBad = true;
  if (hadBad) agg.badDocs++;
}

(async () => {
  const db = admin.firestore();
  const wsSnap = await db.collection('workspaces').get();

  for (const wsDoc of wsSnap.docs) {
    agg.workspaces++;
    const slug = wsDoc.id;
    const wsRef = db.collection('workspaces').doc(slug);

    // — tournaments/{tid}/matches/{mid}/points/{pid} —
    const tournSnap = await wsRef.collection('tournaments').get();
    for (const tDoc of tournSnap.docs) {
      if ((tDoc.data() || {}).isTest === true) continue;
      const matchesSnap = await tDoc.ref.collection('matches').get();
      for (const mDoc of matchesSnap.docs) {
        const pointsSnap = await mDoc.ref.collection('points').get();
        for (const pDoc of pointsSnap.docs) {
          agg.pointsTournament++;
          scanPoint(pDoc.data() || {}, `${slug}/tourn:${tDoc.id}/match:${mDoc.id}/pt:${pDoc.id}`);
        }
      }
    }

    // — trainings/{tid}/matchups/{mid}/points/{pid} —
    const trainSnap = await wsRef.collection('trainings').get();
    for (const tDoc of trainSnap.docs) {
      if ((tDoc.data() || {}).isTest === true) continue;
      const muSnap = await tDoc.ref.collection('matchups').get();
      for (const muDoc of muSnap.docs) {
        const pointsSnap = await muDoc.ref.collection('points').get();
        for (const pDoc of pointsSnap.docs) {
          agg.pointsTraining++;
          scanPoint(pDoc.data() || {}, `${slug}/train:${tDoc.id}/matchup:${muDoc.id}/pt:${pDoc.id}`);
        }
      }
    }
  }

  console.log('');
  console.log('=== Non-array zoneShots-family inner scan (READ-ONLY) ===');
  console.log('');
  console.log(`workspaces scanned        : ${agg.workspaces}`);
  console.log(`tournament points scanned : ${agg.pointsTournament}`);
  console.log(`training points scanned   : ${agg.pointsTraining}`);
  console.log(`total points scanned      : ${agg.pointsTournament + agg.pointsTraining}`);
  console.log('');
  console.log(`offending point docs      : ${agg.badDocs}`);
  console.log(`total non-array inners    : ${agg.badInners}`);
  console.log(`  by field                : ${FIELDS.map(f => `${f}=${agg.byField[f]}`).join('  ')}`);
  console.log('');
  if (agg.samples.length) {
    console.log('sample offenders (up to 25):');
    for (const s of agg.samples) console.log(`  - ${s.path}  (${s.type}) ${s.sample}`);
  } else {
    console.log('✅ NO non-array inners found in any zoneShots-family field on any prod point.');
  }
  console.log('');
  console.log('DONE (read-only, no writes).');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
