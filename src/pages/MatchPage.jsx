import React, { useState, useMemo, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FieldEditor from '../components/FieldEditor';
import { Btn, SectionTitle, Select, Icons, EmptyState, ScoreBadge, Modal , PlayerChip} from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, POINT_OUTCOMES , responsive } from '../utils/theme';
import { resolveField, resolveFieldFull, pointInPolygon } from '../utils/helpers';
import { useField } from '../hooks/useField';

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
  const [deleteConfirm, setDeleteConfirm] = useState(null); // point id to confirm delete
  const [draftA, setDraftA] = useState(emptyTeam());
  const [draftB, setDraftB] = useState(emptyTeam());
  const [activeTeam, setActiveTeam] = useState('A'); // which tab is active for editing
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place');
  const [saving, setSaving] = useState(false);
  const [showOpponent, setShowOpponent] = useState(false);
  const [pendingBump, setPendingBump] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [viewMode, setViewMode] = useState('auto'); // auto|heatmap|editor
  const [showBunkers, setShowBunkers] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [heatmapType, setHeatmapType] = useState('positions');
  const [heatmapTeam, setHeatmapTeam] = useState('A');
  const [draftComment, setDraftComment] = useState('');
  const [isOT, setIsOT] = useState(false);
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

  if (!tournament || !match) return <EmptyState icon="⏳" text="Loading..." />;

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
    setPendingBump(null); setOutcome(null); setShowOpponent(false);
    setDraftComment(''); setIsOT(false);
  };

  const startNewPoint = () => {
    resetDraft();
    setDraftA(prev => ({ ...prev, assign: [...lastAssignA.current] }));
    setDraftB(prev => ({ ...prev, assign: [...lastAssignB.current] }));
    setViewMode('editor');
  };

  // ─── SAVE POINT ───
  const savePoint = async () => {
    if (!draftA.players.some(Boolean) && !draftB.players.some(Boolean)) return;
    if (saving) return;
    setSaving(true);
    try {
      const data = {
        teamA: {
          players: draftA.players, shots: sts(draftA.shots), assignments: draftA.assign,
          bumpStops: draftA.bumps, eliminations: draftA.elim, eliminationPositions: draftA.elimPos,
          penalty: draftA.penalty || null,
        },
        teamB: {
          players: draftB.players, shots: sts(draftB.shots), assignments: draftB.assign,
          bumpStops: draftB.bumps, eliminations: draftB.elim, eliminationPositions: draftB.elimPos,
          penalty: draftB.penalty || null,
        },
        outcome: outcome || 'pending',
        comment: draftComment || null,
        isOT: isOT || false,
      };

      if (editingId) {
        await ds.updatePoint(tournamentId, matchId, editingId, data);
      } else {
        await ds.addPoint(tournamentId, matchId, data);
      }

      // Update match score on the match document for quick display
      // We need to recalculate from all points — use current points + this change
      const allPoints = editingId
        ? points.map(p => p.id === editingId ? { ...p, outcome: outcome || 'pending' } : p)
        : [...points, { outcome: outcome || 'pending' }];
      const scoreA = allPoints.filter(p => p.outcome === 'win_a').length;
      const scoreB = allPoints.filter(p => p.outcome === 'win_b').length;
      await ds.updateMatch(tournamentId, matchId, { scoreA, scoreB });

      resetDraft();
      setViewMode('auto');
    } catch (e) { console.error('Save failed:', e); }
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

  // Canvas handlers
  const handlePlacePlayer = (pos) => {
    // Jeśli gracz oczekuje na pozycję docelową po przycupie — przesuń go
    if (pendingBump !== null) {
      setDraft(prev => {
        const n = { ...prev, players: [...prev.players] };
        n.players[pendingBump] = pos;
        return n;
      });
      setPendingBump(null);
      return;
    }
    // Normalnie: postaw nowego gracza
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
  const handleSelectPlayer = (idx) => setSelPlayer(selPlayer === idx ? null : idx);
  const handleMovePlayer = (idx, pos) => setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; });
  const removePlayer = (idx) => {
    setDraft(prev => ({ ...prev, players: prev.players.map((p,i)=>i===idx?null:p), shots: prev.shots.map((s,i)=>i===idx?[]:[...s]), bumps: prev.bumps.map((b,i)=>i===idx?null:b), elim: prev.elim.map((e,i)=>i===idx?false:e), elimPos: prev.elimPos.map((e,i)=>i===idx?null:e), assign: prev.assign.map((a,i)=>i===idx?null:a) }));
    setSelPlayer(null);
    if (pendingBump === idx) setPendingBump(null);
  };
  const handlePlaceShot = (pi, pos) => setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].push(pos); return n; });
  const handleDeleteShot = (pi, si) => setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].splice(si,1); return n; });
  // handleBumpStop: bump dial zwraca { x, y, duration, playerIdx }
  // Zapisujemy bump (pozycja startowa przycupy) i czekamy na kliknięcie miejsca docelowego
  const handleBumpStop = (bd) => {
    if (bd.playerIdx === undefined) return;
    setDraft(prev => {
      const n = { ...prev, bumps: [...prev.bumps] };
      // bump.x/y = obecna pozycja gracza (startowa przycupy)
      n.bumps[bd.playerIdx] = { x: bd.x, y: bd.y, duration: bd.duration };
      return n;
    });
    setPendingBump(bd.playerIdx); // czekamy na kliknięcie pozycji docelowej
  };
  const toggleElim = (idx) => setDraft(prev => { const n = { ...prev, elim: [...prev.elim] }; n.elim[idx] = !n.elim[idx]; return n; });
  const clearBump = (idx) => setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = null; return n; });
  const getAvailableRoster = (slotIdx) => { const used = draft.assign.filter((a,i)=>a&&i!==slotIdx); return roster.filter(p=>!used.includes(p.id)); };

  const getChipLabel = (idx) => {
    const ap = draft.assign[idx];
    const rp = ap ? roster.find(p => p.id === ap) : null;
    return rp ? `#${rp.number} ${rp.nickname || rp.name.split(' ').pop()}` : `P${idx+1}`;
  };

  // Heatmap data extraction — points have teamA/teamB structure
  const getHeatmapPoints = (side) => {
    return points.map(pt => {
      const d = side === 'A' ? pt.teamA : pt.teamB;
      if (!d) return null;
      return { ...d, shots: sfs(d.shots), outcome: pt.outcome };
    }).filter(Boolean);
  };

  // ═══ HEATMAP VIEW ═══
  if (effectiveView === 'heatmap') {
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Header breadcrumbs={[{label: tournament.name, path: `/tournament/${tournamentId}`}, match.name]} />
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Score */}
          {score && (
            <div style={{ padding: `8px ${R.layout.padding}px`, background: COLORS.surfaceLight, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, borderBottom: `1px solid ${COLORS.border}` }}>
              <span onClick={() => setHeatmapTeam('A')} style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, cursor: 'pointer', color: heatmapTeam === 'A' ? COLORS.accent : COLORS.text }}>{teamA?.name || 'A'}</span>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXl, fontWeight: 800, color: score.a > score.b ? COLORS.win : score.b > score.a ? COLORS.loss : COLORS.textDim, padding: '2px 12px', background: COLORS.bg, borderRadius: 8 }}>
                {score.a} : {score.b}
              </span>
              <span onClick={() => setHeatmapTeam('B')} style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, cursor: 'pointer', color: heatmapTeam === 'B' ? COLORS.accent : COLORS.text }}>{teamB?.name || 'B'}</span>
            </div>
          )}
          {/* Controls */}
          <div style={{ padding: `10px ${R.layout.padding}px`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variant="default" active={heatmapTeam==='A'} size="sm" onClick={() => setHeatmapTeam('A')}>🏴 {teamA?.name || 'A'}</Btn>
            <Btn variant="default" active={heatmapTeam==='B'} size="sm" onClick={() => setHeatmapTeam('B')}>{teamB?.name || 'B'}</Btn>
            <div style={{ flex: 1 }} />
            <Btn variant="default" active={heatmapType==='positions'} size="sm" onClick={() => setHeatmapType('positions')}><Icons.Heat /> Positions</Btn>
            <Btn variant="default" active={heatmapType==='shooting'} size="sm" onClick={() => setHeatmapType('shooting')}><Icons.Target /> Shots</Btn>
          </div>
          <div onClick={startNewPoint} title="Kliknij aby dodać nowy punkt">
            <FieldEditor
              hasBunkers={!!field.bunkers?.length} hasZones={!!(field.dangerZone || field.sajgonZone)} hasLines
              showBunkers={showBunkers} onShowBunkers={setShowBunkers}
              showZones={showZones} onShowZones={setShowZones}
              showLines={showLines} onShowLines={setShowLines}
            >
              <HeatmapCanvas fieldImage={field.fieldImage} points={getHeatmapPoints(heatmapTeam)} mode={heatmapType}
                rosterPlayers={heatmapTeam === 'A' ? rosterA : rosterB}
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
                    <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setDeleteConfirm(pt.id); }}><Icons.Trash /></Btn>
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

      <ConfirmModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}
        title="Delete point?" danger confirmLabel="Delete"
        message="This action cannot be undone."
        onConfirm={() => { handleDeletePoint(deleteConfirm); setDeleteConfirm(null); }} />
      </div>
    );
  }

  // ═══ EDITOR VIEW ═══
  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[{label: tournament.name, path: `/tournament/${tournamentId}`}, match.name]} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Score + Team tabs + Refresh roster */}
        <div style={{ padding: `6px ${R.layout.padding}px`, background: COLORS.surfaceLight, display: 'flex', alignItems: 'center', gap: 6, borderBottom: `1px solid ${COLORS.border}` }}>
          <div onClick={() => { setActiveTeam('A'); setSelPlayer(null); setMode('place'); }} style={{
            flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800,
            color: activeTeam === 'A' ? '#000' : COLORS.text,
            background: activeTeam === 'A' ? COLORS.accent : 'transparent',
            borderRadius: '8px 0 0 8px', border: `1px solid ${activeTeam === 'A' ? COLORS.accent : COLORS.border}`,
          }}>🏴 {teamA?.name || 'A'}</div>
          <div style={{
            padding: '10px 10px', fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 800,
            color: score ? (score.a > score.b ? COLORS.win : score.b > score.a ? COLORS.loss : COLORS.textDim) : COLORS.textDim,
            background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderLeft: 'none', borderRight: 'none',
          }}>{score ? `${score.a}:${score.b}` : '0:0'}</div>
          <div onClick={() => { setActiveTeam('B'); setSelPlayer(null); setMode('place'); }} style={{
            flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800,
            color: activeTeam === 'B' ? '#000' : COLORS.text,
            background: activeTeam === 'B' ? COLORS.accent : 'transparent',
            borderRadius: '0 8px 8px 0', border: `1px solid ${activeTeam === 'B' ? COLORS.accent : COLORS.border}`,
          }}>🏴 {teamB?.name || 'B'}</div>
          <Btn variant="ghost" onClick={() => {
            const la = activeTeam === 'A' ? lastAssignA : lastAssignB;
            const currentRoster = activeTeam === 'A' ? rosterA : rosterB;
            setDraft(prev => {
              const n = { ...prev, assign: [...prev.assign] };
              n.players.forEach((p, i) => {
                if (p && !n.assign[i] && currentRoster[i]) n.assign[i] = currentRoster[i].id;
              });
              return n;
            });
          }} style={{ minHeight: 44, padding: '0 10px', flexShrink: 0 }} title="Refresh roster">
            🔄
          </Btn>
        </div>

        {/* Canvas via FieldEditor */}
        <FieldEditor
          hasBunkers={!!field.bunkers?.length} hasZones={!!(field.dangerZone || field.sajgonZone)} hasLines
          showBunkers={showBunkers} onShowBunkers={setShowBunkers}
          showZones={showZones} onShowZones={setShowZones}
          showLines={showLines} onShowLines={setShowLines}
        >
          <FieldCanvas fieldImage={field.fieldImage}
            players={draft.players} shots={draft.shots} bumpStops={draft.bumps}
            eliminations={draft.elim} eliminationPositions={draft.elimPos}
            onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
            onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
            onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
            editable selectedPlayer={selPlayer} mode={mode}
            playerAssignments={draft.assign} rosterPlayers={roster}
            opponentPlayers={showOpponent ? mirroredOpp : undefined}
            opponentEliminations={showOpponent ? mirroredOppElim : []}
            opponentAssignments={activeTeam==='A' ? draftB.assign : draftA.assign}
            opponentRosterPlayers={activeTeam==='A' ? rosterB : rosterA}
            showOpponentLayer={showOpponent}
            opponentColor={activeTeam==='A' ? '#60a5fa' : '#f87171'}
            discoLine={field.discoLine || 0}
            zeekerLine={field.zeekerLine || 0}
            bunkers={field.bunkers || []}
            dangerZone={field.dangerZone} sajgonZone={field.sajgonZone} />
        </FieldEditor>

        {/* Mode */}
        <div style={{ padding: `6px ${R.layout.padding}px`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn variant="default" active={mode==='place'} onClick={() => setMode('place')} style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}>✋ Positions</Btn>
          <Btn variant="default" active={mode==='shoot'} onClick={() => setMode('shoot')} style={{ minHeight: 44, flex: 1, justifyContent: 'center' }}><Icons.Target /> Shots</Btn>
          <Btn variant={showOpponent?'accent':'default'} onClick={() => setShowOpponent(!showOpponent)} style={{ minHeight: 44 }}>
            {showOpponent ? '👁 Opp ON' : '👁 Opp'}
          </Btn>

        </div>

        {pendingBump !== null && (
          <div style={{ padding: `4px ${R.layout.padding}px`, display: 'flex', alignItems: 'center', gap: 6, background: COLORS.bumpStop + '15', borderTop: `1px solid ${COLORS.bumpStop}40` }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.bumpStop, fontWeight: 700 }}>
              ⏱ Bump {getChipLabel(pendingBump)} — click destination position
            </span>
            <Btn variant="ghost" size="sm" onClick={() => { setPendingBump(null); clearBump(pendingBump); }}>✕</Btn>
          </div>
        )}

        {/* Player chips */}
        <div style={{ padding: `4px ${R.layout.padding}px 4px`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {draft.players.map((p, i) => (
            <PlayerChip key={i} idx={i} player={p}
              label={getChipLabel(i) || `P${i+1}`}
              color={COLORS.playerColors[i]}
              selected={selPlayer === i}
              eliminated={!!draft.elim[i]}
              hasBump={!!draft.bumps[i]}
              bumpDuration={draft.bumps[i]?.duration}
              shotCount={draft.shots[i]?.length || 0}
              onClick={() => setSelPlayer(selPlayer === i ? null : i)}
              onRemove={() => removePlayer(i)}
            />
          ))}
        </div>

        {/* Selected player controls — allow eliminate even without assignment */}
        {selPlayer !== null && (
          <div style={{ padding: `4px ${R.layout.padding}px 6px`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${COLORS.border}30`, paddingTop: 8 }}>
            {draft.players[selPlayer] && (
              <Select value={draft.assign[selPlayer] || ''}
                onChange={v => setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[selPlayer] = v||null; return n; })}
                style={{ flex: 1, minWidth: 110 }}>
                <option value="">— Player —</option>
                {getAvailableRoster(selPlayer).map(p => <option key={p.id} value={p.id}>#{p.number} {p.nickname || p.name}</option>)}
              </Select>
            )}
            <Btn variant={draft.elim[selPlayer]?'danger':'default'} size="sm" onClick={() => toggleElim(selPlayer)}>
              <Icons.Skull /> {draft.elim[selPlayer] ? 'Alive' : 'Hit'}
            </Btn>
            {draft.bumps[selPlayer] && <Btn variant="ghost" onClick={() => clearBump(selPlayer)} style={{ minHeight: 44 }}><Icons.Reset /> Clear Bump</Btn>}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: `4px ${R.layout.padding}px`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {points.length > 0 && !editingId && <Btn variant="ghost" onClick={() => setViewMode('auto')} style={{ minHeight: 44 }}><Icons.Back /> Heatmap</Btn>}
        </div>

        {/* Outcome + penalties */}
        <div style={{ padding: `8px ${R.layout.padding}px`, borderTop: `1px solid ${COLORS.border}30`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>Point outcome:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant={outcome==='win_a'?'win':'default'} size="sm" onClick={() => setOutcome(outcome==='win_a'?null:'win_a')} style={{ flex: 1, justifyContent: 'center' }}>
              ✅ {teamA?.name || 'A'}
            </Btn>
            <Btn variant={outcome==='win_b'?'win':'default'} size="sm" onClick={() => setOutcome(outcome==='win_b'?null:'win_b')} style={{ flex: 1, justifyContent: 'center' }}>
              ✅ {teamB?.name || 'B'}
            </Btn>
            <Btn variant={outcome==='timeout'?'timeout':'default'} size="sm" onClick={() => setOutcome(outcome==='timeout'?null:'timeout')} style={{ flex: 1, justifyContent: 'center' }}>
              ⏱ Timeout
            </Btn>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Penalty {teamA?.name?.slice(0,8)}:</span>
            <Select value={draftA.penalty} onChange={v => setDraftA(prev => ({ ...prev, penalty: v }))} style={{ width: 70 }}>
              <option value="">—</option>
              {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Penalty {teamB?.name?.slice(0,8)}:</span>
            <Select value={draftB.penalty} onChange={v => setDraftB(prev => ({ ...prev, penalty: v }))} style={{ width: 70 }}>
              <option value="">—</option>
              {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          {/* Comment — above OT row */}
          <input value={draftComment} onChange={e => setDraftComment(e.target.value)}
            placeholder="Point comment..."
            style={{
              fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6,
              background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`,
              width: '100%', minHeight: 36,
            }} />
          {/* OT + eliminations */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Btn variant={isOT ? 'accent' : 'default'} size="sm" onClick={() => setIsOT(!isOT)}>
              {isOT ? '⚡ OT!' : '⚡ OT'}
            </Btn>
            <div style={{ flex: 1 }} />
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
              A{draftA.elim.filter(Boolean).length} B{draftB.elim.filter(Boolean).length}
            </span>
          </div>
        </div>
      </div>

      {/* SAVE */}
      <div style={{ padding: `12px ${R.layout.padding}px`, borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface }}>
        <Btn variant="accent" disabled={(!draftA.players.some(Boolean) && !draftB.players.some(Boolean)) || saving}
          onClick={savePoint} style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
          <Icons.Check /> {saving ? 'Saving...' : editingId ? 'SAVE CHANGES' : 'SAVE POINT'}
        </Btn>
      </div>

      {/* Delete point confirmation */}
      <ConfirmModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}
        title="Delete point?" danger confirmLabel="Delete"
        message="This action cannot be undone."
        onConfirm={() => { handleDeletePoint(deleteConfirm); setDeleteConfirm(null); }} />
    </div>
  );
}
