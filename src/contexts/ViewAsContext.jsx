import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

/**
 * ViewAsContext — admin-only role impersonation preview (§ 38.5).
 *
 * State shape: `{ role: 'admin'|'coach'|'scout'|'viewer'|'player', playerId?: string } | null`
 *
 * RE-ENABLED 2026-06-16 (CC_BRIEF_VIEWAS_REENABLE) after the 2026-04-24 hotfix
 * disabled it (the surface was a placeholder + no visible exit → stuck-impersonation
 * risk). Both are now addressed: the surface is real (ViewAsPill/Dropdown call
 * setViewAs) and ViewAsIndicator is wired back into app chrome (App.jsx) as a
 * persistent, non-dismissable exit. The admin-only boundary lives in useViewAs
 * (`viewAs = realIsAdmin ? ctxViewAs : null`, setViewAs no-op for non-admins) — a
 * tampered sessionStorage value has no effect for a non-admin. This is UI PREVIEW
 * (effectiveRoles only NARROWS UI); real permissions are unaffected.
 *
 * Persistence: per-workspace key (`pbscoutpro_viewAs_${slug}`). The provider is keyed
 * by slug in App.jsx, so it REMOUNTS on workspace change → impersonation can never leak
 * across workspaces (fresh state, reads the new ws's key). sessionStorage restores an
 * INTENTIONAL session across a reload within the same workspace.
 */
const ViewAsContext = createContext(null);

export function ViewAsProvider({ children, workspaceSlug }) {
  const storageKey = `pbscoutpro_viewAs_${workspaceSlug || 'none'}`;

  const [viewAs, setViewAsState] = useState(() => {
    try { const v = sessionStorage.getItem(storageKey); return v ? JSON.parse(v) : null; } catch { return null; }
  });

  useEffect(() => {
    try {
      if (viewAs) sessionStorage.setItem(storageKey, JSON.stringify(viewAs));
      else sessionStorage.removeItem(storageKey);
    } catch {}
  }, [viewAs, storageKey]);

  const setViewAs = useCallback((next) => setViewAsState(next || null), []);
  const value = useMemo(() => ({ viewAs, setViewAs }), [viewAs, setViewAs]);
  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAsContext() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAsContext must be used inside ViewAsProvider');
  return ctx;
}
