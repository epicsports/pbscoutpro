import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
import { DEFAULT_WORKSPACE_SLUG } from '../utils/constants';
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
  // /users/{uid} profile mirrored live via onSnapshot so admin-side role
  // changes elsewhere propagate without reload. See § 49 for the auth model.
  const [userProfile, setUserProfile] = useState(null);

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

  // Live /users/{uid} subscription — feeds userProfile.roles (bootstrap
  // role default per § 49) and userProfile.defaultWorkspace (auto-approve
  // path in enterWorkspace). getOrCreateUserProfile above ensures the doc
  // exists before this effect subscribes.
  useEffect(() => {
    if (!user?.uid || user.isAnonymous) { setUserProfile(null); return; }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setUserProfile({ id: snap.id, ...snap.data() });
      else setUserProfile(null);
    }, () => { /* permission error — leave as null */ });
    return () => unsub();
  }, [user?.uid, user?.isAnonymous]);

  // Initial workspace restore from storage. Live updates (roles/members/etc.)
  // come from the subscribeWorkspace effect below.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const ws = JSON.parse(saved);
        if (ws?.slug) {
          // Legacy storage (pre-slugify() enforcement) may contain uppercase
          // or whitespace in slugs. Firestore doc IDs are case-sensitive, so
          // `doc(db, 'workspaces', 'Ranger1996')` would 404 even though
          // `ranger1996` exists. Normalize on load AND persist the cleaned
          // shape so subsequent loads don't need this shim. (2026-04-22 audit
          // surfaced `biuro@epicsports.pl` broken by exactly this mismatch.)
          const normalizedSlug = slugify(ws.slug);
          if (normalizedSlug && normalizedSlug !== ws.slug) {
            ws.slug = normalizedSlug;
            const d = JSON.stringify({ slug: normalizedSlug, name: ws.name });
            localStorage.setItem(STORAGE_KEY, d);
            sessionStorage.setItem(STORAGE_KEY, d);
          }
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
        // New joiner routing (§ 49 unified auth):
        //   (1) Default workspace + user has a bootstrap role array on
        //       /users/{uid} → auto-approve, mirror user.roles into
        //       workspace.userRoles[uid]. Skip pending-approval gate.
        //   (2) Any other case (non-default workspace OR user has no
        //       roles array yet) → existing pending-approvals flow. Admin
        //       must approve via Settings → Members.
        const existingRoles = data.userRoles?.[u.uid];
        if (existingRoles === undefined) {
          const isDefaultWs = userProfile?.defaultWorkspace
            && slug === userProfile.defaultWorkspace;
          const bootstrapRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
          if (isDefaultWs && bootstrapRoles.length > 0) {
            update[`userRoles.${u.uid}`] = [...bootstrapRoles];
            // Intentionally NOT adding to pendingApprovals — auto-approved.
          } else {
            update[`userRoles.${u.uid}`] = [];
            update.pendingApprovals = arrayUnion(u.uid);
          }
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

  // Auto-enter the user's default workspace (2026-04-24 retire-team-code
  // hotfix). Called automatically when the user is authenticated, no
  // workspace is restored from storage, and userProfile has resolved.
  // Skips the password check — the target slug is either the hardcoded
  // DEFAULT_WORKSPACE_SLUG or the server-side userProfile.defaultWorkspace
  // (set only by getOrCreateUserProfile), both system-trusted. The
  // existing enterWorkspace(code) path stays for admin workspace-switch
  // via Settings, which remains password-gated.
  //
  // Write shape matches enterWorkspace's self-join envelope exactly so
  // the existing Firestore rule (hasOnly ['members', 'userRoles',
  // 'pendingApprovals', 'lastAccess', 'passwordHash']) accepts the write
  // without a rules change.
  async function autoEnterDefaultWorkspace() {
    setError(null);
    const slug = userProfile?.defaultWorkspace || DEFAULT_WORKSPACE_SLUG;
    if (!slug || !user?.uid || user.isAnonymous) return false;
    try {
      const ref = doc(db, 'workspaces', slug);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        // Target workspace missing — surface an error but don't crash.
        // Admin needs to intervene; user sees the no-workspace fallback.
        setError('Default workspace not found. Contact admin.');
        return false;
      }
      const data = snap.data();
      const update = {
        members: arrayUnion(user.uid),
        lastAccess: serverTimestamp(),
      };
      const existingRoles = data.userRoles?.[user.uid];
      if (existingRoles === undefined) {
        // New joiner — auto-approve if this IS their defaultWorkspace AND
        // their user doc carries a bootstrap roles array. Otherwise fall
        // through to the pending-approval gate (admin reviews in
        // Members panel). Mirrors enterWorkspace's existing logic so the
        // post-join state is identical.
        const isDefaultWs = userProfile?.defaultWorkspace
          && slug === userProfile.defaultWorkspace;
        const bootstrapRoles = Array.isArray(userProfile?.roles) ? userProfile.roles : [];
        if (isDefaultWs && bootstrapRoles.length > 0) {
          update[`userRoles.${user.uid}`] = [...bootstrapRoles];
        } else {
          update[`userRoles.${user.uid}`] = [];
          update.pendingApprovals = arrayUnion(user.uid);
        }
      }
      await setDoc(ref, update, { merge: true });
      const ws = { slug, ...data };
      setWorkspace(ws);
      const d = JSON.stringify({ slug: ws.slug, name: ws.name });
      localStorage.setItem(STORAGE_KEY, d);
      sessionStorage.setItem(STORAGE_KEY, d);
      return true;
    } catch (e) {
      console.error('Auto-enter default workspace failed:', e);
      const msg = e?.code === 'permission-denied' || e?.code === 'PERMISSION_DENIED'
        ? 'Permission denied entering default workspace — log out and log in again.'
        : `Connection error: ${e?.code || e?.message || 'unknown'}`;
      setError(msg);
      return false;
    }
  }

  // Drive the auto-enter exactly once per auth session after
  // userProfile has loaded. Guard against re-firing while the write is
  // in flight or after it has successfully set `workspace`. Admins with
  // a prior session restore hit this effect with `workspace` already
  // set and short-circuit.
  const autoEnterInFlightRef = useRef(false);
  useEffect(() => {
    if (loading) return;
    if (workspace) return;
    if (!user?.uid || user.isAnonymous) return;
    if (!userProfile) return; // wait for /users/{uid} to load
    if (autoEnterInFlightRef.current) return;
    autoEnterInFlightRef.current = true;
    autoEnterDefaultWorkspace().finally(() => {
      autoEnterInFlightRef.current = false;
    });
    // Deliberately exhaustive-deps-off — autoEnterDefaultWorkspace closes
    // over the same state we read here; React would see it as a fresh
    // reference every render and re-fire. The ref guard handles that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, workspace, user?.uid, user?.isAnonymous, userProfile]);

  async function signOutUser() {
    leaveWorkspace();
    try { await fbLogout(); } catch (e) { console.warn('Sign out failed:', e); }
  }

  // Canonical role resolution (§ 49):
  //   1. If workspace.userRoles[uid] is a non-empty array, use it. This is
  //      the authoritative path — admin has touched this user via Members
  //      page OR enterWorkspace bootstrapped them in.
  //   2. Else fall back to /users/{uid}.roles. This covers new signups
  //      whose user doc carries `['player']` by default but haven't yet
  //      joined any workspace, AND edge cases where workspace.userRoles
  //      is empty `[]` (pending approval, but we still want tab visibility
  //      to reflect the user's default capability).
  //   3. Else empty — most restrictive; treated as pure-player downstream.
  const roles = useMemo(() => {
    const wsRoles = getRolesForUser(workspace, user?.uid);
    if (Array.isArray(wsRoles) && wsRoles.length > 0) return wsRoles;
    const userRoles = userProfile?.roles;
    if (Array.isArray(userRoles) && userRoles.length > 0) return userRoles;
    return [];
  }, [workspace?.userRoles, user?.uid, userProfile?.roles]);
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
      // § 38 multi-role API + § 49 unified auth:
      roles,
      isAdmin: adminFlag,
      isPendingApproval: pendingApproval,
      linkedPlayer,
      userProfile,
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
