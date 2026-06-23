import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, connectFirestoreEmulator,
  persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getAuth, onAuthStateChanged, connectAuthEmulator,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, sendPasswordResetEmail,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  updatePassword,
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

// Password reset — Firebase sends the reset email natively (works on Spark, no
// SMTP/Cloud Functions). Throws auth/user-not-found for an unknown email,
// auth/invalid-email for a malformed one (handled by the LoginPage reset flow).
export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
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

// ── Email-link (passwordless) invite flow — Spark-native, no backend ────────
// Firebase emails the sign-in link itself (Auth email-link template; works on
// Spark, no Cloud Function). The link returns to the app, where the invitee
// completes sign-in (account created here) + sets a password (express reg).
// Requires the Email-link provider enabled + authorized domains in the console.
const EMAIL_FOR_SIGNIN_KEY = 'pb_email_for_signin';

// The return URL the email link points back to (the app root). Same-origin so
// the authorized-domains check passes.
function inviteActionUrl() {
  return `${window.location.origin}${import.meta.env.BASE_URL || '/'}`;
}

export async function sendInviteEmailLink(email) {
  // Access rule: do not issue invites to European teams while Jacek competes for
  // Ranger. Operational/manual gate (no automated geofence here). See
  // docs/product/PAINTBALL_INTELLIGENCE.md §6.
  const url = inviteActionUrl();
  await sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
  // Remember the email on THIS device so completion can skip the prompt when the
  // link is opened in the same browser; cross-device completion prompts instead.
  try { localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email); } catch { /* private mode */ }
}

export function isEmailSignInLink(href = window.location.href) {
  return isSignInWithEmailLink(auth, href);
}

export function getStoredSignInEmail() {
  try { return localStorage.getItem(EMAIL_FOR_SIGNIN_KEY) || ''; } catch { return ''; }
}

// Complete email-link sign-in (creates the account if new). `email` must match
// the invited address; on a different device the app asks the user to enter it.
export async function completeEmailLinkSignIn(email, href = window.location.href) {
  const cred = await signInWithEmailLink(auth, email, href);
  try { localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY); } catch { /* ignore */ }
  return cred.user;
}

// Express registration: set a password (+ optional display name) on the freshly
// email-link-signed-in account so the player can log in normally afterwards.
export async function setPasswordAndName(password, displayName) {
  if (!auth.currentUser) throw new Error('NO_CURRENT_USER');
  await updatePassword(auth.currentUser, password);
  if (displayName) { try { await updateProfile(auth.currentUser, { displayName }); } catch {} }
  return auth.currentUser;
}

export default app;
