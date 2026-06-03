import React, { useState, useEffect, useMemo, useRef } from 'react';
import { COLORS, FONT, TEAM_COLORS } from '../utils/theme';
import { tracePathCone, vectorDirectionDeg } from '../utils/shotGeometry';
import BaseCanvas from './canvas/BaseCanvas';
import { paintStroke } from './canvas/drawStrokes';
import { drawZones } from './field/drawZones';

// ── § Stage 6-lite — replay animation (6L-1 / 6L-2) ─────────────────────
// A short looping preview of player movement across the stage keyframes:
//   Break (keyframe #0 = bumpStop ?? player) → Settle → Mid (point.timeline[]).
// Markers tween by slotId; eliminated players freeze + fade progressively.
// Pure helpers below build the per-marker model once (useMemo) so the RAF
// loop only interpolates + paints ~markers each frame (no grid rebuild).
const REPLAY_HOLD_MS = 600;     // pause on each keyframe
const REPLAY_TWEEN_MS = 1000;   // glide between consecutive keyframes (~1s)
const REPLAY_ELIM_ALPHA = 0.4;  // eliminated = frozen + faded (functional)
const REPLAY_DIM_ALPHA = 0.16;  // isolation dim (matches static Layer-1)
const replaySmooth = (t) => t * t * (3 - 2 * t); // ease-in-out
const replayLerp = (a, b, f) => ({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });

/**
 * Build the aggregate replay model from mapped heatmap points.
 * Global phases = ['break', 'settle'?, 'mid'?] — a stage is present only when
 * ≥1 point captured it. Each marker carries forward-filled per-phase positions
 * (a slot present in Break but absent later "stays put"; a slot appearing
 * mid-timeline keeps leading nulls so it can fade in), plus `outAt` — the phase
 * index at which it goes out (progressive per-keyframe elimination; kf#0
 * end-state elim lands on the final phase). Returns {phases, markers}.
 */
export function buildReplayModel(points) {
  const list = Array.isArray(points) ? points : [];
  const kfOf = (pt, stage) =>
    (Array.isArray(pt.timeline) ? pt.timeline : []).find(e => e && e.stage === stage) || null;
  const hasSettle = list.some(pt => kfOf(pt, 'settle'));
  const hasMid = list.some(pt => kfOf(pt, 'mid'));
  const phases = ['break', hasSettle ? 'settle' : null, hasMid ? 'mid' : null].filter(Boolean);
  // Need ≥2 keyframes to animate; otherwise there's nothing to play.
  if (phases.length < 2) return { phases, markers: [] };

  const markers = [];
  list.forEach(pt => {
    const settle = kfOf(pt, 'settle');
    const mid = kfOf(pt, 'mid');
    const rawPosFor = (phase, i) =>
      phase === 'break' ? (pt.bumpStops?.[i] || pt.players?.[i] || null)
      : phase === 'settle' ? (settle?.players?.[i] || null)
      : (mid?.players?.[i] || null);
    const elimFor = (phase, i) =>
      phase === 'settle' ? !!settle?.eliminations?.[i]
      : phase === 'mid' ? !!mid?.eliminations?.[i]
      : false; // Break: everyone alive (do NOT apply kf#0 end-state here)
    for (let i = 0; i < 5; i++) {
      // Forward-fill positions; leading nulls stay null (not-yet-appeared).
      const positions = [];
      let last = null, appeared = false;
      for (let p = 0; p < phases.length; p++) {
        const raw = rawPosFor(phases[p], i);
        if (raw) { last = raw; appeared = true; }
        positions.push(raw || (appeared ? last : null));
      }
      if (!appeared) continue; // slot never placed in any phase
      // Progressive elimination → first phase the slot goes out.
      let outAt = Infinity;
      for (let p = 0; p < phases.length; p++) {
        if (elimFor(phases[p], i)) { outAt = p; break; }
      }
      // kf#0 end-state elim applies on the FINAL frame if not already out.
      if (outAt === Infinity && pt.eliminations?.[i]) outAt = phases.length - 1;
      markers.push({
        side: pt.side === 'B' ? 'B' : 'A',
        isRunner: !!pt.runners?.[i],
        assignment: pt.assignments?.[i] || null,
        positions,
        outAt,
      });
    }
  });
  return { phases, markers };
}

/**
 * Loop clock → continuous phase position. The loop is N holds + (N-1) tweens:
 * hold(0) · tween(0→1) · hold(1) · [tween(1→2) · hold(2)] · repeat.
 * Returns {from, to, frac, p} where `p` (= from + frac) drives elimination.
 */
function replayClock(elapsed, n) {
  const total = n * REPLAY_HOLD_MS + (n - 1) * REPLAY_TWEEN_MS;
  let t = ((elapsed % total) + total) % total;
  for (let i = 0; i < n; i++) {
    if (t < REPLAY_HOLD_MS) return { from: i, to: i, frac: 0, p: i };
    t -= REPLAY_HOLD_MS;
    if (i < n - 1) {
      if (t < REPLAY_TWEEN_MS) {
        const f = replaySmooth(t / REPLAY_TWEEN_MS);
        return { from: i, to: i + 1, frac: f, p: i + f };
      }
      t -= REPLAY_TWEEN_MS;
    }
  }
  return { from: n - 1, to: n - 1, frac: 0, p: n - 1 };
}

/**
 * HeatmapCanvas — § 64.9 step #5. Read-only density rendering specialized
 * child of `BaseCanvas`. Renders position dots/triangles, bump density, shot
 * density + obstacle cones, kill 💀 clusters, zone overlays, bunker labels.
 *
 * **Gestures:** per § 64.4 — `pinchZoom` + `pan` opt-in via prop (default
 * off, matches current behavior); **loupe never** (HeatmapCanvas's draw
 * pipeline does not call `drawLoupe`, and touchHandler's `setActiveTouchPos`
 * is gated by `editable||layoutEditMode` which HeatmapCanvas never passes →
 * loupe naturally inert even when gestures attached).
 *
 * **Sizing:** width-first via BaseCanvas (no `maxCanvasHeight` cap). Matches
 * today's portrait behavior verbatim (`HeatmapCanvas.jsx:34-39` pre-refactor
 * = `w = containerW; h = min(aspectH, maxH)` — in portrait `aspectH ≪ maxH`
 * so effective behavior is width-first). Landscape activation = § 64.9
 * step #11 (separate feature brief — may need width-first-with-cap added to
 * BaseCanvas at that point).
 *
 * **DPR:** owned by BaseCanvas (`window.devicePixelRatio || 2` per § 64.8.5).
 * Hardcoded `×2` from pre-refactor `HeatmapCanvas:49` removed.
 *
 * **Drawing:** `drawHeatmap` is an inline arrow function in the render body —
 * re-created on every render, so `BaseCanvas`'s draw effect (which has
 * `draw` in its deps) re-fires on any prop change, capturing fresh props
 * via closure. Matches the InteractiveCanvas pattern (Step #4).
 */
export default function HeatmapCanvas({
  fieldImage,
  points = [],
  rosterPlayers = [],
  bunkers = [],
  showBunkers = false,
  dangerZone = null,
  sajgonZone = null,
  showZones = false,
  // § OSTRZAŁ B1 — callout-zone highlight layer. `calloutZones` = resolved
  // unified zones[] (from resolveZones); `calloutZoneWeights` = { zoneId: count }
  // per the active phase (post-breakout obstacle counts until B2). Both null =
  // layer off. Independent of the legacy `showZones` danger/sajgon path.
  calloutZones = null,
  calloutZoneWeights = null,
  // § OSTRZAŁ B2 — heatmap phase. 'postBreakout' (default) = settled position
  // (`players[i]`) — identical to pre-B2 behavior, so legacy consumers are
  // unchanged. 'breakout' = pre-bump break spot (`bumpStops[i] ?? players[i]`).
  phase = 'postBreakout',
  // § OSTRZAŁ B3 — per-player isolation. When set to a roster player id, that
  // player's markers + cones + shot density read at full strength and the rest
  // dim; null = no isolation (default, all full). Identity = `assignments[i]`.
  selectedPlayerId = null,
  showPositions = true,
  showShots = true,
  visibility = null,
  heroPlayerIds = [],
  pinchZoom = false,
  pan = false,
  // § 78 — Stage 2 annotation layers. Both default OFF/blank so existing
  // consumers (MatchPage heatmap tab, TrainingResultsPage) keep current
  // behavior. ScoutedTeam opts in (showAnnotations toggle for 2b scout
  // notes; showCoachPlan + coachAnnotations for 2a coach plan).
  //   - `showAnnotations` (2b): renders `points[i].annotations` (already
  //     mirrored at aggregation time via mirrorPointToLeft — coords arrive
  //     in left-side canonical space).
  //   - `showCoachPlan` + `coachAnnotations` (2a): renders the saved
  //     coach plan strokes in canonical coords (no per-point mirror).
  //     Hidden when `drawMode` is on (DrawingOverlay shows the editing
  //     copy on top to avoid stale-saved + live-edit double rendering).
  showAnnotations = false,
  showCoachPlan = false,
  coachAnnotations = null,
  // § Stage 6-lite — when true, the canvas plays the looping Break→Settle→Mid
  // replay (markers only) instead of the static aggregate layers. No-op unless
  // ≥2 stage keyframes exist across `points` (driven by point.timeline[]).
  replay = false,
  // § 78 — draw arbiter pass-through, isomorphic with InteractiveCanvas
  // Stage 1. HeatmapCanvas itself is read-only display; the consumer
  // (ScoutedTeam) supplies DrawingOverlay + state via `children` and the
  // onDraw* callbacks. BaseCanvas owns the touchHandler routing.
  drawMode = false,
  onDrawStart, onDrawMove, onDrawEnd, onDrawAbort,
  children,
}) {
  // Per-team visibility: if `visibility` prop is provided, it overrides the global booleans.
  // Shape: { A: { positions, shots }, B: { positions, shots } }
  const visAPositions = visibility ? visibility.A.positions : showPositions;
  const visBPositions = visibility ? visibility.B.positions : showPositions;
  const visAShots     = visibility ? visibility.A.shots     : showShots;
  const visBShots     = visibility ? visibility.B.shots     : showShots;
  const anyPositions  = visAPositions || visBPositions;
  const anyShots      = visAShots     || visBShots;

  // § Stage 6-lite — replay model (built once per points change) + RAF driver.
  // The loop just forces a re-render each frame; drawHeatmap re-fires (it's a
  // fresh closure every render) and reads the wall clock via replayStartRef.
  const replayModel = useMemo(() => buildReplayModel(points), [points]);
  const animating = replay && replayModel.phases.length >= 2;
  const replayStartRef = useRef(0);
  const replayRafRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [, setReplayTick] = useState(0);
  useEffect(() => {
    if (!animating) return undefined; // OFF = zero idle cost (no RAF scheduled)
    replayStartRef.current = (typeof performance !== 'undefined' ? performance.now() : 0);
    const loop = () => {
      setReplayTick(t => (t + 1) % 1e9);
      replayRafRef.current = requestAnimationFrame(loop);
    };
    replayRafRef.current = requestAnimationFrame(loop);
    return () => { if (replayRafRef.current) cancelAnimationFrame(replayRafRef.current); };
  }, [animating]);

  const drawHeatmap = (ctx, w, h, state) => {
    const { imgObj } = state;

    // § OSTRZAŁ B2 — phase-aware player position. Breakout shows the pre-bump
    // (break) spot when the player was bumped; post-breakout shows the settled
    // position. Non-bumped players share one position in both phases.
    const phasePos = (pt, i) =>
      phase === 'breakout' ? (pt.bumpStops?.[i] || pt.players?.[i]) : pt.players?.[i];

    // § OSTRZAŁ B3 — isolation active when a player is selected. Non-selected
    // markers/cones dim; selected reads full. All gated on selActive so the
    // no-selection path is byte-identical to pre-B3.
    const selActive = !!selectedPlayerId;

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
    }

    // ── § Stage 6-lite — replay overlay (markers only) ──
    // During play we draw ONLY the tweened markers over the field bg and
    // return early: the aggregate Positions/Shots/Bump/Zone layers are
    // intentionally skipped for the duration (cheap ~markers/frame, and the
    // brief hides shots/zones while playing). Eliminated players freeze at
    // their elimination-stage position and fade. Per-player isolation
    // (selectedPlayerId) dims non-selected markers, matching the static layer.
    if (animating) {
      const now = (typeof performance !== 'undefined' ? performance.now() : 0);
      const clk = replayClock(now - replayStartRef.current, replayModel.phases.length);
      const selActiveR = !!selectedPlayerId;
      const lastIdx = replayModel.phases.length - 1;
      replayModel.markers.forEach(mk => {
        let pos, alpha;
        if (clk.p >= mk.outAt) {
          // Out: frozen at the elimination-stage position, faded.
          pos = mk.positions[Math.min(mk.outAt, lastIdx)];
          alpha = REPLAY_ELIM_ALPHA;
        } else {
          const a = mk.positions[clk.from], b = mk.positions[clk.to];
          if (!a && !b) return;
          if (!a) { pos = b; alpha = clk.frac; }       // appearing → fade in
          else if (!b) { pos = a; alpha = 1; }         // (forward-filled: rare)
          else { pos = replayLerp(a, b, clk.frac); alpha = 1; }
        }
        if (!pos) return;
        if (selActiveR && mk.assignment !== selectedPlayerId) alpha *= REPLAY_DIM_ALPHA;
        const fill = mk.side === 'B' ? COLORS.zeeker : COLORS.success;
        const stroke = mk.side === 'B' ? COLORS.surfaceDark : COLORS.successDim;
        const px = pos.x * w, py = pos.y * h;
        ctx.globalAlpha = alpha;
        if (mk.isRunner) {
          const s2 = 4.5;
          ctx.beginPath();
          ctx.moveTo(px, py - s2); ctx.lineTo(px + s2, py + s2 * 0.7); ctx.lineTo(px - s2, py + s2 * 0.7);
          ctx.closePath();
        } else {
          ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        }
        ctx.fillStyle = fill; ctx.fill();
        ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.globalAlpha = 1;
      });
      return;
    }

    const gridSize = 8;
    const cols = Math.ceil(w / gridSize), rows = Math.ceil(h / gridSize);

    const buildGrid = (pts, radius) => {
      const grid = new Float32Array(cols * rows);
      pts.forEach(pos => {
        const cx = pos.x * w, cy = pos.y * h;
        const x0 = Math.max(0, Math.floor((cx - radius) / gridSize));
        const y0 = Math.max(0, Math.floor((cy - radius) / gridSize));
        const x1 = Math.min(cols - 1, Math.ceil((cx + radius) / gridSize));
        const y1 = Math.min(rows - 1, Math.ceil((cy + radius) / gridSize));
        for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
          const dx = gx * gridSize + gridSize / 2 - cx, dy = gy * gridSize + gridSize / 2 - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < radius) { const wt = 1 - d / radius; grid[gy * cols + gx] += wt * wt; }
        }
      });
      let max = 0; for (let i = 0; i < grid.length; i++) if (grid[i] > max) max = grid[i];
      return { grid, max };
    };

    const renderGrid = (grid, max, colorFn) => {
      if (max <= 0) return;
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        const v = grid[gy * cols + gx]; if (v < 0.005) continue;
        ctx.fillStyle = colorFn(Math.min(1, v / max));
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
      }
    };

    // ── Layer 1: Position heatmap ──
    if (anyPositions) {
    // Split by side for different colors; tag each pos with hero flag
    const heroSet = new Set(heroPlayerIds);
    const posA = [], posB = [];
    const runnerPosA = [], runnerPosB = [];
    const elimPosA = [], elimPosB = [];
    points.forEach(pt => {
      const isB = pt.side === 'B';
      if (isB ? !visBPositions : !visAPositions) return;
      for (let i = 0; i < 5; i++) {
        const pos = phasePos(pt, i);
        if (!pos) continue;
        const isRunner = pt.runners?.[i];
        const isElim = pt.eliminations?.[i];
        const assignedId = pt.assignments?.[i];
        const isHero = !!(assignedId && heroSet.has(assignedId));
        const dim = selActive && assignedId !== selectedPlayerId;
        const marker = { ...pos, isHero, dim };
        if (isElim) {
          (isB ? elimPosB : elimPosA).push(marker);
        } else if (isB) {
          (isRunner ? runnerPosB : posB).push(marker);
        } else {
          (isRunner ? runnerPosA : posA).push(marker);
        }
      }
    });
    // Position density removed per § 62 (NXL Czechy 2026-05-15 feedback) —
    // the radial density blobs were obscuring overlapping markers and making
    // circle (gun-up) vs triangle (runner) shapes unreadable. Shape clarity
    // now comes from solid team fill + 2 px dark stroke on each marker;
    // overlapping markers separate visually via the stroke even at alpha 1.
    // Bump density (Layer 2) + shot density (Layer 3) retained — different
    // visual data, different overlap behavior.

    // Hero ring (§ 25) — amber stroke around HERO position dots. Drawn AFTER
    // the team stroke so the amber ring sits outside the perimeter, two
    // concentric strokes total (team fill → dark perimeter stroke → amber
    // halo at r+3 with 0.6 alpha).
    // § OSTRZAŁ B3 — per-marker alpha multiplier. 1 normally; lowered for
    // dimmed (non-selected) markers under isolation. Helpers multiply their
    // own internal alphas (hero ring, elim fade) by it so dimming composes.
    let baseAlpha = 1;
    const drawHeroRing = (p, radius) => {
      if (!p.isHero) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = baseAlpha * 0.6;
      ctx.stroke();
      ctx.restore();
    };
    // Dots: circles for gun-up, triangles for runners. Solid team fill +
    // 2 px dark stroke for shape separation when markers overlap.
    const drawDot = (p, fillColor, strokeColor) => {
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = fillColor; ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke();
      drawHeroRing(p, 3.5);
      ctx.globalAlpha = 1;
    };
    const drawTriangle = (p, fillColor, strokeColor) => {
      ctx.globalAlpha = baseAlpha;
      const tx = p.x * w, ty = p.y * h, s2 = 4.5;
      ctx.beginPath(); ctx.moveTo(tx, ty - s2); ctx.lineTo(tx + s2, ty + s2*0.7); ctx.lineTo(tx - s2, ty + s2*0.7); ctx.closePath();
      ctx.fillStyle = fillColor; ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      drawHeroRing(p, s2);
      ctx.globalAlpha = 1;
    };
    // Team A: green family (COLORS.success fill + COLORS.successDim stroke).
    // Team B: teal fill (COLORS.zeeker). No dark-teal token exists in the
    // palette and § 62 forbids adding new tokens, so Team B uses
    // COLORS.surfaceDark as a neutral dark stroke — its only job is shape
    // separation on overlap; team identity rides on the fill.
    posA.forEach(p => { baseAlpha = p.dim ? 0.16 : 1; drawDot(p, COLORS.success, COLORS.successDim); });
    runnerPosA.forEach(p => { baseAlpha = p.dim ? 0.16 : 1; drawTriangle(p, COLORS.success, COLORS.successDim); });
    posB.forEach(p => { baseAlpha = p.dim ? 0.16 : 1; drawDot(p, COLORS.zeeker, COLORS.surfaceDark); });
    runnerPosB.forEach(p => { baseAlpha = p.dim ? 0.16 : 1; drawTriangle(p, COLORS.zeeker, COLORS.surfaceDark); });
    baseAlpha = 1;
    // Eliminated players: faded dot + prominent red X
    const drawElimX = (p, teamColor) => {
      const px = p.x * w, py = p.y * h, s = 5;
      // Dark bg circle for contrast
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      // Faded team dot
      ctx.globalAlpha = baseAlpha * 0.4;
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = teamColor; ctx.fill();
      ctx.globalAlpha = baseAlpha;
      // Red X
      ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s); ctx.stroke();
      ctx.lineCap = 'butt';
      drawHeroRing(p, 5.5);
      ctx.globalAlpha = 1;
    };
    elimPosA.forEach(p => { baseAlpha = p.dim ? 0.16 : 1; drawElimX(p, 'rgba(34,197,94,0.5)'); });
    elimPosB.forEach(p => { baseAlpha = p.dim ? 0.16 : 1; drawElimX(p, 'rgba(6,182,212,0.5)'); });
    baseAlpha = 1;

    // ── Layer 2: Bump stops ──
    const bumpsA = [], bumpsB = [];
    points.forEach(pt => {
      const isB = pt.side === 'B';
      if (isB ? !visBPositions : !visAPositions) return;
      for (let i = 0; i < 5; i++) if (pt.bumpStops?.[i]) (isB ? bumpsB : bumpsA).push(pt.bumpStops[i]);
    });
    const drawBumpLayer = (bumpList, colorFn, diamondColor) => {
      if (bumpList.length === 0) return;
      const { grid: bg, max: bmax } = buildGrid(bumpList, 16);
      renderGrid(bg, bmax, colorFn);
      bumpList.forEach(p => {
        const bx = p.x * w, by = p.y * h, s = 4;
        ctx.beginPath(); ctx.moveTo(bx, by - s); ctx.lineTo(bx + s, by);
        ctx.lineTo(bx, by + s); ctx.lineTo(bx - s, by); ctx.closePath();
        ctx.fillStyle = diamondColor; ctx.fill();
      });
    };
    // Team A bumps (blue)
    drawBumpLayer(bumpsA, t => {
      const r = Math.round(191 + (168 - 191) * t);
      const g = Math.round(219 + (85  - 219) * t);
      const b = Math.round(254 + (247 - 254) * t);
      return `rgba(${r},${g},${b},${Math.min(0.92, t * 0.95 + 0.18)})`;
    }, 'rgba(147,197,253,0.9)');
    // Team B bumps (pink)
    drawBumpLayer(bumpsB, t => {
      const r = Math.round(244 + (212 - 244) * t);
      const g = Math.round(114 + (83  - 114) * t);
      const b = Math.round(182 + (150 - 182) * t);
      return `rgba(${r},${g},${b},${Math.min(0.92, t * 0.95 + 0.18)})`;
    }, 'rgba(244,114,182,0.9)');

    } // end anyPositions

    // ── Layer 3: Shots heatmap + direction lines ──
    if (anyShots) {
    const shotDataA = [], shotDataB = [];
    points.forEach(pt => {
      const isB = pt.side === 'B';
      if (isB ? !visBShots : !visAShots) return;
      const shots = Array.isArray(pt.shots) ? pt.shots : pt.shots ? [0,1,2,3,4].map(i => pt.shots[String(i)] || []) : [];
      for (let i = 0; i < 5; i++) {
        const pos = phasePos(pt, i);
        if (!shots[i] || !pos) continue;
        shots[i].forEach(s => (isB ? shotDataB : shotDataA).push({ sx: s.x, sy: s.y, px: pos.x, py: pos.y, isKill: s.isKill, pid: pt.assignments?.[i] }));
      }
    });
    // § 50 sibling (cone redesign 2026-04-24): per-shot cones replace the
    // per-shot directional gradient line. Direction = actual vector from
    // player position to shot end (no zone quantization — heatmap data has
    // richer per-shot orientation than the scouting-side zone enums).
    // Heatmap renders all shots as obstacle cones; the points doc's
    // `shots` field has no break/obstacle phase distinction (that lives
    // only in the scouting-side quickShots/obstacleShots arrays).
    // Reduced radius (0.10 of min dim) + lower opacity than scouting view
    // because heatmap aggregates many shots — full-size cones would be
    // visual chaos.
    const SHOT_CONE_RADIUS = Math.min(w, h) * 0.10;
    const drawShotLayer = (shotData, heatColorFn, teamColor) => {
      if (shotData.length === 0) return;
      // § OSTRZAŁ B3 — under isolation the density grid reflects only the
      // selected player (dimming a summed grid isn't meaningful); cones stay
      // visible but the non-selected ones dim.
      const gridSrc = selActive ? shotData.filter(s => s.pid === selectedPlayerId) : shotData;
      const { grid, max } = buildGrid(gridSrc.map(s => ({ x: s.sx, y: s.sy })), 15);
      renderGrid(grid, max, heatColorFn);
      shotData.forEach(s => {
        const dim = selActive && s.pid !== selectedPlayerId;
        const sx = s.sx * w, sy = s.sy * h, px = s.px * w, py = s.py * h;
        const dx = sx - px, dy = sy - py, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const dirDeg = vectorDirectionDeg(px, py, sx, sy);
        tracePathCone(ctx, px, py, SHOT_CONE_RADIUS, dirDeg, 15);
        ctx.fillStyle = teamColor;
        ctx.globalAlpha = dim ? 0.02 : 0.07;
        ctx.fill();
        ctx.globalAlpha = dim ? 0.12 : 0.55;
        ctx.strokeStyle = teamColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    };
    // Team A shots (red) — heatmap density grid colors preserved; cone color uses TEAM_COLORS.A.
    drawShotLayer(shotDataA, t => {
      return `rgba(${Math.round(239 + (220 - 239) * t)},${Math.round(68 + (38 - 68) * t)},${Math.round(68 + (38 - 68) * t)},${Math.min(0.88, t * 0.9 + 0.15)})`;
    }, TEAM_COLORS.A);
    // Team B shots (blue per § 49 / cone color spec — was teal in old line render)
    drawShotLayer(shotDataB, t => {
      return `rgba(${Math.round(6 + (4 - 6) * t)},${Math.round(182 + (212 - 182) * t)},${Math.round(212 + (240 - 212) * t)},${Math.min(0.88, t * 0.9 + 0.15)})`;
    }, TEAM_COLORS.B);
    // Combined kills clustering — under isolation, only the selected player's
    // kills/normals (§ OSTRZAŁ B3).
    const shotData = selActive
      ? [...shotDataA, ...shotDataB].filter(s => s.pid === selectedPlayerId)
      : [...shotDataA, ...shotDataB];
    if (shotData.length > 0) {
      const CLUSTER_DIST = 0.06;
      const kills = shotData.filter(s => s.isKill);
      const normals = shotData.filter(s => !s.isKill);
      const clusters = []; const used = new Set();
      kills.forEach((k, i) => {
        if (used.has(i)) return;
        const cluster = [k]; used.add(i);
        kills.forEach((k2, j) => {
          if (used.has(j)) return;
          const dx = k.sx - k2.sx, dy = k.sy - k2.sy;
          if (Math.sqrt(dx*dx + dy*dy) < CLUSTER_DIST) { cluster.push(k2); used.add(j); }
        });
        const cx = cluster.reduce((s, c) => s + c.sx, 0) / cluster.length;
        const cy = cluster.reduce((s, c) => s + c.sy, 0) / cluster.length;
        clusters.push({ x: cx, y: cy, count: cluster.length });
      });
      clusters.forEach(cl => {
        const px = cl.x * w, py = cl.y * h;
        ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', px, py);
        if (cl.count > 1) {
          const bx = px + 8, by = py - 8;
          ctx.fillStyle = COLORS.danger;
          ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${cl.count > 9 ? 7 : 8}px sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(cl.count), bx, by);
        }
      });
      normals.forEach(s => {
        const sx = s.sx * w, sy = s.sy * h;
        ctx.strokeStyle = 'rgba(239,68,68,0.8)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fillStyle = 'rgba(239,68,68,0.8)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(sx - 8, sy); ctx.lineTo(sx - 5.5, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 5.5, sy); ctx.lineTo(sx + 8, sy); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy - 5.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx, sy + 5.5); ctx.lineTo(sx, sy + 8); ctx.stroke();
      });
    }

    } // end anyShots

    // ── Callout-zone highlight layer (§ OSTRZAŁ B1) ──
    // Highlights the layout's callout-zone polygons weighted by per-zone shot
    // counts (computeCalloutZoneTargets, 3a). Weighting (fill alpha ∝ count) is
    // heatmap-specific so it's a fill underlay here; the crisp dashed outline +
    // centroid name is delegated to the shared unified-zone painter `drawZones`
    // — NOT the legacy inline danger/sajgon path below. Drawn after Shots so the
    // highlight reads over the density grid, before annotations/labels.
    if (calloutZones && calloutZones.length) {
      const weights = calloutZoneWeights || {};
      // § OSTRZAŁ — only zones SHOT in the active phase are highlighted; a
      // configured-but-never-shot zone (weight 0) draws nothing (no fill, no
      // outline). Mirrors the coach-summary count>0 filter, removes empty-zone
      // clutter from the heatmap.
      const shotZones = calloutZones.filter(z => (weights[z?.id] || 0) > 0);
      let maxW = 0;
      for (const z of shotZones) { const c = weights[z.id] || 0; if (c > maxW) maxW = c; }
      if (maxW > 0) {
        // § OSTRZAŁ (3) — frequency choropleth: each zone fills in its OWN colour
        // (hue = identity) at an opacity scaled by how much it's shot/held in the
        // active phase. Count-normalised within the phase (freqNorm = count /
        // maxCountInPhase) → the hottest zone reads as the most saturated; cool
        // zones stay faint but visible. Ramp lerp(0.12, 0.42) keeps the fill
        // readable UNDER the positions/cones/luf-connector layers drawn on top.
        // (No centred count label: the luf connectors terminate at the zone
        // centroid, so a label there would collide — the count/% lives in the
        // text table.)
        for (const z of shotZones) {
          const poly = z?.polygon;
          if (!Array.isArray(poly) || poly.length < 3) continue;
          const freqNorm = (weights[z.id] || 0) / maxW;
          ctx.beginPath();
          ctx.moveTo(poly[0].x * w, poly[0].y * h);
          for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x * w, poly[i].y * h);
          ctx.closePath();
          ctx.globalAlpha = 0.12 + 0.30 * freqNorm; // lerp(0.12, 0.42); floor keeps count=1 visible
          ctx.fillStyle = z.color || '#ef4444';
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (shotZones.length) drawZones(ctx, w, h, { showZones: true, zones: shotZones, t: () => '' });

      // § OSTRZAŁ (2) — "luf" connectors: a line from each placed slot to the
      // centroid of every callout zone it tagged in the ACTIVE phase. Mirrors
      // the shot-cone layer — all players draw; non-selected dim under isolation
      // (selActive). Position is phase-aware (phasePos: break → bumpStop, post →
      // settled); tags switch break↔obstacle by phase. Anonymous-safe — position
      // is slot-based so unassigned slots still connect (they dim under isolation
      // since their assignment can't match the selected player). Drawn over the
      // zone highlights so the line reads on top of the fill.
      const centroids = {};
      for (const z of calloutZones) {
        const poly = z?.polygon;
        if (!Array.isArray(poly) || poly.length < 3) continue;
        let cx = 0, cy = 0;
        for (const p of poly) { cx += p.x; cy += p.y; }
        centroids[z.id] = { x: cx / poly.length, y: cy / poly.length, color: z.color || '#ef4444' };
      }
      points.forEach(pt => {
        const tagsArr = phase === 'breakout' ? (pt.zoneShots || []) : (pt.zoneObstacleShots || []);
        for (let i = 0; i < 5; i++) {
          const tags = tagsArr[i];
          if (!tags || !tags.length) continue;
          const pos = phasePos(pt, i);
          if (!pos) continue;
          const dim = selActive && (pt.assignments?.[i] !== selectedPlayerId);
          const px = pos.x * w, py = pos.y * h;
          tags.forEach(zoneId => {
            const ctr = centroids[zoneId];
            if (!ctr) return;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(ctr.x * w, ctr.y * h);
            ctx.globalAlpha = dim ? 0.08 : 0.5;
            ctx.strokeStyle = ctr.color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
          });
        }
      });
    }

    // ── Zones overlay ──
    if (showZones) {
      const drawZone = (pts, color, label) => {
        if (!pts || pts.length < 3) return;
        ctx.beginPath(); ctx.moveTo(pts[0].x * w, pts[0].y * h);
        pts.forEach((p, i) => { if (i > 0) ctx.lineTo(p.x * w, p.y * h); });
        ctx.closePath();
        ctx.fillStyle = color + '20'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([6, 3]); ctx.stroke(); ctx.setLineDash([]);
        const cx2 = pts.reduce((s, p) => s + p.x, 0) / pts.length * w;
        const cy2 = pts.reduce((s, p) => s + p.y, 0) / pts.length * h;
        ctx.fillStyle = color; ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx2, cy2);
      };
      if (dangerZone?.length >= 3) drawZone(dangerZone, COLORS.danger, 'DANGER');
      if (sajgonZone?.length >= 3) drawZone(sajgonZone, COLORS.info, 'SAJGON');
    }

    // ── § 78 Stage 2 — annotation layers (painted ABOVE positions/shots,
    //    BELOW bunker labels so coach can write near labels without occluding
    //    them). Both reuse the shared `paintStroke` helper from
    //    drawStrokes.js so visual style + the path-string fix match
    //    DrawingOverlay (Stage 1 capture surface). ──
    const stateZoom = state?.zoom || 1;
    if (showAnnotations) {
      // 2b — per-point scout notes, already mirrored upstream via
      // mirrorPointToLeft (see mapOnePointForTeam in ScoutedTeamPage).
      points.forEach(pt => {
        const ann = pt && pt.annotations;
        if (!ann) return;
        // Firestore-shape (object) or array — accept both. Array path used
        // by mirrorAnnotations output; object path covers pre-mirror raw
        // reads in case a consumer ever forwards untouched Firestore data.
        const list = Array.isArray(ann) ? ann
          : Object.keys(ann).sort((a, b) => Number(a) - Number(b)).map(k => ann[k]);
        list.forEach(s => paintStroke(ctx, s, w, h, stateZoom));
      });
    }
    if (showCoachPlan && coachAnnotations && !drawMode) {
      // 2a — saved coach plan, canonical coords (no mirror). Hidden while
      // user is editing (DrawingOverlay shows the live copy on top).
      coachAnnotations.forEach(s => paintStroke(ctx, s, w, h, stateZoom));
    }

    // ── Bunker labels ──
    if (showBunkers && bunkers.length > 0) {
      bunkers.forEach(b => {
        const bx = b.x * w, by = b.y * h;
        ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15'; ctx.fill();
        ctx.font = `bold 9px ${FONT}`;
        const tw = ctx.measureText(b.name).width;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath(); ctx.roundRect(bx + 6, by - 8, tw + 6, 14, 2); ctx.fill();
        ctx.fillStyle = '#facc15'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(b.name, bx + 9, by - 1);
      });
    }
  };

  return (
    <BaseCanvas
      // § 76 hotfix #2 — object-fit:contain (pick smaller axis). Portrait
      // behavior unchanged (width-first wins because containerH × aspect ≫
      // containerW); landscape no longer overflows the viewport (was
      // width-first only with no cap → h = w/aspect could exceed viewport
      // height on rotation per user 2026-05-24). 'fit' defaults to
      // `window.innerHeight` for the height cap when no `maxCanvasHeight`
      // is passed — sufficient for read-only consumers like ScoutedTeam.
      sizingStrategy="fit"
      fieldImage={fieldImage}
      pinchZoom={pinchZoom}
      pan={pan}
      loupe={false}
      // § 78 — draw arbiter pass-through (Stage 2 capture surface for the
      // coach plan on ScoutedTeam). Defaults make it a no-op for legacy
      // read-only consumers (Match heatmap tab, TrainingResults).
      drawMode={drawMode}
      onDrawStart={onDrawStart}
      onDrawMove={onDrawMove}
      onDrawEnd={onDrawEnd}
      onDrawAbort={onDrawAbort}
      draw={drawHeatmap}
    >
      {children}
    </BaseCanvas>
  );
}
