import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ELEV, FONT, TRACKING, TNUM } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import { leagueDisplayName } from '../hooks/useLeagues';
import { useMatches, useActiveTeams, useScoutedTeams } from '../hooks/useFirestore';
import { useLiveMatchScores } from '../hooks/useLiveMatchScores';
import RdIcon from './RdIcon';
import TeamBadge from './TeamBadge';

/**
 * AppShellPremiumWide — the tablet/desktop premium shell (North Star redesign).
 *
 * Persistent left sidebar (RdSideNav) + a content area. Dispatched by AppShell at
 * viewport width >= 720 (`useDevice().width`); the mobile bottom-tab shell is
 * unchanged below that. Ported from `prototype/redesign.jsx` (AppShellPremiumWide
 * + RdSideNav + RdContentHead + ScoutWide); wired to the app's REAL data/nav — one
 * data source, one nav (it reuses AppShell's `activeTab`/`onTabChange`/`visibleTabs`,
 * not a parallel tab state).
 *
 * Increment 1 (Scout): the scout tab renders the master-detail `ScoutWide`; every
 * other tab renders `children` (the existing tab content) full-bleed as a safe
 * fallback until its own *Wide body lands (CoachWide / PlayerWide next).
 */

// Pulsing live dot (prototype LivePulse) — uses the global rdPulse keyframe.
function LivePulse() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: COLORS.danger, animation: 'rdPulse 1.6s ease-out infinite' }} />
      <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: COLORS.danger }} />
    </span>
  );
}

// Sidebar sub-labels per tab key (prototype copy).
const NAV_META = {
  scout: { icon: 'target', sub: 'Mecze · live' },
  coach: { icon: 'building', sub: 'Drużyny · analiza' },
  ppt: { icon: 'user', sub: 'Punkty · profil' },
};

function RdSideNav({ visibleTabs, activeTab, onTabChange, tournament, tournamentSubtitle, onChangeTournament, onOpenDrawer }) {
  const { t } = useLanguage();
  const { workspace } = useWorkspace();
  const isEnded = tournament?.status === 'closed';
  const isLive = !isEnded && tournament?.status === 'live';
  return (
    <div style={{ width: 256, flexShrink: 0, background: ELEV.sunken, borderRight: `1px solid ${ELEV.hairline}`, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* brand / drawer */}
      <div className="rd-zone" onClick={onOpenDrawer} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px', margin: '6px 8px 4px', cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 35% 30%, ${COLORS.accent}, ${COLORS.accentDim})`, boxShadow: `${ELEV.innerTop}, 0 2px 10px ${COLORS.accent}55` }}>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 15, color: '#1a1205' }}>⊖</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text, letterSpacing: TRACKING.tight }}>reads</div>
          <div style={{ fontFamily: FONT, fontSize: 11.5, fontWeight: 700, color: COLORS.textDim, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workspace?.name || workspace?.slug || 'workspace'}</div>
        </div>
        <span style={{ color: COLORS.textMuted, display: 'flex', flexShrink: 0 }}><RdIcon name="chevron" size={14} /></span>
      </div>

      {/* nav — reuses the app's visibleTabs (same gating as the bottom TabBar) */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleTabs.map(tab => {
          const meta = NAV_META[tab.key] || { icon: 'target', sub: '' };
          const on = tab.key === activeTab;
          return (
            <div key={tab.key} className="rd-press" data-testid={`wide-tab-${tab.key}`} onClick={() => onTabChange(tab.key)} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, cursor: 'pointer', background: on ? COLORS.accentA12 : 'transparent', border: `1px solid ${on ? COLORS.accentA40 : 'transparent'}` }}>
              {on && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, borderRadius: 3, background: COLORS.accent }} />}
              <span style={{ display: 'flex', color: on ? COLORS.accent : COLORS.textMuted }}><RdIcon name={meta.icon} size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: 14.5, fontWeight: on ? 800 : 700, color: on ? COLORS.accent : COLORS.text }}>{tab.labelKey ? (t(tab.labelKey) || tab.label) : tab.label}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, marginTop: 1 }}>{meta.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* tournament context → picker */}
      {tournament && (
        <div className="rd-zone" onClick={onChangeTournament} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 12px', margin: '0 8px 6px', cursor: 'pointer' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(150deg, ${COLORS.accent}, ${COLORS.accentDim})`, boxShadow: `${ELEV.innerTop}, 0 2px 8px ${COLORS.accent}33`, fontFamily: FONT, fontWeight: 800, color: '#1a1205', fontSize: 12 }}>
            {tournament.league ? leagueDisplayName(tournament.league).slice(0, 3).toUpperCase() : (tournament._isTraining ? '⚑' : '•')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tournament.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              {isLive && <LivePulse />}
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[tournamentSubtitle, isEnded ? 'zakończony' : isLive ? 'trwa' : null].filter(Boolean).join(' · ') || (tournament._isTraining ? 'trening' : '')}
              </span>
            </div>
          </div>
          <span style={{ color: COLORS.textMuted, display: 'flex', flexShrink: 0 }}><RdIcon name="chevron" size={14} /></span>
        </div>
      )}
      {/* settings / profile chip → drawer (settings surface, same as mobile) */}
      <div className="rd-zone" onClick={onOpenDrawer} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', margin: '0 8px 10px', borderTop: `1px solid ${ELEV.hairline}`, cursor: 'pointer' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.surface, border: `1px solid ${ELEV.hairlineStrong}`, color: COLORS.textDim }}><RdIcon name="dots" size={16} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{t('tab_more') || 'Menu'}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>{t('settings_title') || 'Ustawienia'}</div>
        </div>
      </div>
    </div>
  );
}

// content header strip (title + count + actions) — prototype RdContentHead
function RdContentHead({ title, count, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 24px', borderBottom: `1px solid ${ELEV.hairline}`, flexShrink: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: FONT, fontSize: 23, fontWeight: 800, color: COLORS.text, letterSpacing: TRACKING.tight }}>{title}</span>
          {count != null && <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORS.textDim, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 999, padding: '2px 9px', ...TNUM }}>{count}</span>}
        </div>
        {sub && <div style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: COLORS.textMuted, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// SCOUT — master list + scouting detail pane, wired to the tournament's REAL
// matches + the same scout route MatchCard uses (tournament scouting, not self-log).
function ScoutWide({ tournamentId }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { matches } = useMatches(tournamentId);
  const { teams } = useActiveTeams();
  const { scouted } = useScoutedTeams(tournamentId);
  const liveCandidateIds = matches.filter(m => m.status !== 'closed').map(m => m.id);
  const liveScores = useLiveMatchScores(tournamentId, liveCandidateIds);

  const getTeam = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    return s ? teams.find(x => x.id === s.teamId) || null : null;
  };
  const getName = (scoutedId) => getTeam(scoutedId)?.name || '?';
  const classify = (m) => {
    if (m.status === 'closed') return 'completed';
    const liveCount = liveScores[m.id]?.count ?? 0;
    if (liveCount > 0 || (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0) return 'live';
    return 'scheduled';
  };
  const live = matches.filter(m => classify(m) === 'live');
  const scheduled = matches.filter(m => classify(m) === 'scheduled');
  const ordered = [...live, ...scheduled];
  const [sel, setSel] = useState(ordered[0]?.id || null);
  const m = ordered.find(x => x.id === sel) || ordered[0] || null;
  const scoutSide = (scoutedId) => navigate(`/tournament/${tournamentId}/match/${m.id}?scout=${scoutedId}&mode=new`);
  const review = () => navigate(`/tournament/${tournamentId}/match/${m.id}`);

  const Row = ({ x }) => {
    const on = x.id === sel;
    const lv = classify(x) === 'live';
    const ls = liveScores[x.id]?.score || null;
    const sA = ls ? ls.a : (x.scoreA || 0);
    const sB = ls ? ls.b : (x.scoreB || 0);
    return (
      <div className="rd-press" onClick={() => setSel(x.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 12px', borderRadius: 13, background: on ? COLORS.accentA12 : ELEV.surface, border: `1px solid ${on ? COLORS.accentA40 : ELEV.hairline}`, boxShadow: on ? 'none' : ELEV.shadow1, cursor: 'pointer', marginBottom: 9 }}>
        <TeamBadge team={getTeam(x.teamA)} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getName(x.teamA)} <span style={{ color: COLORS.textMuted, fontWeight: 600 }}>vs</span> {getName(x.teamB)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            {lv && <LivePulse />}
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: lv ? COLORS.danger : COLORS.textMuted, letterSpacing: '.3px' }}>{lv ? 'NA ŻYWO' : (x.division || t('scout_tab_scheduled') || 'Zaplanowany')}</span>
          </div>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 800, color: lv ? COLORS.text : COLORS.textMuted, ...TNUM }}>{lv ? `${sA}:${sB}` : '—'}</div>
      </div>
    );
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <RdContentHead title={t('tab_scout') || 'Mecze'} count={matches.length} sub={t('section_matches') || 'Mecze'} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* master list */}
        <div className="rd-scroll" style={{ width: 384, flexShrink: 0, borderRight: `1px solid ${ELEV.hairline}`, overflowY: 'auto', padding: '16px 16px 24px' }}>
          {live.length > 0 && (<>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent, letterSpacing: TRACKING.label, textTransform: 'uppercase', margin: '0 2px 10px' }}>Na żywo · {live.length}</div>
            {live.map(x => <Row key={x.id} x={x} />)}
            <div style={{ height: 8 }} />
          </>)}
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textDim, letterSpacing: TRACKING.label, textTransform: 'uppercase', margin: '0 2px 10px' }}>Zaplanowane · {scheduled.length}</div>
          {scheduled.map(x => <Row key={x.id} x={x} />)}
          {ordered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>{t('scout_tab_no_matches_yet') || 'Brak meczów'}</div>
          )}
        </div>
        {/* detail pane */}
        {m ? (
          <div className="rd-scroll" style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
              <div className="rd-press" onClick={() => scoutSide(m.teamA)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 13, minWidth: 0, cursor: 'pointer' }} title="Scoutuj">
                <TeamBadge team={getTeam(m.teamA)} size={54} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getName(m.teamA)}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.accent }}>{(t('tap_to_scout') || 'scoutuj')}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                {(() => { const lv = classify(m) === 'live'; const ls = liveScores[m.id]?.score; const sA = ls ? ls.a : (m.scoreA || 0); const sB = ls ? ls.b : (m.scoreB || 0); return (<>
                  <div style={{ fontFamily: FONT, fontSize: 38, fontWeight: 800, color: COLORS.text, lineHeight: 1, ...TNUM }}>{lv ? `${sA}:${sB}` : '—:—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
                    {lv && <LivePulse />}
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: lv ? COLORS.danger : COLORS.textMuted, letterSpacing: '1px' }}>{lv ? 'NA ŻYWO' : (m.division || '').toUpperCase()}</span>
                  </div>
                </>); })()}
              </div>
              <div className="rd-press" onClick={() => scoutSide(m.teamB)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 13, minWidth: 0, cursor: 'pointer' }} title="Scoutuj">
                <div style={{ minWidth: 0, textAlign: 'right' }}>
                  <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getName(m.teamB)}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.accent }}>{(t('tap_to_scout') || 'scoutuj')}</div>
                </div>
                <TeamBadge team={getTeam(m.teamB)} size={54} />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 220, borderRadius: 14, border: `1px solid ${ELEV.hairlineStrong}`, boxShadow: ELEV.shadow1, background: `radial-gradient(120% 120% at 50% 0%, ${ELEV.raised}, ${ELEV.surface})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.textMuted, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>{getName(m.teamA)} vs {getName(m.teamB)}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <div className="rd-press" onClick={() => scoutSide(m.teamA)} style={{ flex: 1, textAlign: 'center', padding: '15px', borderRadius: 13, fontFamily: FONT, fontSize: 16, fontWeight: 800, cursor: 'pointer', background: COLORS.accent, color: '#1a1206', border: `1px solid ${COLORS.accent}`, boxShadow: `0 4px 14px ${COLORS.accent}40` }}>{(t('scout') || 'Scoutuj')} →</div>
              <div className="rd-press" onClick={review} style={{ padding: '15px 22px', borderRadius: 13, fontFamily: FONT, fontSize: 16, fontWeight: 700, cursor: 'pointer', background: ELEV.surface, color: COLORS.text, border: `1px solid ${ELEV.hairline}` }}>{t('match_details') || 'Szczegóły'}</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 14, color: COLORS.textMuted }}>{t('scout_tab_no_matches_yet') || 'Brak meczów'}</div>
        )}
      </div>
    </div>
  );
}

export default function AppShellPremiumWide({ children, activeTab, onTabChange, visibleTabs = [], tournament, tournamentSubtitle, tournamentId, onChangeTournament, onOpenDrawer }) {
  // Scout tab → wide master-detail when we have a real tournament (not training).
  const scoutWide = activeTab === 'scout' && tournamentId && !tournament?._isTraining;
  return (
    <div style={{ height: '100dvh', display: 'flex', background: COLORS.bg, fontFamily: FONT }}>
      <RdSideNav
        visibleTabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        tournament={tournament}
        tournamentSubtitle={tournamentSubtitle}
        onChangeTournament={onChangeTournament}
        onOpenDrawer={onOpenDrawer}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {scoutWide ? <ScoutWide tournamentId={tournamentId} /> : (
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>{children}</div>
        )}
      </div>
    </div>
  );
}
