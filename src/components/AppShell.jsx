import { useEffect } from 'react';
import { COLORS, FONT } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import WorkspaceLogo from './settings/WorkspaceLogo';
import { useViewAs } from '../hooks/useViewAs';
import TabBar, { computeVisibleTabs } from './TabBar';
import { ReadsBallButton } from './NavDrawer';
import { useQuickLogActive } from '../contexts/QuickLogContext';
import { leagueDisplayName } from '../hooks/useLeagues';
import { useDevice } from '../hooks/useDevice';
import AppShellPremiumWide from './AppShellPremiumWide';

/**
 * AppShell — top-bar + bottom-tab navigation wrapper (DESIGN_DECISIONS § 31,
 * § 49; §C nav drawer restructure, mockup-7).
 *
 * Layout: [top bar: reads ball (drawer trigger) + event context] [content] [tab bar]
 *
 * §C1 top bar: the reads ball (ReadsBallButton) opens the nav drawer (owned by
 * MainPage via `onOpenDrawer`); the event context beside it stays SEPARATELY
 * tappable → TournamentPicker (event switching ≠ settings — two affordances,
 * two frequencies). The bar renders even with no event selected — the ball is
 * the only path to settings/sign-out, so it must always be reachable.
 *
 * §C3 tab bar: content role tabs ONLY (Scout | Coach | Gracz, `requiredAny`
 * role gates; admin sees all). The 'more' tab is REMOVED — settings live in
 * the drawer. TabBar renders only at ≥2 content tabs (single-role users get
 * full-bleed content). A stale persisted 'more' (or any hidden tab) resolves
 * to the role's first content tab via the fallback effect below.
 *
 * Gracz tab navigates to the PPT route (/player/log) rather than swapping
 * MainPage content — PPT has its own layout/chrome and nesting it inside
 * AppShell's tournament context bar would be visually confusing.
 * MainPage.handleTabChange routes 'ppt' → navigate('/player/log').
 */
export default function AppShell({
  children,
  activeTab,
  onTabChange,
  tournament,
  tournamentSubtitle,
  onChangeTournament,
  onOpenDrawer,
  tournamentId,
}) {
  const { t } = useLanguage();
  const { workspace } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const device = useDevice();
  const visibleTabs = computeVisibleTabs(effectiveRoles, effectiveIsAdmin);
  const isEnded = tournament?.status === 'closed';
  // § 58.7 (hotfix v2): hide the tournament context bar during QuickLog
  // flow. QuickLogView mounts deep in the tree (MatchPage / TrainingScoutTab)
  // so URL has no flag — context lifts the state. AppShell consumes here.
  const quickLogActive = useQuickLogActive();

  // §C3 migration + role fallback (subsumes the former B4 cold-open 'more'
  // guard): with 'more' gone from TAB_DEFS, a stale persisted 'more' — and any
  // tab hidden for this role (pure-player with 'scout' persisted, admin
  // impersonating a lower role) — is simply "not visible" and maps to the
  // role's FIRST content tab. Waits for roles to resolve: visibleTabs is empty
  // both while loading AND for viewer-only users (no content tabs at all —
  // MainPage renders their terminal summary card regardless of activeTab), so
  // an empty list never triggers a redirect.
  useEffect(() => {
    if (visibleTabs.length === 0) return; // roles unresolved, or viewer-only
    if (!visibleTabs.some(t => t.key === activeTab)) {
      onTabChange(visibleTabs[0].key);
    }
  }, [activeTab, visibleTabs, onTabChange]);

  // Tablet/desktop (≥720px) → premium wide shell (sidebar + master-detail).
  // Reuses the same activeTab/onTabChange/visibleTabs + tournament context — one
  // nav, one data source. Mobile path below is unchanged. (All hooks above run
  // unconditionally so this branch is hook-safe across resize.)
  //
  // DEPLOY GATE: disabled under the e2e/emulator build (VITE_USE_EMULATOR) — the
  // Playwright suite runs at Desktop-Chrome 1280px (≥720), so without this guard the
  // wide shell would render in every spec and break the mobile-written suite → red
  // e2e → no publish. The flag is set ONLY for the e2e webServer, never the prod
  // build, so prod ≥720 still gets the wide shell. (Same VITE_USE_EMULATOR pattern as
  // MatchPage/firebase.js.) Wide-shell e2e coverage is a separate follow-up.
  if (device.width >= 720 && import.meta.env.VITE_USE_EMULATOR !== 'true') {
    return (
      <AppShellPremiumWide
        activeTab={activeTab}
        onTabChange={onTabChange}
        visibleTabs={visibleTabs}
        tournament={tournament}
        tournamentSubtitle={tournamentSubtitle}
        tournamentId={tournamentId}
        onChangeTournament={onChangeTournament}
        onOpenDrawer={onOpenDrawer}
      >
        {children}
      </AppShellPremiumWide>
    );
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.bg,
    }}>
      {/* Top bar (§C1) — reads ball (drawer trigger) + event context. Always
          rendered (the ball is the sole settings entry) EXCEPT during QuickLog
          (§ 58.7): the bar duplicates the QuickLog PageHeader and pushes the
          Stage 1 CTA off-screen on desktop landscape. The event context is its
          OWN tap target → TournamentPicker, untouched by the ball. */}
      {!quickLogActive && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 48,
          padding: '2px 16px 2px 6px',
          background: COLORS.surfaceBar,
          borderBottom: `1px solid ${COLORS.surfaceLight}`,
          gap: 6,
          flexShrink: 0,
        }}>
          <ReadsBallButton onClick={onOpenDrawer} />
          {tournament ? (
          <div onClick={onChangeTournament}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              minHeight: 44,
              gap: 10,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
          {workspace?.logoUrl && <WorkspaceLogo url={workspace.logoUrl} size={20} />}
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
                <HeaderBadge label={leagueDisplayName(tournament.league)} color={isEnded ? COLORS.textMuted : COLORS.accent} />
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
          ) : (
            <div style={{ flex: 1 }} />
          )}
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>

      {/* Tab bar — shared component (also used on the PPT route, § Gracz fix) */}
      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
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
