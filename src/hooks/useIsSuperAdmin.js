import { useMemo } from 'react';
import { useWorkspace } from './useWorkspace';
import { isSuperAdmin } from '../utils/roleUtils';

/**
 * useIsSuperAdmin — cross-workspace super_admin gate (§ 66.2, Phase 3.a).
 *
 * Returns true when the current user is a platform super_admin — either via
 * the explicit `users/{uid}.globalRole === 'super_admin'` field or the
 * ADMIN_EMAILS bootstrap fallback (see isSuperAdmin in roleUtils).
 *
 * Distinct from `useWorkspace().isAdmin`, which is workspace-scoped. Use this
 * for UI that gates cross-workspace operations (Phase 3.b-f: super_admin user
 * management, cross-workspace team/player editing). No consumers in Phase
 * 3.a — ships for Phase 3.b onward.
 */
export function useIsSuperAdmin() {
  const { user, userProfile } = useWorkspace();
  return useMemo(
    () => isSuperAdmin(user, userProfile),
    [user?.uid, user?.email, userProfile?.globalRole],
  );
}
