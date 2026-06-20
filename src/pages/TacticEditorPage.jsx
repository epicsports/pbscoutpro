/**
 * TacticEditorPage — Stage 2.2. The tactic editor on the SHARED capture engine.
 * Route: /layout/:layoutId/tactic-edit/:tacticId
 *
 * A tactic = an outcome-less, single-team, phase-structured point. This screen
 * assembles the shared pieces (InteractiveCanvas + StageSwitcher + QuickShotPanel +
 * ShotDrawer + the draw stack) on `useCaptureDraft({target:'tactic', teams:'single',
 * outcomeEnabled:false, allowAssign:false, capturePhases:positional})`. Same capture
 * grammar as scouting (one brain) minus the result side. Persists phase-keyed via
 * updateLayoutTactic; per-phase freehand (R3) rides the hook's activeAnnotations seam.
 */
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';

import InteractiveCanvas from '../components/canvas/InteractiveCanvas';
import DrawingOverlay from '../components/canvas/DrawingOverlay';
import DrawToolbar from '../components/canvas/DrawToolbar';
import ShotDrawer from '../components/ShotDrawer';
import QuickShotPanel from '../components/QuickShotPanel';
import StageSwitcher from '../components/match/StageSwitcher';
import PageHeader from '../components/PageHeader';
import { Btn, EmptyState } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useLandscapeMode } from '../hooks/useLandscapeMode';
import useCaptureDraft from '../hooks/useCaptureDraft';
import { TACTIC_PHASE_KEYS, tacticDocToPhases, tacticDocToAnnotations, tacticStateToDoc } from '../utils/tacticDoc';
import { label as phaseLabelFn } from '../utils/pointPhases';
import { resolveZones } from '../utils/layoutZones';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

const E5 = [null, null, null, null, null];
const E5B = [false, false, false, false, false];

export default function TacticEditorPage() {
  const { layoutId, tacticId } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { layouts } = useLayouts();
  const layout = layouts.find(l => l.id === layoutId);
  const { tactics, loading } = useLayoutTactics(layoutId);
  const tactic = tactics.find(tc => tc.id === tacticId);

  if (loading && !tactic) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: COLORS.textMuted }}>{t('tactic_loading') || 'Loading…'}</div>;
  }
  if (!tactic) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <EmptyState icon="⚠️" text={t('tactic_not_found') || 'Tactic not found'} />
        <Btn variant="accent" onClick={() => navigate(`/layout/${layoutId}/tactics`)}>‹ Board</Btn>
      </div>
    );
  }
  // key remounts (re-seeds the lazy-init hook) when switching tactics.
  return <TacticEditorInner key={tacticId} layout={layout} layoutId={layoutId} tacticId={tacticId} tactic={tactic} />;
}

function TacticEditorInner({ layout, layoutId, tacticId, tactic }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { canvasMaxHeight } = useLandscapeMode();

  // Hydrate the per-phase drafts + annotations ONCE (the key prop re-mounts on
  // tactic switch). eslint deps intentionally empty — `tactic` is fixed per mount.
  const initial = useMemo(() => tacticDocToPhases(tactic), []); // eslint-disable-line react-hooks/exhaustive-deps
  const initialAnnotations = useMemo(() => tacticDocToAnnotations(tactic), []); // eslint-disable-line react-hooks/exhaustive-deps
  const eng = useCaptureDraft({
    target: 'tactic', teams: 'single', outcomeEnabled: false, allowAssign: false,
    capturePhases: TACTIC_PHASE_KEYS, initial, initialAnnotations,
  });

  const field = {
    fieldImage: layout?.fieldImage,
    bunkers: layout?.bunkers || [],
    fieldCalibration: layout?.fieldCalibration || null,
    doritoSide: layout?.doritoSide || 'top',
  };
  const zones = useMemo(() => resolveZones(layout), [layout]);
  const stages = useMemo(() => TACTIC_PHASE_KEYS.map(k => ({ key: k, label: phaseLabelFn(k, t) })), [t]);

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const root = TACTIC_PHASE_KEYS[0];
      const phases = { [root]: eng.draftA, ...eng.stageDraftsA };
      const anns = { [root]: eng.annotations, ...eng.stageAnnotations };
      await ds.updateLayoutTactic(layoutId, tacticId, tacticStateToDoc(phases, anns));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      console.error('Tactic save error:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="tactic-editor-loaded" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        back={{ to: `/layout/${layoutId}/tactics` }}
        title={tactic.name || 'Tactic'}
        subtitle={(layout?.name || 'Layout').toUpperCase()}
      />
      {/* Phase spine — 5 positional phases, NO outcome node */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 8px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg, flexShrink: 0 }}>
        <StageSwitcher stage={eng.captureStage} onChange={eng.switchStage} done={eng.stageDone} stages={stages} />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
        <InteractiveCanvas
          fieldImage={field.fieldImage}
          maxCanvasHeight={canvasMaxHeight(0, 200)}
          players={eng.draft.players} shots={eng.draft.shots} bumpStops={eng.draft.bumps}
          eliminations={E5B} eliminationPositions={E5}
          runners={eng.draft.runners || []}
          quickShots={eng.draft.quickShots || []}
          obstacleShots={eng.draft.obstacleShots || []}
          calloutZoneShots={eng.draft.zoneShots || []}
          calloutObstacleShots={eng.draft.zoneObstacleShots || []}
          zones={zones}
          doritoSide={field.doritoSide}
          onPlacePlayer={eng.drawMode ? undefined : eng.handlePlacePlayer}
          onMovePlayer={eng.drawMode ? undefined : eng.handleMovePlayer}
          onPlaceShot={eng.drawMode ? undefined : eng.handlePlaceShot}
          onDeleteShot={eng.drawMode ? undefined : eng.handleDeleteShot}
          onSelectPlayer={eng.drawMode ? undefined : eng.handleSelectPlayer}
          onEmptyTap={() => { if (eng.quickShotPlayer != null) eng.setQuickShotPlayer(null); }}
          onBumpPlayer={eng.drawMode ? undefined : ((idx, fromPos) => { eng.pushUndo(); eng.setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = { x: fromPos.x, y: fromPos.y }; return n; }); })}
          onMoveBumpStop={eng.drawMode ? undefined : ((idx, pos) => eng.setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; if (n.bumps[idx]) n.bumps[idx] = { ...n.bumps[idx], x: pos.x, y: pos.y }; return n; }))}
          editable={!eng.drawMode}
          selectedPlayer={eng.drawMode ? null : eng.selPlayer}
          mode={eng.mode}
          toolbarPlayer={eng.drawMode ? null : eng.toolbarPlayer}
          toolbarItems={eng.toolbarItems}
          onToolbarAction={eng.handleToolbarAction}
          bunkers={field.bunkers} showBunkers={false} showZones={false}
          fieldCalibration={field.fieldCalibration}
          discoLine={0} zeekerLine={0}
          drawMode={eng.drawMode}
          onDrawStart={eng.handleDrawStart}
          onDrawMove={eng.handleDrawMove}
          onDrawEnd={eng.handleDrawEnd}
          onDrawAbort={eng.handleDrawAbort}
        >
          {eng.drawMode && <DrawingOverlay strokes={eng.activeAnnotations} currentStroke={eng.currentStroke} />}
        </InteractiveCanvas>
        {eng.drawMode && (
          <DrawToolbar
            color={eng.drawColor} onColorChange={eng.setDrawColor}
            sizeKey={eng.drawSizeKey} onSizeChange={eng.setDrawSizeKey}
            eraserActive={eng.eraserMode} onEraserToggle={eng.setEraserMode}
            canUndo={eng.activeAnnotations.length > 0} canRedo={eng.redoStack.length > 0}
            hasStrokes={eng.activeAnnotations.length > 0}
            onUndo={eng.handleDrawUndo} onRedo={eng.handleDrawRedo} onClear={eng.handleDrawClear}
            onDone={eng.exitDrawMode}
          />
        )}
        <QuickShotPanel
          unified
          visible={eng.quickShotPlayer != null}
          playerIndex={eng.quickShotPlayer}
          playerLabel={eng.quickShotPlayer != null ? `Player ${eng.quickShotPlayer + 1}` : ''}
          selectedZones={eng.quickShotPlayer != null ? (eng.draft.quickShots?.[eng.quickShotPlayer] || []) : []}
          calloutZones={zones}
          fieldImage={field.fieldImage}
          selectedCallout={eng.quickShotPlayer != null ? (eng.draft.zoneShots?.[eng.quickShotPlayer] || []) : []}
          stageLabel={phaseLabelFn(eng.captureStage, t)}
          onToggleZone={eng.handleToggleQuickZone}
          onPrecise={eng.handleQuickShotPrecise}
          onClose={() => eng.setQuickShotPlayer(null)}
        />
      </div>

      {/* Bottom bar — draw toggle + Save */}
      <div style={{ padding: '10px 12px', background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', display: 'flex', gap: SPACE.sm, flexShrink: 0 }}>
        {!eng.drawMode && (
          <Btn variant="default" testId="tactic-editor-draw" onClick={eng.enterDrawMode}
            style={{ minWidth: 52, padding: '14px 16px', fontSize: FONT_SIZE.base, fontWeight: 700 }}>
            <Pencil size={18} strokeWidth={2.25} />
          </Btn>
        )}
        <Btn variant={savedFlash ? 'default' : 'accent'} testId="tactic-editor-save"
          style={{ flex: 1, padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700,
            ...(savedFlash ? { background: COLORS.success + '20', borderColor: COLORS.success, color: COLORS.success } : {}) }}
          onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : savedFlash ? '✓ Saved' : 'Save tactic'}
        </Btn>
      </div>

      {/* Precise-shot drawer */}
      <ShotDrawer
        open={eng.shotMode !== null}
        onClose={() => eng.setShotMode(null)}
        playerIndex={eng.shotMode}
        playerLabel={eng.shotMode !== null ? `P${eng.shotMode + 1}` : ''}
        playerColor={eng.shotMode !== null ? COLORS.playerColors[eng.shotMode] : '#fff'}
        fieldSide="left"
        fieldImage={field.fieldImage}
        fieldCalibration={field.fieldCalibration}
        bunkers={field.bunkers}
        shots={eng.shotMode !== null ? (eng.draft.shots?.[eng.shotMode] || []) : []}
        onAddShot={pos => { if (eng.shotMode !== null) eng.handlePlaceShot(eng.shotMode, pos); }}
        onUndoShot={() => { if (eng.shotMode !== null) { const arr = eng.draft.shots?.[eng.shotMode]; if (arr?.length) eng.handleDeleteShot(eng.shotMode, arr.length - 1); } }}
        onDeleteShotIdx={si => { if (eng.shotMode !== null) eng.handleDeleteShot(eng.shotMode, si); }}
      />
    </div>
  );
}
