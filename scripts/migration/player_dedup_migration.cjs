// Player-identity dedup migration (CC_BRIEF_PLAYER_DEDUP Item 3).
// Scans the GLOBAL /players catalog for same-exact-name groups and classifies:
//   OBVIOUS   = exactly 2 docs, one WITH a pbliId + one WITHOUT → the pbliId doc is the
//               survivor (primary key); absorb the pbliId-less twin (mergePlayers semantics:
//               backfill empty scalars + teams-union, survivor.aliasIds += absorbed, DELETE absorbed).
//   AMBIGUOUS = 3+ docs, OR 2+ with a pbliId, OR 2 pbliId-LESS → leave for super-admin
//               reconcile (the AdminPlayersPage "Potential duplicates" surface / MergePlayersModal).
//
// DEFAULT = --dry (READ-ONLY, autonomous): reports counts + samples, no writes.
// --live  = performs the OBVIOUS merges. This DELETES absorbed docs → Hard-ESCALATE per the
//           Firebase-autonomy policy: requires an explicit GO + a JSON backup (written first).
//           NEVER touches AMBIGUOUS groups.
//
// Multi-team is normal (a player on many teams in one event) — that is NOT a duplicate.
// Only exact-NAME collisions with pbliId asymmetry are.
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const KEY = path.resolve(__dirname, '../../../pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = KEY;
admin.initializeApp();
const db = admin.firestore();
const LIVE = process.argv.includes('--live');

const normName = (n) => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
const mask = (s) => (s && s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-3)}` : s || '∅');

(async () => {
  const snap = await db.collection('players').get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const groups = new Map();
  all.forEach(p => {
    const k = normName(p.name);
    if (!k) return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  });

  // Global pbliId-collision detect (same pbliId on 2+ docs = true primary-key violation,
  // independent of name). Simple normalize (pbliIds are numeric-ish strings).
  const npb = (x) => String(x || '').trim().toLowerCase();
  const byPbli = new Map();
  all.forEach(p => { if (p.pbliId) { const k = npb(p.pbliId); if (!byPbli.has(k)) byPbli.set(k, []); byPbli.get(k).push(p); } });
  const pbliCollisions = [...byPbli.entries()].filter(([, ds]) => ds.length >= 2);

  const obvious = [];    // name-dup: 1 pbliId + 1 pbliId-less → merge (pbliId survivor)
  const namesakes = [];  // 2 docs, BOTH pbliId, DIFFERENT pbliId → distinct real people, LEAVE
  const ambiguous = [];  // everything else → super-admin reconcile
  for (const [k, docs] of groups) {
    if (docs.length < 2) continue;
    const withPbli = docs.filter(p => p.pbliId);
    if (docs.length === 2 && withPbli.length === 1) {
      const survivor = withPbli[0];
      obvious.push({ name: k, survivor, absorbed: docs.find(p => p.id !== survivor.id) });
    } else if (docs.length === 2 && withPbli.length === 2 && npb(withPbli[0].pbliId) !== npb(withPbli[1].pbliId)) {
      namesakes.push({ name: k, docs });   // two real people, different pbliIds — NOT a dup
    } else {
      ambiguous.push({ name: k, docs });   // 3+, or pbliId-collision, or 2 pbliId-less, etc.
    }
  }

  console.log('=== player dedup audit ===');
  console.log(`  players total            : ${all.length}`);
  console.log(`  same-name groups (>=2)   : ${[...groups.values()].filter(g => g.length >= 2).length}`);
  console.log(`  OBVIOUS name-dup (merge) : ${obvious.length}`);
  console.log(`  pbliId COLLISIONS (same id): ${pbliCollisions.length}  ← true primary-key violations`);
  console.log(`  NAMESAKES (diff pbliId, LEAVE): ${namesakes.length}`);
  console.log(`  AMBIGUOUS (reconcile)    : ${ambiguous.length}`);

  console.log('\n--- OBVIOUS (pbliId survivor ← pbliId-less twin) ---');
  obvious.forEach(o => console.log(`  "${o.name}" : keep ${o.survivor.id} (pbli ${mask(o.survivor.pbliId)}) ← absorb ${o.absorbed.id}`));
  console.log('\n--- pbliId COLLISIONS (same pbliId on 2+ docs) ---');
  pbliCollisions.forEach(([k, ds]) => console.log(`  pbli ${mask(k)} : ${ds.length} docs — ${ds.map(p => `${p.id}(${normName(p.name)})`).join(', ')}`));
  console.log('\n--- AMBIGUOUS (super-admin reconcile) ---');
  ambiguous.forEach(a => console.log(`  "${a.name}" : ${a.docs.length} docs · ${a.docs.filter(p => p.pbliId).length} with pbliId`));
  console.log(`\n  (NAMESAKES left untouched: ${namesakes.map(n => n.name).slice(0, 8).join(' · ')}${namesakes.length > 8 ? ' …' : ''})`);

  if (!LIVE) {
    console.log('\n[DRY] no writes. Re-run with --live (Hard-ESCALATE: backs up + DELETEs absorbed docs) to merge the OBVIOUS set.');
    process.exit(0);
  }

  // ── --live: merge the OBVIOUS set (mergePlayers semantics). Backup first. ──
  const stamp = process.env.DEDUP_STAMP || 'live';
  const backup = obvious.map(o => ({ survivor: o.survivor, absorbed: o.absorbed }));
  const backupPath = path.resolve(__dirname, `player_dedup_backup.${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  console.log(`\n[LIVE] backup written: ${backupPath}`);
  let merged = 0;
  for (const o of obvious) {
    const s = o.survivor, a = o.absorbed;
    const upd = { aliasIds: admin.firestore.FieldValue.arrayUnion(a.id, ...(Array.isArray(a.aliasIds) ? a.aliasIds : [])), updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    // teams-union (multi-team is valid); scalar backfill where survivor is empty.
    const sTeams = Array.isArray(s.teams) ? s.teams : (s.teamId ? [s.teamId] : []);
    const aTeams = Array.isArray(a.teams) ? a.teams : (a.teamId ? [a.teamId] : []);
    const union = [...new Set([...sTeams, ...aTeams])];
    if (union.length) upd.teams = union;
    ['nickname', 'number', 'role', 'nationality', 'photoURL', 'age', 'playerClass'].forEach(f => {
      if ((s[f] == null || s[f] === '') && a[f] != null && a[f] !== '') upd[f] = a[f];
    });
    await db.collection('players').doc(s.id).update(upd);
    await db.collection('players').doc(a.id).delete();
    merged++;
  }
  // Cache-invalidation hint (mirrors dataService.bumpCatalogVersion) so clients drop
  // the deleted docs from their cached catalog on next load.
  await db.doc('meta/catalogVersion').set(
    { version: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  console.log(`[LIVE] merged ${merged} obvious duplicate(s) + bumped catalogVersion. Ambiguous (${ambiguous.length}) left for reconcile.`);
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
