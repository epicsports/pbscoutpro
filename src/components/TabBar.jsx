import { COLORS, FONT } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useViewAs } from '../hooks/useViewAs';
import { hasAnyRole } from '../utils/roleUtils';

/**
 * TabBar — shared bottom-tab navigation bar (§ 31 / § 49).
 *
 * Extracted from AppShell so the PPT route (/player/log, which renders OUTSIDE
 * AppShell with its own chrome) can show the same persistent bottom menu.
 * Renders only the bar — the caller positions it: AppShell as the last flex
 * child of its 100dvh column; PlayerPerformanceTrackerPage wraps it in a fixed
 * bottom box.
 */
export const TAB_DEFS = [
  { key: 'scout', icon: '🎯', label: 'Scout',      labelKey: 'tab_scout',    requiredAny: ['scout'] },
  { key: 'coach', icon: '📊', label: 'Coach',      labelKey: 'tab_coach',    requiredAny: ['coach'] },
  { key: 'ppt',   icon: '🏃', label: 'Gracz',      labelKey: 'tab_player',   requiredAny: ['player'] },
  { key: 'more',  icon: '⚙',  label: 'Ustawienia', labelKey: 'tab_settings', requiredAny: null },
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

export default function TabBar({ activeTab, onTabChange }) {
  const { t } = useLanguage();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const visibleTabs = computeVisibleTabs(effectiveRoles, effectiveIsAdmin);
  return (
    <div style={{
      display: 'flex',
      background: COLORS.surfaceBar,
      borderTop: '1px solid #1a2234',
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {visibleTabs.map(tab => {
        const active = activeTab === tab.key;
        return (
          <div key={tab.key}
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
