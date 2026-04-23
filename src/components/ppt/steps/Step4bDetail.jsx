import React, { useEffect, useRef, useState } from 'react';
import { Target, ArrowRight, Flag, Square, HelpCircle, X as XIcon, Check } from 'lucide-react';
import { Btn } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';

/**
 * Step 4b — elimination detail. See DESIGN_DECISIONS § 48.3 Step 4b.
 * Shown only when outcome === 'elim_midgame' (routing matrix § 48.4).
 *
 * Six detail cards in vertical stack:
 *   Group 1 — konkretne (red borders, red icons):
 *     gunfight, przejscie, faja, na-przeszkodzie
 *   Group 2 — nieprecyzyjne (neutral borders, dim icons):
 *     inne (inline textarea + "Zapisz i dalej" amber CTA),
 *     nie-wiem (auto-advance with null text)
 *
 * Tap any non-inne option → advance to Step 5 with outcomeDetail set and
 * outcomeDetailText cleared. Tapping an option while the `inne` expand
 * is active collapses the expand first (no partial text persists).
 * `inne` expand: textarea is user-editable; the expand-CTA advances
 * only when tapped.
 */

const DETAIL_OPTIONS = [
  { slug: 'gunfight',        Icon: Target,     labelKey: 'ppt_detail_gunfight',        sublabelKey: 'ppt_detail_gunfight_sub',        neutral: false },
  { slug: 'przejscie',       Icon: ArrowRight, labelKey: 'ppt_detail_przejscie',       sublabelKey: 'ppt_detail_przejscie_sub',       neutral: false },
  { slug: 'faja',            Icon: Flag,       labelKey: 'ppt_detail_faja',            sublabelKey: 'ppt_detail_faja_sub',            neutral: false },
  { slug: 'na-przeszkodzie', Icon: Square,     labelKey: 'ppt_detail_na_przeszkodzie', sublabelKey: 'ppt_detail_na_przeszkodzie_sub', neutral: false },
  { slug: 'inne',            Icon: HelpCircle, labelKey: 'ppt_detail_inne',            sublabelKey: 'ppt_detail_inne_sub',            neutral: true },
  { slug: 'nie-wiem',        Icon: XIcon,      labelKey: 'ppt_detail_nie_wiem',        sublabelKey: 'ppt_detail_nie_wiem_sub',        neutral: true },
];

export default function Step4bDetail({ state, advance, patch }) {
  const { t } = useLanguage();
  // Inline expand for "Inaczej". When active, the `inne` card grows to
  // contain a textarea + amber "Zapisz i dalej" CTA. Tapping any other
  // card collapses the expand (no text saved) and advances to Step 5.
  const [inneActive, setInneActive] = useState(
    state.outcomeDetail === 'inne'
  );
  const textareaRef = useRef(null);

  useEffect(() => {
    if (inneActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [inneActive]);

  const handleCardTap = (option) => {
    if (option.slug === 'inne') {
      setInneActive(true);
      // Don't advance yet; wait for textarea + "Zapisz i dalej".
      // Patch the detail slug so the state reflects the branch choice
      // even before the save-and-advance fires.
      patch({ outcomeDetail: 'inne' });
      return;
    }
    // Any non-inne tap while inne was active collapses the expand and
    // advances with fresh state (no stale text).
    setInneActive(false);
    advance({ outcomeDetail: option.slug, outcomeDetailText: null });
  };

  const handleInneSave = () => {
    const text = (state.outcomeDetailText || '').trim();
    advance({ outcomeDetail: 'inne', outcomeDetailText: text || null });
  };

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
        {t('ppt_step4b_hint')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DETAIL_OPTIONS.map(o => {
          const isInneExpanded = o.slug === 'inne' && inneActive;
          const isSelected = state.outcomeDetail === o.slug && !isInneExpanded;
          // Red-or-neutral border palette per spec group assignment.
          const redBorder = 'rgba(239,68,68,0.25)';
          const redIconBg = 'rgba(239,68,68,0.08)';
          const redIconBorder = 'rgba(239,68,68,0.3)';

          if (isInneExpanded) {
            // Expanded inne card — textarea + amber "Zapisz i dalej" CTA.
            return (
              <div key={o.slug} style={{
                borderRadius: RADIUS.lg,
                border: `2px solid ${COLORS.danger}`,
                background: 'rgba(239,68,68,0.09)',
                boxShadow: `0 0 0 4px rgba(239,68,68,0.12)`,
                padding: '16px 18px 14px',
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    border: `2px solid ${COLORS.danger}`,
                    background: 'rgba(239,68,68,0.18)',
                    color: COLORS.danger,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <o.Icon size={22} strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: FONT, fontSize: 16, fontWeight: 800,
                      color: COLORS.danger, letterSpacing: '-0.2px',
                    }}>{t(o.labelKey)}</div>
                    <div style={{
                      fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
                      color: COLORS.textMuted, marginTop: 2,
                    }}>{t(o.sublabelKey)}</div>
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={state.outcomeDetailText || ''}
                  onChange={(e) => patch({ outcomeDetailText: e.target.value })}
                  placeholder={t('ppt_detail_inne_placeholder')}
                  rows={2}
                  style={{
                    width: '100%', minHeight: 56,
                    borderRadius: RADIUS.md,
                    background: COLORS.bg,
                    border: `2px solid ${COLORS.borderLight}`,
                    color: COLORS.text,
                    padding: '14px 16px',
                    fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <Btn variant="accent" onClick={handleInneSave}
                  style={{
                    minHeight: 50, width: '100%',
                    fontSize: FONT_SIZE.sm, fontWeight: 800, gap: 8,
                  }}>
                  <Check size={16} strokeWidth={2.8} /> {t('ppt_detail_inne_save')}
                </Btn>
              </div>
            );
          }

          return (
            <div
              key={o.slug}
              onClick={() => handleCardTap(o)}
              role="button"
              style={{
                minHeight: 72,
                borderRadius: RADIUS.lg,
                border: `2px solid ${isSelected ? COLORS.accent : (o.neutral ? COLORS.border : redBorder)}`,
                background: COLORS.surfaceDark,
                padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                transition: 'border-color .12s',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                border: `2px solid ${o.neutral ? COLORS.border : redIconBorder}`,
                background: o.neutral ? COLORS.surface : redIconBg,
                color: o.neutral ? COLORS.textDim : COLORS.danger,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <o.Icon size={22} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT, fontSize: 16, fontWeight: 800,
                  color: COLORS.text, letterSpacing: '-0.2px',
                }}>{t(o.labelKey)}</div>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
                  color: COLORS.textMuted, marginTop: 2,
                }}>{t(o.sublabelKey)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
