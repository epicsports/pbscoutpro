// Diagnostic (read-only): why DPL tournament teams don't show.
// Lists DPL tournaments + their scouted docs, and checks whether the referenced
// teams resolve in global /teams + the packed catalog.
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)) });
const db = admin.firestore();
const WS = 'ranger1996';

(async () => {
  // 1. Find DPL tournaments
  const trs = await db.collection(`workspaces/${WS}/tournaments`).get();
  const dpl = trs.docs.filter(d => /dpl/i.test(d.data().name || '') || /dpl/i.test(d.id));
  console.log(`\n=== tournaments matching /dpl/i (${dpl.length}) ===`);
  for (const t of dpl) {
    const d = t.data();
    console.log(`\n• ${d.name || '(no name)'}  id=${t.id}  status=${d.status}  division=${d.division || d.divisions || '?'}  createdAt=${d.createdAt?.toDate?.().toISOString?.() || '?'}`);
    const sc = await db.collection(`workspaces/${WS}/tournaments/${t.id}/scouted`).get();
    console.log(`   scouted docs: ${sc.size}`);
    for (const s of sc.docs) {
      const sd = s.data();
      console.log(`     - sid=${s.id} teamId=${sd.teamId || sd.team?.id || '?'} name=${sd.name || sd.teamName || sd.team?.name || '(none on doc)'} roster=${(sd.roster || sd.players || []).length} division=${sd.division || '?'}`);
    }
  }

  // 2. Do Ballistics / Consilium Dei exist in global /teams?
  console.log(`\n=== global /teams name search ===`);
  const teams = await db.collection('teams').get();
  console.log(`total global teams: ${teams.size}`);
  for (const needle of ['ballist', 'consilium']) {
    const hits = teams.docs.filter(t => (t.data().name || '').toLowerCase().includes(needle));
    console.log(`  "${needle}": ${hits.length} → ${hits.map(h => `${h.data().name}(${h.id}, div=${JSON.stringify(h.data().divisions)}, lg=${JSON.stringify(h.data().leagues)})`).join(' | ')}`);
  }

  // 3. Packed catalog teams: is it present + how many + does it have those teams?
  console.log(`\n=== packed catalog /catalog/teams ===`);
  const man = await db.doc('catalog/teams').get();
  if (!man.exists) { console.log('NO packed teams manifest'); }
  else {
    const m = man.data();
    console.log(`manifest: version=${m.version} chunkCount=${m.chunkCount} count=${m.count} updatedAt=${m.updatedAt?.toDate?.().toISOString?.()}`);
    const meta = await db.doc('meta/catalogVersion').get();
    console.log(`/meta/catalogVersion: ${meta.exists ? meta.data().version : 'MISSING'}  (pack ${m.version === (meta.data()?.version) ? 'FRESH' : 'STALE → readers fall back to live'})`);
    let packTeams = [];
    for (let i = 0; i < m.chunkCount; i++) { const c = await db.doc(`catalog/teams/chunks/${i}`).get(); packTeams.push(...(c.data().items || [])); }
    for (const needle of ['ballist', 'consilium']) {
      const hits = packTeams.filter(t => (t.name || '').toLowerCase().includes(needle));
      console.log(`  packed "${needle}": ${hits.length}`);
    }
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
