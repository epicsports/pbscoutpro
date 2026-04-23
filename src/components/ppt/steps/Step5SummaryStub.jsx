import React from 'react';
import { Check } from 'lucide-react';
import { Btn } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';

/**
 * Step 5 — summary. CHECKPOINT 3 STUB. Real tappable-rows summary + save
 * flow lands in Checkpoint 5. For now the stub renders a read-only echo
 * of the collected state and a disabled "Zapisz punkt" CTA so Jacek can
 * confirm the routing matrix reaches this leaf for every path.
 */
const SKIP_SHOTS = ['na-wslizgu', 'na-okretke'];

function variantLabel(variant, t) {
  if (!variant) return '—';
  const key = `ppt_variant_${variant.replace(/-/g, '_')}`;
  return t(key) || variant;
}

export default function Step5SummaryStub({ state, jumpTo, onSave }) {
  const { t } = useLanguage();
  const rows = [
    {
      label: t('ppt_row_breakout'),
      value: state.breakout ? `${state.breakout.side?.toUpperCase()} · ${state.breakout.bunker}` : '—',
      onTap: () => jumpTo(1),
    },
    {
      label: t('ppt_row_variant'),
      value: variantLabel(state.variant, t),
      onTap: () => jumpTo(2),
    },
    {
      label: t('ppt_row_shots'),
      value: SKIP_SHOTS.includes(state.variant)
        ? t('ppt_shots_skipped', variantLabel(state.variant, t))
        : (state.shots || []).length === 0
          ? t('ppt_shots_none')
          : state.shots.map(s => s.bunker).join(' → '),
      onTap: () => jumpTo(SKIP_SHOTS.includes(state.variant) ? 2 : 3),
    },
    {
      label: t('ppt_row_outcome'),
      value: state.outcome
        ? `${t(`ppt_outcome_${state.outcome}`) || state.outcome}${
            state.outcomeDetail
              ? state.outcomeDetail === 'inne' && state.outcomeDetailText
                ? ` · "${state.outcomeDetailText}"`
                : ` · ${t(`ppt_detail_${state.outcomeDetail.replace(/-/g, '_')}`) || state.outcomeDetail}`
              : ''
          }`
        : '—',
      onTap: () => jumpTo(state.outcome === 'elim_midgame' ? '4b' : 4),
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
          <div key={i}
            onClick={r.onTap}
            role="button"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, minHeight: 44,
              paddingBottom: i < rows.length - 1 ? 12 : 0,
              borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}` : 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
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
            }}>
              {r.value}
            </div>
          </div>
        ))}
      </div>

      <Btn variant="accent"
        onClick={onSave}
        style={{ width: '100%', minHeight: 64, fontSize: 17, fontWeight: 800, gap: 10 }}>
        <Check size={20} strokeWidth={2.8} /> {t('ppt_step5_save')}
      </Btn>
      <div style={{
        marginTop: SPACE.sm, textAlign: 'center',
        fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, fontStyle: 'italic',
      }}>
        {t('ppt_stub_checkpoint_5')}
      </div>
    </div>
  );
}
