// READ-ONLY prod diagnostic (admin-SDK; autonomous). No writes.
// "What if we only fetch the teams we scout?" — measure, per workspace, the
// distinct scouted teams + the union of their roster player-ids vs the global
// catalog (307 teams / 2,579 players). Proves the win of a scouted-subset load.
const admin = require('firebase-admin');
const path = require('path');
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
admin.initializeApp();
const db = admin.firestore();

const WS = process.argv.slice(2);

(async () => {
  let slugs = WS;
  if (!slugs.length) {
    // default: the workspaces with the most tournaments (likely heaviest users)
    const all = await db.collection('workspaces').get();
    slugs = all.docs.map(d => d.id);
  }
  for (const slug of slugs) {
    const tSnap = await db.collection(`workspaces/${slug}/tournaments`).get();
    if (tSnap.empty) continue;
    const teamIds = new Set();
    const playerIds = new Set();
    let scoutedDocs = 0;
    for (const t of tSnap.docs) {
      const sc = await db.collection(`workspaces/${slug}/tournaments/${t.id}/scouted`).get();
      sc.forEach(s => {
        scoutedDocs++;
        const d = s.data() || {};
        if (d.teamId) teamIds.add(d.teamId);
        (d.roster || []).forEach(pid => pid && playerIds.add(pid));
      });
    }
    console.log(`\nworkspace="${slug}"  tournaments=${tSnap.size}  scoutedDocs=${scoutedDocs}`);
    console.log(`  distinct scouted teams: ${teamIds.size}  (global /teams = 307)`);
    console.log(`  distinct roster players: ${playerIds.size}  (global /players = 2579)`);
    console.log(`  → players load would shrink ~${(2579/Math.max(playerIds.size,1)).toFixed(0)}x  (≈${(playerIds.size*597/1024).toFixed(0)} KB vs 1504 KB)`);
  }
  process.exit(0);
})().catch(e => { console.error('READ FAILED:', e?.code || e?.message); process.exit(1); });
