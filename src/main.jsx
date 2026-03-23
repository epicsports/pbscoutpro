import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  FIREBASE SETUP — fill in your config below
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *  1. Go to https://console.firebase.google.com
 *  2. Create a new project (or use existing)
 *  3. Add a Web app (</> icon)
 *  4. Copy your firebaseConfig object below
 *  5. In Firestore → Create Database → Start in TEST MODE
 *     (for production, set proper security rules later)
 *
 *  FREE TIER covers:
 *  - 1 GB storage
 *  - 50K reads / 20K writes per day
 *  - Real-time listeners
 *  — more than enough for a scouting team
 */
const firebaseConfig = {
  apiKey: "AIzaSyDczmTRcZHXxsg5PTPDtDZrPel3qc7JUVY",
  authDomain: "pbscoutpro.firebaseapp.com",
  projectId: "pbscoutpro",
  storageBucket: "pbscoutpro.firebasestorage.app",
  messagingSenderId: "301394054921",
  appId: "1:301394054921:web:fccf50371b1398dd8a8dd8",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Uncomment for local emulator development:
// connectFirestoreEmulator(db, 'localhost', 8080);

export default app;
