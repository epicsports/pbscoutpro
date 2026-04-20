import { useCallback } from 'react';
import { useWorkspace } from './useWorkspace';

/**
 * DEPRECATED (§ 38): this hook now delegates to `useWorkspace().linkedPlayer`,
 * which is populated by a live query against `players/{X}.linkedUid` set
 * during PBLI onboarding. Email-based matching from SelfLog Tier 1 is gone —
 * the `players/{X}.emails[]` field is kept as historical record but no longer
 * used for identity resolution.
 *
 * `claimPlayer` is now a no-op that returns void — onboarding happens via
 * `/onboarding/pbleagues` (see src/pages/PbleaguesOnboardingPage.jsx).
 * Callers still referencing it will log a dev warning; migrate them to the
 * onboarding route flow.
 *
 * Migrate consumers in a future commit to read `{ linkedPlayer }` directly
 * from `useWorkspace()` and drop this indirection.
 */
export function useSelfLogIdentity() {
  const { linkedPlayer, user } = useWorkspace();

  const claimPlayer = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.warn(
        '[useSelfLogIdentity] claimPlayer() is a no-op since § 38 — ' +
        'onboarding happens via /onboarding/pbleagues. Remove this caller.'
      );
    }
  }, []);

  return {
    user,
    playerId: linkedPlayer?.id || null,
    playerName: linkedPlayer?.nickname || linkedPlayer?.name || null,
    // Kept for back-compat with existing onboarding modal in MainPage — new
    // onboarding gate (AuthGate) supersedes this and routes unlinked users
    // to /onboarding/pbleagues before MainPage ever mounts.
    needsOnboarding: false,
    claimPlayer,
  };
}
