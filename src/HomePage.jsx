import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const WorkspaceContext = createContext(null);
const STORAGE_KEY = 'pbscoutpro-workspace';

function slugify(code) {
  return code.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 40);
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
            const ref = doc(db, 'workspaces', ws.slug);
            try {
              const snap = await getDoc(ref);
              if (snap.exists()) setWorkspace({ slug: ws.slug, ...snap.data() });
            } catch (e) { console.error('Verify failed:', e); }
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
    const slug = slugify(code);
    if (!slug || slug.length < 2) { setError('Kod musi mieć minimum 2 znaki'); return false; }
    try {
      const ref = doc(db, 'workspaces', slug);
      const snap = await getDoc(ref);
      let ws;
      if (snap.exists()) {
        ws = { slug, ...snap.data() };
        await setDoc(ref, { lastAccess: serverTimestamp() }, { merge: true });
      } else {
        await setDoc(ref, { name: code.trim(), createdAt: serverTimestamp(), lastAccess: serverTimestamp() });
        ws = { slug, name: code.trim() };
      }
      setWorkspace(ws);
      const d = JSON.stringify({ slug: ws.slug, name: ws.name });
      localStorage.setItem(STORAGE_KEY, d);
      sessionStorage.setItem(STORAGE_KEY, d);
      return true;
    } catch (e) {
      console.error('Enter workspace failed:', e);
      setError('Błąd połączenia. Sprawdź konfigurację Firebase.');
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
