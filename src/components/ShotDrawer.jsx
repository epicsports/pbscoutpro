import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Trash2, Skull } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, SPACE, TOUCH } from '../utils/theme';
import { Btn } from './ui';
import BaseCanvas, { useBaseCanvas } from './canvas/BaseCanvas';
import { drawField } from './field/drawField';
import { drawBunkers } from './field/drawBunkers';
import { recomputeMirrorsWithCalibration } from '../utils/helpers';
import { useLanguage } from '../hooks/useLanguage';

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
  // A2 v2 — drag-move + kill-toggle callbacks. Optional; if absent the
  // drawer still works v1-style (tap = delete via onDeleteShotIdx) for any
  // legacy caller, but MatchPage scout wires both in for the v2 contract.
  onMoveShotIdx,        // (shotIdx, { x, y }) — preserves isKill upstream
  onToggleKillShotIdx,  // (shotIdx)           — toggles isKill upstream
}) {
  // Hooks must run unconditionally — early `if (!open) return null` was
  // safe here (no hooks above it) pre-§86 but BaseCanvas mount path has
  // its own hooks; we gate the visible render at the bottom.
  const { t } = useLanguage();
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
    // A2 v2 — isKill markers render a skull glyph instead of the index
    // number, with a thicker red-tinted ring. Mirrors drawPlayers.js
    // shot-render's isKill branch so the kill-toggle menu action has
    // visible feedback IN the drawer (drawPlayers handles the same
    // visualization on the main canvas; this keeps parity).
    shots.forEach((s, i) => {
      const sx = s.x * w, sy = s.y * h;
      if (s.isKill) {
        ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.danger + '40';
        ctx.fill();
        ctx.strokeStyle = COLORS.danger; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.font = 'bold 14px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', sx, sy);
      } else {
        ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.fillStyle = playerColor + '40';
        ctx.fill();
        ctx.strokeStyle = playerColor; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold 12px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), sx, sy);
      }
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
  // A2 v2 — drag-move dispatch. touchHandler fires (pi, si, pos) continuously
  // during a shot drag (past the 6px threshold). Forward to the consumer
  // with the upstream's single-array API; consumer preserves isKill.
  const handleMoveShot = useCallback((_pi, si, pos) => {
    onMoveShotIdx?.(si, { x: pos.x, y: pos.y });
  }, [onMoveShotIdx]);
  // A2 v2 — tap-on-shot opens the floating menu instead of direct-deleting.
  // Stored as the shot index only; the overlay reads the live shot doc
  // from `shots` so kill-toggle reflects the updated state on next render.
  const [menuShotIdx, setMenuShotIdx] = useState(null);
  const handleShotMenu = useCallback((_pi, si) => {
    setMenuShotIdx(si);
  }, []);
  const closeMenu = useCallback(() => setMenuShotIdx(null), []);
  const handleMenuDelete = useCallback(() => {
    if (menuShotIdx == null) return;
    onDeleteShotIdx?.(menuShotIdx);
    setMenuShotIdx(null);
  }, [menuShotIdx, onDeleteShotIdx]);
  const handleMenuToggleKill = useCallback(() => {
    if (menuShotIdx == null) return;
    onToggleKillShotIdx?.(menuShotIdx);
    setMenuShotIdx(null);
  }, [menuShotIdx, onToggleKillShotIdx]);
  // Close menu if its target shot was removed externally (e.g. Undo).
  useEffect(() => {
    if (menuShotIdx != null && (menuShotIdx < 0 || menuShotIdx >= shots.length)) {
      setMenuShotIdx(null);
    }
  }, [menuShotIdx, shots.length]);

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
                // editable=true required — handleDown/handleMove/handleUp
                // early-return on `!editable && !layoutEditMode`. Drawer
                // is always-editable when open (semantically an editor surface).
                editable: true,
                mode: 'shoot',
                selectedPlayer: playerIndex,
                shots: shotsBySlot,
                players: [null, null, null, null, null], // intentionally empty — drawer doesn't render players
              }}
              onPlaceShot={handlePlaceShot}
              onDeleteShot={handleDeleteShot}
              onMoveShot={handleMoveShot}
              onShotMenu={handleShotMenu}
            >
              {/* A2 v2 — floating menu rendered inside BaseCanvas's frame
                  so it can read zoom/pan/canvasSize transform via context
                  (same pattern as InteractiveChrome). */}
              <ShotMenuOverlay
                shot={menuShotIdx != null ? shots[menuShotIdx] : null}
                onClose={closeMenu}
                onDelete={handleMenuDelete}
                onToggleKill={onToggleKillShotIdx ? handleMenuToggleKill : null}
              />
            </BaseCanvas>
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

/**
 * ShotMenuOverlay — A2 v2 floating menu shown when a shot is tapped (and
 * not dragged). Mirrors InteractiveChrome's player-toolbar pattern — DOM
 * overlay positioned absolutely inside BaseCanvas's frame, reading
 * canvas-space → screen-space transform via `useBaseCanvas()` context.
 *
 * Hidden when `shot` is null. Backdrop captures outside-tap → onClose.
 * Actions:
 *   - Delete (✕)
 *   - Kill-toggle (skull) — only rendered when `onToggleKill` is wired.
 *
 * Position math copied verbatim from InteractiveChrome's `toolbarPos`
 * memo (canvas/InteractiveCanvas.jsx:318-332) so the anchor logic + edge
 * clamping + flip-below-if-clipped behavior stays consistent across
 * canvas surfaces.
 */
function ShotMenuOverlay({ shot, onClose, onDelete, onToggleKill }) {
  const ctx = useBaseCanvas();
  if (!shot || !ctx) return null;
  const { canvasSize, zoom, pan, containerRef } = ctx;
  const screenX = shot.x * canvasSize.w * zoom + pan.x;
  const screenY = shot.y * canvasSize.h * zoom + pan.y;
  const itemCount = onToggleKill ? 2 : 1;
  const tbW = itemCount * 56 + 12;
  const visibleW = containerRef?.current?.clientWidth || canvasSize.w;
  let left = screenX - tbW / 2;
  let top = screenY - 80;
  let below = false;
  if (left < 4) left = 4;
  if (left + tbW > visibleW - 4) left = visibleW - 4 - tbW;
  if (top < 4) { top = screenY + 28; below = true; }
  const anchorX = Math.min(screenX, visibleW - 10);
  return (
    <>
      <div
        onTouchStart={(e) => { e.stopPropagation(); onClose?.(); }}
        onMouseDown={(e) => { e.stopPropagation(); onClose?.(); }}
        style={{ position: 'absolute', inset: 0, zIndex: 19 }}
      />
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', left, top,
          display: 'flex', gap: 4, padding: 6,
          background: '#0f172aee', border: '1px solid #1e293b80', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          zIndex: 20, pointerEvents: 'auto',
        }}
      >
        {onToggleKill && (
          <div
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleKill(); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onToggleKill(); }}
            style={{
              width: 52, minHeight: TOUCH.minTarget, borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              cursor: 'pointer', background: '#1e293b30',
              border: `1.5px solid ${(shot.isKill ? COLORS.danger : COLORS.textDim) + '30'}`,
              color: shot.isKill ? COLORS.danger : COLORS.textDim,
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={shot.isKill ? 'Unmark kill' : 'Mark kill'}
          >
            <Skull size={17} strokeWidth={2} />
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>
              {shot.isKill ? 'Alive' : 'Kill'}
            </span>
          </div>
        )}
        <div
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
          style={{
            width: 52, minHeight: TOUCH.minTarget, borderRadius: 12,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            cursor: 'pointer', background: '#1e293b30',
            border: `1.5px solid ${COLORS.textMuted}30`,
            color: COLORS.textMuted,
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label={t('b13_delete_shot')}
        >
          <Trash2 size={17} strokeWidth={2} />
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>
            Del
          </span>
        </div>
        <div style={{
          position: 'absolute',
          left: Math.max(16, Math.min(anchorX - left - 7, tbW - 16)),
          [below ? 'top' : 'bottom']: -8,
          width: 0, height: 0,
          borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
          [below ? 'borderBottom' : 'borderTop']: '8px solid #0f172aee',
        }} />
      </div>
    </>
  );
}
