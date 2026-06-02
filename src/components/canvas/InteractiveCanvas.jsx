import React, { useRef, useEffect, useState, useMemo } from 'react';
import { COLORS, FONT } from '../../utils/theme';
import { recomputeMirrorsWithCalibration } from '../../utils/helpers';
import { useLanguage } from '../../hooks/useLanguage';
import { drawField } from '../field/drawField';
import { drawLoupe } from '../field/drawLoupe';
import { drawCalibration } from '../field/drawCalibration';
import { drawZones } from '../field/drawZones';
import { drawAnalytics } from '../field/drawAnalytics';
import { drawBunkers } from '../field/drawBunkers';
import { drawPlayers } from '../field/drawPlayers';
import { drawQuickShots } from '../field/drawQuickShots';
import BaseCanvas, { useBaseCanvas } from './BaseCanvas';

/**
 * InteractiveCanvas — § 64.9 step #4. Specialized child of `BaseCanvas` that
 * hosts the scouting feature layer (drawing pipeline + inline player toolbar
 * + reset-zoom Btn) on top of BaseCanvas's shared infrastructure (DOM, DPR,
 * sizing, ResizeObserver, landscape integration, viewportSide clipping,
 * gesture composition via `createTouchHandler`).
 *
 * Migration target for FieldCanvas's interactive consumers (MatchPage,
 * TacticPage, LayoutDetailPage, BunkerEditorPage). Drawing pipeline + toolbar
 * are a VERBATIM TRANSPLANT of FieldCanvas L218-451 — same `drawField → drawZones
 * → drawAnalytics → drawPlayers → drawQuickShots → drawBunkers → freehand →
 * HUD → pendingBunkerPos → drawCalibration → drawLoupe` order, same toolbar
 * JSX, same toolbarPos math. No behavior change vs FieldCanvas.
 *
 * `FieldCanvas.jsx` is intentionally **retained as legacy** for `BallisticsPage`
 * (Opus territory, off-limits to this refactor) — duplicate wiring of the
 * drawing pipeline between the two components is accepted on the transition.
 * The `×2` DPR literal at `FieldCanvas:263` stays for the same reason
 * (BallisticsPage still renders FieldCanvas; that bake-in moves with that
 * page's eventual migration). BaseCanvas's DPR is correct here.
 */
export default function InteractiveCanvas({
  fieldImage, players = [], shots = [], bumpShots = [], bumpStops = [],
  eliminations = [], eliminationPositions = [], runners = [],
  freehandStrokes = [],
  onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
  onBumpStop, onSelectPlayer, onMoveBumpStop, onEmptyTap,
  editable = false, selectedPlayer, mode = 'place',
  playerAssignments = [], rosterPlayers = [],
  opponentPlayers, opponentEliminations = [],
  opponentAssignments = [], opponentRosterPlayers = [],
  showOpponentLayer = false, opponentColor = '#60a5fa',
  discoLine = 0, zeekerLine = 0, discoColor, zeekerColor, discoName, zeekerName, hideLineLabels = false,
  calloutLines, editLinePoints, activeLineId, showCalloutLines, showCalloutHatch,
  doritoSide = 'top',
  quickShots = [],
  obstacleShots = [],
  // § OSTRZAŁ — per-player callout-zone tags (break ∪ obstacle). When the
  // selected player has tags, the canvas confirms them with a zone tint + a
  // line player→zone-centroid (mirrors the coach-heatmap "luf" connector). Not
  // a full zones overlay — only the SELECTED player's zones render.
  calloutZoneShots = [],
  calloutObstacleShots = [],
  bunkers = [], showBunkers = false, showHalfLabels = false,
  dangerZone = null, sajgonZone = null, bigMoveZone = null, showZones = false,
  // § 88 — unified zones (new shape). When `zones` is an array, the renderer
  // and touchHandler use it instead of the 3 legacy zone props. Backward-
  // compatible: callers still on the legacy shape (3 named props) keep working.
  zones = null,
  editZonePoints = null,
  layoutEditMode = null,
  onBunkerPlace, onBunkerMove, onBunkerDelete,
  onZonePoint, onZoneUndo, onZoneClose,
  onZonePointMove, onZonePointDelete, onZoneMidpointInsert,
  editDangerPoints = [], editSajgonPoints = [], editBigMovePoints = [],
  onBunkerLabelNudge, onBunkerLabelOffset,
  selectedBunkerId = null,
  visibilityData = null,
  showVisibility = false,
  onVisibilityTap,
  fieldCalibration = null,
  counterData = null,
  showCounter = false,
  enemyPath = null,
  selectedCounterBunkerId = null,
  counterDrawMode = false,
  onCounterPath,
  calibrationMode = false,
  calibrationData = null,
  onCalibrationMove,
  pendingBunkerPos = null,
  viewportSide = null,
  maxCanvasHeight = null,
  fillHeight = false,
  onBumpPlayer,
  toolbarPlayer = null,
  toolbarItems = [],
  onToolbarAction,
  heroPlayerIds = [],
  team = 'A',
  // § 77 — Draw arbiter pass-through. InteractiveCanvas itself doesn't render
  // anything draw-related; consumers (Match) supply state + callbacks + the
  // DrawingOverlay via `children`. We forward to BaseCanvas which owns the
  // touchHandler routing.
  drawMode = false,
  onDrawStart, onDrawMove, onDrawEnd, onDrawAbort,
  children,
  // § 79 — Scout shot-origin semantic. When true, the `shots[i]` lane
  // origins from `bumpStops[i]` whenever a bump exists. Default false
  // preserves Tactic / LayoutDetail tactic-preview semantics. MatchPage
  // scout opts in.
  bumpShotOriginAtStart = false,
}) {
  const { t } = useLanguage();

  // ── Feature-layer local state (FieldCanvas:96-107 — transplanted) ──
  const [selectedZoneVertex, setSelectedZoneVertex] = useState(-1);
  const [counterDraft, setCounterDraft] = useState([]); // eslint-disable-line no-unused-vars
  const counterDraftRef = useRef([]); // eslint-disable-line no-unused-vars

  // Reset zone-vertex selection when leaving zone edit (FieldCanvas:100-104).
  // § 88 — `layoutEditMode` may be a zone id (new shape) or the legacy enum.
  // Reset only when it transitions to null (= leaving zone-edit altogether).
  useEffect(() => {
    if (!layoutEditMode) {
      setSelectedZoneVertex(-1);
    }
  }, [layoutEditMode]);

  // Recompute mirror bunkers using calibration (FieldCanvas:110-117).
  const correctedBunkers = useMemo(
    () => recomputeMirrorsWithCalibration(bunkers, fieldCalibration),
    [bunkers, fieldCalibration]
  );

  // Player label / object helpers (FieldCanvas:218-230).
  const getPlayerLabel = (assignments, rosterList, idx) => {
    const ap = assignments?.[idx];
    const rp = ap && rosterList ? rosterList.find(tp => tp.id === ap) : null;
    return rp ? String(rp.number) : `P${idx + 1}`;
  };
  const getPlayerObj = (assignments, rosterList, idx) => {
    const ap = assignments?.[idx];
    if (!ap || !rosterList) return null;
    return rosterList.find(tp => tp.id === ap) || null;
  };

  // Pre-load player photos (FieldCanvas:232-256).
  const photoCache = useRef(new Map());
  const [photoVersion, setPhotoVersion] = useState(0);
  useEffect(() => {
    const allRoster = [...(rosterPlayers || []), ...(opponentRosterPlayers || [])];
    allRoster.forEach(p => {
      if (!p?.photoURL) return;
      if (photoCache.current.has(p.photoURL)) return;
      const img = new Image();
      img.onload = () => {
        photoCache.current.set(p.photoURL, img);
        setPhotoVersion(v => v + 1);
      };
      img.onerror = () => {
        photoCache.current.set(p.photoURL, null);
      };
      photoCache.current.set(p.photoURL, undefined);
      img.src = p.photoURL;
    });
  }, [rosterPlayers, opponentRosterPlayers]);

  // ── Mode-dependent cursor (FieldCanvas:383). ──
  const cursor = layoutEditMode
    ? 'crosshair'
    : editable
      ? (mode === 'shoot' ? 'crosshair' : 'pointer')
      : 'default';

  // ── Feature state for touchHandler (merged into BaseCanvas's stateRef). ──
  //    Every field that `createTouchHandler` reads via `stateRef.current.X`
  //    beyond BaseCanvas's own infra contribution. Includes both feature
  //    values + the callbacks not in BaseCanvas's standard prop set. ──
  const touchHandlerState = {
    players, shots, bumpStops, editable, mode, selectedPlayer,
    layoutEditMode, bunkers: correctedBunkers, calibrationMode, calibrationData,
    // § 88 — new shape (zones + editZonePoints) takes precedence in
    // touchHandler.getEditPoints; legacy 3-named props kept for callers
    // not yet migrated.
    zones, editZonePoints,
    editDangerPoints, editSajgonPoints, editBigMovePoints,
    selectedZoneVertex,
    toolbarPlayer, toolbarItems, showVisibility,
    onBumpPlayer,
    onCalibrationMove, onBunkerPlace, onBunkerMove, onBunkerDelete,
    onZonePoint, onZoneClose, onToolbarAction, onVisibilityTap,
    onBunkerLabelOffset,
    onZonePointMove, onZonePointDelete, onZoneMidpointInsert,
    onZoneVertexSelect: setSelectedZoneVertex,
  };

  // ── Draw fn — verbatim transplant of FieldCanvas:259-336 draw effect body.
  //    BaseCanvas applies DPR + zoom + pan transform before this callback
  //    fires; we paint at world coords. State arg from BaseCanvas includes
  //    `imgObj` (loaded from fieldImage) + `activeTouchPos` + `loupeSourceRef`
  //    + `zoom` (for HUD zoom-independent sizing) + `canvas` (for drawField /
  //    drawLoupe). ──
  // Photo version + heroPlayerIds in deps via state; the fn closes over them.
  // photoVersion read here to ensure the draw re-runs when photos finish loading.
  const drawFn = (ctx, w, h, state) => {
    void photoVersion; // dep — see useEffect above; closes-over to trigger redraw on photo load
    const { canvas, zoom, activeTouchPos, loupeSourceRef, imgObj } = state;

    drawField(ctx, w, h, canvas, { imgObj, activeTouchPos, loupeSourceRef });
    drawZones(ctx, w, h, { discoLine, zeekerLine, discoColor, zeekerColor, discoName, zeekerName,
      calloutLines, editLinePoints, activeLineId, showCalloutLines, showCalloutHatch, showZones,
      // § 88 — new shape passes `zones` + `editZonePoints`; drawZones picks
      // it over the legacy 3-field shape when present.
      zones, editZonePoints,
      dangerZone, sajgonZone, bigMoveZone,
      layoutEditMode, editDangerPoints, editSajgonPoints, editBigMovePoints,
      selectedZoneVertex, hideLineLabels, doritoSide, t });
    drawAnalytics(ctx, w, h, { visibilityData, showVisibility, fieldCalibration,
      counterData, showCounter, enemyPath, counterDraft });

    // § OSTRZAŁ — selected-player callout confirmation. When a player is
    // selected (e.g. assigning shots in QuickShotPanel), tint each callout zone
    // they've tagged (break ∪ obstacle) and draw a line from the player to the
    // zone centroid — visual confirmation the shot is bound to THAT player.
    // Drawn before drawPlayers so the player marker sits on top of the line
    // origin. Only the selected player's zones render (no full-overlay clutter).
    if (selectedPlayer != null && Array.isArray(zones) && zones.length) {
      const pos = players[selectedPlayer];
      const ids = new Set([
        ...(calloutZoneShots?.[selectedPlayer] || []),
        ...(calloutObstacleShots?.[selectedPlayer] || []),
      ]);
      if (pos && ids.size) {
        const lw = 2 / zoom; // zoom-independent stroke
        for (const z of zones) {
          if (!ids.has(z.id)) continue;
          const poly = z.polygon;
          if (!Array.isArray(poly) || poly.length < 3) continue;
          const color = z.color || COLORS.accent;
          ctx.beginPath();
          ctx.moveTo(poly[0].x * w, poly[0].y * h);
          for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x * w, poly[i].y * h);
          ctx.closePath();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = color;
          ctx.fill();
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = lw;
          ctx.strokeStyle = color;
          ctx.stroke();
          // line player → zone centroid
          let cx = 0, cy = 0;
          for (const p of poly) { cx += p.x; cy += p.y; }
          cx /= poly.length; cy /= poly.length;
          ctx.beginPath();
          ctx.moveTo(pos.x * w, pos.y * h);
          ctx.lineTo(cx * w, cy * h);
          ctx.lineWidth = lw;
          ctx.strokeStyle = color;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    drawPlayers(ctx, w, h, {
      players, eliminations, eliminationPositions, bumpStops, shots, bumpShots, runners,
      playerAssignments, rosterPlayers, selectedPlayer,
      opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
      opponentAssignments, opponentRosterPlayers,
      getPlayerLabel, getPlayerObj, photoCache: photoCache.current, zoom,
      heroPlayerIds,
      fieldSide: viewportSide || 'left',
      bumpShotOriginAtStart,
      // § 88 — pass zones through so drawPlayers can render the scouting
      // pill below each placed player. Null on surfaces that don't pass
      // zones (Tactic / LayoutDetail tactic-preview / BunkerEditor) →
      // pill rendering is skipped.
      zones,
    });
    drawQuickShots(ctx, w, h, { players, quickShots, obstacleShots, doritoSide, fieldSide: viewportSide || 'left', team });
    drawBunkers(ctx, w, h, { bunkers: correctedBunkers, showBunkers, showHalfLabels, layoutEditMode, selectedBunkerId,
      showCounter, counterData, selectedCounterBunkerId });

    // Freehand strokes overlay.
    if (freehandStrokes?.length) {
      const strokes = Array.isArray(freehandStrokes) ? freehandStrokes
        : Object.keys(freehandStrokes).sort((a,b) => Number(a)-Number(b)).map(k => freehandStrokes[k]);
      strokes.forEach(stroke => {
        if (!stroke || stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * w, stroke[0].y * h);
        for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x * w, stroke[i].y * h);
        ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      });
    }

    // HUD (zoom-independent sizing).
    const _s = 1 / zoom;
    if (editable && mode === 'place') {
      const n = players.filter(Boolean).length;
      if (n < 5) {
        ctx.fillStyle = COLORS.accent + 'cc'; ctx.font = `bold ${12 * _s}px ${FONT}`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(`${n}/5`, w - 10 * _s, 10 * _s);
      }
    }
    if (editable && mode === 'shoot' && selectedPlayer !== null) {
      ctx.fillStyle = COLORS.playerColors[selectedPlayer] + 'cc';
      ctx.font = `bold ${12 * _s}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(`Shots P${selectedPlayer + 1}`, w - 10 * _s, 10 * _s);
    }

    // BaseCanvas's draw effect resets the transform after the callback so the
    // zoom-percent indicator (zoom > 1.05) can draw in screen space. The
    // FieldCanvas equivalent (L317-322 ctx.restore + screen-space text) is
    // replaced by the React JSX zoom-Btn in InteractiveChrome (visible only
    // when zoom > 1.05, same threshold). Keeps a single source of truth.

    if (pendingBunkerPos) {
      const px = pendingBunkerPos.x * w, py = pendingBunkerPos.y * h;
      ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#facc1580'; ctx.fill();
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2; ctx.stroke();
    }

    drawCalibration(ctx, w, h, { calibrationMode, calibrationData });
    drawLoupe(ctx, w, h, { activeTouchPos, loupeSourceRef, canvas, isInteractive: !viewportSide && (editable || layoutEditMode) });
  };

  return (
    <BaseCanvas
      sizingStrategy="height-first"
      maxCanvasHeight={maxCanvasHeight}
      fieldImage={fieldImage}
      viewportSide={viewportSide}
      pinchZoom pan loupe
      cursor={cursor}
      onPlacePlayer={onPlacePlayer}
      onMovePlayer={onMovePlayer}
      onPlaceShot={onPlaceShot}
      onDeleteShot={onDeleteShot}
      onBumpStop={onBumpStop}
      onSelectPlayer={onSelectPlayer}
      onMoveBumpStop={onMoveBumpStop}
      onEmptyTap={onEmptyTap}
      drawMode={drawMode}
      onDrawStart={onDrawStart}
      onDrawMove={onDrawMove}
      onDrawEnd={onDrawEnd}
      onDrawAbort={onDrawAbort}
      touchHandlerState={touchHandlerState}
      draw={drawFn}
    >
      <InteractiveChrome
        toolbarPlayer={toolbarPlayer}
        toolbarItems={toolbarItems}
        onToolbarAction={onToolbarAction}
        players={players}
      />
      {children}
    </BaseCanvas>
  );
}

/**
 * InteractiveChrome — JSX overlay rendered inside BaseCanvas's frame:
 *   - reset-zoom Btn (visible when zoom > 1.05).
 *   - inline player toolbar (when toolbarPlayer set + toolbarItems non-empty).
 *
 * Verbatim transplant of FieldCanvas:396-450. Reads gesture/transform state
 * from BaseCanvasContext via `useBaseCanvas()`.
 */
function InteractiveChrome({ toolbarPlayer, toolbarItems, onToolbarAction, players }) {
  const { canvasSize, zoom, pan, setZoom, setPan, containerRef } = useBaseCanvas();

  const toolbarPos = useMemo(() => {
    if (toolbarPlayer === null || !players[toolbarPlayer]) return null;
    const pl = players[toolbarPlayer];
    const screenX = pl.x * canvasSize.w * zoom + pan.x;
    const screenY = pl.y * canvasSize.h * zoom + pan.y;
    const tbW = toolbarItems.length * 56 + 12;
    const visibleW = containerRef.current?.clientWidth || canvasSize.w;
    let left = screenX - tbW / 2;
    let top = screenY - 80;
    let below = false;
    if (left < 4) left = 4;
    if (left + tbW > visibleW - 4) left = visibleW - 4 - tbW;
    if (top < 4) { top = screenY + 28; below = true; }
    return { left, top, below, anchorX: Math.min(screenX, visibleW - 10) };
  }, [toolbarPlayer, toolbarItems, players, canvasSize, zoom, pan, containerRef]);

  return (
    <>
      {zoom > 1.05 && (
        <div onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          style={{ position: 'absolute', top: 6, right: 6, padding: '4px 8px',
            background: 'rgba(0,0,0,0.7)', borderRadius: 6, cursor: 'pointer',
            fontFamily: FONT, fontSize: 10, color: COLORS.accent, fontWeight: 700 }}>
          {Math.round(zoom * 100)}% ✕
        </div>
      )}
      {toolbarPos && toolbarItems.length > 0 && (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 19 }}
            onTouchStart={e => { e.stopPropagation(); onToolbarAction?.('close', toolbarPlayer); }}
            onMouseDown={e => { e.stopPropagation(); onToolbarAction?.('close', toolbarPlayer); }}
          />
          <div style={{
            position: 'absolute', left: toolbarPos.left, top: toolbarPos.top,
            display: 'flex', gap: 4, padding: 6,
            background: '#0f172aee', border: '1px solid #1e293b80', borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            zIndex: 20, pointerEvents: 'auto',
          }}
            onPointerDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {toolbarItems.map((item, i) => (
              <div key={i}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToolbarAction?.(item.action, toolbarPlayer); }}
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onToolbarAction?.(item.action, toolbarPlayer); }}
                style={{
                  width: 52, height: 48, borderRadius: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  cursor: 'pointer', background: '#1e293b30',
                  border: `1.5px solid ${(item.color || COLORS.textDim) + '30'}`,
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.3, color: (item.color || COLORS.textDim) + '90', fontFamily: FONT }}>{item.label}</span>
              </div>
            ))}
            <div style={{
              position: 'absolute',
              left: Math.max(16, Math.min(toolbarPos.anchorX - toolbarPos.left - 7, 214)),
              [toolbarPos.below ? 'top' : 'bottom']: -8,
              width: 0, height: 0,
              borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
              [toolbarPos.below ? 'borderBottom' : 'borderTop']: '8px solid #0f172aee',
            }} />
          </div>
        </>
      )}
    </>
  );
}
