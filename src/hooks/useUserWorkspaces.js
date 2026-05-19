import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useWorkspace } from './useWorkspace';

// Phase 1.1 of multi-tenant migration (DESIGN_DECISIONS § 63.3 Option α +
// MULTI_TENANT_MIGRATION_PLAN.md Phase 1.1).
//
// Returns the list of workspaces the current user is a member of, queried
// via `workspace.userRoles[uid]` map field as source of truth. This is the
// first consumer of the Option α model — every other userRoles[uid] read
// today operates on an already-fetched single workspace doc.
//
// Foundation for future switcher UI (separate brief). Phase 1.2 + 1.3
// build on this by dropping the now-redundant `users/{uid}.workspaces`
// write path and deleting the field server-side.
//
// One-shot fetch on auth change. Upgrade to onSnapshot only if the future
// switcher needs real-time updates on grant/revoke — defer until proven.
export function useUserWorkspaces() {
  const { user } = useWorkspace();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid || user.isAnonymous) {
      setWorkspaces([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const q = query(
          collection(db, 'workspaces'),
          where(`userRoles.${user.uid}`, '!=', null),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = snap.docs.map(d => {
          const data = d.data() || {};
          return {
            id: d.id,
            slug: d.id,
            name: data.name,
            role: data.userRoles?.[user.uid] || [],
            ...data,
          };
        });
        setWorkspaces(list);
      } catch (e) {
        if (cancelled) return;
        console.error('useUserWorkspaces query failed:', e);
        setError(e);
        setWorkspaces([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, user?.isAnonymous]);

  return { workspaces, loading, error };
}
