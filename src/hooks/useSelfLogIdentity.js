import { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from './useWorkspace';
import { usePlayers } from './useFirestore';
import * as ds from '../services/dataService';

/**
 * Maps the logged-in user to a player via player.emails[].
 *
 * Returns { playerId, needsOnboarding, claimPlayer, user }.
 * - playerId: id of matched player, or null.
 * - needsOnboarding: true when user has email but no match (show modal).
 * - claimPlayer(pid): writes user.email into player.emails, completes onboarding.
 */
export function useSelfLogIdentity() {
  const { user } = useWorkspace();
  const { players } = usePlayers();
  const [playerId, setPlayerId] = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user?.email || !Array.isArray(players)) return;
    const email = user.email.toLowerCase();
    const match = players.find(p =>
      Array.isArray(p.emails) && p.emails.some(e => (e || '').toLowerCase() === email)
    );
    if (match) {
      setPlayerId(match.id);
      setNeedsOnboarding(false);
    } else {
      setPlayerId(null);
      setNeedsOnboarding(true);
    }
  }, [user?.email, players]);

  const claimPlayer = useCallback(async (pid) => {
    if (!user?.email) return;
    await ds.claimPlayer(pid, user.email);
    setPlayerId(pid);
    setNeedsOnboarding(false);
  }, [user?.email]);

  return { user, playerId, needsOnboarding, claimPlayer };
}
