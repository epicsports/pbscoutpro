import React from 'react';
import { Shield, Zap, Swords, Flag } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS } from '../../../utils/theme';

/**
 * Step 4 — outcome picker. See DESIGN_DECISIONS § 48.3 Step 4 and § 35.5,
 * extended by § 54.3 amendment (D3.four — 4-stage axis with `elim_endgame`).
 *
 * Four outcome cards, vertical stack. Cards are default-colored
 * (green for alive / red for all 3 elim states) regardless of selection
 * state — § 35.5 + § 48.3 prescribes the semantic default so the meaning
 * is visible before the tap, not only after.
 *
 * Routing per § 54.3: reason capture is required for ANY elim outcome
 * (break / midgame / endgame), so all 3 elim cards advance to Step 4b.
 * Tap alive → routes to Step 5 (no reason). Selected state adds a subtle
 * ring so a re-entered Step 4 from summary jump-back is clear.
 *
 * Brief B Hotfix #4 / Path 2 (2026-04-29): expanded from 3 outcomes to 4
 * to honor § 54.3 4-stage axis. KIOSK lobby uses these same components
 * via KioskWizardHost; PPT route gets the same expansion as a side
 * benefit (more granular self-log data for break + endgame elims).
 */

const OUTCOMES = [
  {
    slug: 'alive',
    Icon: Shield,
    labelKey: 'ppt_outcome_alive',
    sublabelKey: 'ppt_outcome_alive_sub',
    // Green semantic (§ 35.5)
    border: 'rgba(34,197,94,0.35)',
    bg: 'rgba(34,197,94,0.06)',
    iconBorder: COLORS.success,
    iconBg: 'rgba(34,197,94,0.15)',
    iconColor: COLORS.success,
    textColor: COLORS.success,
  },
  {
    slug: 'elim_break',
    Icon: Zap,
    labelKey: 'ppt_outcome_elim_break',
    sublabelKey: 'ppt_outcome_elim_break_sub',
    // Red semantic (§ 35.5 — all elim states use danger)
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.06)',
    iconBorder: 'rgba(239,68,68,0.4)',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: COLORS.danger,
    textColor: COLORS.danger,
  },
  {
    slug: 'elim_midgame',
    Icon: Swords,
    labelKey: 'ppt_outcome_elim_midgame',
    sublabelKey: 'ppt_outcome_elim_midgame_sub',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.06)',
    iconBorder: 'rgba(239,68,68,0.4)',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: COLORS.danger,
    textColor: COLORS.danger,
  },
  {
    slug: 'elim_endgame',
    Icon: Flag,
    labelKey: 'ppt_outcome_elim_endgame',
    sublabelKey: 'ppt_outcome_elim_endgame_sub',
    border: 'rgba(239,68,68,0.35)',
    bg: 'rgba(239,68,68,0.06)',
    iconBorder: 'rgba(239,68,68,0.4)',
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: COLORS.danger,
    textColor: COLORS.danger,
  },
];

export default function Step4Outcome({ state, advance }) {
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
        {t('ppt_step4_hint')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {OUTCOMES.map(o => {
          const selected = state.outcome === o.slug;
          return (
            <div
              key={o.slug}
              onClick={() => {
                // Routing per § 54.3.1 (2026-04-29): reason cascade fires
                // for {elim_midgame, elim_endgame} ONLY. Stage `elim_break`
                // is its own reason ("na brejku" — the moment of being hit
                // on break IS the categorical signal; finer reason adds no
                // value at that timing). Stage `alive` obviously has no
                // reason. Host (WizardShell or KioskWizardHost) reads
                // merged state.outcome and routes to 4b only when reason
                // is appropriate.
                const wantsCascade = o.slug === 'elim_midgame' || o.slug === 'elim_endgame';
                advance({
                  outcome: o.slug,
                  // Preserve detail fields when cascade applies (so user
                  // jumping back through midgame/endgame keeps their prior
                  // reason). Clear for alive + break — no reason applies.
                  outcomeDetail: wantsCascade ? state.outcomeDetail : null,
                  outcomeDetailText: wantsCascade ? state.outcomeDetailText : null,
                });
              }}
              role="button"
              style={{
                minHeight: 84,
                borderRadius: RADIUS.lg,
                border: `2px solid ${o.border}`,
                background: o.bg,
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                boxShadow: selected ? `0 0 0 4px ${o.iconColor}26` : 'none',
                transition: 'box-shadow .12s',
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: `2px solid ${o.iconBorder}`,
                background: o.iconBg,
                color: o.iconColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <o.Icon size={24} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT, fontSize: 17, fontWeight: 800,
                  color: o.textColor, letterSpacing: '-0.2px',
                }}>
                  {t(o.labelKey)}
                </div>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
                  color: o.textColor, opacity: 0.75, marginTop: 2,
                }}>
                  {t(o.sublabelKey)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
