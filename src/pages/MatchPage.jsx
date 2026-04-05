import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FieldEditor from '../components/FieldEditor'; // used only in heatmap view
import { Btn, SectionTitle, Select, Icons, EmptyState, Modal, ConfirmModal } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, POINT_OUTCOMES, TEAM_COLORS, responsive } from '../utils/theme';
import { useTrackedSave } from '../hooks/useSaveStatus';
import { auth } from '../services/firebase';
import { pointInPolygon, mirrorPointToLeft } from '../utils/helpers';
import { useField } from '../hooks/useField';
import { useUndo } from '../hooks/useUndo';
import BottomSheet from '../components/BottomSheet';
import PageHeader from '../components/PageHeader';
import RosterGrid from '../components/RosterGrid';
import ShotDrawer from '../components/ShotDrawer';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];
const PENALTIES = ['', '141', '241', '341'];

function emptyTeam() {
  return { players: E5(), shots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5(), penalty: '' };
}

function mirrorX(p) { return p ? { ...p, x: 1 - p.x } : null; }

// Score from points
function matchScore(points) {
  if (!points?.length) return null;
  const a = points.filter(p => p.outcome === 'win_a').length;
  const b = points.filter(p => p.outcome === 'win_b').length;
  return { a, b };
}

export default function MatchPage() {
  const device = useDevice();
  const R = responsive(device.type);
    const { tournamentId, matchId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId);
  const { points, loading } = usePoints(tournamentId, matchId);
  const { layouts } = useLayouts();

  // Editor state
  const [editingId, setEditingId] = useState(null);
  const deleteConfirm = useConfirm();
  const playerDeleteConfirm = useConfirm();
  const closeMatchConfirm = useConfirm();
  const [draftA, setDraftA] = useState(emptyTeam());
  const [draftB, setDraftB] = useState(emptyTeam());
  const [activeTeam, setActiveTeam] = useState('A');
  const [fieldSide, setFieldSide] = useState('left');
  const [selPlayer, setSelPlayer] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [mode, setMode] = useState('place');
  const [saving, setSaving] = useState(false);
  const tracked = useTrackedSave();
  const [showOpponent, setShowOpponent] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [viewMode, setViewMode] = useState('auto'); // auto|heatmap|editor
  const [showBunkers, setShowBunkers] = useState(false);
  // editorZoom removed — pinch-to-zoom is built into FieldCanvas
  const [showLines, setShowLines] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [heatmapType, setHeatmapType] = useState('positions');
  const [heatmapTeam, setHeatmapTeam] = useState('A');
  const [draftComment, setDraftComment] = useState('');
  const [isOT, setIsOT] = useState(false);
  const [scoutingSide, setScoutingSide] = useState(null); // null=picker, 'home', 'away', 'observe'
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const undoStack = useUndo(10);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [onFieldRoster, setOnFieldRoster] = useState([]);
  const [rosterGridVisible, setRosterGridVisible] = useState(true);
  const [sideChange, setSideChange] = useState(false);
  const [blockedTeam, setBlockedTeam] = useState(null);
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const lastAssignA = useRef(E5());
  const lastAssignB = useRef(E5());



  const tournament = tournaments.find(t => t.id === tournamentId);
  const match = matches.find(m => m.id === matchId);
  const field = useField(tournament, layouts, true); // useField hook



  // Resolve teams
  const scoutedA = scouted.find(s => s.id === match?.teamA);
  const scoutedB = scouted.find(s => s.id === match?.teamB);
  const teamA = teams.find(t => t.id === scoutedA?.teamId);
  const teamB = teams.find(t => t.id === scoutedB?.teamId);
  const rosterA = (scoutedA?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  const rosterB = (scoutedB?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Active draft/roster
  const draft = activeTeam === 'A' ? draftA : draftB;
  const setDraft = activeTeam === 'A' ? setDraftA : setDraftB;
  const roster = activeTeam === 'A' ? rosterA : rosterB;

  // Mirrored opponent for canvas overlay
  const mirroredOpp = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.players.map(p => p ? mirrorX(p) : null);
  }, [activeTeam, draftA.players, draftB.players]);
  const mirroredOppElim = useMemo(() => {
    return (activeTeam === 'A' ? draftB : draftA).elim || E5B();
  }, [activeTeam, draftA.elim, draftB.elim]);

  // Hooks MUST be before any early return (React hooks ordering rule)
  useEffect(() => {
    if (draft.players.some(Boolean) && rosterGridVisible) setRosterGridVisible(false);
  }, [draft.players]);

  const toolbarItems = useMemo(() => {
    if (toolbarPlayer === null) return [];
    const isElim = draft.elim[toolbarPlayer];
    return [
      { icon: '👤', label: 'Assign', color: '#f59e0b', action: 'assign' },
      { icon: isElim ? '❤️' : '💀', label: isElim ? 'Alive' : 'Hit', color: '#ef4444', action: 'hit' },
      { icon: '🎯', label: 'Shot', color: '#94a3b8', action: 'shoot' },
      { icon: '✕', label: 'Del', color: '#64748b', action: 'remove' },
    ];
  }, [toolbarPlayer, draft.elim]);

  if (!tournament || !match) return <EmptyState icon="⏳" text="Loading..." />;

  // Side claim handler
  const claimSide = async (side) => {
    try {
      const uid = auth.currentUser?.uid;
      if (uid && side !== 'observe') {
        const field = side === 'home' ? 'homeScoutedBy' : 'awayScoutedBy';
        await ds.updateMatch(tournamentId, matchId, { [field]: uid });
      }
    } catch (err) {
      console.warn('claimSide error (ignored):', err);
    }
    setScoutingSide(side);
    if (side === 'home') setActiveTeam('A');
    else if (side === 'away') setActiveTeam('B');
  };

  // Side picker overlay
  if (!scoutingSide) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PageHeader back={{ to: `/tournament/${tournamentId}` }} title={match.name || 'Match'} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: COLORS.text, textAlign: 'center' }}>
            Which team are you scouting?
          </div>
          {[
            { side: 'home', team: teamA, color: TEAM_COLORS.A },
            { side: 'away', team: teamB, color: TEAM_COLORS.B },
          ].map(({ side, team, color }) => (
            <div key={side} onClick={() => claimSide(side)} style={{
              width: '100%', maxWidth: 320, padding: '18px 24px', borderRadius: 14,
              background: color + '10', border: `2px solid ${color}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: COLORS.text }}>
                {team?.name || side.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const score = matchScore(points);
  const effectiveView = viewMode === 'auto' ? (points.length > 0 && !editingId ? 'heatmap' : 'editor') : viewMode;

  // Helpers
  const sts = ds.shotsToFirestore;
  const sfs = ds.shotsFromFirestore;

  const resetDraft = () => {
    if (draftA.assign.some(Boolean)) lastAssignA.current = [...draftA.assign];
    if (draftB.assign.some(Boolean)) lastAssignB.current = [...draftB.assign];
    setDraftA(emptyTeam()); setDraftB(emptyTeam());
    setEditingId(null); setSelPlayer(null); setMode('place'); setActiveTeam('A');
    setOutcome(null); setShowOpponent(false);
    setDraftComment(''); setIsOT(false);
  };

  const startNewPoint = () => {
    resetDraft();
    setDraftA(prev => ({ ...prev, assign: [...lastAssignA.current] }));
    setDraftB(prev => ({ ...prev, assign: [...lastAssignB.current] }));
    setViewMode('editor');
    setRosterGridVisible(true);
    setOnFieldRoster([]);
  };

  // ─── SAVE POINT ───
  const savePoint = async () => {
    if (!draftA.players.some(Boolean) && !draftB.players.some(Boolean)) return;
    if (saving) return;
    setSaving(true);
    try {
      const makeTeamData = (d) => ({
        players: d.players, shots: sts(d.shots), assignments: d.assign,
        bumpStops: d.bumps, eliminations: d.elim, eliminationPositions: d.elimPos,
        penalty: d.penalty || null,
      });
      const data = {
        // Legacy format (backward compatible)
        teamA: makeTeamData(draftA),
        teamB: makeTeamData(draftB),
        // New split format for concurrent scouting
        homeData: { ...makeTeamData(draftA), scoutedBy: auth.currentUser?.uid || null },
        awayData: { ...makeTeamData(draftB), scoutedBy: auth.currentUser?.uid || null },
        outcome: outcome || 'pending',
        comment: draftComment || null,
        isOT: isOT || false,
        fieldSide: fieldSide,
      };

      await tracked(async () => {
        if (editingId) {
          await ds.updatePoint(tournamentId, matchId, editingId, data);
        } else {
          await ds.addPoint(tournamentId, matchId, data);
        }

        const allPoints = editingId
          ? points.map(p => p.id === editingId ? { ...p, outcome: outcome || 'pending' } : p)
          : [...points, { outcome: outcome || 'pending' }];
        const scoreA = allPoints.filter(p => p.outcome === 'win_a').length;
        const scoreB = allPoints.filter(p => p.outcome === 'win_b').length;
        await ds.updateMatch(tournamentId, matchId, { scoreA, scoreB });
      });

      resetDraft();
      setViewMode('auto');
      setRosterGridVisible(true);
      setOnFieldRoster([]);
    } catch (e) {
      console.error('Save failed:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    }
    setSaving(false);
  };

  const editPoint = (pt) => {
    const tA = pt.teamA || {};
    const tB = pt.teamB || {};
    setDraftA({
      players: [...(tA.players || E5())], shots: sfs(tA.shots).map(s => [...(s||[])]),
      assign: [...(tA.assignments || E5())], bumps: [...(tA.bumpStops || E5())],
      elim: [...(tA.eliminations || E5B())], elimPos: [...(tA.eliminationPositions || E5())],
      penalty: tA.penalty || '',
    });
    setDraftB({
      players: [...(tB.players || E5())], shots: sfs(tB.shots).map(s => [...(s||[])]),
      assign: [...(tB.assignments || E5())], bumps: [...(tB.bumpStops || E5())],
      elim: [...(tB.eliminations || E5B())], elimPos: [...(tB.eliminationPositions || E5())],
      penalty: tB.penalty || '',
    });
    setOutcome(pt.outcome || null);
    setDraftComment(pt.comment || '');
    setIsOT(pt.isOT || false);
    setEditingId(pt.id); setSelPlayer(null); setMode('place'); setActiveTeam('A');
    setFieldSide(pt.fieldSide || 'left');
    if ((tB.players || E5()).some(Boolean)) setShowOpponent(true);
    setViewMode('editor');
  };

  const handleDeletePoint = async (pid) => {
    await ds.deletePoint(tournamentId, matchId, pid);
    // Recalculate score after deletion
    const remaining = points.filter(p => p.id !== pid);
    const scoreA = remaining.filter(p => p.outcome === 'win_a').length;
    const scoreB = remaining.filter(p => p.outcome === 'win_b').length;
    await ds.updateMatch(tournamentId, matchId, { scoreA, scoreB });
    if (editingId === pid) resetDraft();
  };

  // Undo: snapshot before each mutation
  const pushUndo = () => undoStack.push({ draftA: JSON.parse(JSON.stringify(draftA)), draftB: JSON.parse(JSON.stringify(draftB)), selPlayer, outcome });
  const handleUndo = () => {
    const prev = undoStack.undo();
    if (!prev) return;
    setDraftA(prev.draftA); setDraftB(prev.draftB);
    setSelPlayer(prev.selPlayer); setOutcome(prev.outcome);
  };

  // Canvas handlers
  const toggleRosterPlayer = (playerId) => {
    setOnFieldRoster(prev => {
      if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
      if (prev.length >= 5) return prev;
      return [...prev, playerId];
    });
  };

  const handleToolbarAction = (action, idx) => {
    if (action === 'close') { setToolbarPlayer(null); return; }
    if (action === 'hit') { pushUndo(); toggleElim(idx); setToolbarPlayer(null); }
    if (action === 'shoot') { setShotMode(idx); setToolbarPlayer(null); }
    if (action === 'remove') {
      setToolbarPlayer(null);
      playerDeleteConfirm.ask(idx);
    }
    if (action === 'assign') { setAssignTarget(idx); setToolbarPlayer(null); }
  };

  const handleSelectPlayer = (idx) => {
    setToolbarPlayer(toolbarPlayer === idx ? null : idx);
  };

  const handlePlacePlayer = (pos) => {
    pushUndo();
    setDraft(prev => {
      const n = { ...prev, players: [...prev.players], bumps: [...prev.bumps], assign: [...prev.assign] };
      const idx = n.players.findIndex(p => p === null);
      if (idx >= 0) {
        n.players[idx] = pos;
        const lastRef = activeTeam === 'A' ? lastAssignA : lastAssignB;
        if (!n.assign[idx] && lastRef.current[idx]) n.assign[idx] = lastRef.current[idx];
        setSelPlayer(idx);
      }
      return n;
    });
  };
  // handleSelectPlayer defined above with toolbar integration
  const handleMovePlayer = (idx, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; }); };
  const removePlayer = (idx) => { pushUndo();
    setDraft(prev => ({ ...prev, players: prev.players.map((p,i)=>i===idx?null:p), shots: prev.shots.map((s,i)=>i===idx?[]:[...s]), bumps: prev.bumps.map((b,i)=>i===idx?null:b), elim: prev.elim.map((e,i)=>i===idx?false:e), elimPos: prev.elimPos.map((e,i)=>i===idx?null:e), assign: prev.assign.map((a,i)=>i===idx?null:a) }));
    setSelPlayer(null);
  };
  const handlePlaceShot = (pi, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].push(pos); return n; }); };
  const handleDeleteShot = (pi, si) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].splice(si,1); return n; }); };
  // Bump is now handled by drag on canvas (onBumpPlayer prop)
  const handleBumpStop = () => {}; // no-op — kept for FieldCanvas prop compatibility
  const toggleElim = (idx) => { pushUndo(); setDraft(prev => { const n = { ...prev, elim: [...prev.elim] }; n.elim[idx] = !n.elim[idx]; return n; }); };

  const getChipLabel = (idx) => {
    const ap = draft.assign[idx];
    const rp = ap ? roster.find(p => p.id === ap) : null;
    return rp ? `#${rp.number} ${rp.nickname || rp.name.split(' ').pop()}` : `P${idx+1}`;
  };

  const getHeatmapPoints = (side) => {
    if (side === 'both') {
      return points.flatMap(pt => {
        const results = [];
        const ptSide = pt.fieldSide || 'left';
        if (pt.teamA) results.push({ ...mirrorPointToLeft(pt.teamA, ptSide), shots: sfs(pt.teamA.shots), outcome: pt.outcome, side: 'A' });
        if (pt.teamB) results.push({ ...mirrorPointToLeft(pt.teamB, ptSide), shots: sfs(pt.teamB.shots), outcome: pt.outcome, side: 'B' });
        return results;
      });
    }
    return points.map(pt => {
      const d = side === 'A' ? (pt.homeData || pt.teamA) : (pt.awayData || pt.teamB);
      if (!d) return null;
      const mirrored = mirrorPointToLeft(d, pt.fieldSide);
      return { ...mirrored, shots: sfs(d.shots), outcome: pt.outcome };
    }).filter(Boolean);
  };

  // ═══ HEATMAP VIEW ═══
  if (effectiveView === 'heatmap') {
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <PageHeader
          back={{ label: 'Home', to: '/' }}
          title={match.name || 'Match'}
        />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Score */}
          {score && (
            <div style={{ padding: `8px ${R.layout.padding}px`, background: COLORS.surfaceLight, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, borderBottom: `1px solid ${COLORS.border}` }}>
              <span onClick={() => setHeatmapTeam('A')} style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, cursor: 'pointer', color: heatmapTeam === 'A' ? COLORS.accent : COLORS.text }}>{teamA?.name || 'A'}</span>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXl, fontWeight: 800, color: score.a > score.b ? COLORS.win : score.b > score.a ? COLORS.loss : COLORS.textDim, padding: '2px 12px', background: COLORS.bg, borderRadius: 8 }}>
                {score.a} : {score.b}
              </span>
              <span onClick={() => setHeatmapTeam('B')} style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, cursor: 'pointer', color: heatmapTeam === 'B' ? COLORS.accent : COLORS.text }}>{teamB?.name || 'B'}</span>
              <span onClick={() => setHeatmapTeam('both')} style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 600, cursor: 'pointer', color: heatmapTeam === 'both' ? COLORS.accent : COLORS.textMuted, padding: '2px 6px', borderRadius: 4, border: `1px solid ${heatmapTeam === 'both' ? COLORS.accent : COLORS.border}` }}>Both</span>
            </div>
          )}
          {/* Controls */}
          <div style={{ padding: `10px ${R.layout.padding}px`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }} />
            <Btn variant="default" active={heatmapType==='positions'} size="sm" onClick={() => setHeatmapType('positions')}><Icons.Heat /> Positions</Btn>
            <Btn variant="default" active={heatmapType==='shooting'} size="sm" onClick={() => setHeatmapType('shooting')}><Icons.Target /> Shots</Btn>
          </div>
          <div onClick={startNewPoint} title="Click to add a new point">
            <FieldEditor
              hasBunkers={!!field.bunkers?.length} hasZones={!!(field.dangerZone || field.sajgonZone)} hasLines
              showBunkers={showBunkers} onShowBunkers={setShowBunkers}
              showZones={showZones} onShowZones={setShowZones}
              showLines={showLines} onShowLines={setShowLines}
            >
              <HeatmapCanvas fieldImage={field.fieldImage} points={getHeatmapPoints(heatmapTeam)} mode={heatmapType}
                rosterPlayers={heatmapTeam === 'both' ? [...rosterA, ...rosterB] : heatmapTeam === 'A' ? rosterA : rosterB}
                bunkers={field.bunkers || []} showBunkers={showBunkers}
                dangerZone={field.dangerZone} sajgonZone={field.sajgonZone} showZones={showZones}
                discoLine={showLines ? (field.discoLine || 0) : 0}
                zeekerLine={showLines ? (field.zeekerLine || 0) : 0} />
            </FieldEditor>
          </div>
          {/* Points list */}
          <div style={{ padding: `8px ${R.layout.padding}px`, borderTop: `1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Points ({points.length})
            </div>
            {points.map((pt, idx) => {
              const oc = pt.outcome;
              const oColor = oc === 'win_a' ? COLORS.win : oc === 'win_b' ? COLORS.loss : oc === 'timeout' ? COLORS.timeout : COLORS.textMuted;
              const oLabel = oc === 'win_a' ? teamA?.name?.slice(0,3) : oc === 'win_b' ? teamB?.name?.slice(0,3) : oc === 'timeout' ? 'T' : '—';
              const elimA = (pt.teamA?.eliminations || []).filter(Boolean).length;
              const elimB = (pt.teamB?.eliminations || []).filter(Boolean).length;
              // DANGER/SAJGON detection — check if opponent players are above Disco or below Zeeker
              const oppPlayers = (pt.teamB?.players || []).filter(Boolean);
              // Polygon-based zone detection (falls back to line-based if no zones defined)
              const hasDanger = field.dangerZone?.length >= 3
                ? oppPlayers.some(p => pointInPolygon(p, field.dangerZone))
                : oppPlayers.some(p => p.y < (field.discoLine || 0.30));
              const hasSajgon = field.sajgonZone?.length >= 3
                ? oppPlayers.some(p => pointInPolygon(p, field.sajgonZone))
                : oppPlayers.some(p => p.y > (field.zeekerLine || 0.80));
              return (
                <div key={pt.id} className="fade-in" onClick={() => editPoint(pt)} style={{
                  display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                  cursor: 'pointer', background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                  transition: 'border-color 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent}
                  onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                  {/* Comment line — shown first if exists */}
                  {pt.comment && (
                    <div style={{
                      fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.4,
                    }}>💬 {pt.comment}</div>
                  )}
                  {/* Main badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: TOUCH.minTarget }}>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 800, color: COLORS.accent, width: 28 }}>#{idx+1}</span>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, color: oColor, background: oColor+'20', padding: '3px 8px', borderRadius: 4 }}>{oLabel}</span>
                    {pt.isOT && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, color: COLORS.accent, background: COLORS.accent+'20', padding: '2px 6px', borderRadius: 3 }}>OT</span>}
                    {pt.teamA?.penalty && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.danger, fontWeight: 700 }}>{pt.teamA.penalty}</span>}
                    {(elimA > 0 || elimB > 0) && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>A{elimA} B{elimB}</span>}
                    {hasDanger && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, color: '#ef4444', background: '#ef444420', padding: '2px 6px', borderRadius: 3 }}>⚠ DANGER</span>}
                    {hasSajgon && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, color: '#3b82f6', background: '#3b82f620', padding: '2px 6px', borderRadius: 3 }}>⚠ SAJGON</span>}
                    <div style={{ flex: 1 }} />
                    <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); deleteConfirm.ask(pt.id); }}><Icons.Trash /></Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: `12px ${R.layout.padding}px`, borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface }}>
          <Btn variant="accent" onClick={startNewPoint} style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
            <Icons.Plus /> ADD POINT
          </Btn>
        </div>

      <ConfirmModal {...deleteConfirm.modalProps(
        (id) => handleDeletePoint(id),
        { title: 'Delete point?', message: 'This action cannot be undone.', confirmLabel: 'Delete' }
      )} />
      </div>
    );
  }

  // ═══ EDITOR VIEW ═══
  return (
    <div style={{ height: '100dvh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ═══ COMPACT HEADER ═══ */}
      <div style={{ padding: '10px 16px', background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, textAlign: 'center', position: 'relative' }}>
        <div onClick={() => navigate(`/tournament/${tournamentId}`)}
          style={{ position: 'absolute', left: 16, top: 10, fontSize: 22, color: COLORS.textDim, cursor: 'pointer', fontWeight: 300 }}>‹</div>
        <div style={{
          padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800, letterSpacing: '.5px',
          position: 'absolute', right: 16, top: 12,
          background: match?.status === 'closed' ? '#22c55e18' : COLORS.accent,
          color: match?.status === 'closed' ? '#22c55e' : '#000',
          border: match?.status === 'closed' ? '1px solid #22c55e40' : 'none',
        }}>{match?.status === 'closed' ? 'FINAL' : 'LIVE'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text, letterSpacing: '-.3px',
          padding: '0 40px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {(activeTeam === 'A' ? teamA : teamB)?.name || 'Team'}{' '}
          <span style={{ fontWeight: 400, color: COLORS.textDim, fontSize: 13 }}>vs {(activeTeam === 'A' ? teamB : teamA)?.name || '?'}</span>
        </div>
        <div style={{ marginTop: 3 }}>
          <span onClick={() => {
              setFieldSide(s => s === 'left' ? 'right' : 'left');
              // Mirror placed players to opposite side
              setDraft(prev => ({
                ...prev,
                players: prev.players.map(p => p ? { ...p, x: 1 - p.x } : null),
                bumps: prev.bumps.map(b => b ? { ...b, x: 1 - b.x } : null),
                shots: prev.shots.map(arr => (arr || []).map(s => s ? { ...s, x: 1 - s.x } : null)),
              }));
            }}
            style={{
              fontFamily: FONT, fontSize: 12, color: COLORS.textDim, cursor: 'pointer',
            }}>
            from <span style={{
              fontWeight: 700, color: TEAM_COLORS[activeTeam],
              textDecoration: 'underline', textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
            }}>{fieldSide === 'left' ? 'LEFT' : 'RIGHT'}</span> ⇄
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Canvas */}
        <FieldCanvas fieldImage={field.fieldImage} viewportSide={fieldSide}
          maxCanvasHeight={typeof window !== 'undefined' ? window.innerHeight - 200 : 500}
          players={draft.players} shots={draft.shots} bumpStops={draft.bumps}
          eliminations={draft.elim} eliminationPositions={draft.elimPos}
          onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
          onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
          onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
          onBumpPlayer={(idx, fromPos) => { pushUndo(); setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = { x: fromPos.x, y: fromPos.y }; return n; }); }}
          editable selectedPlayer={selPlayer} mode={shotMode !== null ? 'shoot' : mode}
          toolbarPlayer={toolbarPlayer} toolbarItems={toolbarItems} onToolbarAction={handleToolbarAction}
          playerAssignments={draft.assign} rosterPlayers={roster}
          opponentPlayers={showOpponent ? mirroredOpp : undefined}
          opponentEliminations={showOpponent ? mirroredOppElim : []}
          opponentAssignments={activeTeam==='A' ? draftB.assign : draftA.assign}
          opponentRosterPlayers={activeTeam==='A' ? rosterB : rosterA}
          showOpponentLayer={showOpponent}
          opponentColor={activeTeam==='A' ? TEAM_COLORS.B_light : TEAM_COLORS.A_light}
          discoLine={0}
          zeekerLine={0}
          bunkers={field.bunkers || []}
          showBunkers={false} showZones={false}
          fieldCalibration={field.fieldCalibration} />

      </div>

      {/* ═══ ROSTER GRID ═══ */}
      {rosterGridVisible && (
        <RosterGrid roster={roster} selected={onFieldRoster} onToggle={toggleRosterPlayer} />
      )}

      {/* ═══ BOTTOM BAR ═══ */}
      {(() => {
        const oppColor = TEAM_COLORS[activeTeam === 'A' ? 'B' : 'A'];
        const oppName = (activeTeam === 'A' ? teamB : teamA)?.name || 'Other team';
        return (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px',
            background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
            paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          }}>
            <Btn variant="accent" style={{ width: '100%', padding: '14px 0', fontSize: 14, fontWeight: 700 }}
              onClick={() => setSaveSheetOpen(true)}>✓ Save point</Btn>
            <div onClick={() => {
              // Check concurrent scouting block
              const targetTeam = activeTeam === 'A' ? 'B' : 'A';
              const lastPt = points[points.length - 1];
              const targetData = targetTeam === 'A' ? (lastPt?.homeData || lastPt?.teamA) : (lastPt?.awayData || lastPt?.teamB);
              const scoutedBy = targetData?.scoutedBy;
              const myUid = auth.currentUser?.uid;
              if (scoutedBy && scoutedBy !== myUid) { setBlockedTeam(targetTeam); return; }
              setActiveTeam(targetTeam);
              setFieldSide(s => s === 'left' ? 'right' : 'left');
              setToolbarPlayer(null); setShotMode(null); setSelPlayer(null);
              setRosterGridVisible(true);
            }} style={{
              width: '100%', padding: '14px 0', textAlign: 'center',
              fontSize: 14, fontWeight: 600, borderRadius: 12, cursor: 'pointer',
              border: `1px solid ${oppColor}30`, background: oppColor + '10', color: oppColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FONT,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: oppColor }} />
              Scout {oppName}
            </div>
          </div>
        );
      })()}

      {/* ═══ SHOT DRAWER ═══ */}
      <ShotDrawer
        open={shotMode !== null}
        onClose={() => setShotMode(null)}
        playerIndex={shotMode}
        playerLabel={shotMode !== null ? getChipLabel(shotMode) || `P${shotMode + 1}` : ''}
        playerColor={shotMode !== null ? COLORS.playerColors[shotMode] : '#fff'}
        fieldSide={fieldSide}
        fieldImage={field.fieldImage}
        bunkers={field.bunkers || []}
        shots={shotMode !== null ? (draft.shots[shotMode] || []) : []}
        onAddShot={pos => { if (shotMode !== null) { pushUndo(); handlePlaceShot(shotMode, pos); } }}
        onUndoShot={() => { if (shotMode !== null && draft.shots[shotMode]?.length) { pushUndo(); handleDeleteShot(shotMode, draft.shots[shotMode].length - 1); } }}
      />

      {/* ═══ SAVE BOTTOM SHEET ═══ */}
      <BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)} maxHeight="auto">
        {/* Question */}
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: COLORS.textDim, textAlign: 'center', marginBottom: 14 }}>
          Who won this point?
        </div>

        {/* Outcome cards */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { val: 'win_a', label: teamA?.name?.slice(0, 10) || 'A' },
            { val: 'win_b', label: teamB?.name?.slice(0, 10) || 'B' },
          ].map(o => (
            <div key={o.val} onClick={() => setOutcome(outcome === o.val ? null : o.val)}
              style={{
                flex: 1, padding: '16px 8px 14px', borderRadius: 14, textAlign: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                border: `2px solid ${outcome === o.val ? '#22c55e50' : COLORS.border}`,
                background: outcome === o.val ? '#22c55e08' : '#0f172a',
              }}>
              <div style={{
                fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: 1,
                color: outcome === o.val ? '#22c55e' : 'transparent',
                marginBottom: 6, height: 14,
              }}>{outcome === o.val ? 'WINNER' : '\u00A0'}</div>
              <div style={{
                fontFamily: FONT, fontSize: 15, fontWeight: 700,
                color: outcome === o.val ? COLORS.text : COLORS.textMuted,
                position: 'relative', zIndex: 1,
              }}>{o.label}</div>
              {outcome === o.val && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at bottom center, rgba(34,197,94,0.12) 0%, transparent 70%)',
                }} />
              )}
            </div>
          ))}
          <div onClick={() => setOutcome(outcome === 'timeout' ? null : 'timeout')}
            style={{
              flex: '0 0 54px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 14, cursor: 'pointer',
              border: `2px solid ${outcome === 'timeout' ? '#f59e0b50' : COLORS.border}`,
              background: outcome === 'timeout' ? '#f59e0b08' : '#0f172a',
              fontSize: 20,
            }}>⏱</div>
        </div>

        {/* Side change — inline pill */}
        {!editingId && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: 20 }}>
            <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, fontWeight: 500 }}>Next point</span>
            <div style={{ display: 'flex', background: '#0f172a', borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: 3 }}>
              <div onClick={() => setSideChange(false)} style={{
                padding: '8px 16px', borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', color: !sideChange ? '#f59e0b' : '#475569',
                background: !sideChange ? '#1e293b' : 'transparent',
              }}>Same</div>
              <div onClick={() => setSideChange(true)} style={{
                padding: '8px 16px', borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', color: sideChange ? '#f59e0b' : '#475569',
                background: sideChange ? '#1e293b' : 'transparent',
              }}>Swap sides</div>
            </div>
          </div>
        )}

        {/* Save button */}
        <Btn variant="accent" disabled={!outcome || saving}
          onClick={async () => {
            await savePoint();
            if (sideChange) setFieldSide(s => s === 'left' ? 'right' : 'left');
            setSideChange(false);
            setSaveSheetOpen(false);
          }}
          style={{
            width: '100%', justifyContent: 'center', minHeight: 52, fontWeight: 700, fontSize: 15,
            borderRadius: 14,
            background: outcome ? 'linear-gradient(135deg, #f59e0b, #ef8b00)' : '#1e293b',
            color: outcome ? '#000' : '#475569',
            boxShadow: outcome ? '0 4px 24px #f59e0b25' : 'none',
            border: 'none',
          }}>
          {saving ? 'Saving...' : outcome ? 'Save point' : 'Select winner to save'}
        </Btn>

        {/* More options — hidden by default */}
        <div onClick={() => setMoreInfoOpen(v => !v)}
          style={{ textAlign: 'center', padding: '14px 0 0', fontFamily: FONT, fontSize: 11, color: '#475569', cursor: 'pointer' }}>
          {moreInfoOpen ? '− hide options' : '+ penalties · overtime · notes'}
        </div>

        {moreInfoOpen && (
          <div style={{ paddingTop: 14, marginTop: 12, borderTop: '1px solid #1e293b20', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, fontWeight: 500, minWidth: 65 }}>Penalties</span>
              <Select value={draftA.penalty} onChange={v => setDraftA(prev => ({ ...prev, penalty: v }))}
                style={{ flex: 1, background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
                <option value="">{teamA?.name?.slice(0,6)} — none</option>
                {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select value={draftB.penalty} onChange={v => setDraftB(prev => ({ ...prev, penalty: v }))}
                style={{ flex: 1, background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
                <option value="">{teamB?.name?.slice(0,6)} — none</option>
                {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
            {/* OT toggle */}
            <div onClick={() => setIsOT(!isOT)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div style={{
                width: 44, height: 26, borderRadius: 13, padding: 3,
                background: isOT ? '#f59e0b' : '#1e293b', transition: 'background .2s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 10, background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'transform .2s',
                  transform: isOT ? 'translateX(18px)' : 'translateX(0)',
                }} />
              </div>
              <span style={{ fontFamily: FONT, fontSize: 13, color: isOT ? '#f59e0b' : COLORS.textMuted }}>Overtime</span>
            </div>
            <input value={draftComment} onChange={e => setDraftComment(e.target.value)}
              placeholder="Quick note (optional)"
              style={{
                fontFamily: FONT, fontSize: 12, padding: '10px 14px', borderRadius: 10,
                background: '#0f172a', color: COLORS.textMuted, border: `1px solid ${COLORS.border}`,
                width: '100%', outline: 'none', boxSizing: 'border-box',
              }} />
          </div>
        )}

        {/* Close match */}
        {!editingId && (
          <div onClick={() => { closeMatchConfirm.ask(true); setSaveSheetOpen(false); }}
            style={{ textAlign: 'center', padding: '10px 0 0', fontFamily: FONT, fontSize: 10, color: '#334155', cursor: 'pointer' }}>
            Close match (mark as final)
          </div>
        )}
      </BottomSheet>

      {/* ═══ ASSIGN BOTTOM SHEET ═══ */}
      <BottomSheet open={assignTarget !== null} onClose={() => setAssignTarget(null)}>
        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
          Assign {assignTarget !== null ? getChipLabel(assignTarget) : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {roster.map(r => {
            const taken = draft.assign.some((a, i) => a === r.id && i !== assignTarget);
            return (
              <div key={r.id} onClick={() => {
                if (taken) return;
                pushUndo();
                setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[assignTarget] = r.id; return n; });
                setAssignTarget(null);
              }}
                style={{
                  padding: '12px 8px', borderRadius: 12, textAlign: 'center',
                  cursor: taken ? 'default' : 'pointer', opacity: taken ? 0.25 : 1,
                  background: '#0f172a', border: `1.5px solid ${COLORS.border}`,
                }}>
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>#{r.number}</div>
                <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  {(r.nickname || r.name || '').slice(0, 5)}
                </div>
              </div>
            );
          })}
        </div>
        {assignTarget !== null && draft.assign[assignTarget] && (
          <div onClick={() => {
            pushUndo();
            setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[assignTarget] = null; return n; });
            setAssignTarget(null);
          }}
            style={{ textAlign: 'center', padding: '12px 0 0', fontFamily: FONT, fontSize: 12, color: COLORS.textDim, cursor: 'pointer' }}>
            Unassign
          </div>
        )}
      </BottomSheet>

      {/* Delete point confirmation */}
      <ConfirmModal {...deleteConfirm.modalProps(
        (id) => handleDeletePoint(id),
        { title: 'Delete point?', message: 'This action cannot be undone.', confirmLabel: 'Delete' }
      )} />

      {/* Concurrent scouting blocker */}
      {blockedTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80 }}>
          <div style={{ background: COLORS.surface, borderRadius: 16, padding: 24, textAlign: 'center', maxWidth: 280 }}>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: FONT, color: COLORS.text, marginBottom: 8 }}>
              Another coach is scouting {(blockedTeam === 'A' ? teamA : teamB)?.name}
            </div>
            <div style={{ fontSize: 12, fontFamily: FONT, color: COLORS.textDim, marginBottom: 16 }}>
              You can continue scouting your team.
            </div>
            <Btn variant="default" onClick={() => setBlockedTeam(null)}>
              Back to {(activeTeam === 'A' ? teamA : teamB)?.name}
            </Btn>
          </div>
        </div>
      )}

      {/* Close match confirmation */}
      <ConfirmModal {...closeMatchConfirm.modalProps(
        async () => { await ds.updateMatch(tournamentId, matchId, { status: 'closed' }); },
        { title: 'Close match', message: 'Mark this match as FINAL? No more points can be added.', confirmLabel: 'Close match' }
      )} />

      {/* Remove player confirmation */}
      <ConfirmModal {...playerDeleteConfirm.modalProps(
        (idx) => { pushUndo(); removePlayer(idx); },
        { title: 'Remove player?', message: 'Remove this player from the field?', confirmLabel: 'Remove' }
      )} />
    </div>
  );
}
