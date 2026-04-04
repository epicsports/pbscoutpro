import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useConfirm } from '../hooks/useConfirm';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import FieldEditor from '../components/FieldEditor';
import { Btn, SectionTitle, Select, Icons, EmptyState, ScoreBadge, Modal, ConfirmModal, PlayerChip } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, POINT_OUTCOMES , responsive } from '../utils/theme';
import { useTrackedSave } from '../hooks/useSaveStatus';
import { auth } from '../services/firebase';
import { pointInPolygon } from '../utils/helpers';
import { useField } from '../hooks/useField';
import { useVisibilityPage as useVisibility } from '../hooks/useVisibility';
import { useUndo } from '../hooks/useUndo';
import BottomSheet from '../components/BottomSheet';
import PageHeader from '../components/PageHeader';
import ActionBar from '../components/ActionBar';

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
  const [draftA, setDraftA] = useState(emptyTeam());
  const [draftB, setDraftB] = useState(emptyTeam());
  const [activeTeam, setActiveTeam] = useState('A');
  const [fieldSide, setFieldSide] = useState('left');
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place');
  const [saving, setSaving] = useState(false);
  const tracked = useTrackedSave();
  const [showOpponent, setShowOpponent] = useState(false);
  const [pendingBump, setPendingBump] = useState(null);
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
  const [moreInfoOpen, setMoreInfoOpen] = useState(false);
  const lastAssignA = useRef(E5());
  const lastAssignB = useRef(E5());

  // ── BreakAnalyzer: visibility ──
  const [showVisibility, setShowVisibility] = useState(false);
  const [stanceOverride, setStanceOverride] = useState(null);
  const vis = useVisibility();

  // ── BreakAnalyzer: counter-play ──
  const [counterMode, setCounterMode] = useState('idle');
  const [counterPath, setCounterPath] = useState(null);
  const [showCounter, setShowCounter] = useState(false);
  const [selectedCounterBunkerId, setSelectedCounterBunkerId] = useState(null);
  const counterContainerRef = useRef(null);
  const counterCanvasRef    = useRef(null);

  // ── Freehand overlay ──
  const [freehandOn, setFreehandOn] = useState(false);
  const freehandCanvasRef = useRef(null);
  const isDrawingFH = useRef(false);
  const strokesRef = useRef([]);
  const currentStrokeFH = useRef([]);

  const getFreehandPos = (e) => {
    const canvas = freehandCanvasRef.current; if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
  };

  const drawFreehand = () => {
    const canvas = freehandCanvasRef.current; if (!canvas) return;
    const parent = canvas.parentElement; if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const w = rect.width - 32, h = rect.height;
    if (w <= 0 || h <= 0) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const render = (strokes) => strokes.forEach(s => {
      if (!s.points || s.points.length < 2) return;
      ctx.strokeStyle = s.color || '#3b82f6'; ctx.lineWidth = s.width || 3;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(s.points[0].x * w, s.points[0].y * h);
      for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * w, s.points[i].y * h);
      ctx.stroke();
    });
    render(strokesRef.current);
    if (currentStrokeFH.current.length > 1)
      render([{ points: currentStrokeFH.current, color: '#3b82f6', width: 3 }]);
  };

  useEffect(() => { if (freehandOn) setTimeout(drawFreehand, 100); }, [freehandOn]);
  useEffect(() => { window.addEventListener('resize', drawFreehand); return () => window.removeEventListener('resize', drawFreehand); }, []);
  const counterDrawRef      = useRef([]);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const match = matches.find(m => m.id === matchId);
  const field = useField(tournament, layouts, true); // useField hook

  // Inicjuj silnik balistyczny gdy zmieniają się bunkry
  useEffect(() => {
    if (field.bunkers?.length) vis.initFromLayout(field.bunkers, field.fieldCalibration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.bunkers]);

  useEffect(() => {
    if (vis.counterData) { setCounterMode('active'); setShowCounter(true); setSelectedCounterBunkerId(null); }
  }, [vis.counterData]);

  const getCounterPos = (e) => {
    const el = counterContainerRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: Math.max(0,Math.min(1,(cx-rect.left)/rect.width)), y: Math.max(0,Math.min(1,(cy-rect.top)/rect.height)) };
  };
  const drawCounterCanvas = (pts) => {
    const canvas = counterCanvasRef.current; if (!canvas) return;
    const el = counterContainerRef.current; if (!el) return;
    const r = el.getBoundingClientRect(); canvas.width = r.width; canvas.height = r.height;
    const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
    if (pts.length < 2) return;
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle='#f97316'; ctx.lineWidth=2.5; ctx.setLineDash([8,4]); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(pts[0].x*w,pts[0].y*h);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x*w,pts[i].y*h);
    ctx.stroke(); ctx.setLineDash([]);
    const last=pts[pts.length-1],prev=pts[pts.length-2];
    const dx=last.x-prev.x,dy=last.y-prev.y,len=Math.sqrt(dx*dx+dy*dy);
    if(len>0.001){const nx=dx/len,ny=dy/len,ex=last.x*w,ey=last.y*h;ctx.fillStyle='#f97316';ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-nx*14-ny*7,ey-ny*14+nx*7);ctx.lineTo(ex-nx*14+ny*7,ey-ny*14-nx*7);ctx.closePath();ctx.fill();}
  };
  const startCounterDraw = (e) => { if(counterMode!=='draw')return; e.preventDefault(); const p=getCounterPos(e); if(p){counterDrawRef.current=[p];drawCounterCanvas([p]);} };
  const moveCounterDraw  = (e) => { if(counterMode!=='draw'||!counterDrawRef.current.length)return; e.preventDefault(); const p=getCounterPos(e); if(!p)return; const last=counterDrawRef.current[counterDrawRef.current.length-1]; if(Math.sqrt((p.x-last.x)**2+(p.y-last.y)**2)>0.01){counterDrawRef.current.push(p);drawCounterCanvas(counterDrawRef.current);} };
  const endCounterDraw   = () => { if(counterMode!=='draw')return; const pts=counterDrawRef.current; if(pts.length<2){counterDrawRef.current=[];return;} setCounterPath([...pts]); counterDrawRef.current=[]; const myBase=field.fieldCalibration?.homeBase??{x:0.05,y:0.5}; vis.analyzeCounter(pts,myBase); setCounterMode('active'); };

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

  // Side claim handler
  const claimSide = async (side) => {
    const uid = auth.currentUser?.uid;
    if (uid && side !== 'observe') {
      const field = side === 'home' ? 'homeScoutedBy' : 'awayScoutedBy';
      await ds.updateMatch(tournamentId, matchId, { [field]: uid });
    }
    setScoutingSide(side);
    if (side === 'home') setActiveTeam('A');
    else if (side === 'away') setActiveTeam('B');
  };

  // Side picker overlay
  if (!scoutingSide) {
    const homeClaimedBy = match.homeScoutedBy;
    const awayClaimedBy = match.awayScoutedBy;
    const myUid = auth.currentUser?.uid;
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
          background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
        }}>
          <div onClick={() => navigate(`/tournament/${tournamentId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent }}>
            <Icons.Back />
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 500 }}>{tournament.name}</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontLg, color: COLORS.text, textAlign: 'center' }}>
            {match.name || 'Match'}
          </div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim, textAlign: 'center', marginBottom: 12 }}>
            Choose your scouting side
          </div>

          {/* HOME */}
          <div onClick={() => claimSide('home')} style={{
            width: '100%', maxWidth: 320, padding: '16px 20px', borderRadius: 12,
            background: '#ef444415', border: `2px solid ${homeClaimedBy ? '#ef444460' : '#ef4444'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            opacity: homeClaimedBy && homeClaimedBy !== myUid ? 0.5 : 1,
          }}>
            <span style={{ fontSize: 24 }}>🔴</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, color: COLORS.text }}>HOME: {teamA?.name || '?'}</div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                {homeClaimedBy ? (homeClaimedBy === myUid ? '✓ Claimed by you' : '🔒 Claimed') : 'Available'}
              </div>
            </div>
          </div>

          {/* AWAY */}
          <div onClick={() => claimSide('away')} style={{
            width: '100%', maxWidth: 320, padding: '16px 20px', borderRadius: 12,
            background: '#3b82f615', border: `2px solid ${awayClaimedBy ? '#3b82f660' : '#3b82f6'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
            opacity: awayClaimedBy && awayClaimedBy !== myUid ? 0.5 : 1,
          }}>
            <span style={{ fontSize: 24 }}>🔵</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, color: COLORS.text }}>AWAY: {teamB?.name || '?'}</div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                {awayClaimedBy ? (awayClaimedBy === myUid ? '✓ Claimed by you' : '🔒 Claimed') : 'Available'}
              </div>
            </div>
          </div>

          {/* OBSERVE */}
          <Btn variant="ghost" onClick={() => claimSide('observe')}
            style={{ color: COLORS.textDim, marginTop: 8 }}>
            👀 Observe both (read-only)
          </Btn>
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

  // Undo: snapshot before each mutation
  const pushUndo = () => undoStack.push({ draftA: JSON.parse(JSON.stringify(draftA)), draftB: JSON.parse(JSON.stringify(draftB)), selPlayer, outcome });
  const handleUndo = () => {
    const prev = undoStack.undo();
    if (!prev) return;
    setDraftA(prev.draftA); setDraftB(prev.draftB);
    setSelPlayer(prev.selPlayer); setOutcome(prev.outcome);
  };

  // Canvas handlers
  const handlePlacePlayer = (pos) => {
    pushUndo();
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
  const handleMovePlayer = (idx, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; }); };
  const removePlayer = (idx) => { pushUndo();
    setDraft(prev => ({ ...prev, players: prev.players.map((p,i)=>i===idx?null:p), shots: prev.shots.map((s,i)=>i===idx?[]:[...s]), bumps: prev.bumps.map((b,i)=>i===idx?null:b), elim: prev.elim.map((e,i)=>i===idx?false:e), elimPos: prev.elimPos.map((e,i)=>i===idx?null:e), assign: prev.assign.map((a,i)=>i===idx?null:a) }));
    setSelPlayer(null);
    if (pendingBump === idx) setPendingBump(null);
  };
  const handlePlaceShot = (pi, pos) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].push(pos); return n; }); };
  const handleDeleteShot = (pi, si) => { pushUndo(); setDraft(prev => { const n = { ...prev, shots: prev.shots.map(s=>[...s]) }; n.shots[pi].splice(si,1); return n; }); };
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
  const toggleElim = (idx) => { pushUndo(); setDraft(prev => { const n = { ...prev, elim: [...prev.elim] }; n.elim[idx] = !n.elim[idx]; return n; }); };
  const clearBump = (idx) => setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = null; return n; });
  const getAvailableRoster = (slotIdx) => { const used = draft.assign.filter((a,i)=>a&&i!==slotIdx); return roster.filter(p=>!used.includes(p.id)); };

  const getChipLabel = (idx) => {
    const ap = draft.assign[idx];
    const rp = ap ? roster.find(p => p.id === ap) : null;
    return rp ? `#${rp.number} ${rp.nickname || rp.name.split(' ').pop()}` : `P${idx+1}`;
  };

  // Heatmap data extraction — points have teamA/teamB structure
  const getHeatmapPoints = (side) => {
    if (side === 'both') {
      // Merge both sides into one array
      return points.flatMap(pt => {
        const results = [];
        if (pt.teamA) results.push({ ...pt.teamA, shots: sfs(pt.teamA.shots), outcome: pt.outcome, side: 'A' });
        if (pt.teamB) results.push({ ...pt.teamB, shots: sfs(pt.teamB.shots), outcome: pt.outcome, side: 'B' });
        return results;
      });
    }
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
        <PageHeader
          back={{ label: tournament.name, to: `/tournament/${tournamentId}` }}
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
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ COMPACT HEADER ═══ */}
      <div style={{ padding: '10px 16px', background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div onClick={() => navigate(`/tournament/${tournamentId}`)}
            style={{ fontSize: 22, color: COLORS.textDim, cursor: 'pointer', fontWeight: 300 }}>‹</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 700, color: COLORS.text, letterSpacing: '-.3px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Scouting {(activeTeam === 'A' ? teamA : teamB)?.name || 'Team'}
            </div>
          </div>
          <div style={{
            padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800, letterSpacing: '.5px',
            background: match?.status === 'closed' ? '#22c55e18' : COLORS.accent,
            color: match?.status === 'closed' ? '#22c55e' : '#000',
            border: match?.status === 'closed' ? '1px solid #22c55e40' : 'none',
          }}>{match?.status === 'closed' ? 'FINAL' : 'LIVE'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingLeft: 30 }}>
          <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, flex: 1 }}>
            vs {(activeTeam === 'A' ? teamB : teamA)?.name || '?'} · {score ? `${score.a}:${score.b}` : '0:0'} · Pt {points.length + (editingId ? 0 : 1)}
          </span>
          <span style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5,
            background: (activeTeam === 'A' ? '#ef4444' : '#3b82f6') + '18',
            color: activeTeam === 'A' ? '#ef4444' : '#3b82f6',
          }}>{fieldSide === 'left' ? '◀ LEFT' : 'RIGHT ▶'}</span>
          <div onClick={() => setFieldSide(s => s === 'left' ? 'right' : 'left')} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            fontFamily: FONT, cursor: 'pointer',
            border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, background: COLORS.surfaceLight,
          }}>⇄ Flip</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Canvas via FieldEditor */}
        <div style={{ position: 'relative' }}>
        <div ref={counterContainerRef} style={{ position: 'relative' }}>
        <FieldEditor
          hasBunkers={!!field.bunkers?.length} hasZones={!!(field.dangerZone || field.sajgonZone)} hasLines
          hasVisibility={!!field.bunkers?.length}
          hasCounter={!!vis.counterData || counterMode !== 'idle'}
          showBunkers={showBunkers} onShowBunkers={setShowBunkers}
          showZones={showZones} onShowZones={setShowZones}
          showLines={showLines} onShowLines={setShowLines}
          showVisibility={showVisibility} onShowVisibility={setShowVisibility}
          showCounter={showCounter} onShowCounter={setShowCounter}
          freehandRef={freehandCanvasRef}
          freehandOn={freehandOn}
          freehandEvents={{
            onMouseDown: e => { if (!freehandOn) return; isDrawingFH.current = true; currentStrokeFH.current = [getFreehandPos(e)]; },
            onMouseMove: e => { if (!freehandOn || !isDrawingFH.current) return; currentStrokeFH.current.push(getFreehandPos(e)); drawFreehand(); },
            onMouseUp: () => { if (!freehandOn) return; if (isDrawingFH.current && currentStrokeFH.current.length > 1) { strokesRef.current = [...strokesRef.current, { points: [...currentStrokeFH.current], color: '#3b82f6', width: 3 }]; } isDrawingFH.current = false; currentStrokeFH.current = []; drawFreehand(); },
            onMouseLeave: () => { isDrawingFH.current = false; currentStrokeFH.current = []; },
            onTouchStart: e => { if (!freehandOn) return; e.preventDefault(); isDrawingFH.current = true; currentStrokeFH.current = [getFreehandPos(e)]; },
            onTouchMove: e => { if (!freehandOn) return; e.preventDefault(); if (!isDrawingFH.current) return; currentStrokeFH.current.push(getFreehandPos(e)); drawFreehand(); },
            onTouchEnd: e => { if (!freehandOn) return; e.preventDefault(); if (isDrawingFH.current && currentStrokeFH.current.length > 1) { strokesRef.current = [...strokesRef.current, { points: [...currentStrokeFH.current], color: '#3b82f6', width: 3 }]; } isDrawingFH.current = false; currentStrokeFH.current = []; drawFreehand(); },
          }}
          toolbarRight={freehandOn ? (
            <>
              <Btn variant="ghost" size="sm" onClick={() => { strokesRef.current = strokesRef.current.slice(0,-1); drawFreehand(); }}>↩</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { strokesRef.current = []; drawFreehand(); }}><Icons.Trash /></Btn>
            </>
          ) : null}
        >
          <FieldCanvas fieldImage={field.fieldImage} viewportSide={fieldSide}
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
            dangerZone={field.dangerZone} sajgonZone={field.sajgonZone}
            showVisibility={showVisibility}
            visibilityData={vis.visibilityData}
            fieldCalibration={field.fieldCalibration}
            onVisibilityTap={(bunkerId, pos) => vis.queryVis(bunkerId, pos, stanceOverride)}
            showCounter={showCounter}
            counterData={vis.counterData}
            enemyPath={counterPath}
            selectedCounterBunkerId={selectedCounterBunkerId} />
        </FieldEditor>
        {counterMode === 'draw' && (
          <canvas ref={counterCanvasRef}
            style={{ position: 'absolute', inset: 0, zIndex: 25, touchAction: 'none', cursor: 'crosshair' }}
            onMouseDown={startCounterDraw} onMouseMove={moveCounterDraw}
            onMouseUp={endCounterDraw} onMouseLeave={endCounterDraw}
            onTouchStart={startCounterDraw} onTouchMove={moveCounterDraw} onTouchEnd={endCounterDraw}
          />
        )}
        </div>
        </div>

        {/* Stance selector — visible when 🔥 heatmap is on */}
        {showVisibility && (
          <div style={{ padding: `0 ${R.layout.padding}px 4px`, display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>Stance:</span>
            {[
              { key: null,       label: '⚙ Auto' },
              { key: 'standing', label: '🧍 Standing' },
              { key: 'kneeling', label: '🧎 Kneeling' },
              { key: 'prone',    label: '🐍 Prone' },
            ].map(s => (
              <button key={String(s.key)} onClick={() => setStanceOverride(s.key)}
                style={{
                  padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                  border: `1px solid ${stanceOverride === s.key ? COLORS.accent : COLORS.border}`,
                  background: stanceOverride === s.key ? COLORS.accent + '20' : COLORS.surface,
                  color: stanceOverride === s.key ? COLORS.accent : COLORS.textDim,
                  fontFamily: FONT, fontSize: 11, fontWeight: stanceOverride === s.key ? 700 : 400,
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Counter mode controls */}
        {(
          <div style={{ padding: `4px ${R.layout.padding}px 2px`, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Btn variant={counterMode !== 'idle' ? 'accent' : 'default'}
              style={{ borderColor: counterMode !== 'idle' ? '#f97316' : undefined, color: counterMode !== 'idle' ? '#000' : '#f97316' }}
              size="sm"
              onClick={() => {
                if (counterMode === 'idle') { setCounterMode('draw'); vis.clearCounter(); setCounterPath(null); }
                else { setCounterMode('idle'); setShowCounter(false); vis.clearCounter(); setCounterPath(null); setSelectedCounterBunkerId(null); }
              }}>
              🎯 {counterMode === 'idle' ? 'Counter-play' : counterMode === 'draw' ? 'Draw...' : 'Counter ✕'}
            </Btn>
            {counterMode === 'draw' && (
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#f97316' }}>
                Draw enemy path on the field
              </span>
            )}
            {counterMode === 'active' && vis.isLoading && vis.progress && (
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                ⚙️ {vis.progress.pct}%...
              </span>
            )}
          </div>
        )}

        {/* Counter results panel in MatchPage */}
        {counterMode === 'active' && vis.counterData && !vis.isLoading && (() => {
          const { counters } = vis.counterData;
          return (
            <div style={{ margin: `0 ${R.layout.padding}px 4px`, borderRadius: 8, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '6px 10px', background: '#f9731614', borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#f97316', fontWeight: 700 }}>
                🎯 Counter-play — top {Math.min(5, counters.length)} pozycji
              </div>
              {counters.slice(0,5).map((c,i) => {
                const pHit = c.safe?.pHit || c.arc?.pHit || c.exposed?.pHit || 0;
                const channelColor = c.safe ? '#22c55e' : c.arc ? '#f97316' : '#3b82f6';
                const channelIcon = c.safe ? '🟢' : c.arc ? '🟠' : '🔵';
                const isSelected = c.bunkerId === selectedCounterBunkerId;
                return (
                  <div key={c.bunkerId} onClick={() => setSelectedCounterBunkerId(isSelected ? null : c.bunkerId)}
                    style={{ padding: '5px 10px', display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer',
                      background: isSelected ? channelColor+'14' : 'transparent',
                      borderBottom: `1px solid ${COLORS.border}15` }}>
                    <span style={{ fontFamily: FONT, fontSize: 14 }}>{channelIcon}</span>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>
                      {c.bunkerName}
                      {!c.canIntercept && <span style={{ color:'#f97316',fontSize:9,marginLeft:4 }}>*</span>}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{c.arrivalTime}s</span>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: channelColor }}>
                      {Math.round(pHit*100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Mode buttons moved to action bar at bottom */}

        {pendingBump !== null && (
          <div style={{ padding: `4px ${R.layout.padding}px`, display: 'flex', alignItems: 'center', gap: 6, background: COLORS.bumpStop + '15', borderTop: `1px solid ${COLORS.bumpStop}40` }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.bumpStop, fontWeight: 700 }}>
              ⏱ Bump {getChipLabel(pendingBump)} — click destination position
            </span>
            <Btn variant="ghost" size="sm" onClick={() => { setPendingBump(null); clearBump(pendingBump); }}>✕</Btn>
          </div>
        )}

        {/* Player pills — compact stacked */}
        <div style={{ padding: `4px ${R.layout.padding}px 4px`, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {draft.players.map((p, i) => {
            const assigned = draft.assign[i] ? roster.find(r => r.id === draft.assign[i]) : null;
            const isElim = !!draft.elim[i];
            return (
              <div key={i} onClick={() => setSelPlayer(selPlayer === i ? null : i)} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8,
                background: p ? `${COLORS.playerColors[i]}12` : COLORS.surface,
                border: `1.5px solid ${selPlayer === i ? COLORS.accent : (p ? COLORS.playerColors[i] + '40' : COLORS.border)}`,
                cursor: 'pointer', opacity: isElim ? 0.5 : 1,
              }}>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.playerColors[i], minWidth: 22 }}>P{i+1}</span>
                <span style={{ flex: 1, fontFamily: FONT, fontSize: 11, color: p ? COLORS.text : COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {assigned ? `#${assigned.number} ${assigned.nickname || assigned.name}` : (p ? 'Placed' : '—')}
                </span>
                {p && (
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <Select value={draft.assign[i] || ''} onChange={v => setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[i] = v||null; return n; })}
                      style={{ minWidth: 90, minHeight: 24, padding: '0 4px', fontSize: 10, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, borderRadius: 4 }}>
                      <option value="">— Player —</option>
                      {getAvailableRoster(i).map(r => <option key={r.id} value={r.id}>#{r.number} {(r.nickname || r.name || '').slice(0, 10)}</option>)}
                    </Select>
                    <div onClick={() => { pushUndo(); toggleElim(i); }} style={{
                      width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer',
                      background: isElim ? '#ef444440' : COLORS.surfaceLight, color: isElim ? COLORS.danger : COLORS.textMuted,
                      border: isElim ? `1px solid ${COLORS.danger}60` : '1px solid transparent',
                    }}>💀</div>
                    <div onClick={() => removePlayer(i)} style={{
                      width: 32, height: 32, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, cursor: 'pointer',
                      background: COLORS.surfaceLight, color: COLORS.textMuted,
                    }}>✕</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* ═══ ACTION BAR ═══ */}
      <ActionBar actions={[
        { id: 'place', icon: '📍', label: 'Place', active: mode === 'place', onClick: () => setMode('place') },
        { id: 'hit', icon: '💀', label: 'Hit', onClick: () => { if (selPlayer !== null) toggleElim(selPlayer); } },
        { id: 'shot', icon: '📷', label: 'Shot', active: mode === 'shoot', onClick: () => setMode(mode === 'shoot' ? 'place' : 'shoot') },
        { id: 'bump', icon: '⏱', label: '', active: pendingBump !== null, flex: 0, onClick: () => {
          if (pendingBump !== null) { setPendingBump(null); return; }
          if (selPlayer !== null && draft.players[selPlayer]) {
            pushUndo();
            const pos = draft.players[selPlayer];
            setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[selPlayer] = { x: pos.x, y: pos.y, duration: 2 }; return n; });
            setPendingBump(selPlayer);
          }
        }},
        ...(undoStack.canUndo ? [{ id: 'undo', icon: '↩', label: '', flex: 0, onClick: handleUndo }] : []),
        { id: 'ok', icon: '✓', label: 'OK', variant: 'accent', onClick: () => setSaveSheetOpen(true) },
      ]} />

      {/* ═══ SAVE BOTTOM SHEET ═══ */}
      <BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)}>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 10 }}>
              Point outcome
            </div>

            {/* Outcome buttons */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <Btn variant={outcome==='win_a'?'win':'default'} size="sm" onClick={() => setOutcome(outcome==='win_a'?null:'win_a')} style={{ flex: 1, justifyContent: 'center' }}>
                ✅ {teamA?.name?.slice(0,8) || 'A'}
              </Btn>
              <Btn variant={outcome==='win_b'?'win':'default'} size="sm" onClick={() => setOutcome(outcome==='win_b'?null:'win_b')} style={{ flex: 1, justifyContent: 'center' }}>
                ✅ {teamB?.name?.slice(0,8) || 'B'}
              </Btn>
              <Btn variant={outcome==='timeout'?'timeout':'default'} size="sm" onClick={() => setOutcome(outcome==='timeout'?null:'timeout')} style={{ justifyContent: 'center' }}>
                ⏱
              </Btn>
            </div>

            {/* More options (collapsed) */}
            <div onClick={() => setMoreInfoOpen(v => !v)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>
                {moreInfoOpen ? '▾' : '▸'} More options
              </span>
            </div>
            {moreInfoOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{teamA?.name?.slice(0,6)} pen:</span>
                  <Select value={draftA.penalty} onChange={v => setDraftA(prev => ({ ...prev, penalty: v }))} style={{ width: 60 }}>
                    <option value="">—</option>
                    {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{teamB?.name?.slice(0,6)} pen:</span>
                  <Select value={draftB.penalty} onChange={v => setDraftB(prev => ({ ...prev, penalty: v }))} style={{ width: 60 }}>
                    <option value="">—</option>
                    {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                  <Btn variant={isOT ? 'accent' : 'default'} size="sm" onClick={() => setIsOT(!isOT)}>⚡ OT</Btn>
                </div>
                <input value={draftComment} onChange={e => setDraftComment(e.target.value)}
                  placeholder="Notes..."
                  style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6,
                    background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`,
                    width: '100%', minHeight: 36, boxSizing: 'border-box' }} />
              </div>
            )}

            {/* Save */}
            <Btn variant="accent" disabled={(!draftA.players.some(Boolean) && !draftB.players.some(Boolean)) || saving}
              onClick={() => { savePoint(); setSaveSheetOpen(false); }}
              style={{ width: '100%', justifyContent: 'center', minHeight: 48, fontWeight: 800 }}>
              <Icons.Check /> {saving ? 'Saving...' : editingId ? 'SAVE CHANGES' : 'SAVE POINT'}
            </Btn>

            {points.length > 0 && !editingId && (
              <Btn variant="ghost" onClick={() => { setSaveSheetOpen(false); setViewMode('auto'); }}
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
                <Icons.Back /> Back to heatmap
              </Btn>
            )}
      </BottomSheet>

      {/* Delete point confirmation */}
      <ConfirmModal {...deleteConfirm.modalProps(
        (id) => handleDeletePoint(id),
        { title: 'Delete point?', message: 'This action cannot be undone.', confirmLabel: 'Delete' }
      )} />
    </div>
  );
}
