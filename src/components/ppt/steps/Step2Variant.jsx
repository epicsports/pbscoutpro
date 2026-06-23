import React from 'react';
import RdIcon from '../../RdIcon';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, ZONE_COLORS, FONT, FONT_SIZE, RADIUS, SPACE, ELEV } from '../../../utils/theme';

/**
 * Step 2 — variant picker. See DESIGN_DECISIONS § 48.3 Step 2.
 * Four variants stacked vertically; tap auto-advances. Variants
 * `na-wslizgu` and `na-okretke` carry a cyan SKIP SHOTS badge and route
 * directly to Step 4 (WizardShell.advance handles the jump).
 */
const VARIANTS = [
  { slug: 'late-break',     labelKey: 'ppt_variant_late_break',     hintKey: 'ppt_variant_late_break_hint',     icon: 'clock',     skipShots: false },
  { slug: 'na-wslizgu',     labelKey: 'ppt_variant_na_wslizgu',     hintKey: 'ppt_variant_na_wslizgu_hint',     icon: 'footsteps', skipShots: true  },
  { slug: 'ze-strzelaniem', labelKey: 'ppt_variant_ze_strzelaniem', hintKey: null,                              icon: 'target',    skipShots: false },
  { slug: 'na-okretke',     labelKey: 'ppt_variant_na_okretke',     hintKey: 'ppt_variant_na_okretke_hint',     icon: 'swap',      skipShots: true  },
];

export default function Step2Variant({ state, advance }) {
  const { t } = useLanguage();
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step2_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {t('ppt_step2_hint')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {VARIANTS.map(v => {
          const selected = state.variant === v.slug;
          return (
            <div
              key={v.slug}
              onClick={() => advance({ variant: v.slug })}
              role="button"
              data-testid={`ppt-variant-${v.slug}`}
              style={{
                minHeight: 76,
                borderRadius: RADIUS.lg,
                border: `2px solid ${selected ? COLORS.accent : ELEV.hairline}`,
                background: selected ? `${COLORS.accent}10` : ELEV.surface,
                boxShadow: selected ? 'none' : ELEV.shadow1,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'border-color .12s, background .12s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: RADIUS.md,
                background: ELEV.sunken, color: selected ? COLORS.accent : COLORS.textDim,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'color .12s',
              }}>
                <RdIcon name={v.icon} size={22} />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT, fontSize: 16, fontWeight: 800,
                  color: COLORS.text, letterSpacing: '-0.3px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t(v.labelKey)}
                </div>
                {v.hintKey && (
                  <div style={{
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
                    color: COLORS.textMuted,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t(v.hintKey)}
                  </div>
                )}
              </div>

              {v.skipShots && (
                <span style={{
                  fontFamily: FONT, fontSize: 9, fontWeight: 800,
                  color: ZONE_COLORS.snake,
                  textTransform: 'uppercase', letterSpacing: 0.4,
                  padding: '3px 8px', borderRadius: RADIUS.sm,
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.25)',
                  flexShrink: 0,
                }}>
                  {t('ppt_skip_shots_badge')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
