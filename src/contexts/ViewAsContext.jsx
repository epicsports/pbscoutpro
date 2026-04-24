import React, { createContext, useContext, useEffect, useMemo } from 'react';

/**
 * ViewAsContext — admin-only role impersonation preview (§ 38.5).
 *
 * State shape: `{ role: 'admin'|'coach'|'scout'|'viewer'|'player', playerId?: string } | null`
 *
 * Hotfix 2026-04-24: impersonation is disabled at the runtime layer while the
 * "Podgląd jako" surface is a placeholder (toast-only) per § 50 UX direction.
 * `viewAs` is always `null` and `setViewAs` is a no-op. Previously-persisted
 * sessionStorage values are cleared on mount so users don't remain stuck with
 * a stale impersonation state after the floating ViewAsIndicator pill was
 * removed from app chrome. Restoring the feature = re-enable the useState +
 * effect pair below.
 */
const ViewAsContext = createContext(null);

const noop = () => {};

export function ViewAsProvider({ children, workspaceSlug }) {
  const storageKey = `pbscoutpro_viewAs_${workspaceSlug || 'none'}`;

  useEffect(() => {
    try { sessionStorage.removeItem(storageKey); } catch {}
  }, [storageKey]);

  const value = useMemo(() => ({ viewAs: null, setViewAs: noop }), []);
  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAsContext() {
  const ctx = useContext(ViewAsContext);
  if (!ctx) throw new Error('useViewAsContext must be used inside ViewAsProvider');
  return ctx;
}
