import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
import { Btn } from './ui';
import BaseCanvas from './canvas/BaseCanvas';
import { drawField } from './field/drawField';
import { drawBunkers } from './field/drawBunkers';
import { recomputeMirrorsWithCalibration } from '../utils/helpers';

/**
 * ShotDrawer — § 86 / B11 / A2 migration.
 *
 * Side-panel for placing precise shots on the opponent half. Re-implemented
 * on BaseCanvas (§ 64 ladder) so the universal §75 grammar (pinch-zoom +
 * 1-finger pan + tap-place + tap-element-delete + long-press loupe) applies
 * here too — replaces the pre-§86 `<img>` + native scroll + ad-hoc touch
 * handler (which only knew tap-place).
 *
 * Opponent half framing via `viewportSide` (§64.8.3) — BaseCanvas pans the
 * canvas so the requested half stays in container; tap coords stay
 * full-field 0-1 (touchHandler.getRelPos accounts for pan).
 *
 * Why BaseCanvas (not InteractiveCanvas): InteractiveCanvas's fixed drawFn
 * always renders drawPlayers/drawQuickShots/drawZones — would clutter the
 * drawer with player markers, origin lines (diagonal stripe from off-screen
 * player to shots), zones, etc., none of which belong in a shot-placement
 * surface. BaseCanvas's `draw` prop = custom draw function (consumer
 * decides what to render). Matches the brief's "consumer draw function for
 * markers" requirement.
 *
 * Callbacks routed via BaseCanvas's standard stateRef:
 *   - `mode='shoot'` + `selectedPlayer={playerIndex}` enables touchHandler's
 *     shot-place/shot-delete branch (post-§86 cleanup: no longer requires
 *     `players[selectedPlayer]` truthy — ShotDrawer enforces upstream).
 *   - `onPlaceShot(_, pos)` → wraps `onAddShot(pos)`.
 *   - `onDeleteShot(_, idx)` → wraps `onDeleteShotIdx(idx)`.
 *
 * v1 scope: pinch/pan/loupe/tap-place/tap-delete. Drag-move-shot deferred
 * to follow-up (significant touchHandler work; tap-delete + Undo + re-place
 * is reasonable UX for v1).
 *
 * Props (caller pass-through unchanged from pre-§86 callers, plus
 * `fieldCalibration` for bunker context render + `onDeleteShotIdx`
 * for tap-delete wiring):
 *   - open, onClose, playerIndex, playerLabel, playerColor
 *   - fieldSide, fieldImage, fieldCalibration, bunkers
 *   - shots: array of {x, y, isKill} for THIS player
 *   - onAddShot({x, y}): place callback
 *   - onUndoShot(): footer undo
 *   - onDeleteShotIdx(shotIdx): tap-delete callback (NEW)
 */
export default function ShotDrawer({
  open, onClose, playerIndex, playerLabel, playerColor,
  fieldSide, fieldImage, fieldCalibration = null, bunkers = [],
  shots = [],
  onAddShot, onUndoShot, onDeleteShotIdx,
}) {
  // Hooks must run unconditionally — early `if (!open) return null` was
  // safe here (no hooks above it) pre-§86 but BaseCanvas mount path has
  // its own hooks; we gate the visible render at the bottom.
  const fromRight = fieldSide === 'left';
  // Opponent half = opposite of scouter's fieldSide.
  // BaseCanvas viewportSide pans canvas so this half stays in container.
  const viewportSide = fromRight ? 'right' : 'left';

  const correctedBunkers = useMemo(
    () => recomputeMirrorsWithCalibration(bunkers, fieldCalibration),
    [bunkers, fieldCalibration]
  );

  // BaseCanvas's mode='shoot' branch in touchHandler reads `shots` keyed
  // by player slot index. Provide a 5-slot structure with current player's
  // array populated; other slots empty. findShot scopes via
  // `selectedPlayer={playerIndex}` so cross-slot tap-hits won't fire.
  const shotsBySlot = useMemo(() => {
    const arr = [[], [], [], [], []];
    if (playerIndex != null && playerIndex >= 0 && playerIndex < 5) {
      arr[playerIndex] = shots || [];
    }
    return arr;
  }, [shots, playerIndex]);

  const draw = useCallback((ctx, w, h, state) => {
    const { imgObj, activeTouchPos, loupeSourceRef, canvas } = state;
    drawField(ctx, w, h, canvas, { imgObj, activeTouchPos, loupeSourceRef });
    drawBunkers(ctx, w, h, {
      bunkers: correctedBunkers,
      showBunkers: true,
      showHalfLabels: false,
      layoutEditMode: null,
      selectedBunkerId: null,
      showCounter: false,
    });
    // Shot markers — numbered colored circles. Visual parity with pre-§86
    // absolute-div markers (size 22, color-filled circle with number).
    shots.forEach((s, i) => {
      const sx = s.x * w, sy = s.y * h;
      ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fillStyle = playerColor + '40';
      ctx.fill();
      ctx.strokeStyle = playerColor; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), sx, sy);
    });
  }, [correctedBunkers, shots, playerColor]);

  // Wrap BaseCanvas's onPlaceShot / onDeleteShot callbacks to ShotDrawer's
  // single-array API.
  const handlePlaceShot = useCallback((_pi, pos) => {
    onAddShot?.({ x: pos.x, y: pos.y, isKill: false });
  }, [onAddShot]);
  const handleDeleteShot = useCallback((_pi, si) => {
    onDeleteShotIdx?.(si);
  }, [onDeleteShotIdx]);

  // § 86 hotfix — BaseCanvas's containerRef is `height: auto`; without an
  // explicit pixel maxCanvasHeight, height-first reads node.clientHeight = 0
  // (auto-height collapses pre-canvas-sized). Measure the flex parent here
  // and pass into maxCanvasHeight so BaseCanvas's sizing gets a real value.
  const flexParentRef = useRef(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  useEffect(() => {
    if (!open) return undefined;
    const node = flexParentRef.current;
    if (!node) return undefined;
    const update = () => setMeasuredHeight(node.clientHeight);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(node);
    return () => obs.disconnect();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 90,
      }} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0,
        [fromRight ? 'right' : 'left']: 0,
        width: '70vw', maxWidth: 520,
        background: COLORS.bg,
        borderLeft: fromRight ? `1px solid ${COLORS.border}` : 'none',
        borderRight: !fromRight ? `1px solid ${COLORS.border}` : 'none',
        zIndex: 91,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: `${SPACE.md}px 14px`, paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface,
          display: 'flex', alignItems: 'center', gap: SPACE.sm,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: playerColor }} />
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text, flex: 1 }}>
            Shots: {playerLabel}
          </span>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
            {shots.length} placed
          </span>
          <div onClick={onClose} style={{ padding: `${SPACE.xs}px ${SPACE.sm}px`, cursor: 'pointer', color: COLORS.textDim, fontSize: FONT_SIZE.lg }}>✕</div>
        </div>

        {/* Canvas area — BaseCanvas mounts, fills available flex space */}
        <div ref={flexParentRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#3a5a3a' }}>
          {fieldImage && measuredHeight > 0 && (
            <BaseCanvas
              fieldImage={fieldImage}
              viewportSide={viewportSide}
              pinchZoom
              pan
              loupe
              draw={draw}
              cursor="crosshair"
              sizingStrategy="height-first"
              maxCanvasHeight={measuredHeight}
              // mode='shoot' + selectedPlayer enables touchHandler's
              // shot-place/shot-delete branch. Post-§86 cleanup, this branch
              // no longer requires players[selectedPlayer] truthy.
              touchHandlerState={{
                mode: 'shoot',
                selectedPlayer: playerIndex,
                shots: shotsBySlot,
                players: [null, null, null, null, null], // intentionally empty — drawer doesn't render players
              }}
              onPlaceShot={handlePlaceShot}
              onDeleteShot={handleDeleteShot}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 14px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface,
          display: 'flex', gap: SPACE.sm,
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        }}>
          <Btn variant="ghost" size="sm" onClick={onUndoShot} style={{ padding: '10px 14px' }}>↩ Undo</Btn>
          <Btn variant="accent" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '12px 0', fontWeight: 700 }}>
            Done ({shots.length})
          </Btn>
        </div>
      </div>
    </>
  );
}
