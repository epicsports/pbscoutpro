import React, { useState, useMemo, useReducer } from 'react';
import { useModal } from '../hooks/useModal';
import { useWorkspace } from '../hooks/useWorkspace';
import { useNavigate } from 'react-router-dom';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge, AppFooter, ConfirmModal, SkeletonList } from '../components/ui';
import { useTournaments, useMatches } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { useDevice } from '../hooks/useDevice';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS, responsive, toggleTheme, currentTheme } from '../utils/theme';
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
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // Dashboard: find active tournament (most recently accessed)
  const sorted = useMemo(() => {
    if (!tournaments.length) return [];
    return [...tournaments].sort((a, b) => {
      const ta = a.lastAccess?.seconds || a.createdAt?.seconds || 0;
      const tb = b.lastAccess?.seconds || b.createdAt?.seconds || 0;
      return tb - ta;
    });
  }, [tournaments]);

  const activeTournament = sorted[0] || null;
  const recentTournaments = sorted.slice(1, 4);

  // Fetch matches from active tournament for dashboard
  const { matches } = useMatches(activeTournament?.id);
  const recentMatches = useMemo(() =>
    [...matches].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 3),
    [matches]
  );

  const handleAdd = async () => {
    if (!name.trim()) return;
    await ds.addTournament({ name: name.trim(), league, year: Number(year), division: division || null });
    modal.close(); setName('');
  };

  const handleDelete = async (id) => { await ds.deleteTournament(id); modal.close(); };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Simple title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" style={{ height: 24, width: 'auto' }} />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
          PbScoutPro
        </span>
        <Btn variant="ghost" size="sm" onClick={() => { toggleTheme(); forceUpdate(); }}
          style={{ color: COLORS.textMuted, fontSize: TOUCH.fontXs, padding: '4px 8px' }}>
          {currentTheme === 'dark' ? '☀️' : '🌙'}
        </Btn>
        <Btn variant="ghost" size="sm" onClick={onLogout} style={{ color: COLORS.textMuted, fontSize: TOUCH.fontXs }}>
          🔒 {workspaceName}
        </Btn>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 64 }}>

        {tLoading && <SkeletonList count={3} />}

        {/* ═══ ONBOARDING (no tournaments) ═══ */}
        {!tLoading && !tournaments.length && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontLg, color: COLORS.text, fontWeight: 700, marginBottom: 8 }}>
              Welcome to PbScoutPro
            </div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim, marginBottom: 20 }}>
              Add your first tournament to start scouting
            </div>
          </div>
        )}

        {/* ═══ ACTIVE TOURNAMENT (hero card) ═══ */}
        {!tLoading && activeTournament && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Active tournament
            </div>
            <div onClick={() => navigate(`/tournament/${activeTournament.id}`)} style={{
              padding: '14px 16px', borderRadius: 12,
              background: `linear-gradient(135deg, ${COLORS.accent}15, ${COLORS.accent}05)`,
              border: `1.5px solid ${COLORS.accent}40`,
              cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{ fontSize: 28, color: COLORS.accent }}><Icons.Trophy /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text }}>
                  {activeTournament.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                  <LeagueBadge league={activeTournament.league} />
                  {activeTournament.division && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: COLORS.textMuted + '20', color: COLORS.textDim }}>{activeTournament.division}</span>}
                  <YearBadge year={activeTournament.year} />
                  · {matches.length} matches
                </div>
              </div>
              <Icons.ChevronRight />
            </div>
          </div>
        )}

        {/* ═══ RECENT MATCHES (from active tournament) ═══ */}
        {!tLoading && recentMatches.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Recent matches
            </div>
            {recentMatches.map(m => (
              <div key={m.id}
                onClick={() => navigate(`/tournament/${activeTournament.id}/match/${m.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                  marginBottom: 6, cursor: 'pointer', minHeight: TOUCH.minTarget,
                }}>
                <div style={{
                  fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 800,
                  color: COLORS.accent, minWidth: 48, textAlign: 'center',
                }}>
                  {m.scoreA ?? '–'}:{m.scoreB ?? '–'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>
                    {m.name || 'Match'}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                    {m.gameNumber ? `Game ${m.gameNumber}` : ''}
                  </div>
                </div>
                <Icons.ChevronRight />
              </div>
            ))}
          </div>
        )}

        {/* ═══ MORE TOURNAMENTS ═══ */}
        {!tLoading && recentTournaments.length > 0 && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
              Other tournaments
            </div>
            {recentTournaments.map(t => (
              <Card key={t.id} icon={<Icons.Trophy />} title={t.name}
                badge={<><LeagueBadge league={t.league} /> <YearBadge year={t.year} /></>}
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

        {/* Expandable full list */}
        {!tLoading && sorted.length > 4 && (
          <div>
            <Btn variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', justifyContent: 'center', color: COLORS.textDim }}>
              {showAll ? '▴ Show less' : `▾ All tournaments (${sorted.length})`}
            </Btn>
            {showAll && sorted.slice(4).map(t => (
              <Card key={t.id} icon={<Icons.Trophy />} title={t.name}
                badge={<><LeagueBadge league={t.league} /> <YearBadge year={t.year} /></>}
                subtitle={`${t.scoutedTeams?.length || 0} teams`}
                onClick={() => navigate(`/tournament/${t.id}`)} />
            ))}
          </div>
        )}

        {/* Add tournament button */}
        {!tLoading && (
          <Btn variant="accent" onClick={() => { setName(''); setLeague('NXL'); setYear(currentYear()); setDivision(''); modal.open('add'); }}
            style={{ width: '100%', justifyContent: 'center', minHeight: 48, fontWeight: 800 }}>
            <Icons.Plus /> New tournament
          </Btn>
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
        </div>
      </Modal>

      <ConfirmModal open={modal.is('delete')} onClose={() => modal.close()}
        title="Delete tournament?" danger confirmLabel="Delete"
        message={`Delete "${modal.value?.name}" and all data?`}
        onConfirm={() => handleDelete(modal.value?.id)} />
    </div>
  );
}
