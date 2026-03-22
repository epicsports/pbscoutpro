import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const WorkspaceContext = createContext(null);

const STORAGE_KEY = 'paintball-scout-workspace';

/**
 * Workspace = isolated data space for a scouting team.
 * The workspace slug becomes the Firestore path prefix:
 *   /workspaces/{slug}/teams/...
 *   /workspaces/{slug}/tournaments/...
 *
 * Anyone who knows the code can access the workspace.
 */

/** Normalize team code to a safe Firestore document ID */
function slugify(code) {
  return code
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 40);
}

export function WorkspaceProvider({ children }) {
  const [workspace, setWorkspace] = useState(null); // { slug, name, createdAt }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for saved workspace on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const ws = JSON.parse(saved);
        if (ws?.slug) {
          verifyWorkspace(ws.slug).then((verified) => {
            if (verified) {
              setWorkspace(verified);
            }
            setLoading(false);
          });
          return;
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  async function verifyWorkspace(slug) {
    try {
      const ref = doc(db, 'workspaces', slug);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { slug, ...snap.data() };
      }
      return null;
    } catch (e) {
      console.error('Verify workspace failed:', e);
      return null;
    }
  }

  async function enterWorkspace(code) {
    setError(null);
    const slug = slugify(code);

    if (!slug || slug.length < 2) {
      setError('Kod musi mieć minimum 2 znaki (litery i cyfry)');
      return false;
    }

    try {
      const ref = doc(db, 'workspaces', slug);
      const snap = await getDoc(ref);

      let ws;
      if (snap.exists()) {
        // Existing workspace — load it
        ws = { slug, ...snap.data() };
        // Update lastAccess
        await setDoc(ref, { lastAccess: serverTimestamp() }, { merge: true });
      } else {
        // New workspace — create it
        const data = {
          name: code.trim(),
          createdAt: serverTimestamp(),
          lastAccess: serverTimestamp(),
        };
        await setDoc(ref, data);
        ws = { slug, name: code.trim() };
      }

      setWorkspace(ws);
      // Save to both storage types
      const saveData = JSON.stringify({ slug: ws.slug, name: ws.name });
      localStorage.setItem(STORAGE_KEY, saveData);
      sessionStorage.setItem(STORAGE_KEY, saveData);
      return true;
    } catch (e) {
      console.error('Enter workspace failed:', e);
      setError('Błąd połączenia z bazą danych. Sprawdź konfigurację Firebase.');
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
      workspace,
      loading,
      error,
      enterWorkspace,
      leaveWorkspace,
      /** Firestore path prefix for this workspace */
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
