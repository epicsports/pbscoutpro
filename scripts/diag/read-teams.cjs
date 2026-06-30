const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)) });
const db = admin.firestore();
async function readPacked(kind) {
  const man = await db.doc(`catalog/${kind}`).get();
  if (!man.exists) return null;
  const { chunkCount } = man.data();
  const chunks = await Promise.all(Array.from({ length: chunkCount }, (_, i) => db.doc(`catalog/${kind}/chunks/${i}`).get()));
  const items = []; for (const c of chunks) items.push(...(c.data().items || [])); return items;
}
(async () => {
  const teams = await readPacked('teams');
  if (!teams) { console.log('no packed catalog/teams — teams are individual docs?'); process.exit(0); }
  console.log('total teams:', teams.length);
  console.log('with logoUrl:', teams.filter(t => t.logoUrl).length, '| with country:', teams.filter(t => t.country).length);
  console.log('--- sample logoUrl formats (first 5 with a logo) ---');
  teams.filter(t => t.logoUrl).slice(0, 5).forEach(t => console.log(`  ${t.name} → ${t.logoUrl} | country=${t.country || '-'}`));
  console.log('--- teams whose name matches an .avif logo file ---');
  const fs = require('fs');
  const logos = fs.readdirSync('public/team-logos').map(f => f.replace(/\.(avif|png)$/, ''));
  let matched = 0;
  teams.forEach(t => {
    const norm = (t.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const hit = logos.find(l => l.toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
    if (hit) { matched++; if (matched <= 12) console.log(`  ${t.name} ↔ ${hit}.* | has logoUrl=${!!t.logoUrl} country=${t.country || '-'}`); }
  });
  console.log(`name↔logo matches: ${matched} / ${teams.length} teams`);
})().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
