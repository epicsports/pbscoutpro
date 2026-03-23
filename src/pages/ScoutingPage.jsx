import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, SectionTitle, Select, Icons, EmptyState, ScoreBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, POINT_OUTCOMES } from '../utils/theme';
import { matchScore, mirrorX } from '../utils/helpers';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];
function emptyTeamDraft() { return { players: E5(), shots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5() }; }

const PENALTIES = ['', '141', '241', '341'];

export default function ScoutingPage() {
  const { tournamentId, scoutedId, matchId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId, scoutedId);
  const { points, loading } = usePoints(tournamentId, scoutedId, matchId);

  const [activeTeam, setActiveTeam] = useState('A');
  const [draftA, setDraftA] = useState(emptyTeamDraft());
  const [draftB, setDraftB] = useState(emptyTeamDraft());
  const [editingId, setEditingId] = useState(null);
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place');
  const [saving, setSaving] = useState(false);
  const [showOpponent, setShowOpponent] = useState(false);
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [pendingBump, setPendingBump] = useState(null);
  const [outcome, setOutcome] = useState(null); // #9: track outcome separately
  const [penaltyA, setPenaltyA] = useState(''); // #16
  const [penaltyB, setPenaltyB] = useState('');
  const [viewMode, setViewMode] = useState('auto'); // 'auto'|'heatmap'|'editor'
  const [heatmapType, setHeatmapType] = useState('positions');
  const [heatmapTeam, setHeatmapTeam] = useState('A');
  const lastAssignRef = useRef(E5()); // #17: remember last assignments

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const match = matches.find(m => m.id === matchId);
  const rosterA = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  const effectiveOpponentId = opponentTeamId || match?.opponentScoutedId || '';
  const { matches: oppMatches } = useMatches(tournamentId, effectiveOpponentId || '');
  const opponentScouted = scouted.find(s => s.id === effectiveOpponentId);
  const opponentTeam = teams.find(t => t.id === opponentScouted?.teamId);
  const rosterB = (opponentScouted?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const otherScouted = scouted.filter(s => s.id !== scoutedId);

  const draft = activeTeam === 'A' ? draftA : draftB;
  const setDraft = activeTeam === 'A' ? setDraftA : setDraftB;
  const roster = activeTeam === 'A' ? rosterA : rosterB;

  const mirroredOpponent = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.players.map(p => p ? mirrorX(p) : null);
  }, [activeTeam, draftA.players, draftB.players]);
  const mirroredOpponentElim = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.elim || E5B();
  }, [activeTeam, draftA.elim, draftB.elim]);

  if (!tournament || !match) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const opponentMatchId = match?.linkedMatchId || oppMatches.find(m => m.opponentScoutedId === scoutedId)?.id || null;
  const score = matchScore(points);

  // #14: auto-detect view mode
  const effectiveView = viewMode === 'auto' ? (points.length > 0 && !editingId ? 'heatmap' : 'editor') : viewMode;

  // Firestore helpers
  const shotsToFirestore = (shots) => { const o = {}; shots.forEach((a, i) => { o[String(i)] = a || []; }); return o; };
  const shotsFromFirestore = (obj) => { if (Array.isArray(obj)) return obj; if (!obj) return E5A(); return [0,1,2,3,4].map(i => obj[String(i)] || []); };
  const invertOutcome = (o) => o === 'win' ? 'loss' : o === 'loss' ? 'win' : o;

  // ─── Draft management ───
  const resetDraft = () => {
    // #17: save current assignments for next point
    if (draftA.assign.some(Boolean)) lastAssignRef.current = [...draftA.assign];
    setDraftA(emptyTeamDraft()); setDraftB(emptyTeamDraft());
    setEditingId(null); setSelPlayer(null); setMode('place'); setActiveTeam('A');
    setPendingBump(null); setOutcome(null); setPenaltyA(''); setPenaltyB('');
  };

  const startNewPoint = () => {
    resetDraft();
    // #17: restore last assignments
    setDraftA(prev => ({ ...prev, assign: [...lastAssignRef.current] }));
    setViewMode('editor');
  };

  const switchTeam = (t) => { setActiveTeam(t); setSelPlayer(null); setMode('place'); };

  // ─── SAVE POINT ───
  const savePoint = async () => {
    if (!draftA.players.some(Boolean) || saving) return;
    setSaving(true);
    try {
      const oppScoutedId = match?.opponentScoutedId || effectiveOpponentId || null;
      const oppMatchId = match?.linkedMatchId || opponentMatchId || null;

      const dataA = {
        players: draftA.players, shots: shotsToFirestore(draftA.shots),
        assignments: draftA.assign, bumpStops: draftA.bumps,
        eliminations: draftA.elim, eliminationPositions: draftA.elimPos,
        outcome: outcome || 'pending',
        penaltyA: penaltyA || null, penaltyB: penaltyB || null,
        opponentData: draftB.players.some(Boolean) ? {
          players: draftB.players, shots: shotsToFirestore(draftB.shots),
          assignments: draftB.assign, bumpStops: draftB.bumps,
          eliminations: draftB.elim, eliminationPositions: draftB.elimPos,
          teamId: oppScoutedId,
        } : null,
        linkedOpponentScoutedId: oppScoutedId, linkedOpponentMatchId: oppMatchId,
      };

      let savedId;
      if (editingId) {
        await ds.updatePoint(tournamentId, scoutedId, matchId, editingId, dataA);
        savedId = editingId;
      } else {
        const ref = await ds.addPoint(tournamentId, scoutedId, matchId, dataA);
        savedId = ref.id;
      }

      // Sync to opponent
      if (oppScoutedId && oppMatchId) {
        const hasBData = draftB.players.some(Boolean);
        const dataB = {
          players: hasBData ? draftB.players : E5(),
          shots: hasBData ? shotsToFirestore(draftB.shots) : shotsToFirestore(E5A()),
          assignments: hasBData ? draftB.assign : E5(),
          bumpStops: hasBData ? draftB.bumps : E5(),
          eliminations: hasBData ? draftB.elim : E5B(),
          eliminationPositions: hasBData ? draftB.elimPos : E5(),
          outcome: invertOutcome(outcome || 'pending'),
          penaltyA: penaltyB || null, penaltyB: penaltyA || null,
          opponentData: {
            players: draftA.players, shots: shotsToFirestore(draftA.shots),
            assignments: draftA.assign, bumpStops: draftA.bumps,
            eliminations: draftA.elim, eliminationPositions: draftA.elimPos, teamId: scoutedId,
          },
          linkedOpponentScoutedId: scoutedId, linkedOpponentMatchId: matchId, linkedFromPointId: savedId,
        };
        if (!editingId) await ds.addPoint(tournamentId, oppScoutedId, oppMatchId, dataB);
      }

      resetDraft();
      setViewMode('auto');
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
  };

  const editPoint = (pt) => {
    setDraftA({
      players: [...(pt.players || E5())], shots: shotsFromFirestore(pt.shots).map(s => [...(s||[])]),
      assign: [...(pt.assignments || E5())], bumps: [...(pt.bumpStops || E5())],
      elim: [...(pt.eliminations || E5B())], elimPos: [...(pt.eliminationPositions || E5())],
    });
    setOutcome(pt.outcome || null);
    setPenaltyA(pt.penaltyA || ''); setPenaltyB(pt.penaltyB || '');
    if (pt.opponentData) {
      setDraftB({
        players: [...(pt.opponentData.players || E5())], shots: shotsFromFirestore(pt.opponentData.shots).map(s => [...(s||[])]),
        assign: [...(pt.opponentData.assignments || E5())], bumps: [...(pt.opponentData.bumpStops || E5())],
        elim: [...(pt.opponentData.eliminations || E5B())], elimPos: [...(pt.opponentData.eliminationPositions || E5())],
      });
      if (pt.opponentData.teamId) setOpponentTeamId(pt.opponentData.teamId);
      setShowOpponent(true);
    } else { setDraftB(emptyTeamDraft()); }
    setEditingId(pt.id); setSelPlayer(null); setMode('place'); setActiveTeam('A');
    setViewMode('editor');
  };

  const handleDeletePoint = async (pid) => { await ds.deletePoint(tournamentId, scoutedId, matchId, pid); if (editingId === pid) resetDraft(); };

  // Canvas handlers
  const handlePlacePlayer = (pos) => {
    setDraft(prev => {
      const n = { ...prev, players: [...prev.players], bumps: [...prev.bumps], assign: [...prev.assign] };
      const idx = n.players.findIndex(p => p === null);
      if (idx >= 0) {
        n.players[idx] = pos;
        if (pendingBump) n.bumps[idx] = pendingBump;
        // #17: restore assignment from last point
        if (!n.assign[idx] && lastAssignRef.current[idx]) n.assign[idx] = lastAssignRef.current[idx];
        setSelPlayer(idx);
      }
      return n;
    });
    setPendingBump(null);
  };
  const handleSelectPlayer = (idx) => { setSelPlayer(selPlayer === idx ? null : idx); };
  const handleMovePlayer = (idx, pos) => { setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; }); };
  const removePlayer = (idx) => {
    setDraft(prev => ({ ...prev, players: prev.players.map((p,i)=>i===idx?null:p), shots: prev.shots.map((s,i)=>i===idx?[]:[...s]), bumps: prev.bumps.map((b,i)=>i===idx?null:b), elim: prev.elim.map((e,i)=>i===idx?false:e), elimPos: prev.elimPos.map((e,i)=>i===idx?null:e), assign: prev.assign.map((a,i)=>i===idx?null:a) }));
    setSelPlayer(null);
  };
  const handlePlaceShot = (pi, pos) => { setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].push(pos); return n; }); };
  const handleDeleteShot = (pi, si) => { setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].splice(si,1); return n; }); };
  const handleBumpStop = (bd) => { setPendingBump(bd); };
  const toggleElim = (idx) => { setDraft(prev => { const n = { ...prev, elim: [...prev.elim] }; n.elim[idx] = !n.elim[idx]; return n; }); };
  const clearBump = (idx) => { setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = null; return n; }); };
  const getAvailableRoster = (slotIdx) => { const used = draft.assign.filter((a,i) => a && i !== slotIdx); return roster.filter(p => !used.includes(p.id)); };

  // #18: get display name for chip
  const getChipLabel = (idx) => {
    const ap = draft.assign[idx];
    const rp = ap ? roster.find(p => p.id === ap) : null;
    if (!rp) return `P${idx + 1}`;
    return `#${rp.number} ${rp.nickname || rp.name.split(' ').pop()}`;
  };

  // #11: navigate to opponent's match context
  const goToOpponentMatch = () => {
    if (effectiveOpponentId && opponentMatchId) {
      navigate(`/tournament/${tournamentId}/team/${effectiveOpponentId}/match/${opponentMatchId}`);
    }
  };

  // ═══ HEATMAP VIEW (#14) ═══
  if (effectiveView === 'heatmap') {
    return (
      <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Header breadcrumbs={[tournament.name, team?.name, match.name]} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Score */}
          {score && (
            <div style={{ padding: '8px 16px', background: COLORS.surfaceLight, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, borderBottom: `1px solid ${COLORS.border}` }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, color: COLORS.text }}>{team?.name}</span>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXl, fontWeight: 800, color: score.w > score.l ? COLORS.win : score.l > score.w ? COLORS.loss : COLORS.textDim, padding: '2px 12px', background: COLORS.bg, borderRadius: 8 }}>
                {score.w} : {score.l}
              </span>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, color: COLORS.text }}>{opponentTeam?.name || '?'}</span>
            </div>
          )}

          {/* Heatmap controls */}
          <div style={{ padding: '10px 16px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Btn variant="default" active={heatmapTeam === 'A'} size="sm" onClick={() => setHeatmapTeam('A')}>🏴 {team?.name}</Btn>
            <Btn variant="default" active={heatmapTeam === 'B'} size="sm" onClick={() => setHeatmapTeam('B')}>{opponentTeam?.name || 'Przeciwnik'}</Btn>
            <div style={{ flex: 1 }} />
            <Btn variant="default" active={heatmapType === 'positions'} size="sm" onClick={() => setHeatmapType('positions')}><Icons.Heat /> Pozycje</Btn>
            <Btn variant="default" active={heatmapType === 'shooting'} size="sm" onClick={() => setHeatmapType('shooting')}><Icons.Target /> Strzały</Btn>
          </div>

          {/* Heatmap canvas */}
          <div style={{ padding: '0 16px 8px' }}>
            <HeatmapCanvas fieldImage={tournament.fieldImage}
              points={heatmapTeam === 'A' ? points : points.map(p => p.opponentData ? { ...p.opponentData, outcome: invertOutcome(p.outcome) } : p)}
              mode={heatmapType} rosterPlayers={heatmapTeam === 'A' ? rosterA : rosterB} />
          </div>

          {/* Points list */}
          <div style={{ padding: '8px 16px', borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              Punkty ({points.length}) {score && <ScoreBadge points={points} />}
            </div>
            {points.map((pt, idx) => {
              const oColor = pt.outcome === 'win' ? COLORS.win : pt.outcome === 'loss' ? COLORS.loss : pt.outcome === 'timeout' ? COLORS.timeout : COLORS.textMuted;
              const oLabel = pt.outcome === 'win' ? 'W' : pt.outcome === 'loss' ? 'L' : pt.outcome === 'timeout' ? 'T' : '—';
              return (
                <div key={pt.id} className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, marginBottom: 3, minHeight: 38 }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, color: COLORS.accent, width: 24 }}>#{idx+1}</span>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 800, color: oColor, background: oColor+'20', padding: '2px 6px', borderRadius: 4 }}>{oLabel}</span>
                  {pt.penaltyA && <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.danger, fontWeight: 700 }}>{pt.penaltyA}</span>}
                  <div style={{ flex: 1 }} />
                  <Btn variant="ghost" size="sm" onClick={() => editPoint(pt)}><Icons.Edit /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleDeletePoint(pt.id)}><Icons.Trash /></Btn>
                </div>
              );
            })}
          </div>
        </div>

        {/* #15: Add point button */}
        <div style={{ padding: '12px 16px', borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface }}>
          <Btn variant="accent" onClick={startNewPoint} style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
            <Icons.Plus /> DODAJ PUNKT
          </Btn>
        </div>
      </div>
    );
  }

  // ═══ EDITOR VIEW ═══
  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name, team?.name, match.name]} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Score */}
        {score && (
          <div style={{ padding: '6px 16px', background: COLORS.surfaceLight, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.text }}>{team?.name}</span>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 800, color: score.w > score.l ? COLORS.win : score.l > score.w ? COLORS.loss : COLORS.textDim, padding: '2px 10px', background: COLORS.bg, borderRadius: 6 }}>
              {score.w} : {score.l}
            </span>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.text }}>{opponentTeam?.name || '?'}</span>
          </div>
        )}

        {/* Team tabs — #11: team B name clickable to navigate */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Btn variant={activeTeam === 'A' ? 'accent' : 'default'} onClick={() => switchTeam('A')} style={{ flex: 1, justifyContent: 'center', fontWeight: 800 }}>
            🏴 {team?.name || 'Drużyna A'}
          </Btn>
          <Btn variant={activeTeam === 'B' ? 'accent' : 'default'} onClick={() => switchTeam('B')} style={{ flex: 1, justifyContent: 'center', fontWeight: 800 }}>
            <span onClick={(e) => { if (activeTeam !== 'B' && opponentMatchId) { e.stopPropagation(); goToOpponentMatch(); } }}>
              <Icons.Swap /> {opponentTeam?.name || 'Przeciwnik'}
            </span>
          </Btn>
        </div>

        {/* Canvas */}
        <div style={{ padding: '4px 16px 8px' }}>
          <FieldCanvas fieldImage={tournament.fieldImage}
            players={draft.players} shots={draft.shots} bumpStops={draft.bumps}
            eliminations={draft.elim} eliminationPositions={draft.elimPos}
            onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
            onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
            onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
            editable selectedPlayer={selPlayer} mode={mode}
            playerAssignments={draft.assign} rosterPlayers={roster}
            opponentPlayers={showOpponent ? mirroredOpponent : undefined}
            opponentEliminations={showOpponent ? mirroredOpponentElim : []}
            opponentAssignments={activeTeam === 'A' ? draftB.assign : draftA.assign}
            opponentRosterPlayers={activeTeam === 'A' ? rosterB : rosterA}
            showOpponentLayer={showOpponent}
            opponentColor={activeTeam === 'A' ? '#60a5fa' : '#f87171'} />
        </div>

        {/* Mode & layer — #7: renamed label */}
        <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="default" active={mode === 'place'} onClick={() => setMode('place')}>✋ Pozycje</Btn>
          <Btn variant="default" active={mode === 'shoot'} onClick={() => setMode('shoot')}><Icons.Target /> Strzały</Btn>
          <div style={{ flex: 1 }} />
          <Btn variant={showOpponent ? 'accent' : 'default'} size="sm" onClick={() => setShowOpponent(!showOpponent)}>
            {showOpponent ? '👁 Przeciwnik ON' : '👁 Przeciwnik'}
          </Btn>
        </div>

        {/* Pending bump */}
        {pendingBump && (
          <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.bumpStop, fontWeight: 700 }}>
              ⏱ Przycupa {pendingBump.duration}s — kliknij docelową pozycję
            </span>
            <Btn variant="ghost" size="sm" onClick={() => setPendingBump(null)}>✕</Btn>
          </div>
        )}

        {/* Player chips — #18: show number + nickname at bottom */}
        <div style={{ padding: '4px 16px 4px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {draft.players.map((p, i) => {
            const isElim = draft.elim[i];
            const hasBump = !!draft.bumps[i];
            const teamColor = activeTeam === 'A' ? COLORS.playerColors[i] : '#60a5fa';
            return (
              <div key={i} onClick={() => p && setSelPlayer(selPlayer === i ? null : i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 16, minHeight: 32,
                  fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700,
                  background: p ? (isElim ? COLORS.eliminatedOverlay+'30' : teamColor+'20') : COLORS.surface,
                  border: `2px solid ${p ? teamColor+(selPlayer===i?'ff':'50') : COLORS.border}`,
                  color: p ? (isElim ? COLORS.textMuted : teamColor) : COLORS.textMuted,
                  cursor: p ? 'pointer' : 'default', opacity: isElim ? 0.6 : 1,
                }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: p ? teamColor : COLORS.textMuted+'40' }} />
                {getChipLabel(i)}
                {isElim && <span>💀</span>}
                {hasBump && <span style={{ fontSize: 8, color: COLORS.bumpStop }}>⏱{draft.bumps[i].duration}s</span>}
                {draft.shots[i]?.length > 0 && <span style={{ fontSize: 8 }}>🎯{draft.shots[i].length}</span>}
                {p && <span onClick={e => { e.stopPropagation(); removePlayer(i); }} style={{ cursor: 'pointer', opacity: 0.4, fontSize: 12, marginLeft: 2 }}>×</span>}
              </div>
            );
          })}
        </div>

        {/* Selected player controls */}
        {selPlayer !== null && draft.players[selPlayer] && (
          <div style={{ padding: '4px 16px 6px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${COLORS.border}30`, paddingTop: 8 }}>
            <Select value={draft.assign[selPlayer] || ''}
              onChange={v => setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[selPlayer] = v || null; return n; })}
              style={{ flex: 1, minWidth: 110 }}>
              <option value="">— Zawodnik —</option>
              {getAvailableRoster(selPlayer).map(p => <option key={p.id} value={p.id}>#{p.number} {p.nickname || p.name}</option>)}
            </Select>
            <Btn variant={draft.elim[selPlayer] ? 'danger' : 'default'} size="sm" onClick={() => toggleElim(selPlayer)}>
              <Icons.Skull /> {draft.elim[selPlayer] ? 'Żywy' : 'Trafiony'}
            </Btn>
            {draft.bumps[selPlayer] && <Btn variant="ghost" size="sm" onClick={() => clearBump(selPlayer)}><Icons.Reset /> Bump</Btn>}
            {mode === 'shoot' && draft.shots[selPlayer]?.length > 0 && (
              <Btn variant="ghost" size="sm" onClick={() => setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[selPlayer] = []; return n; })}><Icons.Reset /> Strzały</Btn>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '4px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="default" size="sm" onClick={resetDraft}><Icons.Reset /> Reset</Btn>
          {editingId && <Btn variant="ghost" size="sm" onClick={() => { resetDraft(); setViewMode('auto'); }}>Anuluj</Btn>}
          {points.length > 0 && !editingId && <Btn variant="ghost" size="sm" onClick={() => setViewMode('auto')}><Icons.Back /> Heatmapa</Btn>}
        </div>

        {/* #9: Outcome selector — does NOT save, just sets state. #16: penalties */}
        <div style={{ padding: '8px 16px', borderTop: `1px solid ${COLORS.border}30`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>Wynik punktu:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {POINT_OUTCOMES.map(o => (
              <Btn key={o.key} variant={outcome === o.key ? o.key : 'default'} size="sm"
                onClick={() => setOutcome(outcome === o.key ? null : o.key)}
                style={{ flex: 1, justifyContent: 'center', opacity: outcome && outcome !== o.key ? 0.4 : 1 }}>
                {o.emoji} {o.label}
              </Btn>
            ))}
          </div>
          {/* Penalties */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Kara {team?.name}:</span>
            <Select value={penaltyA} onChange={setPenaltyA} style={{ width: 70 }}>
              <option value="">—</option>
              {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Kara {opponentTeam?.name || 'Przec.'}:</span>
            <Select value={penaltyB} onChange={setPenaltyB} style={{ width: 70 }}>
              <option value="">—</option>
              {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
        </div>
      </div>

      {/* ZAPISZ — sticky bottom */}
      <div style={{ padding: '12px 16px', borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface }}>
        <Btn variant="accent" disabled={!draftA.players.some(Boolean) || saving}
          onClick={savePoint}
          style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
          <Icons.Check /> {saving ? 'Zapisywanie...' : editingId ? 'ZAPISZ ZMIANY' : 'ZAPISZ PUNKT'}
        </Btn>
      </div>
    </div>
  );
}
