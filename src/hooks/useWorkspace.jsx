import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db, auth, ensureAuth } from '../services/firebase';

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
                setWorkspace({ slug: ws.slug, isAdmin, ...data });
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
    const cleanCode = wantsAdmin ? code.slice(2) : code;
    const slug = slugify(cleanCode);
    if (!slug || slug.length < 2) { setError('Code must be at least 2 characters'); return false; }
    try {
      const user = await ensureAuth();
      const pwHash = await hashPassword(cleanCode.trim());
      const ref = doc(db, 'workspaces', slug);
      const snap = await getDoc(ref);
      let ws;
      if (snap.exists()) {
        const data = snap.data();
        if (data.passwordHash && data.passwordHash !== pwHash) {
          setError('Wrong workspace password.');
          return false;
        }
        // Admin = uid matches adminUid, OR ## prefix + migrate adminUid
        const update = {
          members: arrayUnion(user.uid),
          lastAccess: serverTimestamp(),
        };
        if (!data.passwordHash) update.passwordHash = pwHash;
        // If ## used and no adminUid set yet, claim admin
        if (wantsAdmin && !data.adminUid) update.adminUid = user.uid;
        await setDoc(ref, update, { merge: true });
        const isAdmin = (data.adminUid || update.adminUid) === user.uid;
        ws = { slug, isAdmin, ...data };
      } else {
        await setDoc(ref, {
          name: cleanCode.trim(),
          passwordHash: pwHash,
          members: [user.uid],
          adminUid: user.uid,
          createdAt: serverTimestamp(),
          lastAccess: serverTimestamp(),
        });
        ws = { slug, isAdmin: true, name: cleanCode.trim() };
      }
      setWorkspace(ws);
      const d = JSON.stringify({ slug: ws.slug, name: ws.name });
      localStorage.setItem(STORAGE_KEY, d);
      sessionStorage.setItem(STORAGE_KEY, d);
      return true;
    } catch (e) {
      console.error('Enter workspace failed:', e);
      const msg = e?.code === 'auth/operation-not-allowed'
        ? 'Anonymous Auth nie jest włączony w Firebase Console.'
        : e?.code === 'permission-denied' || e?.code === 'PERMISSION_DENIED'
        ? 'Brak uprawnień — wyloguj się i zaloguj ponownie.'
        : `Błąd połączenia: ${e?.code || e?.message || 'unknown'}`;
      setError(msg);
      return false;
    }
  }

  function leaveWorkspace() {
    setWorkspace(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return (
    <WorkspaceContext.Provider value={{
      workspace, loading, error, enterWorkspace, leaveWorkspace,
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
