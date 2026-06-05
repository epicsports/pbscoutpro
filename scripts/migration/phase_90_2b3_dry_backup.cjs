/**
 * §90 STAGE 2B/3 + RIDE-ALONGS — CONSOLIDATED --dry ENUMERATION + LOCAL BACKUP.
 *
 * Brief: "CC BRIEF — §90 2B/3 + ride-alongs: consolidated --live window execution"
 * (Opus, 2026-06-05). This script is the AUTONOMOUS PREP ONLY — gate steps 1+2:
 *
 *   (1) Single --dry pass enumerating EVERY destructive target.
 *   (2) Write JSON backups for every set to a LOCAL dir OUTSIDE the repo
 *       (PII: player/team/account data — NOT the public repo, NOT Google Drive).
 *
 * It performs ZERO Firestore writes and ZERO deletes. It only READS Firestore +
 * Auth and WRITES local JSON backup files. Then it STOPs. The --live deletes
 * (gate step 4) are a SEPARATE step that runs only on Jacek's in-session CONFIRM.
 *
 * Destructive targets enumerated + backed up:
 *   A. player twins        /workspaces/{slug}/players/{pid}      (~2,634)
 *   B. team twins          /workspaces/{slug}/teams/{teamId}     (~299)
 *   C. /layouts stragglers /workspaces/{slug}/layouts/{lid}      (~5, ranger1996)
 *   D. breakoutVariants    /workspaces/{slug}/breakoutVariants/* (expect 0 remnant)
 *   E. ghost accounts      Auth ∪ /users records NOT referenced in ANY workspace,
 *                          split anon / ws-removed, admin-protected — PII.
 *
 * OUT OF SCOPE here (per brief): §98 legacy zone-field drop — DEFERRED (layout-config
 * §98 prod-smoke still OWED → not "prod-confirmed"; brief says defer THIS piece only).
 * Global catalog /players :614 /teams :674 /layouts :699 — untouched (canonical).
 *
 * RUN (read-only + local backup):
 *   set GOOGLE_APPLICATION_CREDENTIALS=C:\...\pbscoutpro-firebase-adminsdk-...json
 *   node scripts/migration/phase_90_2b3_dry_backup.cjs
 *
 * Quota note: Firebase daily read quota is a TIME-gate. If a stage throws (quota /
 * missing index) the script reports what it has and continues — no retry-storm.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: set GOOGLE_APPLICATION_CREDENTIALS to the admin-SDK service-account JSON path.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });

const db = admin.firestore();
const auth = admin.auth();

const ADMIN_EMAILS = ['jacek@epicsports.pl'];

// Backup root: a sibling of the repo (… /dk), OUTSIDE the git tree + NOT Drive.
// repo = …/dk/pbscoutpro  → backups = …/dk/pbscoutpro_backups_90_2b3/<ts>/
const REPO_ROOT = path.resolve(__dirname, '..', '..');           // …/dk/pbscoutpro
const TS = new Date().toISOString().replace(/[:.]/g, '-');       // node script — Date ok
const BACKUP_DIR = path.resolve(REPO_ROOT, '..', 'pbscoutpro_backups_90_2b3', TS);

let reads = 0;
const bump = (n = 1) => { reads += n; };
const pad = (s, n = 6) => String(s).padStart(n);

function writeBackup(name, payload) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, name);
  const json = JSON.stringify(payload, null, 2);
  fs.writeFileSync(file, json, 'utf8');
  const kb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
  return { file, kb };
}

(async () => {
  console.log('');
  console.log('================================================================');
  console.log(' §90 STAGE 2B/3 + RIDE-ALONGS — --dry ENUMERATION + LOCAL BACKUP');
  console.log('   (READ-ONLY Firestore/Auth · writes only LOCAL backup files)');
  console.log('================================================================');
  console.log(`  backup dir: ${BACKUP_DIR}`);
  console.log('');

  // ── 0. WORKSPACES (slugs + reference union for ghost-account classification) ──
  const wsSnap = await db.collection('workspaces').get();
  bump(wsSnap.size);
  const slugs = [];
  const referenced = new Set(), inMembers = new Set(), inUserRoles = new Set(), inPending = new Set();
  const adminUids = new Set();
  wsSnap.forEach(d => {
    const ws = d.data();
    slugs.push(d.id);
    (Array.isArray(ws.members) ? ws.members : []).forEach(uid => { referenced.add(uid); inMembers.add(uid); });
    Object.keys(ws.userRoles || {}).forEach(uid => { referenced.add(uid); inUserRoles.add(uid); });
    (Array.isArray(ws.pendingApprovals) ? ws.pendingApprovals : []).forEach(p => {
      const uid = typeof p === 'string' ? p : (p && p.uid) || null;
      if (uid) { referenced.add(uid); inPending.add(uid); }
    });
    if (ws.adminUid) adminUids.add(ws.adminUid);
  });
  console.log(`── workspaces (${wsSnap.size}) : [${slugs.join(', ')}]`);
  console.log(`   referenced uid union: ${referenced.size}  (members ${inMembers.size} / roles ${inUserRoles.size} / pending ${inPending.size})`);
  console.log('');

  // ── A/B/C/D. PER-WORKSPACE TWIN + LAYOUT ENUMERATION ──────────────────────
  const players = [];   // { path, id, slug, data }
  const teams = [];
  const layouts = [];
  const breakoutVariants = [];
  const perWs = {};

  for (const slug of slugs) {
    const grab = async (sub) => {
      const snap = await db.collection(`workspaces/${slug}/${sub}`).get();
      bump(snap.size);
      return snap.docs.map(d => ({ path: d.ref.path, id: d.id, slug, data: d.data() }));
    };
    const [p, t, l] = await Promise.all([grab('players'), grab('teams'), grab('layouts')]);
    // breakoutVariants is nested (/teams/{tid}/breakoutVariants or /breakoutVariants) —
    // use collectionGroup filtered to this workspace path to catch any remnant docs.
    let bv = [];
    try {
      const bvSnap = await db.collectionGroup('breakoutVariants').get();
      bump(bvSnap.size);
      bv = bvSnap.docs
        .filter(d => d.ref.path.startsWith(`workspaces/${slug}/`))
        .map(d => ({ path: d.ref.path, id: d.id, slug, data: d.data() }));
    } catch (e) {
      console.log(`   [${slug}] breakoutVariants CG scan SKIP: ${e.code || e.message}`);
    }

    players.push(...p); teams.push(...t); layouts.push(...l); breakoutVariants.push(...bv);
    perWs[slug] = { players: p.length, teams: t.length, layouts: l.length, breakoutVariants: bv.length };
    console.log(`── twins [${slug}] : players ${pad(p.length)}  teams ${pad(t.length)}  layouts ${pad(l.length)}  breakoutVariants ${pad(bv.length)}`);
  }
  console.log('');

  // ── E. GHOST ACCOUNTS (PII) — Auth ∪ /users records referenced in NO workspace ──
  const authUsers = new Map();
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    for (const u of res.users) {
      authUsers.set(u.uid, {
        providers: u.providerData.map(p => p.providerId),
        email: u.email || null,
        anon: u.providerData.length === 0,
        disabled: u.disabled === true,
        created: u.metadata.creationTime,
        lastSignIn: u.metadata.lastSignInTime,
      });
    }
    pageToken = res.pageToken;
  } while (pageToken);

  const usersSnap = await db.collection('users').get();
  bump(usersSnap.size);
  const fsUsers = new Map();
  usersSnap.forEach(d => {
    const x = d.data();
    fsUsers.set(d.id, { email: x.email || null, globalRole: x.globalRole || null, disabled: x.disabled === true });
  });

  const isAdminEmail = (email) => !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());
  const allUids = new Set([...authUsers.keys(), ...fsUsers.keys()]);
  const ghostAnon = [], ghostWsRemoved = [];
  for (const uid of allUids) {
    const a = authUsers.get(uid), f = fsUsers.get(uid);
    const email = (a && a.email) || (f && f.email) || null;
    if (isAdminEmail(email) || adminUids.has(uid)) continue;  // never a candidate
    if (referenced.has(uid)) continue;                        // still referenced → keep
    const rec = {
      uid, email,
      store: a && f ? 'both' : a ? 'auth-only' : 'fs-only',
      providers: a ? a.providers : null,
      anon: a ? a.anon : null,
      disabled: (a && a.disabled) || (f && f.disabled) || false,
      created: a ? a.created : null,
      lastSignIn: a ? a.lastSignIn : null,
      globalRole: f ? f.globalRole : null,
      usersDoc: f || null,
    };
    if ((a && a.anon) || !email) ghostAnon.push(rec);
    else ghostWsRemoved.push(rec);
  }
  console.log(`── ghost accounts (referenced in NO workspace, non-admin) :`);
  console.log(`     Auth total ${authUsers.size} · /users docs ${fsUsers.size}`);
  console.log(`     (a) anonymous / no-email : ${pad(ghostAnon.length)}`);
  console.log(`     (b) ws-removed (email)   : ${pad(ghostWsRemoved.length)}`);
  console.log('');

  // ── WRITE LOCAL BACKUPS ────────────────────────────────────────────────────
  const meta = {
    generatedAt: new Date().toISOString(),
    brief: '§90 2B/3 + ride-alongs consolidated --live window (Opus 2026-06-05)',
    workspaces: slugs, perWorkspace: perWs,
    counts: {
      playerTwins: players.length, teamTwins: teams.length,
      layoutStragglers: layouts.length, breakoutVariantsRemnant: breakoutVariants.length,
      ghostAnon: ghostAnon.length, ghostWsRemoved: ghostWsRemoved.length,
    },
    note: '§98 legacy zone-field drop DEFERRED (prod-smoke owed). Global catalog untouched.',
  };
  const b = [];
  b.push(['00_manifest.json', writeBackup('00_manifest.json', meta)]);
  b.push(['A_player_twins.json', writeBackup('A_player_twins.json', players)]);
  b.push(['B_team_twins.json', writeBackup('B_team_twins.json', teams)]);
  b.push(['C_layout_stragglers.json', writeBackup('C_layout_stragglers.json', layouts)]);
  b.push(['D_breakoutVariants_remnant.json', writeBackup('D_breakoutVariants_remnant.json', breakoutVariants)]);
  b.push(['E_ghost_accounts.json', writeBackup('E_ghost_accounts.json', { anon: ghostAnon, wsRemoved: ghostWsRemoved })]);

  console.log('── LOCAL BACKUPS WRITTEN ──');
  b.forEach(([name, { file, kb }]) => console.log(`   ${name.padEnd(34)} ${pad(kb, 8)} KB   ${file}`));
  console.log('');

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log('================================================================');
  console.log(' SUMMARY — destructive targets (NOTHING deleted; backups written)');
  console.log('================================================================');
  console.log(`  A. player twins          : ${players.length}`);
  console.log(`  B. team twins            : ${teams.length}`);
  console.log(`  C. /layouts stragglers   : ${layouts.length}`);
  console.log(`  D. breakoutVariants rem. : ${breakoutVariants.length}  (expect 0)`);
  console.log(`  E. ghost accounts        : ${ghostAnon.length + ghostWsRemoved.length}  (anon ${ghostAnon.length} / ws-removed ${ghostWsRemoved.length})`);
  console.log(`  ~Firestore reads used    : ~${reads}`);
  console.log(`  backup dir               : ${BACKUP_DIR}`);
  console.log('');
  console.log('  STOP. No writes/deletes performed. --live deletes wait for Jacek CONFIRM.');
  console.log('');
  process.exit(0);
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
