import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db, auth, ensureAuth, subscribeAuth, logout as fbLogout } from '../services/firebase';
import {
  getOrCreateUserProfile,
  migrateWorkspaceRoles,
  subscribeLinkedPlayer,
} from '../services/dataService';
import {
  getRolesForUser,
  isAdmin as isAdminUtil,
  isPendingApproval as isPendingApprovalUtil,
} from '../utils/roleUtils';
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
  const [linkedPlayer, setLinkedPlayer] = useState(null);

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

  // Initial workspace restore from storage. Live updates (roles/members/etc.)
  // come from the subscribeWorkspace effect below.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const ws = JSON.parse(saved);
        if (ws?.slug) {
          (async () => {
            try {
              const authUser = await ensureAuth();
              const ref = doc(db, 'workspaces', ws.slug);
              const snap = await getDoc(ref);
              if (snap.exists()) {
                try {
                  await setDoc(ref, {
                    members: arrayUnion(authUser.uid),
                    lastAccess: serverTimestamp(),
                  }, { merge: true });
                } catch (e) { console.warn('Members update failed (will retry on next login):', e.code); }
                const data = snap.data();
                setWorkspace({ slug: ws.slug, ...data });
              } else {
                localStorage.removeItem(STORAGE_KEY);
                sessionStorage.removeItem(STORAGE_KEY);
              }
            } catch (e) {
              console.error('Session restore failed:', e);
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

  // Live subscription to workspace doc — ensures userRoles / pendingApprovals /
  // migration state updates propagate without full reload.
  useEffect(() => {
    if (!workspace?.slug) return;
    const ref = doc(db, 'workspaces', workspace.slug);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      setWorkspace(prev => ({ slug: prev?.slug || workspace.slug, ...snap.data() }));
    });
    return () => unsub();
  }, [workspace?.slug]);

  // Migration trigger — admins only, runs once per workspace lifetime.
  // Safe to retry: migrateWorkspaceRoles is idempotent via rolesVersion flag.
  useEffect(() => {
    if (!workspace?.slug || !user) return;
    if (workspace.rolesVersion === 2) return;
    const amAdmin = isAdminUtil(workspace, user);
    if (!amAdmin) return;
    migrateWorkspaceRoles(workspace.slug).catch(e => {
      console.warn('Role migration failed (will retry next load):', e?.code || e?.message);
    });
  }, [workspace?.slug, workspace?.rolesVersion, user?.uid, user?.email]);

  // Live listener for this user's linked player doc (for SelfLog + role gating).
  useEffect(() => {
    if (!user?.uid || !workspace?.slug) { setLinkedPlayer(null); return; }
    const unsub = subscribeLinkedPlayer(user.uid, setLinkedPlayer);
    return () => unsub();
  }, [user?.uid, workspace?.slug]);

  // Enter workspace — plain code only. `##`/`?` prefix parsing removed per
  // § 38.4: role assignment now happens via Settings → Members, not via
  // workspace code. First user in a brand-new workspace still becomes admin
  // (bootstrap); subsequent joiners land in pendingApprovals awaiting admin
  // assignment.
  async function enterWorkspace(code) {
    setError(null);
    const cleanCode = String(code || '');
    const slug = slugify(cleanCode);
    if (!slug || slug.length < 2) { setError('Code must be at least 2 characters'); return false; }
    try {
      const u = await ensureAuth();
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
        const update = {
          members: arrayUnion(u.uid),
          lastAccess: serverTimestamp(),
        };
        if (!data.passwordHash) update.passwordHash = pwHash;
        // New joiner (not in userRoles yet) lands in pendingApprovals — admin
        // must approve via Settings → Members.
        const existingRoles = data.userRoles?.[u.uid];
        if (existingRoles === undefined) {
          update[`userRoles.${u.uid}`] = [];
          update.pendingApprovals = arrayUnion(u.uid);
        }
        await setDoc(ref, update, { merge: true });
        ws = { slug, ...data };
      } else {
        // Brand-new workspace — bootstrap: first user becomes admin.
        await setDoc(ref, {
          name: cleanCode.trim(),
          passwordHash: pwHash,
          members: [u.uid],
          adminUid: u.uid,
          userRoles: { [u.uid]: ['admin'] },
          rolesVersion: 2,
          pendingApprovals: [],
          createdAt: serverTimestamp(),
          lastAccess: serverTimestamp(),
        });
        ws = { slug, name: cleanCode.trim(), adminUid: u.uid, userRoles: { [u.uid]: ['admin'] } };
      }
      setWorkspace(ws);
      const d = JSON.stringify({ slug: ws.slug, name: ws.name });
      localStorage.setItem(STORAGE_KEY, d);
      sessionStorage.setItem(STORAGE_KEY, d);
      return true;
    } catch (e) {
      console.error('Enter workspace failed:', e);
      const msg = e?.code === 'auth/operation-not-allowed'
        ? 'Authentication not enabled — please sign in with email.'
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

  // Computed multi-role values derived from workspace + user. Memoized so
  // consumers that compare `roles` (array) get stable references between
  // renders when underlying data is unchanged.
  const roles = useMemo(
    () => getRolesForUser(workspace, user?.uid),
    [workspace?.userRoles, user?.uid],
  );
  const adminFlag = useMemo(
    () => isAdminUtil(workspace, user),
    [workspace?.userRoles, workspace?.adminUid, user?.uid, user?.email],
  );
  const pendingApproval = useMemo(
    () => isPendingApprovalUtil(workspace, user?.uid),
    [workspace?.userRoles, workspace?.members, user?.uid],
  );

  useEffect(() => {
    if (user && workspace) {
      setSentryUser({
        uid: user.uid,
        email: user.email,
        workspace: workspace.slug,
        roles: roles.join(',') || 'none',
      });
    } else {
      clearSentryUser();
    }
  }, [user, workspace, roles]);

  return (
    <WorkspaceContext.Provider value={{
      workspace, loading, error, enterWorkspace, leaveWorkspace,
      user, userReady, signOutUser,
      basePath: workspace ? `workspaces/${workspace.slug}` : null,
      // § 38 multi-role API:
      roles,
      isAdmin: adminFlag,
      isPendingApproval: pendingApproval,
      linkedPlayer,
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
