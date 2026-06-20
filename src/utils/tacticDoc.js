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
import { strokesToFirestore, strokesFromFirestore } from '../components/canvas/drawStrokes';
import { emptyTeam, E5, E5A, E5B } from '../hooks/useCaptureDraft';
import { tacticToCanvasProps, normalizeFreehandStrokes } from './tacticState';

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
 * onto the doc, leaving name/onBoard/order intact). `phases` = { [phase]: draft|null };
 * `annsByPhase` = { [phase]: strokes[] } (R3 per-phase freehand). A phase with
 * annotations but no draft still persists (annotations-only phase).
 */
export function tacticStateToDoc(phases, annsByPhase = {}) {
  const out = {};
  TACTIC_PHASE_KEYS.forEach(k => {
    const pd = tacticDraftToPhaseDoc(phases?.[k] || null);
    const anns = strokesToFirestore(annsByPhase[k] || []); // null when empty
    if (pd) out[k] = { ...pd, annotations: anns };
    else if (anns) out[k] = { annotations: anns };
    else out[k] = null;
  });
  return { schemaVersion: 2, phases: out };
}

/**
 * A tactic doc → the per-phase annotations { [phase]: strokes[] }. schemaVersion:2
 * → each phase's `annotations`. Legacy → the top-level freehand maps to the
 * breakout phase (Q1-aligned), the rest empty.
 */
/**
 * Board PREVIEW props (read-only) for a tactic — handles BOTH legacy (flat/steps[0])
 * and phased (schemaVersion:2) docs. For a phased tactic the most representative
 * phase is shown (breakout buzzer positions → preBreakout → first phase with
 * players), with that phase's freehand. Returns the InteractiveCanvas-renderable
 * shape (matching tacticToCanvasProps) so the board preview is one call site.
 */
export function tacticPreviewProps(tac) {
  if (!(tac && tac.schemaVersion === 2 && tac.phases)) {
    return tacticToCanvasProps(tac); // legacy / flat / steps[0]
  }
  const order = ['breakout', 'preBreakout', 'settle', 'mid', 'endgame'];
  const chosen = order.find(k => {
    const pd = tac.phases[k];
    return pd && Array.isArray(pd.players) && pd.players.some(Boolean);
  }) || null;
  if (!chosen) {
    // positions empty everywhere — show the breakout freehand (if any) over an empty field.
    return {
      players: E5(), shots: E5A(), bumpShots: E5A(), bumps: E5(), runners: E5B(),
      quickShots: [], obstacleShots: [], freehandStrokes: strokesFromFirestore(tac.phases.breakout?.annotations),
    };
  }
  const d = tacticPhaseDocToDraft(tac.phases[chosen]);
  return {
    players: d.players, shots: d.shots, bumpShots: E5A(), bumps: d.bumps, runners: d.runners,
    quickShots: d.quickShots, obstacleShots: E5A(),
    freehandStrokes: strokesFromFirestore(tac.phases[chosen].annotations),
  };
}

export function tacticDocToAnnotations(tac) {
  if (tac && tac.schemaVersion === 2 && tac.phases) {
    const out = {};
    TACTIC_PHASE_KEYS.forEach(k => { out[k] = strokesFromFirestore(tac.phases[k]?.annotations); });
    return out;
  }
  return {
    preBreakout: [], breakout: normalizeFreehandStrokes(tac?.freehandStrokes),
    settle: [], mid: [], endgame: [],
  };
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
