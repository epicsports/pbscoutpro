import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, connectFirestoreEmulator,
  persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, connectAuthEmulator,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile,
} from 'firebase/auth';

// E2E / local-testing flag. ONLY true when Vite is started with
// VITE_USE_EMULATOR=true (the Playwright emulator harness). In every other
// build — prod deploy, dev, CI build — it is unset → false → the emulator code
// below is dead-eliminated and the prod path is byte-for-byte unchanged.
const USE_EMULATOR = import.meta.env.VITE_USE_EMULATOR === 'true';

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
// Firestore. PROD: multi-tab IndexedDB persistence — offline read cache + a
// write queue that flushes on reconnect (a point committed during a wifi drop
// is not lost). `persistentMultipleTabManager` replaces the deprecated
// `enableIndexedDbPersistence` (single-tab; threw `failed-precondition` on a 2nd
// tab). SDK 11 modern cache API. See SCOUTING_CONCURRENCY_AND_CACHE.md § 4.
// EMULATOR: default (in-memory) cache so each test run starts from clean state.
export const db = USE_EMULATOR
  ? initializeFirestore(app, {})
  : initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
export const auth = getAuth(app);

// Route to the local Firebase emulator suite ONLY under the test flag. Must run
// before the first read/write. Prod/dev/CI never enter this branch.
if (USE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

// Uncomment for local emulator development:
// connectFirestoreEmulator(db, 'localhost', 8080);

/**
 * Ensure user is signed in (email/password required).
 * Returns Firebase User object with .uid.
 * Legacy anonymous sessions are still accepted — new anonymous sign-in disabled.
 */
export async function ensureAuth() {
  // Cold-boot offline: if the session already restored from IndexedDB (Firebase
  // v11 default indexedDBLocalPersistence), resolve immediately — never wait on
  // the listener or risk the 10s timeout when there's no network to reach.
  if (auth.currentUser) return auth.currentUser;
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
        reject(new Error('Not authenticated — please sign in with email'));
      }
    });
  });
}

/**
 * Wait for the first auth state (logged-in or null) — never signs in.
 * Use this when we want to gate the UI on email/password login.
 */
export async function waitForAuthState() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && cred.user) {
    try { await updateProfile(cred.user, { displayName }); } catch {}
  }
  return cred.user;
}

export async function logout() {
  return signOut(auth);
}

export function subscribeAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export default app;
