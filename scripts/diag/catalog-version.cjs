const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS)) });
const db = admin.firestore();
(async () => {
  const meta = await db.doc('meta/catalogVersion').get();
  console.log('meta/catalogVersion:', meta.exists ? JSON.stringify(meta.data()) : 'MISSING');
  const man = await db.doc('catalog/teams').get();
  console.log('catalog/teams manifest:', man.exists ? JSON.stringify(man.data()) : 'MISSING');
  if (man.exists) {
    const { chunkCount } = man.data();
    for (let i = 0; i < chunkCount; i++) {
      const c = await db.doc(`catalog/teams/chunks/${i}`).get();
      console.log(`  chunk ${i}: ${c.exists ? (c.data().items||[]).length + ' items' : 'MISSING!'}`);
    }
  }
})().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
