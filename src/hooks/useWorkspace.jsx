import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db, auth, ensureAuth, subscribeAuth, logout as fbLogout } from '../services/firebase';
import { getOrCreateUserProfile } from '../services/dataService';
import { setSentryUser, clearSentryUser } from '../services/sentry';

const WorkspaceContext = createContext(null);
const STORAGE_KEY = 'pbscoutpro-workspace';

function slugify(code) {
  return code.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 40);
}

async function hashPassword(code) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [userReady, setUserReady] = useState(false);

  // Subscribe to Firebase auth state — tracks the current user regardless of
  // sign-in method (email/password or legacy anonymous).
  useEffect(() => {
    const unsub = subscribeAuth(async (u) => {
      setUser(u || null);
      setUserReady(true);
      if (u && !u.isAnonymous) {
        // Real account — ensure Firestore profile exists.
        try {
          await getOrCreateUserProfile(u.uid, u.email || '', u.displayName || '');
        } catch (e) {
          console.warn('User profile create failed:', e);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const ws = JSON.parse(saved);
        if (ws?.slug) {
          (async () => {
            try {
              const user = await ensureAuth();
              const ref = doc(db, 'workspaces', ws.slug);
              const snap = await getDoc(ref);
              if (snap.exists()) {
                // Try to add uid to members — may fail on old workspaces, that's OK
                try {
                  await setDoc(ref, {
                    members: arrayUnion(user.uid),
                    lastAccess: serverTimestamp(),
                  }, { merge: true });
                } catch (e) { console.warn('Members update failed (will retry on next login):', e.code); }
                const data = snap.data();
                const isAdmin = data.adminUid === auth.currentUser?.uid;
                const savedRole = ws.role || 'coach';
                setWorkspace({ slug: ws.slug, isAdmin, role: savedRole, ...data });
              } else {
                // Workspace deleted — clear stored session
                localStorage.removeItem(STORAGE_KEY);
                sessionStorage.removeItem(STORAGE_KEY);
              }
            } catch (e) {
              console.error('Session restore failed:', e);
              // Clear bad session so user sees login screen
              localStorage.removeItem(STORAGE_KEY);
              sessionStorage.removeItem(STORAGE_KEY);
            }
            setLoading(false);
          })();
          return;
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  async function enterWorkspace(code) {
    setError(null);
    const wantsAdmin = code.startsWith('##');
    const wantsViewer = !wantsAdmin && code.startsWith('?');
    const cleanCode = wantsAdmin ? code.slice(2) : wantsViewer ? code.slice(1) : code;
    const slug = slugify(cleanCode);
    if (!slug || slug.length < 2) { setError('Code must be at least 2 characters'); return false; }
    try {
      const user = await ensureAuth();
      const pwHash = await hashPassword(cleanCode.trim());
      const ref = doc(db, 'workspaces', slug);
      const snap = await getDoc(ref);
      let ws;
      const role = wantsViewer ? 'viewer' : 'coach';
      if (snap.exists()) {
        const data = snap.data();
        if (data.passwordHash && data.passwordHash !== pwHash) {
          setError('Wrong workspace password.');
          return false;
        }
        const update = {
          members: arrayUnion(user.uid),
          lastAccess: serverTimestamp(),
        };
        if (!data.passwordHash) update.passwordHash = pwHash;
        if (wantsAdmin && !data.adminUid) update.adminUid = user.uid;
        await setDoc(ref, update, { merge: true });
        const isAdmin = (data.adminUid || update.adminUid) === user.uid;
        ws = { slug, isAdmin, role, ...data };
      } else {
        if (wantsViewer) { setError('Workspace not found. Viewers cannot create workspaces.'); return false; }
        await setDoc(ref, {
          name: cleanCode.trim(),
          passwordHash: pwHash,
          members: [user.uid],
          adminUid: user.uid,
          createdAt: serverTimestamp(),
          lastAccess: serverTimestamp(),
        });
        ws = { slug, isAdmin: true, role: 'coach', name: cleanCode.trim() };
      }
      setWorkspace(ws);
      const d = JSON.stringify({ slug: ws.slug, name: ws.name, role: ws.role });
      localStorage.setItem(STORAGE_KEY, d);
      sessionStorage.setItem(STORAGE_KEY, d);
      return true;
    } catch (e) {
      console.error('Enter workspace failed:', e);
      const msg = e?.code === 'auth/operation-not-allowed'
        ? 'Anonymous Auth is not enabled in Firebase Console.'
        : e?.code === 'permission-denied' || e?.code === 'PERMISSION_DENIED'
        ? 'Permission denied — log out and log in again.'
        : `Connection error: ${e?.code || e?.message || 'unknown'}`;
      setError(msg);
      return false;
    }
  }

  function leaveWorkspace() {
    setWorkspace(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  async function signOutUser() {
    leaveWorkspace();
    try { await fbLogout(); } catch (e) { console.warn('Sign out failed:', e); }
  }

  useEffect(() => {
    if (user && workspace) {
      setSentryUser({
        uid: user.uid,
        email: user.email,
        workspace: workspace.slug,
        role: workspace.role || 'scout',
      });
    } else {
      clearSentryUser();
    }
  }, [user, workspace]);

  return (
    <WorkspaceContext.Provider value={{
      workspace, loading, error, enterWorkspace, leaveWorkspace,
      user, userReady, signOutUser,
      basePath: workspace ? `workspaces/${workspace.slug}` : null,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be inside WorkspaceProvider');
  return ctx;
}
