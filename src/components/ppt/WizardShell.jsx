import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { Btn, ConfirmModal } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import Step1Breakout from './steps/Step1Breakout';
import Step2Variant from './steps/Step2Variant';
import Step3Shots from './steps/Step3Shots';
import Step4Outcome from './steps/Step4Outcome';
import Step4bDetail from './steps/Step4bDetail';
import Step5Summary from './steps/Step5Summary';
import {
  createSelfReport,
  createPendingSelfReport,
} from '../../services/playerPerformanceTrackerService';
import { queuePending } from '../../services/pptPendingQueue';
import { clearActiveTraining } from '../../utils/pptActiveTraining';

/**
 * WizardShell — 5-step PPT state machine + chrome.
 * See DESIGN_DECISIONS § 48.3 (steps) and § 48.4 (routing matrix).
 *
 * Renders:
 *   - Header (back chevron, "Krok N z M", exit, progress bar)
 *   - Training pill (live dot + name + "#N pkt dziś")
 *   - Current step body
 *   - Exit confirm modal
 *
 * State machine:
 *   currentStep ∈ { 1, 2, 3, 4, '4b', 5 }
 *   Per-step state fields: breakout / variant / shots / outcome /
 *     outcomeDetail / outcomeDetailText.
 *   Routing per § 48.4:
 *     - Step 1 → 2
 *     - Step 2 → 3 if variant ∈ {late-break, ze-strzelaniem}, else 4
 *     - Step 3 → 4
 *     - Step 4 → 4b if outcome === 'elim_midgame', else 5
 *     - Step 4b → 5
 *     - Step 5 → save + navigate away
 *   totalSteps M is 5 for shot-requiring variants and 4 for skip-shots ones,
 *   default 5 before variant is chosen. 4b doesn't count toward M — it's a
 *   conditional detail of Step 4 and keeps the "Krok 4" label.
 *
 * localStorage persistence (§ 48.8):
 *   Key `ppt_wizard_state_{playerId}`. On every state change we rewrite;
 *   on mount we try to rehydrate if the snapshot is < 10 min old and
 *   targets the same trainingId. Older / mismatched snapshots are dropped.
 *
 * Checkpoint 3 scope: Steps 1 + 2 are real; 3, 4, 4b, 5 are stubs that
 * still show the wizard chrome and advance through routing so Jacek can
 * validate the 5-step flow end-to-end. Real step bodies land in
 * Checkpoints 4 + 5.
 */

const PERSIST_TTL_MS = 10 * 60 * 1000;
const SKIP_SHOTS = ['na-wslizgu', 'na-okretke'];

function persistKey(playerId) {
  return `ppt_wizard_state_${playerId || 'anon'}`;
}

function loadPersisted(playerId, trainingId) {
  try {
    const raw = localStorage.getItem(persistKey(playerId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.updatedAt || Date.now() - data.updatedAt > PERSIST_TTL_MS) return null;
    if (data.trainingId !== trainingId) return null;
    return data;
  } catch {
    return null;
  }
}

function savePersisted(playerId, state) {
  try {
    localStorage.setItem(persistKey(playerId), JSON.stringify({
      ...state,
      updatedAt: Date.now(),
    }));
  } catch { /* quota, private mode — non-fatal */ }
}

function clearPersisted(playerId) {
  try { localStorage.removeItem(persistKey(playerId)); } catch { /* non-fatal */ }
}

function initialState(trainingId) {
  return {
    currentStep: 1,
    breakout: null,
    variant: null,
    shots: null,
    outcome: null,
    outcomeDetail: null,
    outcomeDetailText: null,
    trainingId,
  };
}

/**
 * Compute the display number for a step (§ 48.3 "Krok N z M"). Step 4b
 * shares a number with Step 4 since it's a detail branch. Skip-shots
 * variants collapse the numbering to 4 slots.
 */
function displayStep(step, variant) {
  const skipShots = SKIP_SHOTS.includes(variant);
  if (step === 1) return 1;
  if (step === 2) return 2;
  if (step === 3) return 3;
  if (step === 4 || step === '4b') return skipShots ? 3 : 4;
  if (step === 5) return skipShots ? 4 : 5;
  return 1;
}

function totalStepsFor(variant) {
  return SKIP_SHOTS.includes(variant) ? 4 : 5;
}

function hasDirtyData(state) {
  return !!(state.breakout || state.variant || state.shots || state.outcome || state.outcomeDetail);
}

export default function WizardShell({ training, layout, playerId, uid, todaysPointsCount = 0, backTo = '/player/log' }) {
  // Unlinked mode (2026-04-24): if no playerId, fall back to the uid
  // path. createPendingSelfReport writes to /workspaces/{slug}/
  // pendingSelfReports keyed by uid; onPlayerLinked migrates them on
  // link. Pickers stay in bootstrap mode (no player history aggregation
  // available without a player doc).
  const scopeId = playerId || uid;
  const isLinked = !!playerId;
  const pendingMode = isLinked ? 'player' : 'uid';
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [state, setState] = useState(() =>
    loadPersisted(playerId, training?.id) || initialState(training?.id)
  );
  // exitConfirm: null = closed; 'leave' = user is exiting the wizard;
  // 'change-training' = user is changing the sticky training (pill tap).
  // The two paths share the same confirm UI but route differently after.
  const [exitConfirm, setExitConfirm] = useState(null);
  // Local pill counter — bumped after each successful save so the user gets
  // immediate "#N pkt dziś" feedback without waiting for the parent to
  // re-fetch. Seeded from the parent prop on mount.
  const [localCount, setLocalCount] = useState(todaysPointsCount);
  useEffect(() => { setLocalCount(todaysPointsCount); }, [todaysPointsCount]);
  // Inline save toast — replaces TodaysLogsList's toast since the post-save
  // flow now stays in the wizard. Auto-dismiss after 2.5s.
  const [saveToast, setSaveToast] = useState(null);
  useEffect(() => {
    if (!saveToast) return;
    const tm = setTimeout(() => setSaveToast(null), 2500);
    return () => clearTimeout(tm);
  }, [saveToast]);
  // Direction: 'forward' slides new step in from the right (100ms).
  // 'backward' slides it in from the left. Default forward.
  const [slideDir, setSlideDir] = useState('forward');
  const stepEnterKey = useRef(0);

  useEffect(() => {
    savePersisted(playerId, state);
  }, [playerId, state]);

  const total = totalStepsFor(state.variant);
  const display = displayStep(state.currentStep, state.variant);
  const progressPct = Math.round((display / total) * 100);

  // Advance helpers — merge new fields + compute the next step via § 48.4.
  const advance = useCallback((partial) => {
    setSlideDir('forward');
    stepEnterKey.current += 1;
    setState(prev => {
      const next = { ...prev, ...partial };
      const cur = prev.currentStep;
      let target = cur;
      if (cur === 1) target = 2;
      else if (cur === 2) {
        target = SKIP_SHOTS.includes(next.variant) ? 4 : 3;
      } else if (cur === 3) target = 4;
      else if (cur === 4) {
        // § 54.3 amendment (2026-04-29): reason capture window covers
        // ALL elim outcomes (break / midgame / endgame), not just midgame.
        const isElim = next.outcome && next.outcome !== 'alive';
        target = isElim ? '4b' : 5;
      } else if (cur === '4b') target = 5;
      return { ...next, currentStep: target };
    });
  }, []);

  // Mid-step merge — updates state without triggering a step transition or
  // slide animation. Used by Step 3 (shot toggles accumulate before "Dalej"
  // fires the real advance) and Step 4b (inne textarea typing updates
  // outcomeDetailText while the step stays put). Distinct from advance so
  // that re-entering Step 3 after a back-nav doesn't re-animate on every
  // keystroke.
  const patch = useCallback((partial) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const goBack = useCallback(() => {
    setSlideDir('backward');
    stepEnterKey.current += 1;
    setState(prev => {
      const cur = prev.currentStep;
      let target = cur;
      if (cur === 1) return prev; // handled via exit-confirm below
      if (cur === 2) target = 1;
      else if (cur === 3) target = 2;
      else if (cur === 4) target = SKIP_SHOTS.includes(prev.variant) ? 2 : 3;
      else if (cur === '4b') target = 4;
      else if (cur === 5) {
        // Summary back lands on the last *data* step — 4b if there was a
        // detail branch, else 4. Step 3 back from summary isn't a path
        // (Step 5 always follows 4 or 4b, never 3 directly).
        target = prev.outcomeDetail ? '4b' : 4;
      }
      return { ...prev, currentStep: target };
    });
  }, []);

  // Jump to a specific step from the summary (§ 48.3 Step 5 tappable rows).
  const jumpTo = useCallback((step) => {
    setSlideDir('backward');
    stepEnterKey.current += 1;
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  // `?leave=1` tells the entry page to skip the sticky-training auto-redirect
  // for this one visit so the user can actually exit the wizard. Sticky
  // selection is preserved (next "+ Nowy punkt" tap still skips the picker).
  const exitTo = `${backTo}${backTo.includes('?') ? '&' : '?'}leave=1`;

  const handleBackChevron = useCallback(() => {
    if (state.currentStep === 1) {
      if (hasDirtyData(state)) setExitConfirm('leave');
      else { clearPersisted(playerId); navigate(exitTo); }
    } else {
      goBack();
    }
  }, [state, goBack, playerId, navigate, exitTo]);

  const handleExitButton = useCallback(() => {
    if (hasDirtyData(state)) setExitConfirm('leave');
    else { clearPersisted(playerId); navigate(exitTo); }
  }, [state, playerId, navigate, exitTo]);

  // Pill is the "Zmień trening" affordance per the 2026-04-24 hotfix —
  // tapping it clears the per-day sticky selection AND forces the picker
  // (?pick=1) so the user can actually choose a different training rather
  // than being auto-bounced back to the same wizard.
  const handleTrainingPillTap = useCallback(() => {
    if (hasDirtyData(state)) {
      setExitConfirm('change-training');
    } else {
      clearActiveTraining();
      clearPersisted(playerId);
      navigate('/player/log?pick=1');
    }
  }, [state, playerId, navigate]);

  const confirmExit = useCallback(() => {
    clearPersisted(playerId);
    if (exitConfirm === 'change-training') {
      clearActiveTraining();
      setExitConfirm(null);
      navigate('/player/log?pick=1');
    } else {
      setExitConfirm(null);
      navigate(exitTo);
    }
  }, [playerId, navigate, exitTo, exitConfirm]);

  // Save flow per § 48.8 + 2026-04-24 sticky-training hotfix:
  //   primary path → createSelfReport → inline toast "Zapisany punkt #N"
  //   offline path → queuePending + inline toast "Zapisany lokalnie…"
  // The wizard now stays in place after save (sticky training behavior) —
  // state resets to Step 1, the local pill counter bumps, and an inline
  // toast confirms. No navigation, so the next point is one tap away
  // (15s game-time budget per § 48). Persisted wizard state is cleared
  // either way since the save is terminal.
  const handleSave = useCallback(async () => {
    if (!scopeId) return;
    const payload = {
      layoutId: layout?.id || null,
      trainingId: training?.id || null,
      teamId: training?.teamId || null,
      breakout: state.breakout ? { ...state.breakout, variant: state.variant } : null,
      // null when skip-shots variant bypassed Step 3; [] or populated
      // otherwise (§ 48.5 schema).
      shots: SKIP_SHOTS.includes(state.variant) ? null : (state.shots || []),
      outcome: state.outcome,
      outcomeDetail: state.outcomeDetail || null,
      outcomeDetailText: state.outcomeDetailText || null,
    };
    // Defensive — shouldn't be reachable with proper routing but guards
    // against refresh-mid-summary edge cases where state is partial.
    if (!payload.breakout?.bunker || !payload.outcome) return;

    const nextCount = localCount + 1;
    let toastType = 'saved';
    try {
      if (isLinked) {
        await createSelfReport(playerId, payload);
      } else {
        await createPendingSelfReport(uid, payload);
      }
    } catch (err) {
      queuePending(scopeId, payload, pendingMode);
      toastType = 'offline';
    }
    clearPersisted(playerId);
    setLocalCount(nextCount);
    setSlideDir('forward');
    stepEnterKey.current += 1;
    setState(initialState(training?.id));
    setSaveToast({ type: toastType, n: nextCount });
  }, [scopeId, isLinked, playerId, uid, layout, training, state, localCount, pendingMode]);

  // Step body — stubs (3, 4, 4b, 5) still let advancing work so we can
  // walk the full routing matrix end-to-end in Checkpoint 3. Real bodies
  // ship in Checkpoints 4 + 5.
  const stepBody = useMemo(() => {
    const shared = { state, advance, patch, layout, training, playerId };
    switch (state.currentStep) {
      case 1: return <Step1Breakout {...shared} />;
      case 2: return <Step2Variant {...shared} />;
      case 3: return <Step3Shots {...shared} />;
      case 4: return <Step4Outcome {...shared} />;
      case '4b': return <Step4bDetail {...shared} />;
      case 5: return <Step5Summary {...shared} jumpTo={jumpTo} onSave={handleSave} />;
      default: return null;
    }
  }, [state, advance, patch, layout, training, playerId, jumpTo, handleSave]);

  const trainingName = training?.name || t('tab_training') || 'Trening';

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header — sticky, shared across steps. */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: COLORS.bg,
        padding: '8px 16px 12px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12, marginBottom: 12,
        }}>
          <div
            onClick={handleBackChevron}
            role="button"
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: COLORS.accent,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </div>
          <div style={{
            flex: 1, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
            color: COLORS.text,
          }}>
            <span style={{
              color: COLORS.textMuted, fontSize: 11, fontWeight: 600,
              letterSpacing: 0.4, textTransform: 'uppercase', marginRight: 4,
            }}>{t('ppt_step_label')}</span>
            {display}
            <span style={{ color: COLORS.textMuted }}> {t('ppt_step_of')} {total}</span>
          </div>
          <div
            onClick={handleExitButton}
            role="button"
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: COLORS.textDim,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <X size={20} strokeWidth={2.5} />
          </div>
        </div>
        <div style={{
          height: 6, borderRadius: RADIUS.full,
          background: COLORS.surfaceDark, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%',
            background: COLORS.accentGradient,
            boxShadow: '0 0 8px rgba(245,158,11,0.4)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Training pill — below header. Doubles as the "Zmień trening"
          affordance per the 2026-04-24 sticky-training hotfix: tap to clear
          today's selection and return to the picker. Discreet styling per
          § 27 (no second amber CTA competing with the step CTA). The pill
          itself is the 44px tap area; the trailing "Zmień" label is a hint
          rather than a separate touch target. */}
      <div
        onClick={handleTrainingPillTap}
        role="button"
        aria-label={t('ppt_pill_change_aria') || 'Zmień trening'}
        style={{
          margin: `${SPACE.sm}px ${SPACE.lg}px 0`,
          padding: '10px 14px',
          minHeight: 44,
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.md,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
          color: COLORS.textMuted,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: training?.status === 'live' ? COLORS.success : COLORS.textDim,
          boxShadow: training?.status === 'live' ? '0 0 4px rgba(34,197,94,0.6)' : 'none',
          flexShrink: 0,
        }} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {t('ppt_pill_prefix')} {trainingName}
        </span>
        <span style={{ color: COLORS.accent, fontWeight: 800 }}>
          #{localCount}
        </span>
        <span style={{ color: COLORS.textMuted }}>
          {t('ppt_pill_suffix')}
        </span>
        <span style={{
          marginLeft: 6,
          paddingLeft: 8,
          borderLeft: `1px solid ${COLORS.border}`,
          color: COLORS.textDim,
          fontSize: 11, fontWeight: 700,
          letterSpacing: 0.3, textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {t('ppt_pill_change') || 'Zmień'}
        </span>
      </div>

      {/* Unlinked banner (PPT 2026-04-24 unlinked-mode). Shown when the
          user hasn't linked a player yet — logs go to pendingSelfReports
          and migrate on link. Tap-through to /profile is the discreet
          CTA; we deliberately don't make it amber so it doesn't compete
          with the step's own CTA. */}
      {!isLinked && (
        <div
          onClick={() => navigate('/profile')}
          role="button"
          style={{
            margin: `${SPACE.sm}px ${SPACE.lg}px 0`,
            padding: '10px 14px',
            minHeight: 44,
            background: 'rgba(245,158,11,0.08)',
            border: `1px solid rgba(245,158,11,0.25)`,
            borderRadius: RADIUS.md,
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span aria-hidden style={{ fontSize: 14, flexShrink: 0 }}>🧩</span>
          <span style={{
            flex: 1,
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
            color: COLORS.text, lineHeight: 1.4,
          }}>
            {t('ppt_unlinked_banner') || 'Logujesz bez profilu — punkty trafią do gracza po połączeniu.'}
          </span>
          <span style={{
            color: COLORS.accent, fontSize: 11, fontWeight: 800,
            letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 0,
          }}>
            {t('ppt_unlinked_banner_cta') || 'Połącz'}
          </span>
        </div>
      )}

      {/* Step body — slides in 100ms. stepEnterKey forces re-mount so the
          CSS transition re-runs each transition. */}
      <div
        key={stepEnterKey.current}
        style={{
          flex: 1,
          padding: `${SPACE.lg}px ${SPACE.lg}px 80px`,
          animation: `ppt-slide-${slideDir} 100ms ease-out`,
        }}
      >
        {stepBody}
      </div>

      {/* Local animation keyframes — injected once per render, idempotent. */}
      <style>{`
        @keyframes ppt-slide-forward {
          from { transform: translateX(20%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ppt-slide-backward {
          from { transform: translateX(-20%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <ConfirmModal
        open={!!exitConfirm}
        onClose={() => setExitConfirm(null)}
        title={t('ppt_exit_title')}
        message={t('ppt_exit_message')}
        confirmLabel={t('ppt_exit_confirm')}
        danger
        onConfirm={confirmExit}
      />

      {/* Inline save toast — replaces the post-save TodaysLogsList toast
          since the wizard now stays in place after save (sticky-training
          hotfix 2026-04-24). Auto-dismisses via the saveToast effect above. */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 360, width: 'calc(100% - 32px)',
          padding: '12px 16px',
          background: COLORS.surface,
          border: `1px solid ${COLORS.accent}60`,
          borderRadius: RADIUS.lg,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          color: COLORS.text,
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
          textAlign: 'center',
          zIndex: 50,
          pointerEvents: 'none',
        }}>
          {saveToast.type === 'saved'
            ? t('ppt_toast_saved', saveToast.n)
            : t('ppt_toast_saved_offline')}
        </div>
      )}
    </div>
  );
}
