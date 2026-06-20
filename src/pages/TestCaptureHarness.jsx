// EMULATOR-ONLY test rig for the TACTIC configuration of useCaptureDraft (Stage
// 2.0). The tactic editor screen lands in Stage 2.2; this minimal mount exercises
// the NEW engine branches (teams:'single', outcomeEnabled:false, the positional
// 5-phase set) NOW so the tactic golden is captured + the branches are proven
// green before any editor exists. Mirrors the MatchPage capture probe pattern:
// publishes window.__pbCaptureTactic (real handlers + deterministic draft tree).
// Gated on VITE_USE_EMULATOR (the route is only registered under the flag).
import React, { useRef } from 'react';
import useCaptureDraft, { E5 } from '../hooks/useCaptureDraft';

// Canonical positional play set (tactic root = preBreakout).
export const TACTIC_PHASES = ['preBreakout', 'breakout', 'settle', 'mid', 'endgame'];

export default function TestCaptureHarness() {
  const lastAssignA = useRef(E5());
  const lastAssignB = useRef(E5());
  const eng = useCaptureDraft({
    target: 'tactic', teams: 'single', outcomeEnabled: false,
    capturePhases: TACTIC_PHASES,
    lastAssignA, lastAssignB,
  });

  if (typeof window !== 'undefined' && import.meta.env.VITE_USE_EMULATOR === 'true') {
    window.__pbCaptureTactic = {
      v: (window.__pbCaptureTacticV = (window.__pbCaptureTacticV || 0) + 1),
      // single-team deterministic snapshot (no draftB / outcome).
      state: () => JSON.parse(JSON.stringify({
        captureStage: eng.captureStage,
        draftA: eng.draftA,
        stageDraftsA: eng.stageDraftsA,
        stageAnnotations: eng.stageAnnotations,
      })),
      toolbarItems: () => JSON.parse(JSON.stringify(eng.toolbarItems.map(i => i.action))),
      switchStage: eng.switchStage,
      placePlayer: eng.handlePlacePlayer, movePlayer: eng.handleMovePlayer,
      selectPlayer: eng.handleSelectPlayer, toolbarAction: eng.handleToolbarAction,
      toggleQuickZone: eng.handleToggleQuickZone, placeShot: eng.handlePlaceShot,
      removePlayer: eng.removePlayer,
    };
  }

  return <div data-testid="capture-harness-ready" style={{ display: 'none' }} />;
}
