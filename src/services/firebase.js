import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000:web:000',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence — cached data available when offline
enableIndexedDbPersistence(db).catch(e => {
  if (e.code === 'failed-precondition') console.warn('Offline: multiple tabs open');
  else if (e.code === 'unimplemented') console.warn('Offline: browser not supported');
});

// Uncomment for local emulator development:
// connectFirestoreEmulator(db, 'localhost', 8080);

/**
 * Ensure user is signed in (anonymous auth).
 * Returns Firebase User object with .uid.
 * Safe to call multiple times — reuses existing session.
 */
export async function ensureAuth() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Auth timeout — Firebase not responding'));
    }, 10000);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then(cred => resolve(cred.user))
          .catch(e => {
            console.error('Anonymous auth failed:', e);
            reject(e);
          });
      }
    });
  });
}

export default app;
