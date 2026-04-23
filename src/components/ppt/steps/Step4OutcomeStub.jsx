import React from 'react';
import { Btn } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';

/**
 * Step 4 — outcome picker. CHECKPOINT 3 STUB. Real 3-card layout with
 * default-colored semantic outcomes (alive green, 2× elim red) lands in
 * Checkpoint 4. For now three buttons dispatch the same outcomes so the
 * routing matrix (§ 48.4 — elim_midgame → Step 4b, else → Step 5) is
 * walkable.
 */
const OUTCOMES = [
  { slug: 'alive',         labelKey: 'ppt_outcome_alive',         color: 'success' },
  { slug: 'elim_break',    labelKey: 'ppt_outcome_elim_break',    color: 'danger'  },
  { slug: 'elim_midgame',  labelKey: 'ppt_outcome_elim_midgame',  color: 'danger'  },
];

export default function Step4OutcomeStub({ state, advance }) {
  const { t } = useLanguage();
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step4_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {t('ppt_stub_checkpoint_4')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OUTCOMES.map(o => {
          const selected = state.outcome === o.slug;
          const accent = o.color === 'success' ? COLORS.success : COLORS.danger;
          return (
            <div key={o.slug}
              onClick={() => advance({ outcome: o.slug })}
              role="button"
              style={{
                minHeight: 84,
                borderRadius: RADIUS.lg,
                border: `2px solid ${selected ? accent : `${accent}55`}`,
                background: `${accent}0e`,
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: `2px solid ${accent}`,
                background: `${accent}26`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: accent, fontFamily: FONT, fontWeight: 800, fontSize: 18,
                flexShrink: 0,
              }}>·</div>
              <div style={{
                fontFamily: FONT, fontSize: 17, fontWeight: 800,
                color: accent, letterSpacing: '-0.2px',
              }}>
                {t(o.labelKey)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
