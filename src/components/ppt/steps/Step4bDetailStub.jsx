import React from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';

/**
 * Step 4b — elimination detail. CHECKPOINT 3 STUB. Real 6-option list
 * with "Inaczej" inline textarea lands in Checkpoint 4. For now the
 * stub offers the two low-information options (`nie-wiem` auto-advance
 * and `gunfight` as a placeholder concrete choice) so the wizard can be
 * walked through the elim_midgame branch.
 */
const STUB_OPTIONS = [
  { slug: 'gunfight', labelKey: 'ppt_detail_gunfight' },
  { slug: 'nie-wiem', labelKey: 'ppt_detail_nie_wiem' },
];

export default function Step4bDetailStub({ state, advance }) {
  const { t } = useLanguage();
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step4b_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {t('ppt_stub_checkpoint_4')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STUB_OPTIONS.map(o => {
          const selected = state.outcomeDetail === o.slug;
          return (
            <div key={o.slug}
              onClick={() => advance({ outcomeDetail: o.slug, outcomeDetailText: null })}
              role="button"
              style={{
                minHeight: 72,
                borderRadius: RADIUS.lg,
                border: `2px solid ${selected ? COLORS.accent : COLORS.border}`,
                background: selected ? `${COLORS.accent}10` : COLORS.surfaceDark,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center',
                fontFamily: FONT, fontSize: 16, fontWeight: 800,
                color: COLORS.text, letterSpacing: '-0.2px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
              {t(o.labelKey)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
