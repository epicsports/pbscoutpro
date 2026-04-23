import React from 'react';
import { Btn } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';

/**
 * Step 3 — shots picker. CHECKPOINT 3 STUB. Real multi-select grid
 * lands in Checkpoint 4. For now renders a placeholder + "Dalej" CTA
 * so the 5-step routing matrix (§ 48.4) can be walked end-to-end.
 */
export default function Step3ShotsStub({ state, advance }) {
  const { t } = useLanguage();
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step3_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {t('ppt_stub_checkpoint_4')}
      </div>
      <div style={{
        padding: SPACE.lg, borderRadius: RADIUS.lg,
        background: COLORS.surfaceDark, border: `1px dashed ${COLORS.border}`,
        fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim,
        marginBottom: SPACE.lg,
      }}>
        state.breakout: {state.breakout?.bunker || '—'} · variant: {state.variant || '—'}
      </div>
      <Btn variant="accent" onClick={() => advance({ shots: [] })}
        style={{ width: '100%', minHeight: 64, fontSize: 17, fontWeight: 800 }}>
        {t('ppt_step3_next')}
      </Btn>
    </div>
  );
}
