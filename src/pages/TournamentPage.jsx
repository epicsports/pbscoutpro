import React, { useState, useRef, useEffect } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import ScheduleImport from '../components/ScheduleImport';
import { Btn, Card, SectionTitle, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge , ConfirmModal} from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts, useTactics, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS , responsive } from '../utils/theme';
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
  const linkedLayout = field.layout;
  const alreadyIds = scouted.map(s => s.teamId);
  const available = teams.filter(t => !alreadyIds.includes(t.id) && (t.leagues || []).includes(tournament.league));

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
    const teamRoster = players.filter(p => p.teamId === teamId).map(p => p.id);
    await ds.addScoutedTeam(tournamentId, {
      teamId, roster: teamRoster,
      division: activeDivision !== 'all' ? activeDivision : null,
    });
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent }}>
          <Icons.Back />
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 500 }}>Start</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap * 2 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setInfoCollapsed(v => !v)}>
            <SectionTitle>{tournament.name} <LeagueBadge league={tournament.league} /> <YearBadge year={tournament.year} /></SectionTitle>
            <span style={{ color: COLORS.textMuted, fontSize: 18 }}>{infoCollapsed ? '▸' : '▾'}</span>
          </div>
          <Btn variant="ghost" size="sm" onClick={openEdit}><Icons.Edit /> Edit</Btn>
        </div>

        {(tournament.location || tournament.date || tournament.division || tournament.rules) && (
          <div style={{ padding: 10, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            {tournament.division && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>{tournament.division}</div>}
            {tournament.location && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📍 {tournament.location}</div>}
            {tournament.date && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📅 {tournament.date}</div>}
            {tournament.rules && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📋 {tournament.rules}</div>}
          </div>
        )}

        {!infoCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Field + Disco/Zeeker lines */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Field layout {linkedLayout && <span style={{ color: COLORS.accent, textTransform: 'none' }}>({linkedLayout.name})</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <Btn variant="accent" onClick={() => setLayoutPicker(true)}>🗺️ {field.hasLayout ? 'Change layout' : 'Select layout'}</Btn>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFieldUpload} style={{ display: 'none' }} />
            <Btn variant="default" size="sm" onClick={() => fileRef.current?.click()}><Icons.Image /> Upload custom</Btn>
            {field.fieldImage && !field.hasLayout && (
              <Btn variant="ghost" size="sm" onClick={async () => {
                const ref = await ds.addLayout({
                  name: `${tournament.name} ${tournament.year || ''}`.trim(),
                  league: tournament.league, year: tournament.year,
                  fieldImage: field.fieldImage,
                  discoLine: field.discoLine, zeekerLine: field.zeekerLine,
                });
                await ds.updateTournament(tournamentId, { layoutId: ref.id });
              }}>💾 Save as layout</Btn>
            )}
            {field.hasLayout && (
              <Btn variant="ghost" size="sm" onClick={() => ds.updateTournament(tournamentId, { layoutId: null })}>✕ Unlink</Btn>
            )}
          </div>
          {field.fieldImage && (
            <div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                {field.discoLine > 0 && <Btn variant={showLines ? 'accent' : 'default'} size="sm" onClick={() => setShowLines(v => !v)} style={{ padding: '0 8px' }}>〰️ Lines</Btn>}
                {field.bunkers?.length > 0 && <Btn variant={showBunkers ? 'accent' : 'default'} size="sm" onClick={() => setShowBunkers(v => !v)} style={{ padding: '0 8px' }}>🏷️ Bunkers</Btn>}
                {(field.dangerZone?.length >= 3 || field.sajgonZone?.length >= 3) && <Btn variant={showZones ? 'accent' : 'default'} size="sm" onClick={() => setShowZones(v => !v)} style={{ padding: '0 8px' }}>⚠️ Zones</Btn>}
              </div>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
                <img src={field.fieldImage} alt="Field" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 300 }} />
                {showLines && field.discoLine > 0 && <>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: `${field.discoLine * 100}%`, borderTop: '2px dashed #f97316', pointerEvents: 'none' }}>
                    <span style={{ position: 'absolute', right: 4, top: -14, fontFamily: FONT, fontSize: 9, color: '#f97316', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: 3 }}>DISCO</span>
                  </div>
                  <div style={{ position: 'absolute', left: 0, right: 0, top: `${field.zeekerLine * 100}%`, borderTop: '2px dashed #3b82f6', pointerEvents: 'none' }}>
                    <span style={{ position: 'absolute', right: 4, top: -14, fontFamily: FONT, fontSize: 9, color: '#3b82f6', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: 3 }}>ZEEKER</span>
                  </div>
                </>}
                {showBunkers && (field.bunkers || []).map(b => (
                  <div key={b.id} style={{ position: 'absolute', left: `${b.x * 100}%`, top: `${b.y * 100}%`, transform: 'translate(-50%,-100%)', pointerEvents: 'none' }}>
                    <div style={{ background: 'rgba(8,12,22,0.92)', border: '1px solid #facc15', borderRadius: 4, padding: '1px 5px', fontFamily: FONT, fontSize: 8, fontWeight: 700, color: '#facc15', whiteSpace: 'nowrap' }}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Division tabs */}
        {(tournament.divisions?.length > 0) && (
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
            return (
              <Card key={st.id} icon="🏴" title={gt.name}
                subtitle={(st.roster||[]).length + ' players'}
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
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Hidden drużyny:</div>
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

          {available.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {scouted.length > 0 ? (
                <Btn variant="ghost" size="sm" onClick={() => setShowAvailable(!showAvailable)}>
                  {showAvailable ? '▼' : '▶'} Add team ({available.length})
                </Btn>
              ) : (
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Add:</div>
              )}
              {(showAvailable || !scouted.length) && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {available.slice(0, 20).map(t => (
                    <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}><Icons.Plus /> {t.name}</Btn>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tactics */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => { setTacticName(''); setTacticTeam(''); setTacticModal(true); }}>
              <Icons.Plus /> Taktyka
            </Btn>
          }>📐 Tactics</SectionTitle>

          {/* Layout-level tactics (global for this field) */}
          {layoutTactics.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                🗺️ From layout ({linkedLayout?.name})
              </div>
              {layoutTactics.map(t => (
                <Card key={'lt-' + t.id} icon="🗺️" title={t.name}
                  subtitle={(t.steps?.length || 0) + ' steps · global'}
                  onClick={() => navigate('/tournament/' + tournamentId + '/tactic/' + t.id + '?layout=' + tournament.layoutId)}
                  actions={<span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                    <Btn variant="ghost" size="sm" title="Copy to tournament" onClick={async () => {
                      await ds.addTactic(tournamentId, { name: `${t.name} (copy)`, myTeamScoutedId: null, steps: t.steps || [], freehandStrokes: t.freehandStrokes || null });
                    }}>📋</Btn>
                  </span>} />
              ))}
            </div>
          )}

          {/* Tournament-level tactics */}
          {tournamentTactics.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              {layoutTactics.length > 0 && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>📌 Tournament</div>}
              {tournamentTactics.map(t => {
                const tScoutedEntry = scouted.find(s => s.id === t.myTeamScoutedId);
                const tTeam = tScoutedEntry ? teams.find(x => x.id === tScoutedEntry.teamId) : null;
                return (
                  <Card key={t.id} icon="📐" title={t.name}
                    subtitle={(tTeam?.name || '?') + ' · ' + (t.steps?.length || 0) + ' steps'}
                    onClick={() => navigate('/tournament/' + tournamentId + '/tactic/' + t.id)}
                    actions={<span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                      {tournament.layoutId && (
                        <Btn variant="ghost" size="sm" title="Add to layout library" onClick={async () => {
                          await ds.addLayoutTactic(tournament.layoutId, { name: t.name, myTeamId: tScoutedEntry?.teamId || null, steps: t.steps || [], freehandStrokes: t.freehandStrokes || null });
                        }}>🗺️↑</Btn>
                      )}
                      {isAdmin && <Btn variant="ghost" size="sm" onClick={() => ds.deleteTactic(tournamentId, t.id)}><Icons.Trash /></Btn>}
                    </span>} />
                );
              })}
            </div>
          )}

          {!tournamentTactics.length && !layoutTactics.length && <EmptyState icon="📋" text="Plan breakouts and tactics for your team" />}
        </div>

        </div>
        )}

        {/* All matches */}
        <div>
          <SectionTitle>⚔️ Matches ({(activeDivision === 'all' ? matches : matches.filter(m => m.division === activeDivision)).length})</SectionTitle>
          {!matches.length && <EmptyState icon="📋" text="Add matches from schedule or from team view" />}
          {(activeDivision === 'all' ? matches : matches.filter(m => m.division === activeDivision)).map(m => {
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const hasScore = sA > 0 || sB > 0;
            const tA = getTeamName(m.teamA), tB = getTeamName(m.teamB);
            return (
              <Card key={m.id} icon={<Icons.Target />}
                title={tA + ' vs ' + tB}
                subtitle={[m.date, m.time, hasScore && (sA + ':' + sB)].filter(Boolean).join(' · ')}
                badge={hasScore && (
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 800, color: sA > sB ? COLORS.win : sB > sA ? COLORS.loss : COLORS.textDim }}>
                    {`${sA}:${sB}`}
                  </span>
                )}
                onClick={() => navigate('/tournament/' + tournamentId + '/match/' + m.id)}
                actions={<span onClick={e => e.stopPropagation()}>
                  {isAdmin && <Btn variant="ghost" size="sm" onClick={() => {
                    const mName = getTeamName(m.teamA) + ' vs ' + getTeamName(m.teamB);
                    setDeleteMatchModal({ id: m.id, name: mName });
                    setDeleteMatchPassword('');
                  }}><Icons.Trash /></Btn>}
                </span>} />
            );
          })}
        </div>
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
                    style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>×</span>
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
      <Modal open={layoutPicker} onClose={() => setLayoutPicker(false)} title="Select layout z biblioteki">
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
              steps: [{ players: [null,null,null,null,null], shots: [{},{},{},{},{}], assignments: [null,null,null,null,null], description: 'Rozbieg' }],
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
