/**
 * LayoutTacticsBoardPage — the Coach Tactics board (rail-native).
 * Route: /layout/:layoutId/tactics
 *
 * Completes the 'tactic' archetype shell migration (fieldViewConfig). Two modes,
 * one screen:
 *   BROWSE  → CanvasRailLayout: field HERO = read-only InteractiveCanvas preview
 *             of the SELECTED tactic; rail = the ordered on-board tactic list
 *             (drag-to-reorder, tap=select, ✕=remove-from-board → onBoard:false)
 *             + a pinned "+ NEW TACTIC" footer (new blank / add from library).
 *   PRESENT → full-bleed immersive: chrome hidden, field 100%, floating DrawToolbar
 *             for live annotation over the selected tactic. Draw persists via the
 *             existing updateLayoutTactic path. "full-bleed present" is realized
 *             via §76 immersive (NOT §116 manual rail-collapse, which is unbuilt
 *             F2) — same end-user result, proven TacticPage pattern.
 *
 * LayoutDetailPage's tactic list COEXISTS (structured position-editing door).
 */
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';

import CanvasRailLayout from '../components/canvas/CanvasRailLayout';
import InteractiveCanvas from '../components/canvas/InteractiveCanvas';
import DrawingOverlay from '../components/canvas/DrawingOverlay';
import DrawToolbar from '../components/canvas/DrawToolbar';
import PageHeader from '../components/PageHeader';
import { Btn, Modal, EmptyState } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useLandscapeMode } from '../hooks/useLandscapeMode';
import * as ds from '../services/dataService';
import { STROKE_COLORS, STROKE_SIZES, strokesToFirestore, eraseAcrossStrokes } from '../components/canvas/drawStrokes';
import { tacticToCanvasProps, onBoardTactics, offBoardTactics, sortBoardTactics } from '../utils/tacticState';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

export default function LayoutTacticsBoardPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const { layouts, loading: layoutsLoading } = useLayouts();
  const layout = layouts.find(l => l.id === layoutId);
  const { tactics, loading } = useLayoutTactics(layoutId);
  const { immersive } = useLandscapeMode();

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
  const preview = useMemo(() => tacticToCanvasProps(selectedTactic), [selectedTactic]);

  // ── Present / annotate (full-bleed draw) ──
  const [present, setPresent] = useState(false);
  const [freehandStrokes, setFreehandStrokes] = useState([]);
  const [freehandCurrent, setFreehandCurrent] = useState(null);
  const [freehandRedo, setFreehandRedo] = useState([]);
  const [drawColor, setDrawColor] = useState(STROKE_COLORS[0].value);
  const [drawSizeKey, setDrawSizeKey] = useState('medium');
  const [drawEraser, setDrawEraser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Library picker + create
  const [libraryOpen, setLibraryOpen] = useState(false);

  // Field geometry from the layout (read-time displayName-resolved bunkers).
  const field = {
    fieldImage: layout?.fieldImage,
    bunkers: layout?.bunkers || [],
    fieldCalibration: layout?.fieldCalibration || null,
    doritoSide: layout?.doritoSide || 'top',
  };

  const enterPresent = (tactic) => {
    if (!tactic) return;
    setFreehandStrokes(tacticToCanvasProps(tactic).freehandStrokes);
    setFreehandRedo([]);
    setFreehandCurrent(null);
    setDrawEraser(false);
    setSelectedId(tactic.id);
    setPresent(true);
  };
  const exitPresent = () => { setPresent(false); setFreehandCurrent(null); setDrawEraser(false); };

  // ── Draw handlers (shared DrawingOverlay stack — verbatim from TacticPage) ──
  const handleDrawStart = (pos) => {
    if (drawEraser) { setFreehandStrokes(prev => eraseAcrossStrokes(prev, pos, STROKE_SIZES[drawSizeKey] * 2, 1000, 500)); setFreehandRedo([]); return; }
    setFreehandCurrent({ color: drawColor, size: STROKE_SIZES[drawSizeKey], pts: [pos] });
  };
  const handleDrawMove = (pos) => {
    if (drawEraser) { setFreehandStrokes(prev => eraseAcrossStrokes(prev, pos, STROKE_SIZES[drawSizeKey] * 2, 1000, 500)); return; }
    setFreehandCurrent(prev => (prev ? { ...prev, pts: [...prev.pts, pos] } : prev));
  };
  const handleDrawEnd = () => {
    if (drawEraser) return;
    setFreehandCurrent(prev => {
      if (!prev || prev.pts.length < 2) return null;
      setFreehandStrokes(p => [...p, prev]);
      setFreehandRedo([]);
      return null;
    });
  };
  const handleDrawAbort = () => setFreehandCurrent(null);
  const handleDrawUndo = () => setFreehandStrokes(prev => {
    if (prev.length === 0) return prev;
    const last = prev[prev.length - 1];
    setFreehandRedo(r => [...r, last]);
    return prev.slice(0, -1);
  });
  const handleDrawRedo = () => setFreehandRedo(prev => {
    if (prev.length === 0) return prev;
    const last = prev[prev.length - 1];
    setFreehandStrokes(s => [...s, last]);
    return prev.slice(0, -1);
  });
  const handleDrawClear = () => { setFreehandStrokes([]); setFreehandRedo([]); };

  const handleSaveAnnotation = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await ds.updateLayoutTactic(layoutId, selectedId, { freehandStrokes: strokesToFirestore(freehandStrokes) });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      console.error('Save annotation error:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

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
    const n = boardTactics.length + libraryTactics.length + 1;
    const ref = await ds.addLayoutTactic(layoutId, { name: `Tactic ${n}`, onBoard: true });
    enterPresent({ id: ref.id, name: `Tactic ${n}`, freehandStrokes: null });
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
        <EmptyState icon="⚠️" text="Layout not found" subtitle="This field layout could not be loaded." />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => navigate('/layouts')}>‹ Layouts</Btn>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRESENT / ANNOTATE — full-bleed immersive draw surface
  // ═══════════════════════════════════════════════════════════════════════
  if (present && selectedTactic) {
    return (
      <div data-testid="tactics-present" style={{
        position: 'fixed', inset: 0, height: '100dvh', zIndex: 100,
        background: COLORS.bg, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <InteractiveCanvas
            fieldImage={field.fieldImage}
            players={preview.players}
            shots={preview.shots}
            bumpShots={preview.bumpShots}
            bumpStops={preview.bumps}
            runners={preview.runners}
            quickShots={preview.quickShots}
            obstacleShots={preview.obstacleShots}
            eliminations={[false, false, false, false, false]}
            eliminationPositions={[null, null, null, null, null]}
            doritoSide={field.doritoSide}
            bunkers={field.bunkers}
            showBunkers={false}
            fieldCalibration={field.fieldCalibration}
            discoLine={0}
            zeekerLine={0}
            editable={false}
            drawMode
            onDrawStart={handleDrawStart}
            onDrawMove={handleDrawMove}
            onDrawEnd={handleDrawEnd}
            onDrawAbort={handleDrawAbort}
          >
            <DrawingOverlay strokes={freehandStrokes} currentStroke={freehandCurrent} />
          </InteractiveCanvas>
          <DrawToolbar
            color={drawColor}
            onColorChange={setDrawColor}
            sizeKey={drawSizeKey}
            onSizeChange={setDrawSizeKey}
            eraserActive={drawEraser}
            onEraserToggle={setDrawEraser}
            canUndo={freehandStrokes.length > 0}
            canRedo={freehandRedo.length > 0}
            hasStrokes={freehandStrokes.length > 0}
            onUndo={handleDrawUndo}
            onRedo={handleDrawRedo}
            onClear={handleDrawClear}
            onDone={async () => { await handleSaveAnnotation(); exitPresent(); }}
          />
        </div>
        {/* Floating back + title (top-left) */}
        <div style={{ position: 'fixed', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8, zIndex: 50 }}>
          <Btn variant="default" size="sm" testId="tactics-present-back"
            onClick={exitPresent}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ‹ Board
          </Btn>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text,
            background: COLORS.surface + 'cc', backdropFilter: 'blur(8px)', padding: '6px 10px', borderRadius: RADIUS.sm }}>
            {selectedTactic.name}
          </span>
        </div>
        {/* Floating save (bottom-right) */}
        <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 50 }}>
          <Btn variant={savedFlash ? 'default' : 'accent'} testId="tactics-present-save"
            style={{ padding: '10px 20px', fontSize: FONT_SIZE.sm, fontWeight: 700, backdropFilter: 'blur(8px)',
              ...(savedFlash ? { background: COLORS.success + '20', borderColor: COLORS.success, color: COLORS.success } : {}) }}
            onClick={handleSaveAnnotation}
            disabled={saving}>
            {saving ? '...' : savedFlash ? '✓' : 'Save'}
          </Btn>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BROWSE — CanvasRailLayout (field hero preview + tactic rail)
  // ═══════════════════════════════════════════════════════════════════════
  const headerEl = !immersive ? (
    <PageHeader
      back={{ to: `/layout/${layoutId}` }}
      title="Tactics board"
      subtitle={(layout?.name || 'Layout').toUpperCase()}
    />
  ) : null;

  const artifactEl = (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
      {selectedTactic ? (
        <InteractiveCanvas
          fieldImage={field.fieldImage}
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
          {boardTactics.length === 0 ? 'No tactics on the board yet — add one below.' : 'Select a tactic to preview it.'}
        </div>
      )}
    </div>
  );

  // Pencil → present/annotate, only when a tactic is selected (floats on field).
  const fieldToolsEl = selectedTactic ? (
    <div role="button" aria-label="Present and annotate" data-testid="tactics-present-enter"
      onClick={() => enterPresent(selectedTactic)}
      style={{
        minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(13,17,23,0.92)', border: `1px solid ${COLORS.border}`, borderRadius: 8,
        color: COLORS.text, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', backdropFilter: 'blur(8px)',
      }}>
      <Pencil size={18} strokeWidth={2.25} />
    </div>
  ) : null;

  const railEl = (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px 12px 6px', fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
        color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0 }}>
        On the board · {boardTactics.length}
      </div>
      <div data-testid="tactics-board-list" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 8px' }}>
        {boardTactics.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, padding: '8px 6px', lineHeight: 1.5 }}>
            {loading ? 'Loading…' : 'Nothing here yet. Use “+ New tactic” to start, or add one from your library.'}
          </div>
        )}
        {orderedIds.map((id) => {
          const tactic = boardTactics.find(t => t.id === id);
          if (!tactic) return null;
          const active = id === selectedId;
          return (
            <div key={id} ref={el => { rowRefs.current[id] = el; }} data-testid={`tactic-row-${id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6,
                borderRadius: RADIUS.md, background: active ? COLORS.surfaceLight : COLORS.surfaceDark,
                border: `1px solid ${active ? COLORS.accent + '55' : COLORS.border}`,
                opacity: dragId === id ? 0.6 : 1,
              }}>
              {/* Drag handle (reorder) — ≥44px (§27) */}
              <div role="button" aria-label="Reorder" data-testid={`tactic-drag-${id}`}
                onPointerDown={(e) => onHandlePointerDown(e, id)}
                style={{ minWidth: 44, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: COLORS.textMuted, cursor: 'grab', touchAction: 'none', fontSize: 16 }}>⠿</div>
              {/* Tap body = select */}
              <div role="button" data-testid={`tactic-select-${id}`}
                onClick={() => setSelectedId(id)}
                style={{ flex: 1, minWidth: 0, minHeight: 52, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  cursor: 'pointer', padding: '8px 2px' }}>
                <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                  color: active ? COLORS.text : COLORS.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tactic.name || 'Untitled'}
                </span>
              </div>
              {/* Selected-row remove (split-tap exception) — non-destructive (→ library) */}
              {active && (
                <div role="button" aria-label="Remove from board" data-testid={`tactic-remove-${id}`} onClick={() => removeFromBoard(id)}
                  style={{ minWidth: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</div>
              )}
            </div>
          );
        })}
      </div>
      {/* Pinned footer — + NEW TACTIC */}
      <div style={{ flexShrink: 0, padding: '8px 10px', borderTop: `1px solid ${COLORS.border}`, display: 'flex', gap: SPACE.sm, ...safeBottom }}>
        <Btn variant="accent" size="lg" testId="tactics-new" onClick={createBlankTactic}
          style={{ flex: 1, fontWeight: 700 }}>+ New tactic</Btn>
        {libraryTactics.length > 0 && (
          <Btn variant="default" size="lg" testId="tactics-library-open" onClick={() => setLibraryOpen(true)}
            style={{ minWidth: 52, fontWeight: 600 }}>Library</Btn>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <CanvasRailLayout
        aspect={16 / 10}
        railMin={220}
        header={headerEl}
        artifact={artifactEl}
        fieldTools={fieldToolsEl}
        rail={railEl}
        collapsed={{ tabs: [], pins: [], count: { value: boardTactics.length, label: 'plays' }, onBack: () => navigate(`/layout/${layoutId}`) }}
      />
      {/* Library picker — off-board tactics, tap to re-add */}
      <Modal open={libraryOpen} onClose={() => setLibraryOpen(false)} title="Add from library">
        {libraryTactics.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: 8 }}>
            Your library is empty — every tactic is already on the board.
          </div>
        ) : (
          <div data-testid="tactics-library-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {libraryTactics.map(tac => (
              <div key={tac.id} role="button" data-testid={`library-row-${tac.id}`} onClick={() => addFromLibrary(tac.id)}
                style={{ minHeight: 52, display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer',
                  background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>
                {tac.name || 'Untitled'}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

const safeBottom = { paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' };
