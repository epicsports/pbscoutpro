import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { ConfirmModal } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import Step1Breakout from './steps/Step1Breakout';
import Step2Variant from './steps/Step2Variant';
import Step3Shots from './steps/Step3Shots';
import Step4Outcome from './steps/Step4Outcome';
import Step4bDetail from './steps/Step4bDetail';
import Step5SummaryStub from './steps/Step5SummaryStub';

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

export default function WizardShell({ training, layout, playerId, todaysPointsCount = 0, backTo = '/player/log' }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [state, setState] = useState(() =>
    loadPersisted(playerId, training?.id) || initialState(training?.id)
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);
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
        target = next.outcome === 'elim_midgame' ? '4b' : 5;
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

  const handleBackChevron = useCallback(() => {
    if (state.currentStep === 1) {
      if (hasDirtyData(state)) setShowExitConfirm(true);
      else { clearPersisted(playerId); navigate(backTo); }
    } else {
      goBack();
    }
  }, [state, goBack, playerId, navigate, backTo]);

  const handleExitButton = useCallback(() => {
    if (hasDirtyData(state)) setShowExitConfirm(true);
    else { clearPersisted(playerId); navigate(backTo); }
  }, [state, playerId, navigate, backTo]);

  const confirmExit = useCallback(() => {
    clearPersisted(playerId);
    setShowExitConfirm(false);
    navigate(backTo);
  }, [playerId, navigate, backTo]);

  const handleTrainingPillTap = useCallback(() => {
    // Per § 48.3 training pill tap = confirm → returns to picker + clears state.
    if (hasDirtyData(state)) setShowExitConfirm(true);
    else { clearPersisted(playerId); navigate('/player/log'); }
  }, [state, playerId, navigate]);

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
      case 5: return <Step5SummaryStub {...shared} jumpTo={jumpTo} onSave={confirmExit} />;
      default: return null;
    }
  }, [state, advance, patch, layout, training, playerId, jumpTo, confirmExit]);

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

      {/* Training pill — below header, tappable → exit confirm + picker. */}
      <div
        onClick={handleTrainingPillTap}
        role="button"
        style={{
          margin: `${SPACE.sm}px ${SPACE.lg}px 0`,
          padding: '8px 14px',
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
          #{todaysPointsCount}
        </span>
        <span style={{ color: COLORS.textMuted }}>
          {t('ppt_pill_suffix')}
        </span>
      </div>

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
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title={t('ppt_exit_title')}
        message={t('ppt_exit_message')}
        confirmLabel={t('ppt_exit_confirm')}
        danger
        onConfirm={confirmExit}
      />
    </div>
  );
}
