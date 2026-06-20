// tacticDoc — Stage 2.1 serialize / hydrate / legacy-compat for the phased tactic
// doc (TACTIC_AS_SCOUTED_POINT.md §3). A tactic = an outcome-less, single-team,
// phase-structured point. Persisted under /layoutOverlays/{layoutId}/tactics/{id}:
//
//   { schemaVersion: 2, phases: { preBreakout, breakout, settle, mid, endgame } }
//   PHASE = { players, assign, bumps, runners, shots, quickShots, zoneShots }
//
// MY-TEAM + SETUP-SIDE ONLY — excludes elim/elimPos/elimReasons/penalty/outcome
// (result side) + obstacleShots/zoneObstacleShots (legacy read-only) + bumpShots/
// curve (Q2: one schema, zero drift). Serialized via the SHARED point helpers
// (shotsToFirestore/quickShotsToFirestore) → zero divergence from scouting.
//
// Legacy read (no schemaVersion:2): the single flat/steps[0] arrangement maps into
// phases.breakout (Q1 — the buzzer positions); freehand → the annotation layer
// (handled by the editor, not here). NO destructive migration — a legacy tactic
// simply opens as a one-phase (breakout) tactic.
import {
  shotsToFirestore, shotsFromFirestore, quickShotsToFirestore, quickShotsFromFirestore,
} from '../services/dataService';
import { emptyTeam, E5, E5B } from '../hooks/useCaptureDraft';
import { tacticToCanvasProps } from './tacticState';

// Canonical positional play set (tactic root = preBreakout). Mirrors
// TestCaptureHarness.TACTIC_PHASES — kept here as the persistence contract.
export const TACTIC_PHASE_KEYS = ['preBreakout', 'breakout', 'settle', 'mid', 'endgame'];

/** A hook draft (emptyTeam-shaped) → the persisted PHASE doc (setup-side only). */
export function tacticDraftToPhaseDoc(draft) {
  if (!draft) return null;
  return {
    players: draft.players || E5(),
    assign: draft.assign || E5(),
    bumps: draft.bumps || E5(),
    runners: draft.runners || E5B(),
    shots: shotsToFirestore(draft.shots),
    quickShots: quickShotsToFirestore(draft.quickShots),
    zoneShots: quickShotsToFirestore(draft.zoneShots),
  };
}

/** A persisted PHASE doc → a hook draft (emptyTeam with setup-side filled). */
export function tacticPhaseDocToDraft(p) {
  if (!p) return null;
  return {
    ...emptyTeam(),
    players: Array.isArray(p.players) ? p.players : E5(),
    assign: Array.isArray(p.assign) ? p.assign : E5(),
    bumps: Array.isArray(p.bumps) ? p.bumps : E5(),
    runners: Array.isArray(p.runners) ? p.runners : E5B(),
    shots: shotsFromFirestore(p.shots),
    quickShots: quickShotsFromFirestore(p.quickShots),
    zoneShots: quickShotsFromFirestore(p.zoneShots),
  };
}

/**
 * The hook's per-phase tactic state → the tactic doc payload (additive — merge
 * onto the doc, leaving name/onBoard/order/freehandStrokes intact).
 * `phases` = { preBreakout: draft|null, breakout: draft|null, … }.
 */
export function tacticStateToDoc(phases) {
  const out = {};
  TACTIC_PHASE_KEYS.forEach(k => { out[k] = tacticDraftToPhaseDoc(phases?.[k] || null); });
  return { schemaVersion: 2, phases: out };
}

/**
 * A tactic doc → the per-phase hook drafts (root + stages), keyed by phase.
 * schemaVersion:2 → deserialize phases. Legacy → flat/steps[0] arrangement into
 * phases.breakout (Q1); other phases null. Freehand stays the annotation layer.
 */
export function tacticDocToPhases(tac) {
  if (tac && tac.schemaVersion === 2 && tac.phases) {
    const phases = {};
    TACTIC_PHASE_KEYS.forEach(k => { phases[k] = tac.phases[k] ? tacticPhaseDocToDraft(tac.phases[k]) : null; });
    return phases;
  }
  // Legacy single arrangement → breakout phase (Q1). preBreakout stays empty root.
  const c = tacticToCanvasProps(tac);
  const breakout = {
    ...emptyTeam(),
    players: c.players,
    bumps: c.bumps,
    runners: c.runners,
    shots: c.shots,
    quickShots: c.quickShots,
    // legacy has no assign / zoneShots → emptyTeam defaults
  };
  return { preBreakout: null, breakout, settle: null, mid: null, endgame: null };
}
