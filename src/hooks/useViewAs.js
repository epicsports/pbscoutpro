import { useWorkspace } from './useWorkspace';
import { useViewAsContext } from '../contexts/ViewAsContext';

const noop = () => {};

/**
 * useViewAs — role-impersonation preview layer on top of useWorkspace (§ 38.5).
 *
 * Returned shape:
 *   realIsAdmin        — actual admin status. ViewAsPill visibility MUST use this
 *                        (so admin impersonating viewer still sees the escape hatch).
 *   effectiveRoles     — roles array for ALL UI gating. Collapses to `[viewAs.role]`
 *                        during impersonation so feature flags / CTAs / route guards
 *                        see exactly what the target role sees.
 *   effectiveIsAdmin   — admin-gated UI that SHOULD be hidden during impersonation
 *                        (e.g. Members tab, Debug Flags). Falls to true only when
 *                        impersonating `admin` explicitly, or not impersonating at all.
 *   viewAs             — `{ role, playerId? } | null`
 *   isImpersonating    — `viewAs !== null`
 *   viewAsPlayerId     — playerId when impersonating 'player', else null
 *   setViewAs(next)    — admin-only; no-op for non-admins (defensive)
 *   exitImpersonation()— admin-only; no-op for non-admins (defensive)
 *
 * Non-admins always get `effectiveRoles === roles` and cannot write impersonation.
 * Permissions are NOT downgraded — this is UI preview, not sandboxing (§ 38.5).
 */
export function useViewAs() {
  const { roles, isAdmin: realIsAdmin } = useWorkspace();
  const { viewAs: ctxViewAs, setViewAs: ctxSetViewAs } = useViewAsContext();

  const viewAs = realIsAdmin ? ctxViewAs : null;
  const setViewAs = realIsAdmin ? ctxSetViewAs : noop;

  const effectiveRoles = viewAs ? [viewAs.role] : roles;
  const effectiveIsAdmin = viewAs ? viewAs.role === 'admin' : realIsAdmin;
  const isImpersonating = viewAs !== null;
  const viewAsPlayerId = viewAs?.playerId || null;

  return {
    realIsAdmin,
    effectiveRoles,
    effectiveIsAdmin,
    viewAs,
    setViewAs,
    isImpersonating,
    viewAsPlayerId,
    exitImpersonation: () => setViewAs(null),
  };
}
