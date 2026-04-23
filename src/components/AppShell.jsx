import { useEffect } from 'react';
import { COLORS, FONT } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useViewAs } from '../hooks/useViewAs';
import { hasAnyRole } from '../utils/roleUtils';

/**
 * AppShell — bottom-tab navigation wrapper (DESIGN_DECISIONS § 31, § 49).
 *
 * Layout: [context bar] [content (scroll)] [tab bar]
 * Tabs: Scout | Coach | Gracz | More — each has a `requiredAny` role gate.
 *   null = always visible; otherwise at least one role must match.
 *   Admin (effective) always sees every tab regardless of requiredAny.
 *
 * § 49 strict matrix (replaces Brief E Option 1 permissive one):
 *   Pure-player → Gracz + More
 *   Pure-scout  → Scout + More
 *   Pure-coach  → Coach + More  (coach does NOT see Scout tab anymore)
 *   Admin       → all tabs
 *   Multi-role (e.g. ['scout','coach']) → union of allowed tabs
 *   Viewer role retired from tab matrix — viewer users fall through to
 *     More-only visibility. No migration.
 *
 * Gracz tab navigates to the PPT route (/player/log) rather than swapping
 * MainPage content — PPT has its own layout/chrome and nesting it inside
 * AppShell's tournament context bar would be visually confusing.
 * MainPage.handleTabChange routes 'ppt' → navigate('/player/log').
 */
const TAB_DEFS = [
  { key: 'scout', icon: '🎯', label: 'Scout',      labelKey: 'tab_scout',    requiredAny: ['scout'] },
  { key: 'coach', icon: '📊', label: 'Coach',      labelKey: 'tab_coach',    requiredAny: ['coach'] },
  { key: 'ppt',   icon: '🏃', label: 'Gracz',      labelKey: 'tab_player',   requiredAny: ['player'] },
  { key: 'more',  icon: '⚙',  label: 'Ustawienia', labelKey: 'tab_settings', requiredAny: null },
];

function computeVisibleTabs(effectiveRoles, effectiveIsAdmin) {
  return TAB_DEFS.filter(tab => {
    if (!tab.requiredAny) return true;
    if (effectiveIsAdmin) return true;
    return hasAnyRole(effectiveRoles, ...tab.requiredAny);
  });
}

export default function AppShell({
  children,
  activeTab,
  onTabChange,
  tournament,
  tournamentSubtitle,
  onChangeTournament,
}) {
  const { t } = useLanguage();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const visibleTabs = computeVisibleTabs(effectiveRoles, effectiveIsAdmin);
  const isEnded = tournament?.status === 'closed';

  // If the persisted activeTab is hidden for this role (e.g. pure-player
  // whose localStorage still has 'scout' from a multi-role session, or an
  // admin impersonating a lower role), fall back to the first visible tab.
  useEffect(() => {
    if (!visibleTabs.some(t => t.key === activeTab)) {
      onTabChange(visibleTabs[0]?.key || 'more');
    }
  }, [activeTab, visibleTabs, onTabChange]);
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.bg,
    }}>
      {/* Context bar — visible only when a tournament is selected */}
      {tournament && (
        <div onClick={onChangeTournament}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 16px',
            background: '#0d1117',
            borderBottom: '1px solid #1a2234',
            gap: 10,
            flexShrink: 0,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isEnded ? COLORS.textMuted
              : tournament.status === 'live' ? COLORS.success
              : COLORS.borderLight,
            boxShadow: !isEnded && tournament.status === 'live' ? '0 0 6px #22c55e80' : 'none',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-.1px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>{tournament.name}</span>

              {/* Type badge — grayed out when ended, otherwise cyan (training) / amber (league) */}
              {tournament._isTraining ? (
                <HeaderBadge label="TRENING" color={isEnded ? COLORS.textMuted : '#22d3ee'} />
              ) : tournament.league ? (
                <HeaderBadge label={tournament.league} color={isEnded ? COLORS.textMuted : COLORS.accent} />
              ) : null}

              {/* LIVE badge — only when actually live and not ended */}
              {!isEnded && tournament.status === 'live' && <HeaderBadge label="LIVE" color={COLORS.success} />}

              {tournament.isTest && (
                <HeaderBadge label="TEST" color={COLORS.textMuted} />
              )}
            </div>
            {(tournamentSubtitle || isEnded) && (
              <div style={{
                fontFamily: FONT,
                fontSize: 10,
                color: COLORS.textMuted,
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {[tournamentSubtitle, isEnded ? (t('session_ended') || 'zakończony') : null].filter(Boolean).join(' \u00b7 ')}
              </div>
            )}
          </div>
          <span style={{
            fontFamily: FONT, fontSize: 16, color: COLORS.textMuted,
            flexShrink: 0, opacity: 0.6,
          }}>›</span>
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: '#0d1117',
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
              <span style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>
                {tab.icon}
              </span>
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
    </div>
  );
}

function HeaderBadge({ label, color }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700,
      color,
      background: `${color}18`,
      border: `1px solid ${color}40`,
      borderRadius: 3,
      padding: '1px 5px',
      letterSpacing: '.3px',
      flexShrink: 0,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}
