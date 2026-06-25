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
 *
 * CHROME (feat/tactic-workspace): the prototype `TacticWorkspace` look — a left rail
 * (phase selector + how-to + setup status + draw toggle) beside the horizontal field
 * on wide (landscape ≥720), a coach/player READ-ONLY variant (no tools, canvas not
 * editable), and the EXISTING phone layout left byte-identical. The CAPTURE ENGINE,
 * the draw/handler logic, and the SAVE (updateLayoutTactic payload) are unchanged —
 * this restyles the chrome around them. Prod's real interaction model (always-on
 * place-player + per-player floating toolbar for runner/shot + freehand drawMode) is
 * preserved verbatim; the prototype's 4 mutually-exclusive canvas "tools" do NOT map
 * onto it (see NIGHT_QUESTIONS Q2) and are deliberately NOT invented here.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Eye, Info } from 'lucide-react';

import InteractiveCanvas from '../components/canvas/InteractiveCanvas';
import DrawingOverlay from '../components/canvas/DrawingOverlay';
import DrawToolbar from '../components/canvas/DrawToolbar';
import ShotDrawer from '../components/ShotDrawer';
import QuickShotPanel from '../components/QuickShotPanel';
import StageSwitcher from '../components/match/StageSwitcher';
import PageHeader from '../components/PageHeader';
import { Btn, EmptyState, SectionLabel } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useViewAs } from '../hooks/useViewAs';
import { canEditTactics } from '../utils/roleUtils';
import useCaptureDraft from '../hooks/useCaptureDraft';
import { TACTIC_PHASE_KEYS, tacticDocToPhases, tacticDocToAnnotations, tacticStateToDoc } from '../utils/tacticDoc';
import { label as phaseLabelFn } from '../utils/pointPhases';
import { resolveZones } from '../utils/layoutZones';
import * as ds from '../services/dataService';
import { COLORS, ELEV, FONT, FONT_SIZE, SPACE, TNUM } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';
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
        <Btn variant="accent" onClick={() => navigate(`/layout/${layoutId}/tactics`)}>‹ {t('tactic_editor_back_board')}</Btn>
      </div>
    );
  }
  // key remounts (re-seeds the lazy-init hook) when switching tactics.
  return <TacticEditorInner key={tacticId} layout={layout} layoutId={layoutId} tacticId={tacticId} tactic={tactic} />;
}

function TacticEditorInner({ layout, layoutId, tacticId, tactic }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const device = useDevice();
  const { effectiveRoles } = useViewAs();
  // canEdit — coach/admin draw; player (and any non-coach) view READ-ONLY (the
  // prototype's two-role split). canEditTactics = admin || coach (§ 38 capability).
  const canEdit = canEditTactics(effectiveRoles);
  // Wide = landscape tablet/desktop (prototype breakpoint 720). Phone/portrait
  // keeps the EXISTING stacked chrome byte-identical (additive constraint).
  const wide = device.width >= 720 && !device.isPortrait;

  // This screen KEEPS its chrome (header + phase spine + bottom bar), unlike the
  // immersive MatchPage. So the field must fit the AVAILABLE (flex-slot) height, NOT
  // window.innerHeight. Measure the field wrapper; 'fit' (contain) then keeps the
  // field inside BOTH its width and that height — no downward spill over the bar.
  const fieldWrapRef = useRef(null);
  const [fieldH, setFieldH] = useState(0);
  useEffect(() => {
    const el = fieldWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setFieldH(el.clientHeight));
    ro.observe(el);
    setFieldH(el.clientHeight);
    return () => ro.disconnect();
  }, []);

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

  // SAVE — byte-identical to the prior page. Phase data model + updateLayoutTactic
  // payload (tacticStateToDoc) unchanged; the chrome rebuild does not touch it.
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
      alert(t('tactic_save_failed', e.message || t('tactic_save_unknown_error')));
    } finally {
      setSaving(false);
    }
  };

  // ── Derived setup readout (rail only; pure reads off the live draft) ──
  const placed = (eng.draft.players || E5).filter(Boolean).length;
  const runnerCount = (eng.draft.runners || E5B).filter(Boolean).length;
  const shotCount = (eng.draft.shots || []).reduce((n, arr) => n + (arr ? arr.length : 0), 0);
  const phaseLabel = phaseLabelFn(eng.captureStage, t);

  // ── Canvas — ONE instance config consumed by BOTH layouts (phone + wide) so
  //    the capture wiring stays identical. drawMode disables the place/shot
  //    handlers (the freehand arbiter takes over). Read-only (non-coach): the
  //    canvas is non-editable and the capture handlers are detached. ──
  const canvasEditable = canEdit && !eng.drawMode;
  const canvasEl = (
    <InteractiveCanvas
      fieldImage={field.fieldImage}
      sizingStrategy="fit"
      maxCanvasHeight={fieldH || undefined}
      players={eng.draft.players} shots={eng.draft.shots} bumpStops={eng.draft.bumps}
      eliminations={E5B} eliminationPositions={E5}
      runners={eng.draft.runners || []}
      quickShots={eng.draft.quickShots || []}
      obstacleShots={eng.draft.obstacleShots || []}
      calloutZoneShots={eng.draft.zoneShots || []}
      calloutObstacleShots={eng.draft.zoneObstacleShots || []}
      zones={zones}
      doritoSide={field.doritoSide}
      onPlacePlayer={canvasEditable ? eng.handlePlacePlayer : undefined}
      onMovePlayer={canvasEditable ? eng.handleMovePlayer : undefined}
      onPlaceShot={canvasEditable ? eng.handlePlaceShot : undefined}
      onDeleteShot={canvasEditable ? eng.handleDeleteShot : undefined}
      onSelectPlayer={canvasEditable ? eng.handleSelectPlayer : undefined}
      onEmptyTap={() => { if (eng.quickShotPlayer != null) eng.setQuickShotPlayer(null); }}
      onBumpPlayer={canvasEditable ? ((idx, fromPos) => { eng.pushUndo(); eng.setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = { x: fromPos.x, y: fromPos.y }; return n; }); }) : undefined}
      onMoveBumpStop={canvasEditable ? ((idx, pos) => eng.setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; if (n.bumps[idx]) n.bumps[idx] = { ...n.bumps[idx], x: pos.x, y: pos.y }; return n; })) : undefined}
      editable={canvasEditable}
      selectedPlayer={canvasEditable ? eng.selPlayer : null}
      mode={eng.mode}
      toolbarPlayer={canvasEditable ? eng.toolbarPlayer : null}
      toolbarItems={eng.toolbarItems}
      onToolbarAction={eng.handleToolbarAction}
      bunkers={field.bunkers} showBunkers={false} showZones={false}
      fieldCalibration={field.fieldCalibration}
      discoLine={0} zeekerLine={0}
      drawMode={canEdit && eng.drawMode}
      onDrawStart={eng.handleDrawStart}
      onDrawMove={eng.handleDrawMove}
      onDrawEnd={eng.handleDrawEnd}
      onDrawAbort={eng.handleDrawAbort}
    >
      {canEdit && eng.drawMode && <DrawingOverlay strokes={eng.activeAnnotations} currentStroke={eng.currentStroke} />}
    </InteractiveCanvas>
  );

  // Draw toolbar + quick-shot panel — only meaningful when editing.
  const drawToolbarEl = canEdit && eng.drawMode ? (
    <DrawToolbar
      color={eng.drawColor} onColorChange={eng.setDrawColor}
      sizeKey={eng.drawSizeKey} onSizeChange={eng.setDrawSizeKey}
      eraserActive={eng.eraserMode} onEraserToggle={eng.setEraserMode}
      canUndo={eng.activeAnnotations.length > 0} canRedo={eng.redoStack.length > 0}
      hasStrokes={eng.activeAnnotations.length > 0}
      onUndo={eng.handleDrawUndo} onRedo={eng.handleDrawRedo} onClear={eng.handleDrawClear}
      onDone={eng.exitDrawMode}
    />
  ) : null;

  const quickShotPanelEl = canEdit ? (
    <QuickShotPanel
      unified
      visible={eng.quickShotPlayer != null}
      playerIndex={eng.quickShotPlayer}
      playerLabel={eng.quickShotPlayer != null ? `Player ${eng.quickShotPlayer + 1}` : ''}
      selectedZones={eng.quickShotPlayer != null ? (eng.draft.quickShots?.[eng.quickShotPlayer] || []) : []}
      calloutZones={zones}
      fieldImage={field.fieldImage}
      selectedCallout={eng.quickShotPlayer != null ? (eng.draft.zoneShots?.[eng.quickShotPlayer] || []) : []}
      stageLabel={phaseLabel}
      onToggleZone={eng.handleToggleQuickZone}
      onPrecise={eng.handleQuickShotPrecise}
      onClose={() => eng.setQuickShotPlayer(null)}
    />
  ) : null;

  const shotDrawerEl = canEdit ? (
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
  ) : null;

  // ── Phase selector — prod's REAL phases (StageSwitcher data model), styled as
  //    the prototype's segmented bar. Shared by edit + read-only. ──
  const phaseSelector = (
    <div>
      <SectionLabel>{t('tactic_phase_label')}</SectionLabel>
      <StageSwitcher stage={eng.captureStage} onChange={eng.switchStage} done={eng.stageDone} stages={stages} wrap />
    </div>
  );

  // ── WIDE (landscape ≥720) — left rail + horizontal field, prototype look. ──
  if (wide) {
    return (
      <div data-testid="tactic-editor-loaded" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: ELEV.bg, fontFamily: FONT }}>
        <PageHeader
          back={{ to: `/layout/${layoutId}/tactics` }}
          title={tactic.name || t('tactic_title_fallback')}
          subtitle={(canEdit ? t('tactic_role_coach') : t('tactic_role_viewer')).toUpperCase()}
          badges={(
            <span style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 800,
              color: canEdit ? COLORS.accent : COLORS.info,
              background: (canEdit ? COLORS.accent : COLORS.info) + '1c',
              border: `1px solid ${(canEdit ? COLORS.accent : COLORS.info)}44`,
              borderRadius: 999, padding: '4px 10px',
            }}>{canEdit ? t('tactic_role_coach') : t('tactic_role_viewer')}</span>
          )}
        />
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Left rail — phase selector + (edit) how-to + setup status + draw toggle */}
          <div className="rd-scroll" style={{ width: 348, flexShrink: 0, borderRight: `1px solid ${ELEV.hairlineStrong}`, background: ELEV.sunken, overflowY: 'auto', padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
            <RailCard>{phaseSelector}</RailCard>

            {canEdit ? (
              <>
                <RailCard>
                  <SectionLabel>{t('tactic_howto_label')}</SectionLabel>
                  <p style={{ margin: 0, fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 1.45 }}>{t('tactic_howto_body')}</p>
                </RailCard>

                <RailCard>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.sm }}>
                    <SectionLabel>{t('tactic_setup_label')}</SectionLabel>
                    <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: placed === 5 ? COLORS.success : COLORS.accent, ...TNUM }}>{placed}/5</span>
                  </div>
                  <SetupRow label={t('tactic_setup_runners')} value={runnerCount} color={COLORS.info} />
                  <SetupRow label={t('tactic_setup_shots')} value={shotCount} color={COLORS.danger} />
                </RailCard>

                {!eng.drawMode && (
                  <Btn variant="default" testId="tactic-editor-draw" onClick={eng.enterDrawMode}
                    style={{ width: '100%', padding: '12px', fontSize: FONT_SIZE.base, fontWeight: 700, gap: 8 }}>
                    <Pencil size={18} strokeWidth={2.25} /> {t('tactic_draw_freehand')}
                  </Btn>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.sm, padding: '11px 13px', borderRadius: 11, background: COLORS.info + '11', border: `1px solid ${COLORS.info}33` }}>
                  <span style={{ color: COLORS.info, display: 'flex', marginTop: 1 }}><Eye size={15} /></span>
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, lineHeight: 1.45 }}>{t('tactic_readonly_banner')}</span>
                </div>
                <RailCard>
                  <SectionLabel>{phaseLabel}</SectionLabel>
                  <SetupRow label={t('tactic_setup_players')} value={`${placed}/5`} color={COLORS.text} />
                  <SetupRow label={t('tactic_setup_runners')} value={runnerCount} color={COLORS.text} />
                  <SetupRow label={t('tactic_setup_shots')} value={shotCount} color={COLORS.danger} />
                </RailCard>
              </>
            )}
          </div>

          {/* Field hero */}
          <div ref={fieldWrapRef} data-testid="tactic-editor-field" style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: ELEV.bg }}>
            {canvasEl}
            {drawToolbarEl}
            {quickShotPanelEl}
          </div>
        </div>

        {/* Save bar — coach only */}
        {canEdit && (
          <div style={{ padding: '10px 16px', background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
            <Btn variant={savedFlash ? 'default' : 'accent'} testId="tactic-editor-save"
              style={{ minWidth: 220, padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700,
                ...(savedFlash ? { background: COLORS.success + '20', borderColor: COLORS.success, color: COLORS.success } : {}) }}
              onClick={handleSave} disabled={saving}>
              {saving ? t('tactic_saving') : savedFlash ? t('tactic_saved') : t('tactic_save')}
            </Btn>
          </div>
        )}
        {shotDrawerEl}
      </div>
    );
  }

  // ── PHONE / portrait — EXISTING stacked chrome (byte-identical engine wiring),
  //    plus the read-only gate (non-coach hides the draw + save bar). ──
  return (
    <div data-testid="tactic-editor-loaded" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PageHeader
        back={{ to: `/layout/${layoutId}/tactics` }}
        title={tactic.name || t('tactic_title_fallback')}
        subtitle={(layout?.name || t('tactic_back_layout')).toUpperCase()}
      />
      {/* Phase spine — positional phases, NO outcome node */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 8px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg, flexShrink: 0 }}>
        <StageSwitcher stage={eng.captureStage} onChange={eng.switchStage} done={eng.stageDone} stages={stages} />
      </div>

      {/* Read-only hint — non-coach roles */}
      {!canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: '8px 12px', background: COLORS.info + '11', borderBottom: `1px solid ${COLORS.info}33`, flexShrink: 0 }}>
          <Info size={14} style={{ color: COLORS.info, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, lineHeight: 1.4 }}>{t('tactic_readonly_banner')}</span>
        </div>
      )}

      {/* Canvas — bounded to THIS wrapper's available height (chrome stays visible) */}
      <div ref={fieldWrapRef} data-testid="tactic-editor-field" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        {canvasEl}
        {drawToolbarEl}
        {quickShotPanelEl}
      </div>

      {/* Bottom bar — draw toggle + Save (coach only) */}
      {canEdit && (
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
            {saving ? t('tactic_saving') : savedFlash ? t('tactic_saved') : t('tactic_save')}
          </Btn>
        </div>
      )}

      {shotDrawerEl}
    </div>
  );
}

// ── Rail card — resting surface tile (premium elevation language). ──
function RailCard({ children, style }) {
  return (
    <div style={{
      background: ELEV.surface, border: `1px solid ${ELEV.hairline}`,
      borderRadius: 12, padding: SPACE.md, boxShadow: ELEV.shadow1, ...style,
    }}>{children}</div>
  );
}

// ── Setup readout row (label · value). ──
function SetupRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, padding: '3px 0' }}>
      <span style={{ color: COLORS.textMuted }}>{label}</span>
      <span style={{ color: color || COLORS.text, fontWeight: 700, ...TNUM }}>{value}</span>
    </div>
  );
}
