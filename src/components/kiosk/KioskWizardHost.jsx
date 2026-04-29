import React, { useCallback, useState, useEffect } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import Step1Breakout from '../ppt/steps/Step1Breakout';
import Step2Variant from '../ppt/steps/Step2Variant';
import Step3Shots from '../ppt/steps/Step3Shots';
import Step4Outcome from '../ppt/steps/Step4Outcome';
import Step4bDetail from '../ppt/steps/Step4bDetail';
import Step5Summary from '../ppt/steps/Step5Summary';

/**
 * KioskWizardHost — slim wizard host for KIOSK player verification flow.
 *
 * Composes the same Step1-Step5 PPT components as WizardShell but with:
 *   - No localStorage persistence (KIOSK is per-tap, not resumed across
 *     sessions — coach hands tablet for a single-point fill)
 *   - No exit-confirm modal (back chevron just calls onClose)
 *   - No training pill / today's-points counter (KIOSK lobby provides
 *     player + point context already)
 *   - No slide animations (avoid extra runtime surface area)
 *   - onSave delegates to caller — KIOSK writes to point.shots/ and
 *     point.selfLogs[playerId], NOT players/{pid}/selfReports/ (the
 *     latter is PPT-only per § 35.7).
 *
 * State machine identical to WizardShell.advance/goBack/jumpTo logic, but
 * without the persistence side-effects. Routing per § 48.4 + § 54.3
 * amendment (any elim outcome → Step 4b for reason capture).
 *
 * Brief B Hotfix #4 / Path 2 (2026-04-29): replaces HotSheet from KIOSK
 * lobby per E2 amendment. PPT components reused directly with KIOSK-
 * specific save adapter (passed in as `onSave` prop).
 */

const SKIP_SHOTS = ['na-wslizgu', 'na-okretke'];

function totalStepsFor(variant) {
  return SKIP_SHOTS.includes(variant) ? 4 : 5;
}

function displayStep(step, variant) {
  const skipShots = SKIP_SHOTS.includes(variant);
  if (step === 1) return 1;
  if (step === 2) return 2;
  if (step === 3) return 3;
  if (step === 4 || step === '4b') return skipShots ? 3 : 4;
  if (step === 5) return skipShots ? 4 : 5;
  return 1;
}

function initialState() {
  return {
    currentStep: 1,
    breakout: null,
    variant: null,
    shots: null,
    outcome: null,
    outcomeDetail: null,
    outcomeDetailText: null,
  };
}

export default function KioskWizardHost({
  open,           // bool — when false, host returns null
  layout,         // training layout (passed through to Step1/Step3)
  playerId,       // KIOSK identity override (active player tile tap)
  onClose,        // callback when user dismisses (back chevron on Step 1, X)
  onSave,         // async callback ({state}) — KIOSK adapter writes to point
}) {
  const { t } = useLanguage();
  const [state, setState] = useState(initialState);
  const [saving, setSaving] = useState(false);

  // Reset state when wizard opens fresh (new tile tap)
  useEffect(() => {
    if (open) {
      setState(initialState());
      setSaving(false);
    }
  }, [open]);

  const advance = useCallback((partial) => {
    setState(prev => {
      const next = { ...prev, ...partial };
      const cur = prev.currentStep;
      let target = cur;
      if (cur === 1) target = 2;
      else if (cur === 2) {
        target = SKIP_SHOTS.includes(next.variant) ? 4 : 3;
      } else if (cur === 3) target = 4;
      else if (cur === 4) {
        // § 54.3: any elim → 4b (reason capture); alive → 5 directly.
        const isElim = next.outcome && next.outcome !== 'alive';
        target = isElim ? '4b' : 5;
      } else if (cur === '4b') target = 5;
      return { ...next, currentStep: target };
    });
  }, []);

  const patch = useCallback((partial) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      const cur = prev.currentStep;
      if (cur === 1) {
        // Back from Step 1 — close wizard entirely (KIOSK lobby visible again).
        // Defer onClose to next tick to avoid setState-during-render warnings.
        setTimeout(() => onClose?.(), 0);
        return prev;
      }
      let target = cur;
      if (cur === 2) target = 1;
      else if (cur === 3) target = 2;
      else if (cur === 4) target = SKIP_SHOTS.includes(prev.variant) ? 2 : 3;
      else if (cur === '4b') target = 4;
      else if (cur === 5) target = prev.outcomeDetail ? '4b' : 4;
      return { ...prev, currentStep: target };
    });
  }, [onClose]);

  const jumpTo = useCallback((step) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave?.(state);
      // Caller (KioskLobbyOverlay) clears activePlayerId → unmounts host.
    } catch (e) {
      console.error('KioskWizardHost save failed:', e);
      alert(t('kiosk_wizard_save_failed') || `Błąd zapisu: ${e?.message || 'nieznany'}`);
      setSaving(false);
    }
  }, [state, onSave, saving, t]);

  if (!open) return null;

  const total = totalStepsFor(state.variant);
  const display = displayStep(state.currentStep, state.variant);
  const progressPct = Math.round((display / total) * 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 250,
      background: COLORS.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header — back chevron + step counter + close X */}
      <div style={{
        background: '#0d1117',
        borderBottom: `1px solid ${COLORS.border}`,
        padding: `12px 16px`,
        display: 'flex', alignItems: 'center', gap: 12,
        minHeight: 56, flexShrink: 0,
      }}>
        <div onClick={goBack} style={{
          color: COLORS.accent,
          minWidth: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <ChevronLeft size={24} strokeWidth={2.5} />
        </div>
        <div style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
          {t('ppt_step_counter', display, total) || `Krok ${display} z ${total}`}
        </div>
        <div onClick={onClose} style={{
          color: COLORS.textMuted,
          minWidth: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <X size={20} strokeWidth={2} />
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3, background: COLORS.border, position: 'relative', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(90deg, ${COLORS.accent} 0%, ${COLORS.accent}cc 100%)`,
          width: `${progressPct}%`,
          transition: 'width .2s',
        }} />
      </div>

      {/* Step body — scrollable area */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: SPACE.xl,
        background: COLORS.bg,
      }}>
        {state.currentStep === 1 && (
          <Step1Breakout state={state} advance={advance} layout={layout} playerId={playerId} />
        )}
        {state.currentStep === 2 && (
          <Step2Variant state={state} advance={advance} />
        )}
        {state.currentStep === 3 && (
          <Step3Shots state={state} advance={advance} patch={patch} layout={layout} />
        )}
        {state.currentStep === 4 && (
          <Step4Outcome state={state} advance={advance} />
        )}
        {state.currentStep === '4b' && (
          <Step4bDetail state={state} advance={advance} patch={patch} />
        )}
        {state.currentStep === 5 && (
          <Step5Summary state={state} jumpTo={jumpTo} onSave={handleSave} />
        )}
      </div>
    </div>
  );
}
