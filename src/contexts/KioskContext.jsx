import { createContext, useState, useCallback, useContext, useMemo } from 'react';
import { isKioskCompatible } from '../utils/kioskViewport';

/**
 * KioskContext — § 55 KIOSK Player Verification mode state.
 *
 * Decisions per CC_BRIEF_KIOSK_B_LOBBY pre-implementation (2026-04-29):
 *   E1 — context-direct identity (no useSelfLogIdentity hook recreated).
 *        HotSheet receives `playerId` prop. KIOSK lobby renders HotSheet
 *        with `playerId={kiosk.activePlayerId}` overriding the email-matched
 *        player. MatchPage's existing FAB path (uses linkedPlayer) untouched.
 *   E3 — overlay (not route). `postSaveOpen` and `lobbyOpen` flags drive
 *        full-screen overlays mounted at App root. Coach view persists
 *        underneath, not navigated away from.
 *   E4 — training only for MVP. enterPostSave/enterLobby take training
 *        context (trainingId, matchupId, scoutingSide). Tournament path
 *        is a separate brief.
 *   E6 — viewport gate. enterPostSave is a no-op on phone / portrait —
 *        coach proceeds without seeing KIOSK overlays; players use Tier 1
 *        HotSheet on their own phones.
 *
 * State surface:
 *   activePlayerId    — set when a tile is tapped in lobby; identity override
 *   lobbyOpen         — full-screen lobby visible
 *   postSaveOpen      — full-screen post-save summary visible
 *   pointId           — point currently in lobby (or just saved for postSave)
 *   trainingId        — training context (E4)
 *   matchupId         — training matchup context (E4)
 *   scoutingSide      — 'home' | 'away' — which side's players the lobby filters
 *
 * Actions:
 *   enterPostSave({ pointId, trainingId, matchupId, scoutingSide })
 *     → no-op if !isKioskCompatible (E6)
 *     → otherwise opens post-save summary screen
 *   enterLobby() — transition postSave → lobby (after tap "Przekaż graczom")
 *   exitPostSave() — close post-save without entering lobby (tap "Następny punkt →")
 *   exitLobby() — close lobby (back chevron); clears all state
 *   setActivePlayer(playerId) — tile tap; arms HotSheet identity override
 *   clearActivePlayer() — call after wizard close (save or cancel)
 */
export const KioskContext = createContext(null);

export function useKiosk() {
  return useContext(KioskContext);
}

export function KioskProvider({ children }) {
  const [activePlayerId, setActivePlayerId] = useState(null);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [postSaveOpen, setPostSaveOpen] = useState(false);
  const [pointId, setPointId] = useState(null);
  const [trainingId, setTrainingId] = useState(null);
  const [matchupId, setMatchupId] = useState(null);
  const [scoutingSide, setScoutingSide] = useState(null);

  const reset = useCallback(() => {
    setActivePlayerId(null);
    setLobbyOpen(false);
    setPostSaveOpen(false);
    setPointId(null);
    setTrainingId(null);
    setMatchupId(null);
    setScoutingSide(null);
  }, []);

  const enterPostSave = useCallback((ctx) => {
    // E6 viewport gate — phone / portrait → no KIOSK, coach goes straight on
    if (!isKioskCompatible()) return false;
    if (!ctx?.pointId) return false;
    setPointId(ctx.pointId);
    setTrainingId(ctx.trainingId || null);
    setMatchupId(ctx.matchupId || null);
    setScoutingSide(ctx.scoutingSide || null);
    setPostSaveOpen(true);
    setLobbyOpen(false);
    setActivePlayerId(null);
    return true;
  }, []);

  const enterLobby = useCallback(() => {
    // Transition from postSave (after "Przekaż graczom") into lobby
    setPostSaveOpen(false);
    setLobbyOpen(true);
  }, []);

  const exitPostSave = useCallback(() => {
    // "Następny punkt →" — dismiss summary, return to coach view
    reset();
  }, [reset]);

  const exitLobby = useCallback(() => {
    // Back chevron — leave entire KIOSK flow
    reset();
  }, [reset]);

  const setActivePlayer = useCallback((playerId) => {
    setActivePlayerId(playerId);
  }, []);

  const clearActivePlayer = useCallback(() => {
    setActivePlayerId(null);
  }, []);

  const value = useMemo(() => ({
    activePlayerId, lobbyOpen, postSaveOpen,
    pointId, trainingId, matchupId, scoutingSide,
    enterPostSave, enterLobby, exitPostSave, exitLobby,
    setActivePlayer, clearActivePlayer,
  }), [
    activePlayerId, lobbyOpen, postSaveOpen,
    pointId, trainingId, matchupId, scoutingSide,
    enterPostSave, enterLobby, exitPostSave, exitLobby,
    setActivePlayer, clearActivePlayer,
  ]);

  return (
    <KioskContext.Provider value={value}>
      {children}
    </KioskContext.Provider>
  );
}
