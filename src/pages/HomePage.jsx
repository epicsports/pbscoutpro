import React, { useState, useMemo } from 'react';
import { useModal } from '../hooks/useModal';
import { useWorkspace } from '../hooks/useWorkspace';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Btn, Card, SectionTitle, SectionLabel, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge, AppFooter, ConfirmModal, SkeletonList, ResultBadge, Score } from '../components/ui';
import { useTournaments, useMatches, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { useDevice } from '../hooks/useDevice';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS, responsive } from '../utils/theme';
import { yearOptions, currentYear } from '../utils/helpers';

export default function HomePage({ onLogout, workspaceName }) {
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { tournaments, loading: tLoading } = useTournaments();
  const { workspace } = useWorkspace();
  const isAdmin = workspace?.isAdmin || false;
  const modal = useModal();
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [division, setDivision] = useState('');
  const [year, setYear] = useState(currentYear());
  const [showAll, setShowAll] = useState(false);
  const [expandLive, setExpandLive] = useState(false);
  const [expandFinished, setExpandFinished] = useState(false);
  const [expandUpcoming, setExpandUpcoming] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [layoutId, setLayoutId] = useState('');
  const { layouts } = useLayouts();

  // Dashboard: find active tournament (most recently accessed)
  const practices = useMemo(() => tournaments.filter(t => t.type === 'practice'), [tournaments]);
  const regularTournaments = useMemo(() => tournaments.filter(t => t.type !== 'practice'), [tournaments]);
  const sorted = useMemo(() => {
    if (!regularTournaments.length) return [];
    return [...regularTournaments].sort((a, b) => {
      const ta = a.lastAccess?.seconds || a.createdAt?.seconds || 0;
      const tb = b.lastAccess?.seconds || b.createdAt?.seconds || 0;
      return tb - ta;
    });
  }, [regularTournaments]);

  const activeTournament = sorted[0] || null;
  const recentTournaments = sorted.slice(1, 4);

  // Fetch matches from active tournament for dashboard
  const { matches } = useMatches(activeTournament?.id);
  const allMatches = useMemo(() =>
    [...matches].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
    [matches]
  );

  const handleAdd = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), league, year: Number(year), division: division || null, layoutId: layoutId || null };
    if (practiceMode) data.type = 'practice';
    await ds.addTournament(data);
    modal.close(); setName(''); setPracticeMode(false); setLayoutId('');
  };

  const handleDelete = async (id) => { await ds.deleteTournament(id); modal.close(); };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <PageHeader
        title="PbScoutPro"
        titleColor={COLORS.accent}
        subtitle="PAINTBALL SCOUTING & TACTICS"
        action={
          <Btn variant="ghost" size="sm" onClick={onLogout}
            style={{ color: COLORS.textMuted, fontSize: TOUCH.fontXs, padding: '4px 10px', borderRadius: RADIUS.full,
              background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}` }}>
            🔒 {workspaceName}
          </Btn>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 80 }}>

        {tLoading && <SkeletonList count={3} />}

        {/* ═══ ONBOARDING (no tournaments) ═══ */}
        {!tLoading && !tournaments.length && (
          <div style={{ textAlign: 'center', padding: '24px 16px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontLg, color: COLORS.text, fontWeight: 700, marginBottom: 16 }}>
              Welcome to PbScoutPro
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 20 }}>
              {[
                { step: '1', icon: '🗺️', title: 'Upload a layout', desc: 'Go to Layouts tab and add your field image' },
                { step: '2', icon: '🏷️', title: 'Mark bunkers', desc: 'Tap on the field to place and name each bunker' },
                { step: '3', icon: '🏆', title: 'Start scouting', desc: 'Create a tournament, add teams, and scout matches' },
              ].map(s => (
                <div key={s.step} style={{ display: 'flex', gap: SPACE.md, alignItems: 'flex-start', padding: `10px ${SPACE.md}px`, borderRadius: RADIUS.lg, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: RADIUS.xl, background: COLORS.accent + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800, color: COLORS.accent, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.text }}>{s.icon} {s.title}</div>
                    <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ LIVE TOURNAMENT ═══ */}
        {!tLoading && activeTournament && activeTournament.status !== 'closed' && (
          <div>
            <SectionLabel>Live tournament</SectionLabel>
            <div onClick={() => navigate(`/tournament/${activeTournament.id}`)} style={{
              padding: `14px ${SPACE.lg}px`, borderRadius: RADIUS.lg,
              background: COLORS.accent + '08',
              border: `1px solid ${COLORS.accent}40`,
              cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: COLORS.accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: FONT_SIZE.md, color: COLORS.text }}>
                  {activeTournament.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  <LeagueBadge league={activeTournament.league} />
                  <YearBadge year={activeTournament.year} />
                  · {matches.length} matches
                  {(() => { const live = matches.filter(m => m.status !== 'closed' && ((m.scoreA || 0) > 0 || (m.scoreB || 0) > 0)); return live.length > 0 ? ` · ${live.length} live` : ''; })()}
                </div>
              </div>
              <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs, background: COLORS.accent, color: '#000', letterSpacing: '.5px' }}>LIVE</span>
            </div>
          </div>
        )}

        {/* ═══ CATEGORIZED MATCHES ═══ */}
        {!tLoading && allMatches.length > 0 && (() => {
          const liveMatches = allMatches.filter(m => m.status !== 'closed' && ((m.scoreA || 0) > 0 || (m.scoreB || 0) > 0));
          const finishedMatches = allMatches.filter(m => m.status === 'closed');
          const upcomingMatches = allMatches.filter(m => m.status !== 'closed' && (m.scoreA || 0) === 0 && (m.scoreB || 0) === 0);

          const renderMatchCard = (m, accentColor, badgeType) => {
            const isScheduled = badgeType === 'SCHED';
            return (
              <div key={m.id}
                onClick={() => navigate(`/tournament/${activeTournament.id}/match/${m.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  borderRadius: RADIUS.lg, background: COLORS.surfaceDark,
                  border: `1px ${isScheduled ? 'dashed' : 'solid'} ${COLORS.border}`,
                  marginBottom: 6, cursor: 'pointer', overflow: 'hidden',
                  opacity: isScheduled ? 0.55 : 1,
                }}>
                <div style={{ width: 4, alignSelf: 'stretch', background: accentColor, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '12px 14px', minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.name || 'Match'}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginTop: 2 }}>
                    {activeTournament?.name} {m.division ? `· ${m.division}` : ''} {m.date ? `· ${m.date}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 0 0', flexShrink: 0 }}>
                  {(m.scoreA || 0) > 0 || (m.scoreB || 0) > 0
                    ? <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.text }}>{m.scoreA || 0}:{m.scoreB || 0}</span>
                    : <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.textMuted }}>— : —</span>
                  }
                  {badgeType === 'LIVE' && <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs, background: COLORS.accent, color: '#000', letterSpacing: '.5px' }}>LIVE</span>}
                  {badgeType === 'FINAL' && <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs, background: COLORS.success + '18', color: COLORS.success, letterSpacing: '.5px' }}>FINAL</span>}
                  {badgeType === 'SCHED' && <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs, border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted, letterSpacing: '.5px' }}>SCHED</span>}
                </div>
              </div>
            );
          };

          const renderSection = (list, label, accentColor, badgeType, expanded, setExpanded) => {
            if (list.length === 0) return null;
            const visible = expanded ? list : list.slice(0, 3);
            const hasMore = list.length > 3;
            return (
              <div>
                <SectionLabel>{label} <span style={{ fontWeight: 400, color: COLORS.textMuted }}>{list.length}</span></SectionLabel>
                {visible.map(m => renderMatchCard(m, accentColor, badgeType))}
                {hasMore && (
                  <div onClick={() => setExpanded(!expanded)} style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.accent, textAlign: 'center', padding: 8, cursor: 'pointer' }}>
                    {expanded ? '▴ Show less' : `Show ${list.length - 3} more`}
                  </div>
                )}
              </div>
            );
          };

          return (
            <>
              {renderSection(liveMatches, 'Live matches', COLORS.accent, 'LIVE', expandLive, setExpandLive)}
              {renderSection(finishedMatches, 'Finished matches', COLORS.success, 'FINAL', expandFinished, setExpandFinished)}
              {renderSection(upcomingMatches, 'Upcoming matches', COLORS.border, 'SCHED', expandUpcoming, setExpandUpcoming)}
            </>
          );
        })()}

        {/* ═══ DIVIDER ═══ */}
        {!tLoading && (recentTournaments.length > 0 || practices.length > 0) && (
          <div style={{ height: 1, background: COLORS.border, margin: '12px 0 4px' }} />
        )}

        {/* ═══ OTHER TOURNAMENTS ═══ */}
        {!tLoading && recentTournaments.length > 0 && (
          <div>
            <SectionLabel>Other tournaments</SectionLabel>
            {recentTournaments.map(t => (
              <Card key={t.id} icon={<Icons.Trophy />} title={t.name}
                badge={<><LeagueBadge league={t.league} /> <YearBadge year={t.year} />
                  {t.status === 'closed' && <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs, background: COLORS.textMuted + '30', color: COLORS.textMuted, marginLeft: 4 }}>CLOSED</span>}
                </>}
                subtitle={`${t.scoutedTeams?.length || 0} teams`}
                onClick={() => navigate(`/tournament/${t.id}`)} />
            ))}
          </div>
        )}

        {/* ═══ PRACTICE SESSIONS ═══ */}
        {!tLoading && practices.length > 0 && (
          <div>
            <SectionLabel>Practice sessions</SectionLabel>
            {practices.map(t => (
              <Card key={t.id} icon="🏋️" title={t.name}
                badge={<YearBadge year={t.year} />}
                subtitle={`${t.scoutedTeams?.length || 0} teams`}
                onClick={() => navigate(`/tournament/${t.id}`)}
                actions={
                  <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    {isAdmin && <Btn variant="ghost" size="sm" onClick={() => modal.open({ type: 'delete', id: t.id, name: t.name })}>
                      <Icons.Trash />
                    </Btn>}
                  </span>
                } />
            ))}
          </div>
        )}

        {/* Add tournament / practice buttons */}
        {!tLoading && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="accent" onClick={() => { setName(''); setLeague('NXL'); setYear(currentYear()); setDivision(''); setPracticeMode(false); modal.open('add'); }}
              style={{ flex: 1, justifyContent: 'center', minHeight: 48, fontWeight: 800 }}>
              <Icons.Plus /> New tournament
            </Btn>
            <Btn variant="default" onClick={() => {
              setName('Practice ' + new Date().toLocaleDateString());
              setLeague('NXL'); setYear(currentYear()); setDivision('');
              setPracticeMode(true); modal.open('add');
            }}
              style={{ justifyContent: 'center', minHeight: 48, fontWeight: 700 }}>
              🏋️ Practice
            </Btn>
          </div>
        )}

        <AppFooter />
      </div>

      {/* Add tournament modal */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="New tournament"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}><Icons.Check /> Add</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="NXL Tampa 2026..." onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(l => (
                  <Btn key={l} variant="default" size="sm" active={league === l}
                    style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => { setLeague(l); setDivision(''); }}>{l}</Btn>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Year</div>
              <Select value={year} onChange={v => setYear(Number(v))}>
                {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
          {DIVISIONS[league] && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Division</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIVISIONS[league].map(d => (
                  <Btn key={d} variant="default" size="sm" active={division === d}
                    onClick={() => setDivision(division === d ? '' : d)}>{d}</Btn>
                ))}
              </div>
            </div>
          )}
          {layouts.length > 0 && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Layout</div>
              <Select value={layoutId} onChange={setLayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                <option value="">— no layout —</option>
                {layouts.filter(l => l.league === league || league === 'NXL' || l.league === 'NXL').map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal open={modal.is('delete')} onClose={() => modal.close()}
        title="Delete tournament?" danger confirmLabel="Delete"
        message={`Delete "${modal.value?.name}" and all data?`}
        onConfirm={() => handleDelete(modal.value?.id)} />
    </div>
  );
}
