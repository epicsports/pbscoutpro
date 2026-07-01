/**
 * LayoutTacticsBoardPage — the Coach Tactics board (rail-native).
 * Route: /layout/:layoutId/tactics
 *
 * Completes the 'tactic' archetype shell migration (fieldViewConfig). BROWSE only:
 * CanvasRailLayout — field HERO = read-only InteractiveCanvas preview of the
 * SELECTED tactic (phased OR legacy via tacticPreviewProps); rail = the ordered
 * on-board list (drag-to-reorder, tap=select, swipe=remove→onBoard:false) + a
 * pinned "+ NEW TACTIC" footer (new blank → editor / add from library). The Edit
 * door (Move icon) → the phased TacticEditorPage.
 *
 * Stage 2.3 — the old full-bleed PRESENT/annotate mode is RETIRED; edit + per-phase
 * freehand live in TacticEditorPage. LayoutDetailPage's tactic list COEXISTS.
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Move } from 'lucide-react';

import InteractiveCanvas from '../components/canvas/InteractiveCanvas';
import PageHeader from '../components/PageHeader';
import { Btn, Modal, EmptyState, SwipeDelete } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { onBoardTactics, offBoardTactics, sortBoardTactics } from '../utils/tacticState';
import { tacticPreviewProps } from '../utils/tacticDoc';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

export default function LayoutTacticsBoardPage() {
  const { layoutId } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { layouts, loading: layoutsLoading } = useLayouts();
  const layout = layouts.find(l => l.id === layoutId);
  const { tactics, loading } = useLayoutTactics(layoutId);
  // #1 layout — branch on VIEWPORT GEOMETRY (innerWidth > innerHeight), like
  // CanvasRailLayout, so the inline layout applies on tablet AND desktop landscape
  // (useLandscapeMode.isLandscape excludes desktop-width screens).
  const [vp, setVp] = useState(() => (typeof window !== 'undefined' ? { w: window.innerWidth, h: window.innerHeight } : { w: 0, h: 0 }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on); window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  const landscape = vp.w > vp.h;
  // INLINE two-state rail (expanded ↔ 56px strip), no overlay. Tap the field →
  // minimize; tap the strip → expand. Switching tactics never costs open/close.
  const [railOpen, setRailOpen] = useState(true);

  // ── Board list (client-side onBoard filter + order sort; legacy-safe) ──
  const boardTactics = useMemo(() => sortBoardTactics(onBoardTactics(tactics)), [tactics]);
  const libraryTactics = useMemo(() => offBoardTactics(tactics), [tactics]);

  // ── Selection ──
  const [selectedId, setSelectedId] = useState(null);
  // Auto-select the first board tactic once loaded (so the field is never blank
  // when there IS something to show). Clears if the selected tactic leaves the board.
  useEffect(() => {
    if (selectedId && boardTactics.some(t => t.id === selectedId)) return;
    setSelectedId(boardTactics[0]?.id || null);
  }, [boardTactics, selectedId]);
  const selectedTactic = boardTactics.find(t => t.id === selectedId) || null;
  // Read-only preview — handles BOTH phased (schemaVersion:2) and legacy tactics.
  const preview = useMemo(() => tacticPreviewProps(selectedTactic), [selectedTactic]);

  // Library picker
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Field geometry from the layout (read-time displayName-resolved bunkers).
  const field = {
    fieldImage: layout?.fieldImage,
    bunkers: layout?.bunkers || [],
    fieldCalibration: layout?.fieldCalibration || null,
    doritoSide: layout?.doritoSide || 'top',
  };

  // Edit / annotate now happens in the phased TacticEditorPage (Stage 2.3 — the old
  // full-bleed present mode is retired; per-phase freehand lives in the editor).
  const openEditor = (tacId) => navigate(`/layout/${layoutId}/tactic-edit/${tacId}`);

  // ── Board mutations ──
  const removeFromBoard = async (tacId) => {
    // Non-destructive: stays in the library, NOT deleted.
    await ds.updateLayoutTactic(layoutId, tacId, { onBoard: false });
  };
  const addFromLibrary = async (tacId) => {
    const maxOrder = boardTactics.reduce((m, t) => (typeof t.order === 'number' && t.order > m ? t.order : m), -1);
    await ds.updateLayoutTactic(layoutId, tacId, { onBoard: true, order: maxOrder + 1 });
    setLibraryOpen(false);
    setSelectedId(tacId);
  };
  const createBlankTactic = async () => {
    // Unique numbering: highest existing "Tactic N" + 1. The old `length + 1`
    // collided after deletions (delete one of 3 → next is "Tactic 3" again).
    const usedNums = [...boardTactics, ...libraryTactics]
      .map(tt => Number(/^Tactic (\d+)$/.exec(tt?.name || '')?.[1]))
      .filter(Number.isFinite);
    const n = (usedNums.length ? Math.max(...usedNums) : 0) + 1;
    const ref = await ds.addLayoutTactic(layoutId, { name: `Tactic ${n}`, onBoard: true });
    openEditor(ref.id); // straight into the phased editor
  };

  // ── Drag-to-reorder (pointer-based; ▲▼ on the selected row for precise/a11y) ──
  const rowRefs = useRef({});
  const [dragId, setDragId] = useState(null);
  const [dragOrder, setDragOrder] = useState(null); // live id[] override while dragging
  const orderedIds = dragOrder || boardTactics.map(t => t.id);

  const commitOrder = async (ids) => {
    // Only persist if the order actually changed.
    const cur = boardTactics.map(t => t.id);
    if (ids.length === cur.length && ids.every((id, i) => id === cur[i])) return;
    try { await ds.reorderLayoutTactics(layoutId, ids); } catch (e) { console.error('Reorder error:', e); }
  };

  const onHandlePointerDown = (e, id) => {
    e.preventDefault();
    setDragId(id);
    setDragOrder(boardTactics.map(t => t.id));
  };
  useEffect(() => {
    if (!dragId) return undefined;
    const move = (ev) => {
      const y = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const ids = (dragOrder || boardTactics.map(t => t.id)).slice();
      // Find the row currently under the pointer; swap dragId toward it.
      let targetId = null;
      for (const id of ids) {
        const el = rowRefs.current[id];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y >= r.top && y <= r.bottom) { targetId = id; break; }
      }
      if (!targetId || targetId === dragId) return;
      const from = ids.indexOf(dragId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      setDragOrder(ids);
    };
    const up = () => {
      const ids = dragOrder || boardTactics.map(t => t.id);
      setDragId(null);
      setDragOrder(null);
      commitOrder(ids);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragId, dragOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── No layout (only after the layout subscription has actually settled — keying
  //    off the TACTICS loading flag fired the "not found" state too early) ──
  if (!layoutsLoading && !layout) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState icon="⚠️" text={t('layout_tactic_not_found')} subtitle={t('layout_tactic_not_found_sub')} />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => navigate('/layouts')}>{t('layout_tactic_back_layouts')}</Btn>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BROWSE — CanvasRailLayout (field hero preview + tactic rail)
  // ═══════════════════════════════════════════════════════════════════════
  const headerEl = !landscape ? (
    <PageHeader
      back={{ to: `/layout/${layoutId}` }}
      title={t('layout_tactic_board_title')}
      subtitle={(layout?.name || t('layout_tactic_layout_fallback')).toUpperCase()}
    />
  ) : null;

  const artifactEl = (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
      {/* STAGE 2 — door into the new DrawingCanvas tactics editor (additive; the
          legacy board here stays until the STAGE 3 supersede). */}
      <div role="button" aria-label={t('tactics_new_editor')} data-testid="open-tactics-canvas"
        onClick={() => navigate(`/layout/${layoutId}/tactics-canvas`)}
        style={{ position: 'absolute', top: 12, left: 12, zIndex: 30, display: 'inline-flex', alignItems: 'center', gap: 6,
          minHeight: 36, padding: '0 12px', borderRadius: 18, cursor: 'pointer',
          background: 'rgba(15,23,42,.85)', border: `1px solid ${COLORS.accent}`, color: COLORS.accent,
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800, backdropFilter: 'blur(8px)', WebkitTapHighlightColor: 'transparent' }}>
        ✨ {t('tactics_new_editor')}
      </div>
      {selectedTactic ? (
        <InteractiveCanvas
          fieldImage={field.fieldImage}
          // Landscape: height-first so the field fills 100% height; the field box's
          // overflow:hidden crops the horizontal excess (no letterbox). Portrait: cap.
          maxCanvasHeight={landscape ? vp.h : null}
          players={preview.players}
          shots={preview.shots}
          bumpShots={preview.bumpShots}
          bumpStops={preview.bumps}
          runners={preview.runners}
          quickShots={preview.quickShots}
          obstacleShots={preview.obstacleShots}
          freehandStrokes={preview.freehandStrokes}
          eliminations={[false, false, false, false, false]}
          eliminationPositions={[null, null, null, null, null]}
          doritoSide={field.doritoSide}
          bunkers={field.bunkers}
          showBunkers={false}
          fieldCalibration={field.fieldCalibration}
          discoLine={0}
          zeekerLine={0}
          editable={false}
          drawMode={false}
        />
      ) : (
        <div data-testid="tactics-empty-field" style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center', padding: 24,
        }}>
          {boardTactics.length === 0 ? t('layout_tactic_field_empty') : t('layout_tactic_field_select')}
        </div>
      )}
    </div>
  );

  // Field tool — the single Edit door → the phased TacticEditorPage (edit positions
  // per phase + per-phase freehand). The old separate present/annotate mode is retired.
  const fieldToolBtn = {
    minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(13,17,23,0.92)', border: `1px solid ${COLORS.border}`, borderRadius: 8,
    color: COLORS.text, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', backdropFilter: 'blur(8px)',
  };
  const fieldToolsEl = selectedTactic ? (
    <div role="button" aria-label={t('layout_tactic_edit_aria')} data-testid="tactics-edit-enter"
      onClick={() => openEditor(selectedTactic.id)}
      style={fieldToolBtn}>
      <Move size={18} strokeWidth={2.25} />
    </div>
  ) : null;

  const railEl = (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px 6px', fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
        color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>
        {t('layout_tactic_on_board', boardTactics.length)}
      </div>
      <div data-testid="tactics-board-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px' }}>
        {boardTactics.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, padding: '8px 6px', lineHeight: 1.5 }}>
            {loading ? t('loading') : t('layout_tactic_empty_board')}
          </div>
        )}
        {orderedIds.map((id) => {
          const tactic = boardTactics.find(t => t.id === id);
          if (!tactic) return null;
          const active = id === selectedId;
          return (
            // Remove = swipe-left (app's established SwipeDelete), NOT a corner ✕ — so it
            // never shares the rail's top-right collapse/close corner. Non-destructive →
            // amber "Remove" (stays in the library), NOT red "Delete" (§27).
            <SwipeDelete key={id} onDelete={() => removeFromBoard(id)} label="Remove"
              bg={COLORS.surfaceLight} color={COLORS.accent} testId={`tactic-remove-${id}`}
              leftAction={() => openEditor(id)} leftLabel={t('edit')}
              leftBg={COLORS.accent} leftColor={COLORS.bg} leftTestId={`tactic-edit-${id}`}>
              <div ref={el => { rowRefs.current[id] = el; }} data-testid={`tactic-row-${id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  borderRadius: RADIUS.md, background: active ? COLORS.surfaceLight : COLORS.surfaceDark,
                  border: `1px solid ${active ? COLORS.accent + '55' : COLORS.border}`,
                  opacity: dragId === id ? 0.6 : 1,
                }}>
                {/* Drag handle (reorder) — ≥44px (§27). stopPropagation on touchstart so a
                    vertical reorder drag never triggers the horizontal swipe-to-remove. */}
                <div role="button" aria-label={t('layout_tactic_reorder_aria')} data-testid={`tactic-drag-${id}`}
                  onPointerDown={(e) => onHandlePointerDown(e, id)}
                  onTouchStart={(e) => e.stopPropagation()}
                  style={{ minWidth: 44, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: COLORS.textMuted, cursor: 'grab', touchAction: 'none', fontSize: 16 }}>⠿</div>
                {/* Tap body = select */}
                <div role="button" data-testid={`tactic-select-${id}`}
                  onClick={() => setSelectedId(id)}
                  style={{ flex: 1, minWidth: 0, minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    cursor: 'pointer', padding: '8px 2px' }}>
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                    color: active ? COLORS.text : COLORS.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tactic.name || t('layout_tactic_untitled')}
                  </span>
                </div>
              </div>
            </SwipeDelete>
          );
        })}
      </div>
      {/* Pinned footer — + NEW TACTIC */}
      <div style={{ flexShrink: 0, padding: '8px 10px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: SPACE.sm, ...safeBottom }}>
        <Btn variant="accent" size="lg" testId="tactics-new" onClick={createBlankTactic}
          style={{ flex: 1, fontWeight: 700 }}>{t('layout_tactic_new')}</Btn>
        {libraryTactics.length > 0 && (
          <Btn variant="default" size="lg" testId="tactics-library-open" onClick={() => setLibraryOpen(true)}
            style={{ minWidth: 52, fontWeight: 600 }}>{t('layout_tactic_library')}</Btn>
        )}
      </div>
    </div>
  );

  // Minimized rail = a 56px strip (always visible, one-tap expandable). No overlay.
  const stripBtn = { minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', color: COLORS.textDim, fontSize: 18 };
  const stripEl = (
    <div data-testid="tactics-rail-strip" role="button" aria-label={t('layout_tactic_expand_aria')} onClick={() => setRailOpen(true)}
      style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0', gap: 6, borderRight: `1px solid ${COLORS.border}`, background: COLORS.bg, cursor: 'pointer' }}>
      <div role="button" aria-label={t('layout_tactic_back_aria')} onClick={(e) => { e.stopPropagation(); navigate(`/layout/${layoutId}`); }} style={{ ...stripBtn, color: COLORS.accent, fontSize: 22 }}>‹</div>
      <div style={{ width: 24, borderTop: `1px solid ${COLORS.border}`, margin: '2px 0' }} />
      <div data-testid="tactics-rail-expand" style={{ ...stripBtn, color: COLORS.accent }}>☰</div>
      <div style={{ marginTop: 'auto', paddingBottom: 6, textAlign: 'center', lineHeight: 1.1, fontFamily: FONT, fontSize: TOUCH.fontXs - 2, fontWeight: 700, color: COLORS.textMuted }}>{boardTactics.length}<br />{t('layout_tactic_plays')}</div>
    </div>
  );
  // Field box — fills residual width; overflow:hidden crops the height-first field
  // (100% height, no letterbox). Tap empty field → minimize the rail (more field);
  // the edit door (top-right) stops propagation so it never minimizes.
  const fieldBox = (onTap) => (
    <div data-testid="tactics-field" onClick={onTap}
      style={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', background: COLORS.bg }}>
      {artifactEl}
      {fieldToolsEl && (
        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 4 }} onClick={(e) => e.stopPropagation()}>{fieldToolsEl}</div>
      )}
    </div>
  );

  const libraryModal = (
    <Modal open={libraryOpen} onClose={() => setLibraryOpen(false)} title={t('layout_tactic_library_modal')}>
        {libraryTactics.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: 8 }}>
            {t('layout_tactic_library_empty')}
          </div>
        ) : (
          <div data-testid="tactics-library-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {libraryTactics.map(tac => (
              <div key={tac.id} role="button" data-testid={`library-row-${tac.id}`} onClick={() => addFromLibrary(tac.id)}
                style={{ minHeight: 52, display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer',
                  background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>
                {tac.name || t('layout_tactic_untitled')}
              </div>
            ))}
          </div>
        )}
      </Modal>
  );

  return (
    <>
      {landscape ? (
        // LANDSCAPE — field HERO (height-first crop, fills 100% height) + INLINE
        // two-state rail (expanded 300px ↔ 56px strip), NO overlay panel.
        <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'row' }}>
          {/* Rail on the LEFT (consistent with the editor + live screens). Jacek 2026-06-26. */}
          {railOpen ? (
            <div data-testid="tactics-rail" style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 10px', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
                <span style={{ flex: 1, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{layout?.name || t('layout_tactic_tactics_fallback')}</span>
                <div role="button" aria-label={t('layout_tactic_minimize_aria')} data-testid="tactics-rail-minimize" onClick={() => setRailOpen(false)} style={stripBtn}>‹</div>
              </div>
              {railEl}
            </div>
          ) : stripEl}
          {fieldBox(() => railOpen && setRailOpen(false))}
        </div>
      ) : (
        // PORTRAIT — stacked: header · field (capped) · rail list + footer.
        <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
          {headerEl}
          <div style={{ flex: '0 0 46vh', minHeight: 0, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            {artifactEl}
            {fieldToolsEl && <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 4 }}>{fieldToolsEl}</div>}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{railEl}</div>
        </div>
      )}
      {libraryModal}
    </>
  );
}

const safeBottom = { paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' };
