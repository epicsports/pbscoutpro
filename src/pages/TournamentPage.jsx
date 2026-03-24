import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ScheduleImport from '../components/ScheduleImport';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePlayers, useLayouts, useTactics, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS } from '../utils/theme';
import { compressImage, yearOptions, resolveField } from '../utils/helpers';

export default function TournamentPage() {
  const { tournamentId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted, loading } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { layouts } = useLayouts();
  const { tactics: tournamentTactics } = useTactics(tournamentId);
  const tournamentRef = tournaments.find(t => t.id === tournamentId);
  const { tactics: layoutTactics } = useLayoutTactics(tournamentRef?.layoutId);
  const [deleteModal, setDeleteModal] = useState(null);
  const [layoutPicker, setLayoutPicker] = useState(false);
  const [tacticModal, setTacticModal] = useState(false);
  const [tacticName, setTacticName] = useState('');
  const [tacticTeam, setTacticTeam] = useState('');
  const [editModal, setEditModal] = useState(false);
  const [eName, setEName] = useState('');
  const [eLeague, setELeague] = useState('');
  const [eYear, setEYear] = useState('');
  const fileRef = useRef(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [hiddenTeams, setHiddenTeams] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`hidden_${tournamentId}`) || '[]'); } catch { return []; }
  });
  const [showHidden, setShowHidden] = useState(false);

  const toggleHide = (scoutedId) => {
    const next = hiddenTeams.includes(scoutedId) ? hiddenTeams.filter(id => id !== scoutedId) : [...hiddenTeams, scoutedId];
    setHiddenTeams(next);
    localStorage.setItem(`hidden_${tournamentId}`, JSON.stringify(next));
  };

  const tournament = tournaments.find(t => t.id === tournamentId);
  if (!tournament) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const field = resolveField(tournament, layouts);
  const linkedLayout = field.layout;
  const alreadyIds = scouted.map(s => s.teamId);
  const available = teams.filter(t => !alreadyIds.includes(t.id));

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
    await ds.addScoutedTeam(tournamentId, { teamId, roster: teamRoster });
  };

  const handleRemoveScouted = async (sid) => { await ds.removeScoutedTeam(tournamentId, sid); setDeleteModal(null); };

  const openEdit = () => { setEName(tournament.name); setELeague(tournament.league); setEYear(tournament.year || 2026); setEditModal(true); };
  const handleSaveEdit = async () => { await ds.updateTournament(tournamentId, { name: eName.trim(), league: eLeague, year: Number(eYear) }); setEditModal(false); };

  // Resolve team names for matches
  const getTeamName = (scoutedId) => {
    const s = scouted.find(x => x.id === scoutedId);
    const t = s ? teams.find(x => x.id === s.teamId) : null;
    return t?.name || '?';
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name]} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <SectionTitle>{tournament.name} <LeagueBadge league={tournament.league} /> <YearBadge year={tournament.year} /></SectionTitle>
          <Btn variant="ghost" size="sm" onClick={openEdit}><Icons.Edit /> Edytuj</Btn>
        </div>

        {(tournament.location || tournament.date || tournament.division || tournament.rules) && (
          <div style={{ padding: 10, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
            {tournament.division && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>{tournament.division}</div>}
            {tournament.location && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📍 {tournament.location}</div>}
            {tournament.date && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📅 {tournament.date}</div>}
            {tournament.rules && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>📋 {tournament.rules}</div>}
          </div>
        )}

        {/* Field + Disco/Zeeker lines */}
        <div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Layout pola {linkedLayout && <span style={{ color: COLORS.accent, textTransform: 'none' }}>({linkedLayout.name})</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <Btn variant="accent" onClick={() => setLayoutPicker(true)}>🗺️ {field.hasLayout ? 'Zmień layout' : 'Wybierz layout'}</Btn>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFieldUpload} style={{ display: 'none' }} />
            <Btn variant="default" size="sm" onClick={() => fileRef.current?.click()}><Icons.Image /> Wgraj własny</Btn>
            {field.fieldImage && !field.hasLayout && (
              <Btn variant="ghost" size="sm" onClick={async () => {
                const ref = await ds.addLayout({
                  name: `${tournament.name} ${tournament.year || ''}`.trim(),
                  league: tournament.league, year: tournament.year,
                  fieldImage: field.fieldImage,
                  discoLine: field.discoLine, zeekerLine: field.zeekerLine,
                });
                await ds.updateTournament(tournamentId, { layoutId: ref.id });
              }}>💾 Zapisz jako layout</Btn>
            )}
            {field.hasLayout && (
              <Btn variant="ghost" size="sm" onClick={() => ds.updateTournament(tournamentId, { layoutId: null })}>✕ Odłącz</Btn>
            )}
          </div>
          {field.fieldImage && (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
              <img src={field.fieldImage} alt="Field" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 300 }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: `${field.discoLine * 100}%`, borderTop: '2px dashed #f97316', pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', right: 4, top: -14, fontFamily: FONT, fontSize: 9, color: '#f97316', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: 3 }}>DISCO (D)</span>
              </div>
              <div style={{ position: 'absolute', left: 0, right: 0, top: `${field.zeekerLine * 100}%`, borderTop: '2px dashed #3b82f6', pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', right: 4, top: -14, fontFamily: FONT, fontSize: 9, color: '#3b82f6', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: 3 }}>ZEEKER (S)</span>
              </div>
            </div>
          )}
          {/* Line controls — edit layout lines or tournament override */}
          {field.fieldImage && (
            <div style={{ marginTop: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#f97316', fontWeight: 700 }}>D:</span>
                <input type="range" min="10" max="50" value={Math.round(field.discoLine * 100)}
                  onChange={e => {
                    const v = Number(e.target.value) / 100;
                    if (field.hasLayout) ds.updateTournament(tournamentId, { discoLineOverride: v });
                    else ds.updateTournament(tournamentId, { discoLine: v });
                  }} style={{ width: 80 }} />
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{Math.round(field.discoLine * 100)}%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#3b82f6', fontWeight: 700 }}>Z:</span>
                <input type="range" min="50" max="95" value={Math.round(field.zeekerLine * 100)}
                  onChange={e => {
                    const v = Number(e.target.value) / 100;
                    if (field.hasLayout) ds.updateTournament(tournamentId, { zeekerLineOverride: v });
                    else ds.updateTournament(tournamentId, { zeekerLine: v });
                  }} style={{ width: 80 }} />
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{Math.round(field.zeekerLine * 100)}%</span>
              </div>
              {(tournament.discoLineOverride != null || tournament.zeekerLineOverride != null) && (
                <Btn variant="ghost" size="sm" onClick={() => ds.updateTournament(tournamentId, { discoLineOverride: null, zeekerLineOverride: null })}>
                  ↩ Reset do layoutu
                </Btn>
              )}
            </div>
          )}
        </div>

        {/* Scouted teams */}
        <div>
          <SectionTitle right={
            <div style={{ display: 'flex', gap: 6 }}>
              {hiddenTeams.length > 0 && (
                <Btn variant="ghost" size="sm" onClick={() => setShowHidden(!showHidden)}>
                  {showHidden ? `Ukryj (${hiddenTeams.length})` : `Ukryte (${hiddenTeams.length})`}
                </Btn>
              )}
              <Btn variant="accent" size="sm" onClick={() => setScheduleOpen(true)}>📷 Import</Btn>
            </div>
          }>
            🏴 Drużyny ({scouted.length - hiddenTeams.length})
          </SectionTitle>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}

          {scouted.filter(st => !hiddenTeams.includes(st.id)).map(st => {
            const gt = teams.find(g => g.id === st.teamId);
            if (!gt) return null;
            return (
              <Card key={st.id} icon="🏴" title={gt.name}
                subtitle={`${(st.roster||[]).length} zawodników`}
                onClick={() => navigate(`/tournament/${tournamentId}/team/${st.id}`)}
                actions={<span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                  <Btn variant="ghost" size="sm" onClick={() => toggleHide(st.id)} title="Ukryj">👁</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setDeleteModal({ id: st.id, name: gt.name })}><Icons.Trash /></Btn>
                </span>} />
            );
          })}

          {/* Hidden teams */}
          {showHidden && hiddenTeams.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: COLORS.surfaceLight, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Ukryte drużyny:</div>
              {scouted.filter(st => hiddenTeams.includes(st.id)).map(st => {
                const gt = teams.find(g => g.id === st.teamId);
                return gt ? (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, flex: 1 }}>{gt.name}</span>
                    <Btn variant="ghost" size="sm" onClick={() => toggleHide(st.id)}>Pokaż</Btn>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {available.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>Dodaj:</span>
              {available.slice(0, 10).map(t => (
                <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}><Icons.Plus /> {t.name}</Btn>
              ))}
            </div>
          )}
        </div>

        {/* Tactics */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => { setTacticName(''); setTacticTeam(''); setTacticModal(true); }}>
              <Icons.Plus /> Taktyka
            </Btn>
          }>⚔️ Taktyki</SectionTitle>

          {/* Layout-level tactics (global for this field) */}
          {layoutTactics.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                🗺️ Z layoutu ({linkedLayout?.name})
              </div>
              {layoutTactics.map(t => (
                <Card key={`lt-${t.id}`} icon="🗺️" title={t.name}
                  subtitle={`${t.steps?.length || 0} kroków · globalna`}
                  onClick={() => navigate(`/tournament/${tournamentId}/tactic/${t.id}?layout=${tournament.layoutId}`)}
                  actions={<span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                    <Btn variant="ghost" size="sm" title="Kopiuj do turnieju" onClick={async () => {
                      await ds.addTactic(tournamentId, { name: `${t.name} (kopia)`, myTeamScoutedId: null, steps: t.steps || [], freehandStrokes: t.freehandStrokes || null });
                    }}>📋</Btn>
                  </span>} />
              ))}
            </div>
          )}

          {/* Tournament-level tactics */}
          {tournamentTactics.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              {layoutTactics.length > 0 && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>📌 Turniejowe</div>}
              {tournamentTactics.map(t => {
                const tScoutedEntry = scouted.find(s => s.id === t.myTeamScoutedId);
                const tTeam = tScoutedEntry ? teams.find(x => x.id === tScoutedEntry.teamId) : null;
                return (
                  <Card key={t.id} icon="⚔️" title={t.name}
                    subtitle={`${tTeam?.name || '?'} · ${t.steps?.length || 0} kroków`}
                    onClick={() => navigate(`/tournament/${tournamentId}/tactic/${t.id}`)}
                    actions={<span onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 2 }}>
                      {tournament.layoutId && (
                        <Btn variant="ghost" size="sm" title="Dodaj do biblioteki layoutu" onClick={async () => {
                          await ds.addLayoutTactic(tournament.layoutId, { name: t.name, myTeamId: tScoutedEntry?.teamId || null, steps: t.steps || [], freehandStrokes: t.freehandStrokes || null });
                        }}>🗺️↑</Btn>
                      )}
                      <Btn variant="ghost" size="sm" onClick={() => ds.deleteTactic(tournamentId, t.id)}><Icons.Trash /></Btn>
                    </span>} />
                );
              })}
            </div>
          )}

          {!tournamentTactics.length && !layoutTactics.length && <EmptyState icon="📋" text="Zaplanuj rozbiegi i taktyki dla swojej drużyny" />}
        </div>

        {/* All matches */}
        <div>
          <SectionTitle>⚔️ Mecze ({matches.length})</SectionTitle>
          {!matches.length && <EmptyState icon="📋" text="Dodaj mecze z rozpiski lub z poziomu drużyny" />}
          {matches.map(m => {
            const sA = m.scoreA || 0, sB = m.scoreB || 0;
            const hasScore = sA > 0 || sB > 0;
            return (
              <Card key={m.id} icon={<Icons.Target />}
                title={`${getTeamName(m.teamA)} vs ${getTeamName(m.teamB)}`}
                subtitle={[m.date, m.time, hasScore && `${sA}:${sB}`].filter(Boolean).join(' · ')}
                badge={hasScore && (
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 800, color: sA > sB ? COLORS.win : sB > sA ? COLORS.loss : COLORS.textDim }}>
                    {sA}:{sB}
                  </span>
                )}
                onClick={() => navigate(`/tournament/${tournamentId}/match/${m.id}`)}
                actions={<span onClick={e => e.stopPropagation()}><Btn variant="ghost" size="sm" onClick={() => ds.deleteMatch(tournamentId, m.id)}><Icons.Trash /></Btn></span>} />
            );
          })}
        </div>
      </div>

      <ScheduleImport open={scheduleOpen} onClose={() => setScheduleOpen(false)}
        tournament={tournament} teams={teams} scouted={scouted} players={players}
        ds={ds} tournamentId={tournamentId} />

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edytuj turniej"
        footer={<><Btn variant="default" onClick={() => setEditModal(false)}>Anuluj</Btn><Btn variant="accent" onClick={handleSaveEdit} disabled={!eName.trim()}><Icons.Check /> Zapisz</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={eName} onChange={setEName} placeholder="Nazwa turnieju" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 6 }}>{LEAGUES.map(l => (<Btn key={l} variant="default" size="sm" active={eLeague===l} style={{ borderColor: eLeague===l?LEAGUE_COLORS[l]:COLORS.border, color: eLeague===l?LEAGUE_COLORS[l]:COLORS.textDim }} onClick={() => setELeague(l)}>{l}</Btn>))}</div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Rok</div>
              <Select value={eYear} onChange={v => setEYear(Number(v))}>{yearOptions().map(y => <option key={y} value={y}>{y}</option>)}</Select>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Usuń?"
        footer={<><Btn variant="default" onClick={() => setDeleteModal(null)}>Anuluj</Btn><Btn variant="danger" onClick={() => handleRemoveScouted(deleteModal?.id)}><Icons.Trash /> Usuń</Btn></>}>
        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim, margin: 0 }}>Usunąć <strong style={{ color: COLORS.text }}>{deleteModal?.name}</strong>?</p>
      </Modal>

      {/* Layout picker from library */}
      <Modal open={layoutPicker} onClose={() => setLayoutPicker(false)} title="Wybierz layout z biblioteki">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
          {!layouts.length && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, padding: 20, textAlign: 'center' }}>Brak layoutów. Dodaj je w 🗺️ Bibliotece layoutów.</div>}
          {layouts.map(l => (
            <div key={l.id} onClick={async () => {
              await ds.updateTournament(tournamentId, {
                layoutId: l.id,
                discoLineOverride: null, zeekerLineOverride: null,
              });
              setLayoutPicker(false);
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
          ))}
        </div>
      </Modal>

      {/* Create tactic modal */}
      <Modal open={tacticModal} onClose={() => setTacticModal(false)} title="Nowa taktyka"
        footer={<>
          <Btn variant="default" onClick={() => setTacticModal(false)}>Anuluj</Btn>
          <Btn variant="accent" onClick={async () => {
            if (!tacticName.trim() || !tacticTeam) return;
            const ref = await ds.addTactic(tournamentId, {
              name: tacticName.trim(), myTeamScoutedId: tacticTeam,
              steps: [{ players: [null,null,null,null,null], shots: [{},{},{},{},{}], assignments: [null,null,null,null,null], description: 'Rozbieg' }],
            });
            setTacticModal(false);
            navigate(`/tournament/${tournamentId}/tactic/${ref.id}`);
          }} disabled={!tacticName.trim() || !tacticTeam}><Icons.Check /> Utwórz</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={tacticName} onChange={setTacticName} placeholder="Nazwa taktyki, np. Atak Snake" autoFocus />
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Moja drużyna</div>
            <Select value={tacticTeam} onChange={setTacticTeam} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
              <option value="">— wybierz —</option>
              {scouted.map(s => { const t = teams.find(x => x.id === s.teamId); return t ? <option key={s.id} value={s.id}>{t.name}</option> : null; })}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
