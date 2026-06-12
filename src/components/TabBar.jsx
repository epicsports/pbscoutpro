import { COLORS, FONT } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useViewAs } from '../hooks/useViewAs';
import { hasAnyRole } from '../utils/roleUtils';

/**
 * TabBar — shared bottom-tab navigation bar (§ 31 / § 49; §C nav drawer).
 *
 * §C3 (mockup-7, gated): CONTENT role tabs only — the 'more'/Settings tab is
 * REMOVED (settings live in the nav drawer behind the reads ball). RULE: the
 * bar renders only when the user has ≥2 content tabs; single-role users get
 * full-bleed content with zero dead chrome (the bar returns null).
 *
 * Extracted from AppShell so the PPT route (/player/log, which renders OUTSIDE
 * AppShell with its own chrome) can show the same persistent bottom menu.
 * Renders only the bar — the caller positions it: AppShell as the last flex
 * child of its 100dvh column; PlayerPerformanceTrackerPage wraps it in a fixed
 * bottom box (gated on useTabBarVisible so no empty fixed layer remains).
 */
export const TAB_DEFS = [
  { key: 'scout', icon: '🎯', label: 'Scout', labelKey: 'tab_scout',  requiredAny: ['scout'] },
  { key: 'coach', icon: '📊', label: 'Coach', labelKey: 'tab_coach',  requiredAny: ['coach'] },
  { key: 'ppt',   icon: '🏃', label: 'Gracz', labelKey: 'tab_player', requiredAny: ['player'] },
];

// Bar height (excluding the safe-area inset, which is added as paddingBottom).
// Consumers that overlay content above a fixed TabBar offset by this.
export const TAB_BAR_HEIGHT = 56;

export function computeVisibleTabs(effectiveRoles, effectiveIsAdmin) {
  return TAB_DEFS.filter(tab => {
    if (!tab.requiredAny) return true;
    if (effectiveIsAdmin) return true;
    return hasAnyRole(effectiveRoles, ...tab.requiredAny);
  });
}

/**
 * useTabBarVisible — whether the bottom bar renders for the current effective
 * roles (≥2 content tabs). Consumers that reserve space above the bar (PPT's
 * sticky CTA, the fixed wrapper) key their offsets off this so single-role
 * users get true full-bleed content.
 */
export function useTabBarVisible() {
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  return computeVisibleTabs(effectiveRoles, effectiveIsAdmin).length >= 2;
}

export default function TabBar({ activeTab, onTabChange }) {
  const { t } = useLanguage();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const visibleTabs = computeVisibleTabs(effectiveRoles, effectiveIsAdmin);
  // §C3 rule: a one-tab bar is dead chrome — render nothing below 2 tabs.
  if (visibleTabs.length < 2) return null;
  return (
    <div data-testid="tab-bar" style={{
      display: 'flex',
      background: COLORS.surfaceBar,
      borderTop: `1px solid ${COLORS.surfaceLight}`,
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {visibleTabs.map(tab => {
        const active = activeTab === tab.key;
        return (
          <div key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '10px 0 8px',
              cursor: 'pointer',
              minHeight: 48,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <span style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>{tab.icon}</span>
            <span style={{
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '.3px',
              color: active ? COLORS.accent : COLORS.textMuted,
            }}>
              {tab.labelKey ? (t(tab.labelKey) || tab.label) : tab.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
