/**
 * seed-stress.cjs — DEDICATED stress fixture for the wave-2 cross-device audit.
 * NOT the e2e gate seed (that stays minimal/deterministic). Realistic-to-worst-case
 * data + 5 role accounts so every screen renders meaningfully under load.
 *
 * Emulator ONLY (hard guard). Run via firebase emulators:exec (sets the *_EMULATOR_HOST).
 * Idempotent: fixed ids + delete-then-create auth.
 *
 * Provides (audit-ws): 5 roles · 48 players (diacritics, 1×42-char, pbliIds, 1 empty-
 * optional) · 14 teams (1×60-char) · 3 tournaments + 3 trainings (scrolly pickers) ·
 * 1 rich layout (base+overlay, fieldImage, 8 bunkers) · hitability 8×8 + 28 links +
 * ~210 hits (counts 1–40) · a 26-point match (130 deaths + full timeline + per-slot
 * assignments incl. the linked player for the player heatmap).
 */
const admin = require('firebase-admin');
const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-pbscoutpro';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('REFUSING TO SEED: emulator host vars unset. Run via firebase emulators:exec.');
  process.exit(1);
}
admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();
const now = Date.now();

const WS = 'audit-ws';
const PW = 'test1234';
// 5 role accounts (see audit/REACHABILITY_MAP.md).
const ROLES = [
  { uid: 'audit-super',   email: 'super@audit.local',   roles: ['admin'],  globalRole: 'super_admin' },
  { uid: 'audit-wsadmin', email: 'wsadmin@audit.local', roles: ['admin'] },
  // Baseline = admin+coach: admin auto-enter is fast (the non-admin per-reload
  // member-write latency is the audit-harness trap, logged as backlog). Renders
  // every screen for the visual matrix; pure-role access deltas come from the
  // scout/player rows + the reachability map.
  { uid: 'audit-coach',   email: 'coach@audit.local',   roles: ['admin', 'coach'] },
  { uid: 'audit-scout',   email: 'scout@audit.local',   roles: ['scout'],  linkSkipped: true },
  { uid: 'audit-player',  email: 'player@audit.local',  roles: ['player'], linkedPid: 'asp-1' },
];
const LAYOUT = 'lay-stress';     // global base id == overlay id (§96)
const TRN = 'trn-stress';        // layoutId == LAYOUT → fetchLayoutDeaths picks it up
const MATCH = 'mat-stress';
const TEAM_MAIN = 'ateam-0';
const TRN_HIT = 'trn-hit-stress';

const DIAC = ['Paweł Łękawa', 'Józef Ćwikła', 'Grzegorz Brzęczyszczykiewicz', 'Michał Żółć', 'Bartłomiej Ćma', 'Łukasz Średnicki'];
const LONG_NAME = 'Aleksander Konstantynowicz-Przybyłowski III'; // 43 chars
const pos = (i) => ({ x: +(0.12 + (i % 5) * 0.18).toFixed(3), y: +(0.15 + ((i * 7) % 9) * 0.09).toFixed(3) });

async function main() {
  for (const r of ROLES) { try { await auth.deleteUser(r.uid); } catch (_) {} }
  for (const r of ROLES) await auth.createUser({ uid: r.uid, email: r.email, password: PW, displayName: r.email, emailVerified: true });

  let batch = db.batch();
  let n = 0;
  const set = (path, data) => { batch.set(db.doc(path), data); if (++n % 400 === 0) { /* flush below */ } };
  const flush = async () => { await batch.commit(); batch = db.batch(); };

  // ── users + workspace ──
  for (const r of ROLES) {
    set(`users/${r.uid}`, {
      email: r.email, displayName: r.email, defaultWorkspace: WS,
      ...(r.globalRole ? { globalRole: r.globalRole } : {}),
      ...(r.linkSkipped ? { linkSkippedAt: now } : {}),
      createdAt: now,
    });
  }
  const userRoles = {}; ROLES.forEach(r => { userRoles[r.uid] = r.roles; });
  set(`workspaces/${WS}`, {
    name: 'Audit Stress Workspace', members: ROLES.map(r => r.uid), userRoles,
    adminUid: 'audit-wsadmin', rolesVersion: 2, createdAt: now,
  });

  // ── 14 teams (one 60-char) ──
  const teamIds = [];
  for (let i = 0; i < 14; i++) {
    const id = `ateam-${i}`; teamIds.push(id);
    const league = ['NXL', 'DPL', 'PXL'][i % 3];
    const division = ['PRO', 'D1', 'D2', 'CDF Premiere'][i % 4];
    const name = i === 3
      ? 'Wyjątkowo Długa Nazwa Drużyny Paintballowej Testowa Edycja 2026' // 62 chars
      : `${DIAC[i % DIAC.length].split(' ')[0]} Team ${i}`;
    set(`teams/${id}`, { name, ownerWorkspaceId: WS, leagues: [league], divisions: { [league]: division } });
  }

  // ── 48 players (diacritics, 1×43-char, pbliIds, 1 empty-optional) ──
  const playerIds = [];
  for (let i = 0; i < 48; i++) {
    const id = `asp-${i + 1}`; playerIds.push(id);
    const empty = i === 47; // empty-optional entity
    const name = i === 0 ? LONG_NAME : DIAC[i % DIAC.length] + ` ${i}`;
    set(`players/${id}`, empty
      ? { name: 'Min', ownerWorkspaceId: WS }
      : {
          name, number: String((i % 99) + 1), nickname: i % 3 === 0 ? `nick${i}` : null,
          teamId: teamIds[i % teamIds.length], ownerWorkspaceId: WS, pbliId: String(100000 + i),
          ...(i === 0 ? { linkedUid: 'audit-player' } : {}), // asp-1 → player role
        });
  }
  await flush();

  // ── rich layout: global base + ws overlay (fieldImage so the canvas mounts) ──
  const IMG = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#0a1410"/></svg>').toString('base64');
  const bunkers = Array.from({ length: 8 }, (_, i) => ({ id: `b${i}`, x: +(0.2 + (i % 4) * 0.2).toFixed(2), y: +(0.25 + Math.floor(i / 4) * 0.4).toFixed(2), positionName: ['Snake', 'Dorito', 'Can', 'Beam', 'TempleA', 'TempleB', 'Wing', 'Center'][i], type: 'can' }));
  set(`layouts/${LAYOUT}`, { name: 'Stress Field', league: 'NXL', year: 2026, bunkers, fieldImage: IMG, discoLine: 0.30, zeekerLine: 0.80, mirrorMode: 'y', doritoSide: 'top', fieldCalibration: null, createdAt: now });
  set(`workspaces/${WS}/layoutOverlays/${LAYOUT}`, {
    baseLayoutId: LAYOUT, nameOverride: null,
    zones: [{ id: 'z1', name: 'Snake', type: 'snake', polygon: [{ x: 0.1, y: 0.6 }, { x: 0.3, y: 0.6 }, { x: 0.3, y: 0.9 }, { x: 0.1, y: 0.9 }] },
            { id: 'z2', name: 'Dorito', type: 'dorito', polygon: [{ x: 0.6, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.35 }] }],
    dangerZone: null, sajgonZone: null, bigMoveZone: null, createdAt: now,
  });

  // ── 3 tournaments + 3 trainings (scrolly pickers); TRN has layoutId=LAYOUT ──
  for (let i = 0; i < 3; i++) {
    set(`workspaces/${WS}/tournaments/${i === 0 ? TRN : `trn-x${i}`}`, {
      name: `${DIAC[i].split(' ')[0]} Cup ${2024 + i}`, eventType: 'tournament', league: ['NXL', 'DPL', 'PXL'][i],
      year: 2024 + i, division: 'PRO', status: 'active', layoutId: LAYOUT, createdAt: now + i,
    });
    set(`workspaces/${WS}/trainings/${i === 0 ? TRN_HIT : `trn-tr${i}`}`, {
      type: 'training', name: `Trening ${i + 1} — ${DIAC[i]}`, layoutId: LAYOUT, status: 'open',
      attendees: playerIds.slice(0, 18), squads: {}, createdAt: now + i, updatedAt: now + i,
    });
  }

  // scouted teams (roster 18 = 15+) — main one is TEAM_MAIN (used in routes)
  set(`workspaces/${WS}/tournaments/${TRN}/scouted/${TEAM_MAIN}`, {
    teamId: TEAM_MAIN, name: 'Audit Alpha', league: 'NXL', division: 'PRO', roster: playerIds.slice(0, 18),
  });
  set(`workspaces/${WS}/tournaments/${TRN}/scouted/ateam-1`, {
    teamId: 'ateam-1', name: 'Audit Bravo', league: 'NXL', division: 'PRO', roster: playerIds.slice(18, 36),
  });
  await flush();

  // ── 26-point match: 130 deaths + full timeline + per-slot assignments ──
  set(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH}`, { teamA: TEAM_MAIN, teamB: 'ateam-1', name: 'Audit Final', status: 'live', order: now, createdAt: now });
  const slotData = (seed, elimMask) => ({
    players: Array.from({ length: 5 }, (_, i) => pos(seed + i)),
    eliminations: Array.from({ length: 5 }, (_, i) => !!((elimMask >> i) & 1)),
    runners: Array.from({ length: 5 }, (_, i) => i === 0),
    bumpStops: Array.from({ length: 5 }, (_, i) => (i < 2 ? pos(seed + i + 3) : null)),
    fieldSide: 'left',
    assignments: Array.from({ length: 5 }, (_, i) => playerIds[(seed + i) % 18]), // incl asp-1 (player) at seed%18==0
    quickShots: { 0: ['dorito'], 1: ['snake'] },
    zoneShots: { 0: { zoneId: 'z1', kill: true }, 2: { zoneId: 'z2', kill: false } },
  });
  for (let p = 0; p < 26; p++) {
    const home = slotData(p, 0b11111);   // all 5 home elim
    const away = slotData(p + 50, 0b00111); // 3 away elim → 5+3=8/pt × 26 ≈ 130+ deaths total (some pts vary)
    set(`workspaces/${WS}/tournaments/${TRN}/matches/${MATCH}/points/pt-${p}`, {
      order: p, homeTeam: TEAM_MAIN, awayTeam: 'ateam-1', fieldSide: 'left',
      homeData: home, awayData: away, winner: p % 2 === 0 ? 'A' : 'B',
      timeline: [
        { stage: 'settle', players: home.players.map(pp => ({ x: pp.x + 0.05, y: pp.y })), eliminations: home.eliminations },
        { stage: 'mid', players: home.players.map(pp => ({ x: pp.x + 0.1, y: pp.y + 0.05 })), eliminations: home.eliminations },
      ],
      createdAt: now + p,
    });
    if (p % 12 === 0) await flush();
  }
  await flush();

  // ── hitability: 8 pos × 8 tgt + 28 links + ~210 hits (counts 1–40) ──
  const hpos = Array.from({ length: 8 }, (_, i) => ({ id: `hp-${i}`, x: +(0.15 + (i % 4) * 0.1).toFixed(2), y: +(0.2 + Math.floor(i / 4) * 0.15).toFixed(2), color: ['#ef4444', '#3b82f6', '#f97316', '#22d3ee', '#a855f7', '#ec4899', '#14b8a6', '#ef4444'][i], label: String(i + 1) }));
  const htgt = Array.from({ length: 8 }, (_, i) => ({ id: `ht-${i}`, x: +(0.6 + (i % 4) * 0.1).toFixed(2), y: +(0.2 + Math.floor(i / 4) * 0.15).toFixed(2), label: String.fromCharCode(65 + i) }));
  const links = [];
  for (let i = 0; i < 28; i++) links.push({ playerId: hpos[i % 8].id, targetId: htgt[(i * 3) % 8].id });
  set(`workspaces/${WS}/layoutOverlays/${LAYOUT}/hitability/config`, { players: hpos, targets: htgt, links, updatedAt: now });
  // counts 1..40 distributed across target/pos pairs → ~210 hit docs
  let h = 0;
  for (let t = 0; t < 8; t++) {
    const count = [1, 3, 5, 8, 12, 18, 27, 40][t];
    for (let c = 0; c < count; c++) {
      set(`workspaces/${WS}/layoutOverlays/${LAYOUT}/hitabilityHits/hit-${h++}`, {
        trainingId: TRN_HIT, targetId: htgt[t].id, playerId: hpos[(t + c) % 8].id, ts: now + h,
      });
      if (h % 200 === 0) await flush();
    }
  }
  await flush();

  console.log(`✅ Stress-seeded '${PROJECT_ID}' ws=${WS}: ${ROLES.length} roles · 48 players · 14 teams · 26-pt match · ${h} hits.`);
  process.exit(0);
}
main().catch(e => { console.error('STRESS SEED FAILED:', e); process.exit(1); });
