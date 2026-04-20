import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

/**
 * ViewAsContext — admin-only role impersonation preview (§ 38.5).
 *
 * State shape: `{ role: 'admin'|'coach'|'scout'|'viewer'|'player', playerId?: string } | null`
 *
 * Persistence: sessionStorage keyed by workspace slug. Per-tab — never localStorage
 * — so impersonation auto-clears when the tab closes (§ 38.10 anti-pattern).
 *
 * Provider is expected to be remounted on workspace switch via `key={slug}` so
 * useState's lazy initializer reads the fresh sessionStorage key. See App.jsx.
 */
const ViewAsContext = createContext(null);

export function ViewAsProvider({ children, workspaceSlug }) {
  const storageKey = `pbscoutpro_viewAs_${workspaceSlug || 'none'}`;

  const [viewAs, setViewAs] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (viewAs) sessionStorage.setItem(storageKey, JSON.stringify(viewAs));
      else sessionStorage.removeItem(storageKey);
    } catch {
      // sessionStorage disabled / quota — non-fatal, impersonation just
      // won't survive a hard reload.
    }
  }, [viewAs, storageKey]);

  const value = useMemo(() => ({ viewAs, setViewAs }), [viewAs]);
  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAsContext() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAsContext must be used inside ViewAsProvider');
  return ctx;
}
