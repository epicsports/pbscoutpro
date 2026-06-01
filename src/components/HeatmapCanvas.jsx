import React from 'react';
import { COLORS, FONT, TEAM_COLORS } from '../utils/theme';
import { tracePathCone, vectorDirectionDeg } from '../utils/shotGeometry';
import BaseCanvas from './canvas/BaseCanvas';
import { paintStroke } from './canvas/drawStrokes';
import { drawZones } from './field/drawZones';

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

  const drawHeatmap = (ctx, w, h, state) => {
    const { imgObj } = state;

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
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
        if (!pt.players?.[i]) continue;
        const isRunner = pt.runners?.[i];
        const isElim = pt.eliminations?.[i];
        const assignedId = pt.assignments?.[i];
        const isHero = !!(assignedId && heroSet.has(assignedId));
        const marker = { ...pt.players[i], isHero };
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
    const drawHeroRing = (p, radius) => {
      if (!p.isHero) return;
      ctx.save();
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.restore();
    };
    // Dots: circles for gun-up, triangles for runners. Solid team fill +
    // 2 px dark stroke for shape separation when markers overlap.
    const drawDot = (p, fillColor, strokeColor) => {
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = fillColor; ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.stroke();
      drawHeroRing(p, 3.5);
    };
    const drawTriangle = (p, fillColor, strokeColor) => {
      const tx = p.x * w, ty = p.y * h, s2 = 4.5;
      ctx.beginPath(); ctx.moveTo(tx, ty - s2); ctx.lineTo(tx + s2, ty + s2*0.7); ctx.lineTo(tx - s2, ty + s2*0.7); ctx.closePath();
      ctx.fillStyle = fillColor; ctx.fill();
      ctx.strokeStyle = strokeColor; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
      drawHeroRing(p, s2);
    };
    // Team A: green family (COLORS.success fill + COLORS.successDim stroke).
    // Team B: teal fill (COLORS.zeeker). No dark-teal token exists in the
    // palette and § 62 forbids adding new tokens, so Team B uses
    // COLORS.surfaceDark as a neutral dark stroke — its only job is shape
    // separation on overlap; team identity rides on the fill.
    posA.forEach(p => drawDot(p, COLORS.success, COLORS.successDim));
    runnerPosA.forEach(p => drawTriangle(p, COLORS.success, COLORS.successDim));
    posB.forEach(p => drawDot(p, COLORS.zeeker, COLORS.surfaceDark));
    runnerPosB.forEach(p => drawTriangle(p, COLORS.zeeker, COLORS.surfaceDark));
    // Eliminated players: faded dot + prominent red X
    const drawElimX = (p, teamColor) => {
      const px = p.x * w, py = p.y * h, s = 5;
      // Dark bg circle for contrast
      ctx.beginPath(); ctx.arc(px, py, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      // Faded team dot
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = teamColor; ctx.fill();
      ctx.globalAlpha = 1;
      // Red X
      ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s); ctx.stroke();
      ctx.lineCap = 'butt';
      drawHeroRing(p, 5.5);
    };
    elimPosA.forEach(p => drawElimX(p, 'rgba(34,197,94,0.5)'));
    elimPosB.forEach(p => drawElimX(p, 'rgba(6,182,212,0.5)'));

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
        if (!shots[i] || !pt.players?.[i]) continue;
        shots[i].forEach(s => (isB ? shotDataB : shotDataA).push({ sx: s.x, sy: s.y, px: pt.players[i].x, py: pt.players[i].y, isKill: s.isKill }));
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
      const { grid, max } = buildGrid(shotData.map(s => ({ x: s.sx, y: s.sy })), 15);
      renderGrid(grid, max, heatColorFn);
      shotData.forEach(s => {
        const sx = s.sx * w, sy = s.sy * h, px = s.px * w, py = s.py * h;
        const dx = sx - px, dy = sy - py, len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        const dirDeg = vectorDirectionDeg(px, py, sx, sy);
        tracePathCone(ctx, px, py, SHOT_CONE_RADIUS, dirDeg, 15);
        ctx.fillStyle = teamColor;
        ctx.globalAlpha = 0.07;
        ctx.fill();
        ctx.globalAlpha = 0.55;
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
    // Combined kills clustering
    const shotData = [...shotDataA, ...shotDataB];
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
      let maxW = 0;
      for (const z of calloutZones) { const c = weights[z?.id] || 0; if (c > maxW) maxW = c; }
      if (maxW > 0) {
        for (const z of calloutZones) {
          const poly = z?.polygon;
          if (!Array.isArray(poly) || poly.length < 3) continue;
          const c = weights[z.id] || 0;
          if (c <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(poly[0].x * w, poly[0].y * h);
          for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x * w, poly[i].y * h);
          ctx.closePath();
          ctx.globalAlpha = 0.14 + 0.4 * (c / maxW); // floor keeps count=1 visible
          ctx.fillStyle = z.color || '#ef4444';
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      drawZones(ctx, w, h, { showZones: true, zones: calloutZones, t: () => '' });
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
