import React, { useState, useRef, useEffect } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import ScheduleImport from '../components/ScheduleImport';
import FieldCanvas from '../components/FieldCanvas';
import PageHeader from '../components/PageHeader';
import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge, ConfirmModal, Checkbox } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts, useTactics, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, responsive } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';
import { compressImage, yearOptions } from '../utils/helpers';
import { useField } from '../hooks/useField';

export default function TournamentPage() {
  const device = useDevice();
  const R = responsive(device.type);
    const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { layouts } = useLayouts();
  const { tactics: tournamentTactics } = useTactics(tournamentId);
  const [activeLayoutId, setActiveLayoutId] = useState(null);
  const { tactics: layoutTactics } = useLayoutTactics(activeLayoutId);
  const [deleteModal, setDeleteModal] = useState(null);
  const [layoutPicker, setLayoutPicker] = useState(false);
  const [tacticModal, setTacticModal] = useState(false);
  const [tacticName, setTacticName] = useState('');
  const [tacticTeam, setTacticTeam] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [eName, setEName] = useState('');
  const [eLeague, setELeague] = useState('');
  const [eYear, setEYear] = useState('');
  const [eDivisions, setEDivisions] = useState([]);
  const [newDivInput, setNewDivInput] = useState('');
  const fileRef = useRef(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [activeDivision, setActiveDivision] = useState('all');
  const [showBunkers, setShowBunkers] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [hiddenTeams, setHiddenTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`hidden_${tournamentId}`) || '[]'); } catch { return []; }
  });
  const [showAvailable, setShowAvailable] = useState(false);
  const [showLines, setShowLines] = useState(true);
  const [deleteMatchModal, setDeleteMatchModal] = useState(null); // { id, name }
  const [deleteMatchPassword, setDeleteMatchPassword] = useState('');
  const { workspace } = useWorkspace();
  const isAdmin = workspace?.isAdmin || false;

  // Sync layoutId from tournament to hook
  const tournamentForLayout = tournaments.find(t => t.id === tournamentId);
  useEffect(() => {
    setActiveLayoutId(tournamentForLayout?.layoutId || null);
  }, [tournamentForLayout?.layoutId]);

  const toggleHide = (scoutedId) => {
    const next = hiddenTeams.includes(scoutedId) ? hiddenTeams.filter(id => id !== scoutedId) : [...hiddenTeams, scoutedId];
    setHiddenTeams(next);
    localStorage.setItem(`hidden_${tournamentId}`, JSON.stringify(next));
  };

  const tournament = tournaments.find(t => t.id === tournamentId);
  const field = useField(tournament, layouts); // must be before any early return (Rules of Hooks)

  if (!tournament) return <EmptyState icon="⏳" text="Loading..." />;
  const isPractice = tournament.type === 'practice';
  const linkedLayout = field.layout;
  const alreadyIds = scouted.map(s => s.teamId);
  const available = teams.filter(t => {
    if (alreadyIds.includes(t.id)) return false;
    if (!isPractice && !(t.leagues || []).includes(tournament.league)) return false;
    return true;
  });
  const sortedAvailable = (() => {
    const parents = available.filter(t => !t.parentTeamId);
    const children = available.filter(t => !!t.parentTeamId);
    const result = [];
    parents.forEach(p => {
      result.push(p);
      children.filter(c => c.parentTeamId === p.id).forEach(c => {
        result.push({ ...c, _isChild: true });
      });
    });
    children.filter(c => !parents.find(p => p.id === c.parentTeamId)).forEach(c => {
      result.push({ ...c, _isChild: true });
    });
    return result;
  })();
  const filteredAvailable = activeDivision === 'all'
    ? sortedAvailable
    : sortedAvailable.filter(t => {
        const teamDiv = t.divisions?.[tournament.league];
        return !teamDiv || teamDiv === activeDivision;
      });

  const handleFieldUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1200);
      await ds.updateTournament(tournamentId, { fieldImage: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleAddScouted = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    let teamRoster;
    if (isPractice) {
      const childIds = teams.filter(t => t.parentTeamId === teamId).map(t => t.id);
      teamRoster = players.filter(p => [teamId, ...childIds].includes(p.teamId)).map(p => p.id);
    } else {
      teamRoster = players.filter(p => p.teamId === teamId).map(p => p.id);
    }
    const teamDivision = team?.divisions?.[tournament.league] || null;
    const division = isPractice ? null : (teamDivision || (activeDivision !== 'all' ? activeDivision : null));
    await ds.addScoutedTeam(tournamentId, { teamId, roster: teamRoster, division });
  };

  const handleRemoveScouted = async (sid) => { await ds.removeScoutedTeam(tournamentId, sid); setDeleteModal(null); };

  const openEdit = () => { setEName(tournament.name); setELeague(tournament.league); setEYear(tournament.year || 2026); setEDivisions(tournament.divisions || []); setNewDivInput(''); setEditModal(true); };
  const handleSaveEdit = async () => { await ds.updateTournament(tournamentId, { name: eName.trim(), league: eLeague, year: Number(eYear), divisions: eDivisions }); setEditModal(false); };
  const addDivision = () => { const d = newDivInput.trim(); if (d && !eDivisions.includes(d)) setEDivisions(prev => [...prev, d]); setNewDivInput(''); };

  // Resolve team names for matches
  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ COMPACT HEADER: back + title + badges + edit ═══ */}
      <PageHeader
        back={{ label: 'Start', to: '/' }}
        title={tournament.name}
        badges={isPractice
          ? <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, padding: '1px 6px', borderRadius: RADIUS.xs, background: COLORS.accent + '20', color: COLORS.accent }}>🏋️ Practice</span>
          : <><LeagueBadge league={tournament.league} /> <YearBadge year={tournament.year} /></>}
        right={<Btn variant="ghost" size="sm" onClick={openEdit}><Icons.Edit /></Btn>}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        {/* ═══ LAYOUT PREVIEW (tappable → navigate to layout detail) ═══ */}
        {field.fieldImage ? (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
              <Checkbox label="Labels" checked={showBunkers} onChange={v => setShowBunkers(v)} />
              <Checkbox label="Lines" checked={showLines} onChange={v => setShowLines(v)} />
              <Checkbox label="Zones" checked={showZones} onChange={v => setShowZones(v)} />
              {linkedLayout && (
                <span style={{ flex: 1, textAlign: 'right', fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>
                  {linkedLayout.name}
                </span>
              )}
            </div>
            <div onClick={() => linkedLayout ? navigate(`/layout/${linkedLayout.id}`) : null}
              style={{ cursor: linkedLayout ? 'pointer' : 'default', borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              <FieldCanvas
                fieldImage={field.fieldImage}
                players={[]} shots={[]} bumpStops={[]}
                eliminations={[]} eliminationPositions={[]}
                editable={false}
                discoLine={showLines ? (field.discoLine || 0) : 0}
                zeekerLine={showLines ? (field.zeekerLine || 0) : 0}
                bunkers={field.bunkers || []}
                showBunkers={showBunkers}
                dangerZone={field.dangerZone} sajgonZone={field.sajgonZone}
                showZones={showZones}
              />
            </div>
          </div>
        ) : (
          <Btn variant="default" onClick={() => setLayoutPicker(true)}
            style={{ width: '100%', justifyContent: 'center', padding: '16px 0' }}>
            📷 Assign layout
          </Btn>
        )}

        {/* Division tabs */}
        {!isPractice && (tournament.divisions?.length > 0) && (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '0 0 4px', flexShrink: 0 }}>
            <Btn size="sm" variant={activeDivision === 'all' ? 'accent' : 'default'}
              onClick={() => setActiveDivision('all')}>All</Btn>
            {tournament.divisions.map(d => (
              <Btn key={d} size="sm" variant={activeDivision === d ? 'accent' : 'default'}
                onClick={() => setActiveDivision(d)}>{d}</Btn>
            ))}
          </div>
        )}

        {/* Scouted teams */}
        <div>
          <SectionTitle right={
            <div style={{ display: 'flex', gap: 6 }}>
              {hiddenTeams.length > 0 && (
                <Btn variant="ghost" size="sm" onClick={() => setShowHidden(!showHidden)}>
                  {showHidden ? 'Hide (' + hiddenTeams.length + ')' : 'Hidden (' + hiddenTeams.length + ')'}
                </Btn>
              )}
              <Btn variant="accent" size="sm" onClick={() => setScheduleOpen(true)}>📷 Import schedule</Btn>
            </div>
          }>
            🏴 Teams ({scouted.length - hiddenTeams.length})
          </SectionTitle>

          {loading && <SkeletonList count={3} />}

          {scouted.filter(st => !hiddenTeams.includes(st.id) && (activeDivision === 'all' || st.division === activeDivision)).map(st => {
            const gt = teams.find(g => g.id === st.teamId);
            if (!gt) return null;
            const profileDiv = gt.divisions?.[tournament.league];
            const mismatch = profileDiv && st.division && profileDiv !== st.division;
            return (
              <Card key={st.id} icon="🏴" title={gt.name}
                subtitle={[(st.roster||[]).length + ' players', st.division, mismatch && '⚠️ profile: ' + profileDiv].filter(Boolean).join(' · ')}
                onClick={() => navigate('/tournament/' + tournamentId + '/team/' + st.id)}
                actions={<span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                  <Btn variant="ghost" size="sm" onClick={() => toggleHide(st.id)} title="Hide">👁</Btn>
                  {isAdmin && <Btn variant="ghost" size="sm" onClick={() => setDeleteModal({ id: st.id, name: gt.name })}><Icons.Trash /></Btn>}
                </span>} />
            );
          })}

          {/* Hidden teams */}
          {showHidden && hiddenTeams.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Hidden teams:</div>
              {scouted.filter(st => hiddenTeams.includes(st.id)).map(st => {
                const gt = teams.find(g => g.id === st.teamId);
                return gt ? (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, flex: 1 }}>{gt.name}</span>
                    <Btn variant="ghost" size="sm" onClick={() => toggleHide(st.id)}>Show</Btn>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {filteredAvailable.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {scouted.length > 0 ? (
                <Btn variant="ghost" size="sm" onClick={() => setShowAvailable(!showAvailable)}>
                  {showAvailable ? '▼' : '▶'} Add team ({filteredAvailable.length})
                </Btn>
              ) : (
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Add:</div>
              )}
              {(showAvailable || !scouted.length) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {filteredAvailable.slice(0, 20).map(t => {
                    const teamDiv = t.divisions?.[tournament.league];
                    return (
                      <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}
                        style={t._isChild ? { marginLeft: 16, fontSize: TOUCH.fontXs, borderStyle: 'dashed' } : {}}>
                        <Icons.Plus /> {t._isChild ? '↳ ' : ''}{t.name}
                        {teamDiv && <span style={{ fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginLeft: SPACE.xs }}>({teamDiv})</span>}
                      </Btn>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ MATCHES — grouped by status ═══ */}
        {(() => {
          const filtered = activeDivision === 'all' ? matches : matches.filter(m => m.division === activeDivision);
          const classify = (m) => {
            const hasScore = (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0;
            if (m.status === 'closed') return 'completed';
            if (hasScore) return 'live';
            return 'scheduled';
          };
          const live = filtered.filter(m => classify(m) === 'live');
          const scheduled = filtered.filter(m => classify(m) === 'scheduled');
          const completed = filtered.filter(m => classify(m) === 'completed');

          const MatchCard = ({ m, status }) => {
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const tA = getTeamName(m.teamA), tB = getTeamName(m.teamB);
            return (
              <div key={m.id} onClick={() => navigate('/tournament/' + tournamentId + '/match/' + m.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: SPACE.sm,
                  padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.lg,
                  background: COLORS.surfaceLight, border: `1.5px solid ${status === 'live' ? COLORS.accent + '60' : COLORS.border}`,
                  marginBottom: SPACE.xs, cursor: 'pointer', minHeight: TOUCH.minTarget,
                  opacity: status === 'completed' ? 0.65 : 1,
                }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tA} <span style={{ fontWeight: 400, color: COLORS.textMuted }}>vs</span> {tB}
                  </div>
                  {(m.date || m.time) && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim }}>{[m.date, m.time].filter(Boolean).join(' · ')}</div>}
                </div>
                {(sA > 0 || sB > 0) && (
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.text, minWidth: 40, textAlign: 'center' }}>
                    {sA}:{sB}
                  </span>
                )}
                {status === 'live' && (
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs - 1, fontWeight: 800, padding: '1px 5px', borderRadius: RADIUS.xs, background: COLORS.accent, color: '#000' }}>LIVE</span>
                )}
                {status === 'completed' && (
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs - 1, fontWeight: 800, padding: '1px 5px', borderRadius: RADIUS.xs, background: COLORS.success + '18', color: COLORS.success }}>FINAL</span>
                )}
                <span onClick={e => e.stopPropagation()}>
                  {isAdmin && <Btn variant="ghost" size="sm" onClick={() => {
                    setDeleteMatchModal({ id: m.id, name: tA + ' vs ' + tB });
                    setDeleteMatchPassword('');
                  }}><Icons.Trash /></Btn>}
                </span>
              </div>
            );
          };

          return (
            <div>
              <SectionTitle>⚔️ Matches ({filtered.length})</SectionTitle>

              {/* Empty state */}
              {!filtered.length && (
                <div style={{ textAlign: 'center', padding: SPACE.xl }}>
                  <EmptyState icon="⚔️" text="No matches yet" />
                  <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'center', marginTop: SPACE.md }}>
                    <Btn variant="accent" onClick={() => navigate('/tournament/' + tournamentId + '/team/' + (scouted[0]?.id || ''))}>
                      <Icons.Plus /> Add match
                    </Btn>
                    <Btn variant="default" onClick={() => setScheduleOpen(true)}>📷 Import schedule</Btn>
                  </div>
                </div>
              )}

              {/* Live */}
              {live.length > 0 && (
                <div style={{ marginBottom: SPACE.sm }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.xs }}>Live ({live.length})</div>
                  {live.map(m => <MatchCard key={m.id} m={m} status="live" />)}
                </div>
              )}

              {/* Scheduled */}
              {scheduled.length > 0 && (
                <div style={{ marginBottom: SPACE.sm }}>
                  {(live.length > 0 || completed.length > 0) && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.xs }}>Scheduled ({scheduled.length})</div>}
                  {scheduled.map(m => <MatchCard key={m.id} m={m} status="scheduled" />)}
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div style={{ marginBottom: SPACE.sm }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACE.xs }}>Completed ({completed.length})</div>
                  {completed.map(m => <MatchCard key={m.id} m={m} status="completed" />)}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      <ConfirmModal open={!!deleteMatchModal} onClose={() => { setDeleteMatchModal(null); setDeleteMatchPassword(''); }}
        title="Delete match?" danger confirmLabel="Delete"
        message={'Delete "' + (deleteMatchModal?.name || '') + '"?'}
        requirePassword={workspace?.slug}
        password={deleteMatchPassword} onPasswordChange={setDeleteMatchPassword}
        onConfirm={async () => { await ds.deleteMatch(tournamentId, deleteMatchModal.id); setDeleteMatchModal(null); setDeleteMatchPassword(''); }} />

      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit tournament"
        footer={<><Btn variant="default" onClick={() => setEditModal(false)}>Cancel</Btn><Btn variant="accent" onClick={handleSaveEdit} disabled={!eName.trim()}><Icons.Check /> Save</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={eName} onChange={setEName} placeholder="Tournament name" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
              <div style={{ display: 'flex', gap: 6 }}>{LEAGUES.map(l => (<Btn key={l} variant="default" size="sm" active={eLeague===l} style={{ borderColor: eLeague===l?LEAGUE_COLORS[l]:COLORS.border, color: eLeague===l?LEAGUE_COLORS[l]:COLORS.textDim }} onClick={() => setELeague(l)}>{l}</Btn>))}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Year</div>
              <Select value={eYear} onChange={v => setEYear(Number(v))}>{yearOptions().map(y => <option key={y} value={y}>{y}</option>)}</Select>
            </div>
          </div>
          {/* Divisions chip editor */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Divisions</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {eDivisions.map(d => (
                <span key={d} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 12, background: COLORS.accent + '20',
                  border: `1px solid ${COLORS.accent}40`, fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.accent,
                }}>
                  {d}
                  <span onClick={() => setEDivisions(prev => prev.filter(x => x !== d))}
                    style={{ cursor: 'pointer', fontWeight: 700, fontSize: FONT_SIZE.sm }}>×</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Input value={newDivInput} onChange={setNewDivInput} placeholder="e.g. Div.1"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDivision(); } }}
                style={{ flex: 1 }} />
              <Btn variant="default" size="sm" onClick={addDivision} disabled={!newDivInput.trim()}>
                <Icons.Plus />
              </Btn>
            </div>
          </div>
        </div>
      </Modal>

            <ConfirmModal open={!!deleteModal} onClose={() => setDeleteModal(null)}
        title="Delete?" danger confirmLabel="Delete"
        message={'Delete "' + (deleteModal?.name || '') + '"?'}
        onConfirm={() => handleRemoveScouted(deleteModal?.id)} />

      {/* Layout picker from library */}
      <Modal open={layoutPicker} onClose={() => setLayoutPicker(false)} title="Select layout from library">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
          {(() => {
            const tLeague = tournament?.league;
            const filtered = layouts.filter(l => l.league === tLeague || l.league === 'NXL' || tLeague === 'NXL');
            if (!filtered.length) return <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 20, textAlign: 'center' }}>No layouts found. Add them in 🗺️ Layout Library.</div>;
            return filtered.map(l => (
            <div key={l.id} onClick={async () => {
              await ds.updateTournament(tournamentId, {
                layoutId: l.id,
                discoLineOverride: null, zeekerLineOverride: null,
              });
              setLayoutPicker(false);
              setInfoCollapsed(true);
            }} style={{ display: 'flex', gap: 10, padding: 8, borderRadius: 8, background: tournament?.layoutId === l.id ? COLORS.accent + '15' : COLORS.surface, border: `1px solid ${tournament?.layoutId === l.id ? COLORS.accent : COLORS.border}`, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = tournament?.layoutId === l.id ? COLORS.accent : COLORS.border}>
              {l.fieldImage && <img src={l.fieldImage} alt="" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.text }}>{l.name}</div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, display: 'flex', gap: 4, marginTop: 2 }}>
                  <LeagueBadge league={l.league} /> <YearBadge year={l.year} />
                </div>
              </div>
              {tournament?.layoutId === l.id && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.accent }}>✓</span>}
            </div>
          ));
          })()}
        </div>
      </Modal>

      {/* Create tactic modal */}
      <Modal open={tacticModal} onClose={() => setTacticModal(false)} title="New tactic"
        footer={<>
          <Btn variant="default" onClick={() => setTacticModal(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={async () => {
            if (!tacticName.trim() || !tacticTeam) return;
            const ref = await ds.addTactic(tournamentId, {
              name: tacticName.trim(), myTeamScoutedId: tacticTeam,
              steps: [{ players: [null,null,null,null,null], shots: [[],[],[],[],[]], assignments: [null,null,null,null,null], bumps: [null,null,null,null,null], description: 'Breakout' }],
            });
            setTacticModal(false);
            navigate('/tournament/' + tournamentId + '/tactic/' + ref.id);
          }} disabled={!tacticName.trim() || !tacticTeam}><Icons.Check /> Create</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={tacticName} onChange={setTacticName} placeholder="Tactic name, e.g. Snake Attack" autoFocus />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>My team</div>
            <Select value={tacticTeam} onChange={setTacticTeam} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— select —</option>
              {scouted.map(s => { const t = teams.find(x => x.id === s.teamId); return t ? <option key={s.id} value={s.id}>{t.name}</option> : null; })}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
