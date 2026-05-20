/**
 * Phase 3.a — globalRole field migration.
 *
 * Per DESIGN_DECISIONS § 66.5 + § 65.7.2. Writes `globalRole` to every
 * /users/{uid} doc: 'super_admin' for Jacek (jacek@epicsports.pl), null for
 * everyone else.
 *
 * Additive + idempotent — only writes docs whose current value differs from
 * the target. Safe to re-run. Reversible: the field is purely additive and
 * pre-3.a code ignores it (isAdmin 4th path / isSuperAdmin treat absent or
 * null identically — not super_admin).
 *
 * Gated by PHASE_3_A_EXECUTE_CONFIRMED env var (mirrors phase_2_x execute
 * scripts). Service account via GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   export PHASE_3_A_EXECUTE_CONFIRMED=1
 *   node scripts/migration/phase_3_a_globalrole.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!process.env.PHASE_3_A_EXECUTE_CONFIRMED) {
  console.error('ERROR: Execute mode requires PHASE_3_A_EXECUTE_CONFIRMED=1 env var.');
  process.exit(1);
}

const SA_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!SA_PATH) {
  console.error('ERROR: Set GOOGLE_APPLICATION_CREDENTIALS env var to service account JSON path');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(SA_PATH)) });
const db = admin.firestore();

const SUPER_ADMIN_EMAIL = 'jacek@epicsports.pl';
const REPORTS_DIR = path.join(__dirname, 'reports');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_PATH = path.join(REPORTS_DIR, `phase_3_a_globalrole_${timestamp}.json`);

async function migrate() {
  console.log('Phase 3.a — globalRole migration starting...');

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} user docs`);

  // Find the super_admin user by email (case-insensitive).
  const jacekDoc = usersSnap.docs.find(
    d => String(d.data().email || '').toLowerCase() === SUPER_ADMIN_EMAIL,
  );
  if (!jacekDoc) {
    throw new Error(`Super admin user not found by email (${SUPER_ADMIN_EMAIL}) — aborting`);
  }
  console.log(`Super admin uid: ${jacekDoc.id}`);

  const noEmail = usersSnap.docs.filter(d => !d.data().email);
  if (noEmail.length > 0) {
    console.warn(`${noEmail.length} user doc(s) without email — will get globalRole=null:`,
      noEmail.map(d => d.id));
  }

  // Idempotent batch — write only deltas.
  const batch = db.batch();
  let writes = 0;
  let alreadyCorrect = 0;
  const changes = [];

  for (const doc of usersSnap.docs) {
    const isJacek = doc.id === jacekDoc.id;
    const target = isJacek ? 'super_admin' : null;
    const current = doc.data().globalRole ?? null;
    if (current !== target) {
      batch.update(doc.ref, { globalRole: target });
      changes.push({ uid: doc.id, email: doc.data().email || null, from: current, to: target });
      writes++;
    } else {
      alreadyCorrect++;
    }
  }

  if (writes > 0) {
    await batch.commit();
    console.log(`Wrote ${writes} update(s) (${alreadyCorrect} already correct)`);
  } else {
    console.log(`No changes needed — all ${alreadyCorrect} user docs already correct`);
  }

  // Verify post-migration state.
  console.log('\nVerifying...');
  const verifySnap = await db.collection('users').get();
  const superAdmins = verifySnap.docs.filter(d => d.data().globalRole === 'super_admin');
  const nulls = verifySnap.docs.filter(d => d.data().globalRole === null);
  const absent = verifySnap.docs.filter(d => d.data().globalRole === undefined);

  console.log(`  super_admin: ${superAdmins.length}`);
  console.log(`  null:        ${nulls.length}`);
  console.log(`  absent:      ${absent.length}`);

  if (superAdmins.length !== 1) {
    throw new Error(`Expected exactly 1 super_admin, found ${superAdmins.length}`);
  }
  if (superAdmins[0].id !== jacekDoc.id) {
    throw new Error('super_admin is not the expected uid — aborting');
  }
  if (absent.length > 0) {
    console.warn(`WARNING: ${absent.length} doc(s) still have absent globalRole`);
  }

  // Write report.
  if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const report = {
    phase: '3.a',
    ranAt: new Date().toISOString(),
    totalUsers: usersSnap.size,
    superAdminUid: jacekDoc.id,
    writes,
    alreadyCorrect,
    changes,
    postState: {
      superAdmin: superAdmins.length,
      null: nulls.length,
      absent: absent.length,
    },
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nReport: ${REPORT_PATH}`);
  console.log('Migration verified successfully');
}

migrate()
  .then(() => process.exit(0))
  .catch(e => { console.error('Migration failed:', e); process.exit(1); });
