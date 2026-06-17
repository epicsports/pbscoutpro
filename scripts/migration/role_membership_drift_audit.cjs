// READ-ONLY audit: quantify the G1 membership/role drift across ALL workspaces.
//
// Companion to docs/architecture/ROLE_VISIBILITY_AUDIT.md (step 6.1). Workspace
// EVENT reads gate on members[]; role lives in userRoles{}. The two can drift.
// The reported symptom (scout sees catalog, can't pick any tournament/training)
// is the shape of: userRoles[uid] has a role BUT uid is NOT in members[].
//
// For every workspaces/*, this classifies each userRoles key:
//   - role + member            → healthy (reads events)
//   - role, NOT member, LIVE   → THE G1 SYMPTOM (real account, locked out of events)
//   - role, NOT member, dead   → purged-account straggler (B15 noise, not the symptom)
// and the inverse: members[] uids with no/empty role (pending-approval shape, §49).
// "LIVE" = /users/{uid} doc exists. Also flags whether the ws has any events.
//
// RUN (read-only, no writes):
//   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
//   node scripts/migration/role_membership_drift_audit.cjs

const admin = require('firebase-admin');
admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS

const ADMIN_EMAILS = ['jacek@epicsports.pl'];

(async () => {
  const db = admin.firestore();
  const wsSnap = await db.collection('workspaces').get();
  console.log('');
  console.log('=== G1 membership/role drift audit (READ-ONLY, all workspaces) ===');
  console.log(`workspaces scanned: ${wsSnap.size}`);
  console.log('');

  const liveSymptomGlobal = []; // {slug, uid, email, roles, hasEvents}

  for (const ws of wsSnap.docs) {
    const slug = ws.id;
    const d = ws.data();
    const userRoles = d.userRoles || {};
    const members = new Set(Array.isArray(d.members) ? d.members : []);
    const adminUid = d.adminUid || null;
    const roleKeys = Object.keys(userRoles);

    // Does this workspace hold any events? (tournaments OR trainings, 1-doc probe each)
    const [tSnap, trSnap] = await Promise.all([
      db.collection(`workspaces/${slug}/tournaments`).limit(1).get(),
      db.collection(`workspaces/${slug}/trainings`).limit(1).get(),
    ]);
    const hasEvents = !tSnap.empty || !trSnap.empty;

    let healthy = 0, symptomLive = 0, symptomDead = 0, roleEmpty = 0;
    const liveSymptom = [];

    const CHUNK = 50;
    for (let i = 0; i < roleKeys.length; i += CHUNK) {
      const chunk = roleKeys.slice(i, i + CHUNK);
      const snaps = await Promise.all(chunk.map(uid => db.doc(`users/${uid}`).get()));
      chunk.forEach((uid, idx) => {
        const roles = Array.isArray(userRoles[uid]) ? userRoles[uid] : [];
        const hasRole = roles.length > 0;
        const isMember = members.has(uid);
        if (!hasRole) { roleEmpty++; return; }
        if (isMember) { healthy++; return; }
        // role + NOT member → drift. Live vs dead by user-doc existence.
        const us = snaps[idx];
        if (us.exists) {
          symptomLive++;
          const email = us.data().email || '(no email)';
          liveSymptom.push({ uid, email, roles });
        } else {
          symptomDead++;
        }
      });
    }

    // Inverse: members with no/empty role (pending-approval shape).
    let memberNoRole = 0;
    members.forEach(uid => {
      const roles = Array.isArray(userRoles[uid]) ? userRoles[uid] : [];
      if (roles.length === 0) memberNoRole++;
    });

    const interesting = symptomLive > 0 || (hasEvents && (symptomDead > 0 || memberNoRole > 0));
    console.log(`--- ${slug} ${hasEvents ? '[has events]' : '[no events]'} | userRoles=${roleKeys.length} members=${members.size} adminUid=${adminUid || '—'}`);
    console.log(`    healthy(role+member)=${healthy}  role-empty=${roleEmpty}  member-no-role=${memberNoRole}`);
    console.log(`    DRIFT role-not-member: LIVE=${symptomLive}  dead/purged=${symptomDead}`);
    liveSymptom.forEach(s => {
      const isAdmin = ADMIN_EMAILS.includes((s.email || '').toLowerCase());
      console.log(`      • LIVE role-only ${s.uid}  <${s.email}>  roles=[${s.roles.join(',')}]${isAdmin ? '  (ADMIN_EMAIL)' : ''}${hasEvents ? '  ← locked out of THIS ws events' : ''}`);
      liveSymptomGlobal.push({ slug, ...s, hasEvents });
    });
    if (!interesting && symptomLive === 0) console.log('    (no live drift)');
    console.log('');
  }

  console.log('=== SUMMARY: live role-only accounts (the G1 symptom population) ===');
  if (!liveSymptomGlobal.length) {
    console.log('  NONE — no live account has a role without membership in any workspace.');
  } else {
    liveSymptomGlobal.forEach(s =>
      console.log(`  ${s.slug}: ${s.uid} <${s.email}> [${s.roles.join(',')}]${s.hasEvents ? ' (ws has events → locked out)' : ' (ws has no events)'}`));
  }
  console.log('');
  console.log('DONE (read-only).');
  process.exit(0);
})().catch((e) => { console.error('FAILED:', e); process.exit(1); });
