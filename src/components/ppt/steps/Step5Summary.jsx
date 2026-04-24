import React from 'react';
import { Check } from 'lucide-react';
import { Btn, SideTag } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';

/**
 * Step 5 — summary. See DESIGN_DECISIONS § 48.3 Step 5.
 *
 * Single card with four tappable rows. Each row jumps back to its
 * source step with state preserved (user sees current values, can
 * modify, re-enters summary via normal routing). Jump-target for the
 * "Strzały" row depends on variant — skip-shots variants never visit
 * Step 3, so tap-to-edit has to land on Step 2 where variant is
 * chosen (changing variant is the only way to toggle shots on/off).
 *
 * Sticky amber "Zapisz punkt" CTA (64px) fires onSave, which
 * WizardShell wires to createSelfReport + offline-queue fallback +
 * navigate to today's logs list.
 */
const SKIP_SHOTS = ['na-wslizgu', 'na-okretke'];

function variantLabel(variant, t) {
  if (!variant) return '—';
  const key = `ppt_variant_${variant.replace(/-/g, '_')}`;
  return t(key) || variant;
}

function detailLabel(slug, t) {
  if (!slug) return '';
  const key = `ppt_detail_${slug.replace(/-/g, '_')}`;
  return t(key) || slug;
}

function outcomeLabel(slug, t) {
  if (!slug) return '';
  return t(`ppt_outcome_${slug}`) || slug;
}

export default function Step5Summary({ state, jumpTo, onSave }) {
  const { t } = useLanguage();
  const skipShots = SKIP_SHOTS.includes(state.variant);
  const rows = [
    {
      label: t('ppt_row_breakout'),
      value: state.breakout ? (
        <>
          <SideTag side={state.breakout.side} /> <span>{state.breakout.bunker}</span>
        </>
      ) : '—',
      onTap: () => jumpTo(1),
    },
    {
      label: t('ppt_row_variant'),
      value: variantLabel(state.variant, t),
      onTap: () => jumpTo(2),
    },
    {
      label: t('ppt_row_shots'),
      value: skipShots ? (
        <em style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>
          {t('ppt_shots_skipped', variantLabel(state.variant, t))}
        </em>
      ) : (state.shots || []).length === 0 ? (
        <em style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>
          {t('ppt_shots_none')}
        </em>
      ) : (
        <>
          <SideTag side={state.shots[0].side} /> <span>{state.shots.map(s => s.bunker).join(' → ')}</span>
        </>
      ),
      // Skip-shots variants never touched Step 3; editing means changing
      // variant at Step 2.
      onTap: () => jumpTo(skipShots ? 2 : 3),
    },
    {
      label: t('ppt_row_outcome'),
      value: state.outcome ? (
        <span>
          {outcomeLabel(state.outcome, t)}
          {state.outcomeDetail && (
            state.outcomeDetail === 'inne' && state.outcomeDetailText
              ? ` · "${state.outcomeDetailText}"`
              : ` · ${detailLabel(state.outcomeDetail, t)}`
          )}
        </span>
      ) : '—',
      // Outcome edit lands on Step 4 by default; if the user committed a
      // detail (elim_midgame branch) jump to 4b so they land on the detail
      // picker, not the outcome picker (saves a tap).
      onTap: () => jumpTo(state.outcomeDetail ? '4b' : 4),
    },
  ];

  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step5_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {t('ppt_step5_hint')}
      </div>

      <div style={{
        borderRadius: RADIUS.lg,
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        padding: SPACE.lg,
        display: 'flex', flexDirection: 'column', gap: 14,
        marginBottom: SPACE.lg,
      }}>
        {rows.map((r, i) => (
          <div
            key={i}
            onClick={r.onTap}
            role="button"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, minHeight: 44,
              paddingBottom: i < rows.length - 1 ? 12 : 0,
              borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase',
              color: COLORS.textMuted, flexShrink: 0,
            }}>
              {r.label}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
              color: COLORS.text, textAlign: 'right',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, minWidth: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              justifyContent: 'flex-end',
            }}>
              {r.value}
            </div>
          </div>
        ))}
      </div>

      {/* Spacer reserves room under the fixed footer — see Step 3. */}
      <div aria-hidden style={{ height: 120 }} />

      {/* Sticky "Zapisz punkt" CTA — pinned to viewport bottom per § 48.3
          spec. Matches the Step 3 Dalej pattern from the 2026-04-24 PPT
          follow-up (position:fixed + safe-area + gradient fade). */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        paddingBottom: `calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: `linear-gradient(180deg, rgba(8,12,20,0) 0%, ${COLORS.bg} 30%)`,
        zIndex: 20,
      }}>
        <Btn variant="accent" onClick={onSave}
          style={{ width: '100%', minHeight: 64, fontSize: 17, fontWeight: 800, gap: 10 }}>
          <Check size={20} strokeWidth={2.8} /> {t('ppt_step5_save')}
        </Btn>
      </div>
    </div>
  );
}
