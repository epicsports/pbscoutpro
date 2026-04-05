import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';

import FieldCanvas from '../components/FieldCanvas';
import FieldEditor from '../components/FieldEditor';
import { Btn, SectionTitle, Select, Icons, EmptyState, Input , PlayerChip} from '../components/ui';
import ModeTabBar from '../components/ModeTabBar';
import { useTournaments, useTeams, useScoutedTeams, usePlayers, useTactics, useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH , responsive } from '../utils/theme';
import { useField } from '../hooks/useField';
import { useTrackedSave } from '../hooks/useSaveStatus';
import { useVisibilityPage as useVisibility } from '../hooks/useVisibility';
import { uid } from '../utils/helpers';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];

const ensureArray = (val, fallback = []) => {
  if (!val) return fallback;
  return Array.isArray(val) ? val : Object.values(val);
};

export default function TacticPage() {
  const device = useDevice();
  const R = responsive(device.type);
  const { tournamentId, layoutId, tacticId } = useParams();
  const isLayoutMode = !!layoutId && !tournamentId;
  const navigate = useNavigate();
  
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { scouted } = useScoutedTeams(tournamentId);
  const { players } = usePlayers();
  const { tactics: tournamentTactics } = useTactics(tournamentId);
  const { tactics: layoutTactics } = useLayoutTactics(layoutId);
  const tactics = isLayoutMode ? layoutTactics : tournamentTactics;
  const { layouts } = useLayouts();

  const [currentStep, setCurrentStep] = useState(0);
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place');
  const [saving, setSaving] = useState(false);
  const tracked = useTrackedSave();
  const [freehandOn, setFreehandOn] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(null);
  const [showBreakoutUnder, setShowBreakoutUnder] = useState(true);

  // ── BreakAnalyzer: visibility ──
  const [showVisibility, setShowVisibility] = useState(false);
  const [stanceOverride, setStanceOverride] = useState(null); // null|'standing'|'kneeling'|'prone'
  const vis = useVisibility();

  // ── BreakAnalyzer: counter-play ──
  const [counterMode, setCounterMode] = useState('idle'); // 'idle'|'draw'|'active'
  const [counterPath, setCounterPath] = useState(null);   // [{x,y}] normalized
  const [showCounter, setShowCounter] = useState(false);
  const [selectedCounterBunkerId, setSelectedCounterBunkerId] = useState(null);
  const counterContainerRef = useRef(null);
  const counterCanvasRef    = useRef(null);
  const counterDrawRef      = useRef([]);  // points being drawn (no re-render on every move)
  const [pendingBump, setPendingBump] = useState(null);
  
  const freehandColor = '#3b82f6';
  const freehandWidth = 3;
  const [freehandStrokes, setFreehandStrokes] = useState([]);
  const freehandCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  const strokesRef = useRef([]); 
  const currentStroke = useRef([]);

  const tactic = tactics.find(t => t.id === tacticId);
  const tournament = tournaments.find(t => t.id === tournamentId);
  const activeLayout = isLayoutMode ? layouts.find(l => l.id === layoutId) : null;

  useEffect(() => {
    if (tactic?.freehandStrokes?.length) {
      setFreehandStrokes(tactic.freehandStrokes);
      strokesRef.current = tactic.freehandStrokes;
    }
  }, [tactic?.id]);

  const [localSteps, setLocalSteps] = useState(null);

  const steps = useMemo(() => {
    if (localSteps) return localSteps;
    if (!tactic?.steps?.length) return [{ players: E5(), shots: E5A(), assignments: E5(), description: 'Breakout' }];
    
    return tactic.steps.map(s => ({
      ...s,
      players: ensureArray(s.players, E5()),
      assignments: ensureArray(s.assignments, E5()),
      shots: ensureArray(s.shots, E5A()).map(sh => ensureArray(sh)),
      bumps: ensureArray(s.bumps, E5()),
    }));
  }, [tactic, localSteps]);

  const getFreehandPos = useCallback((e) => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
  }, []);

  const drawFreehand = useCallback(() => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const newW = rect.width > 0 ? rect.width - 32 : parent.offsetWidth - 32;
    const newH = rect.height > 0 ? rect.height : parent.offsetHeight;

    if (newW <= 0 || newH <= 0) return;

    if (canvas.width !== newW || canvas.height !== newH) {
      canvas.width = newW;
      canvas.height = newH;
    }
    
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const renderStrokes = (strokesToRender) => {
      strokesToRender.forEach(stroke => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color || '#3b82f6';
        ctx.lineWidth = stroke.width || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
        }
        ctx.stroke();
      });
    };

    renderStrokes(strokesRef.current);
    if (currentStroke.current && currentStroke.current.length > 1) {
      renderStrokes([{ points: currentStroke.current, color: freehandColor, width: freehandWidth }]);
    }
  }, [freehandColor, freehandWidth]);

  useEffect(() => {
    if (freehandOn) {
      const timer = setTimeout(() => drawFreehand(), 100);
      return () => clearTimeout(timer);
    }
  }, [freehandOn, drawFreehand]);

  useEffect(() => {
    window.addEventListener('resize', drawFreehand);
    return () => window.removeEventListener('resize', drawFreehand);
  }, [drawFreehand]);

  const tournamentField = useField(tournament, layouts);
  const field = isLayoutMode && activeLayout
    ? { fieldImage: activeLayout?.fieldImage, discoLine: activeLayout?.discoLine || 0.30,
        zeekerLine: activeLayout?.zeekerLine || 0.80, bunkers: activeLayout?.bunkers || [],
        dangerZone: activeLayout?.dangerZone, sajgonZone: activeLayout?.sajgonZone,
        fieldCalibration: activeLayout?.fieldCalibration || null }
    : tournamentField;

  // Inicjuj silnik balistyczny gdy zmieniają się bunkry
  useEffect(() => {
    if (field.bunkers?.length) vis.initFromLayout(field.bunkers, field.fieldCalibration);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.bunkers]);

  // Gdy counter wyniki przychodzą → przełącz na 'active' i pokaż warstwę
  useEffect(() => {
    if (vis.counterData) {
      setCounterMode('active');
      setShowCounter(true);
      setSelectedCounterBunkerId(null);
    }
  }, [vis.counterData]);

  if ((!tournament && !isLayoutMode) || !tactic) return <EmptyState icon="⏳" text="Loading..." />;

  const step = steps[currentStep] || steps[0];
  const activeStepIndices = visibleSteps || [currentStep];
  const mergedPlayers = (() => {
    if (activeStepIndices.length <= 1) return step.players;
    return [0,1,2,3,4].map(i => {
      for (let si = activeStepIndices.length - 1; si >= 0; si--) {
        const s = steps[activeStepIndices[si]];
        if (s?.players?.[i]) return s.players[i];
      }
      return null;
    });
  })();

  const myTeamScoutedId = tactic?.myTeamScoutedId;
  const myScoutedEntry = scouted.find(s => s.id === myTeamScoutedId);
  const myTeam = teams.find(t => t.id === myScoutedEntry?.teamId);
  const roster = (myScoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  const updateStep = (stepIdx, updater) => {
    setLocalSteps(prev => {
      const s = prev || [...steps];
      const next = [...s];
      next[stepIdx] = updater({ ...next[stepIdx] });
      return next;
    });
  };

  const addStep = () => {
    const prevStep = steps[steps.length - 1];
    setLocalSteps(prev => {
      const s = prev || [...steps];
      return [...s, {
        players: E5(), shots: E5A(),
        assignments: [...(prevStep?.assignments || E5())],
        description: `Step ${s.length + 1}`,
      }];
    });
    setCurrentStep(steps.length);
  };

  const removeStep = (idx) => {
    if (steps.length <= 1) return;
    setLocalSteps(prev => {
      const s = prev || [...steps];
      const next = s.filter((_, i) => i !== idx);
      return next;
    });
    if (currentStep >= steps.length - 1) setCurrentStep(Math.max(0, steps.length - 2));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stepsToSave = (localSteps || steps).map(s => ({
        players: s.players,
        shots: ds.shotsToFirestore(s.shots),
        assignments: s.assignments,
        bumps: s.bumps || E5(),
        description: s.description || '',
      }));
      const data = { steps: stepsToSave, freehandStrokes: strokesRef.current };
      await tracked(async () => {
        if (isLayoutMode) {
          await ds.updateLayoutTactic(layoutId, tacticId, data);
        } else {
          await ds.updateTactic(tournamentId, tacticId, data);
        }
      });
      setLocalSteps(null);
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handlePlacePlayer = (pos) => {
    // If player is awaiting bump destination
    if (pendingBump !== null) {
      updateStep(currentStep, s => {
        const n = { ...s, players: [...s.players] };
        n.players[pendingBump] = pos;
        return n;
      });
      setPendingBump(null);
      return;
    }
    updateStep(currentStep, s => {
      const n = { ...s, players: [...s.players] };
      const idx = n.players.findIndex(p => p === null);
      if (idx >= 0) { n.players[idx] = pos; setSelPlayer(idx); }
      return n;
    });
  };

  const handleMovePlayer = (idx, pos) => {
    updateStep(currentStep, s => {
      const n = { ...s, players: [...s.players] };
      n.players[idx] = pos;
      return n;
    });
  };

  const handlePlaceShot = (pi, pos) => {
    updateStep(currentStep, s => {
      const n = { ...s, shots: s.shots.map(a => [...(a || [])]) };
      n.shots[pi].push(pos);
      return n;
    });
  };

  const handleDeleteShot = (pi, si) => {
    updateStep(currentStep, s => {
      const n = { ...s, shots: s.shots.map(a => [...(a || [])]) };
      n.shots[pi].splice(si, 1);
      return n;
    });
  };

  const removePlayer = (idx) => {
    updateStep(currentStep, s => ({
      ...s,
      players: s.players.map((p, i) => i === idx ? null : p),
      shots: s.shots.map((a, i) => i === idx ? [] : [...a]),
      bumps: (s.bumps || E5()).map((b, i) => i === idx ? null : b),
    }));
    setSelPlayer(null);
    if (pendingBump === idx) setPendingBump(null);
  };

  // ── Bump in TacticPage ──

  const handleBumpStop = (bd) => {
    if (bd.playerIdx === undefined) return;
    updateStep(currentStep, s => {
      const n = { ...s, bumps: [...(s.bumps || E5())] };
      n.bumps[bd.playerIdx] = { x: bd.x, y: bd.y, duration: bd.duration };
      return n;
    });
    setPendingBump(bd.playerIdx);
  };

  const clearBump = (idx) => {
    updateStep(currentStep, s => {
      const n = { ...s, bumps: [...(s.bumps || E5())] };
      n.bumps[idx] = null;
      return n;
    });
    if (pendingBump === idx) setPendingBump(null);
  };

  const getChipLabel = (idx) => {
    const ap = step.assignments?.[idx];
    const rp = ap ? roster.find(p => p.id === ap) : null;
    return rp ? `#${rp.number} ${rp.nickname || rp.name.split(' ').pop()}` : `P${idx + 1}`;
  };

  const getAvailableRoster = (slotIdx) => {
    const used = (step.assignments || []).filter((a, i) => a && i !== slotIdx);
    return roster.filter(p => !used.includes(p.id));
  };

  const isDirty = localSteps !== null || freehandStrokes.length !== (tactic?.freehandStrokes?.length || 0);

  // ── Counter canvas helpers ──
  // Get normalized position (0-1) from event on overlay canvas
  const getCounterPos = (e) => {
    const el = counterContainerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)),
    };
  };

  // Rysuje bieżącą ścieżkę na canvas overlay
  const drawCounterCanvas = (points) => {
    const canvas = counterCanvasRef.current;
    if (!canvas) return;
    const el = counterContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (points.length < 2) return;
    const w = canvas.width, h = canvas.height;
    ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 4]); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x * w, points[0].y * h);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x * w, points[i].y * h);
    ctx.stroke(); ctx.setLineDash([]);
    // Arrow head
    if (points.length >= 2) {
      const last = points[points.length - 1], prev = points[points.length - 2];
      const dx = last.x - prev.x, dy = last.y - prev.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len > 0.001) {
        const nx = dx/len, ny = dy/len;
        const ex = last.x * w, ey = last.y * h;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - nx*14 - ny*7, ey - ny*14 + nx*7);
        ctx.lineTo(ex - nx*14 + ny*7, ey - ny*14 - nx*7);
        ctx.closePath(); ctx.fill();
      }
    }
    // "DRAG" hint on first tap
    if (points.length === 1) {
      ctx.fillStyle = '#f97316cc'; ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('↓ draw enemy path', points[0].x * w, points[0].y * h - 18);
    }
  };

  const startCounterDraw = (e) => {
    if (counterMode !== 'draw') return;
    e.preventDefault();
    const pos = getCounterPos(e);
    if (!pos) return;
    counterDrawRef.current = [pos];
    drawCounterCanvas([pos]);
  };

  const moveCounterDraw = (e) => {
    if (counterMode !== 'draw' || !counterDrawRef.current.length) return;
    e.preventDefault();
    const pos = getCounterPos(e);
    if (!pos) return;
    // Add point every min 0.01 (avoid duplicates)
    const last = counterDrawRef.current[counterDrawRef.current.length - 1];
    const dist = Math.sqrt((pos.x - last.x)**2 + (pos.y - last.y)**2);
    if (dist > 0.01) {
      counterDrawRef.current.push(pos);
      drawCounterCanvas(counterDrawRef.current);
    }
  };

  const endCounterDraw = (e) => {
    if (counterMode !== 'draw') return;
    const pts = counterDrawRef.current;
    if (pts.length < 2) { counterDrawRef.current = []; return; }
    setCounterPath([...pts]);
    counterDrawRef.current = [];
    // Wyślij do workera
    const myBase = field.fieldCalibration?.homeBase ?? { x: 0.05, y: 0.5 };
    vis.analyzeCounter(pts, myBase);
    setCounterMode('active'); // switch to computing/active mode
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div onClick={() => navigate(isLayoutMode ? `/layout/${layoutId}` : `/tournament/${tournamentId}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent }}>
          <Icons.Back />
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 500 }}>
            {isLayoutMode ? 'Layout' : (tournament?.name || 'Tournament')}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {myTeam && (
          <div style={{ padding: `8px ${R.layout.padding}px`, background: COLORS.surfaceLight, borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
            🏴 Team: <strong style={{ color: COLORS.text }}>{myTeam.name}</strong>
          </div>
        )}

        <div style={{ padding: `8px ${R.layout.padding}px 4px`, display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          onTouchStart={e => { if (e.touches.length === 1) e.currentTarget._swipeX = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const start = e.currentTarget._swipeX;
            if (start === undefined) return;
            const end = e.changedTouches[0].clientX;
            const dx = end - start;
            if (Math.abs(dx) > 50) {
              if (dx < 0 && currentStep < steps.length - 1) { setCurrentStep(currentStep + 1); setSelPlayer(null); setVisibleSteps(null); }
              else if (dx > 0 && currentStep > 0) { setCurrentStep(currentStep - 1); setSelPlayer(null); setVisibleSteps(null); }
            }
            e.currentTarget._swipeX = undefined;
          }}>
          {steps.map((s, i) => (
            <Btn key={i} variant={currentStep === i ? 'accent' : 'ghost'} size="sm"
              onClick={() => { setCurrentStep(i); setSelPlayer(null); setMode('place'); setVisibleSteps(null); }}
              style={{ flexShrink: 0 }}>
              {i + 1}. {s.description?.slice(0, 10) || `Step ${i + 1}`}
            </Btn>
          ))}
          {steps.length < 3 && <Btn variant="ghost" size="sm" onClick={addStep} style={{ flexShrink: 0 }}><Icons.Plus /> Step</Btn>}
        </div>

        <div style={{ padding: `4px ${R.layout.padding}px 8px` }}>
          <input value={step.description || ''} onChange={e => updateStep(currentStep, s => ({ ...s, description: e.target.value }))}
            placeholder="Step description..." style={{
              fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6,
              background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`,
              width: '100%', minHeight: 32,
            }} />
        </div>

        <div className="print-area">
          <div ref={counterContainerRef} style={{ position: 'relative' }}>
          <FieldEditor
            hasBunkers={!!field.bunkers?.length} hasZones={!!(field.dangerZone || field.sajgonZone)} hasLines
            hasVisibility={!!field.bunkers?.length}
            showVisibility={showVisibility} onShowVisibility={setShowVisibility}
            hasCounter={!!vis.counterData || counterMode !== 'idle'}
            showCounter={showCounter} onShowCounter={setShowCounter}
            hasDraw drawOn={freehandOn} onDrawOn={v => { setFreehandOn(v); if (v) setTimeout(() => drawFreehand(), 50); }}
            showLines
            toolbarRight={
              freehandOn ? (
                <>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    const next = strokesRef.current.slice(0, -1);
                    strokesRef.current = next;
                    setFreehandStrokes(next);
                    drawFreehand();
                  }}>↩</Btn>
                  <Btn variant="ghost" size="sm" onClick={() => {
                    strokesRef.current = [];
                    setFreehandStrokes([]);
                    drawFreehand();
                  }}><Icons.Trash /></Btn>
                </>
              ) : null
            }
            freehandRef={freehandCanvasRef}
            freehandOn={freehandOn}
            freehandEvents={{
              onMouseDown: e => { if (!freehandOn) return; isDrawing.current = true; currentStroke.current = [getFreehandPos(e)]; },
              onMouseMove: e => { if (!freehandOn || !isDrawing.current) return; currentStroke.current.push(getFreehandPos(e)); drawFreehand(); },
              onMouseUp: () => { 
                if (!freehandOn) return; 
                if (isDrawing.current && currentStroke.current.length > 1) {
                  const newStroke = { points: [...currentStroke.current], color: freehandColor, width: freehandWidth };
                  strokesRef.current = [...strokesRef.current, newStroke];
                  setFreehandStrokes(strokesRef.current);
                } 
                isDrawing.current = false; 
                currentStroke.current = []; 
                drawFreehand(); 
              },
              onMouseLeave: () => { isDrawing.current = false; currentStroke.current = []; },
              onTouchStart: e => { if (!freehandOn) return; e.preventDefault(); isDrawing.current = true; currentStroke.current = [getFreehandPos(e)]; },
              onTouchMove:  e => { if (!freehandOn) return; e.preventDefault(); if (!isDrawing.current) return; currentStroke.current.push(getFreehandPos(e)); drawFreehand(); },
              onTouchEnd: e => { 
                if (!freehandOn) return; 
                e.preventDefault(); 
                if (isDrawing.current && currentStroke.current.length > 1) {
                  const newStroke = { points: [...currentStroke.current], color: freehandColor, width: freehandWidth };
                  strokesRef.current = [...strokesRef.current, newStroke];
                  setFreehandStrokes(strokesRef.current);
                } 
                isDrawing.current = false; 
                currentStroke.current = []; 
                drawFreehand(); 
              },
            }}
          >
            <FieldCanvas fieldImage={field.fieldImage}
              players={freehandOn && !showBreakoutUnder ? [] : mergedPlayers}
              shots={freehandOn && !showBreakoutUnder ? [[], [], [], [], []] : (activeStepIndices.length > 1 ? [[], [], [], [], []] : step.shots)}
              bumpStops={step.bumps || E5()}
              onPlacePlayer={freehandOn ? undefined : handlePlacePlayer}
              onMovePlayer={freehandOn ? undefined : handleMovePlayer}
              onPlaceShot={freehandOn ? undefined : handlePlaceShot}
              onDeleteShot={freehandOn ? undefined : handleDeleteShot}
              onBumpStop={freehandOn ? undefined : handleBumpStop}
              onSelectPlayer={freehandOn ? undefined : (idx) => setSelPlayer(selPlayer === idx ? null : idx)}
              editable={!freehandOn} selectedPlayer={freehandOn ? null : selPlayer}
              mode={freehandOn ? 'place' : mode}
              playerAssignments={step.assignments} rosterPlayers={roster}
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

          {/* Counter path drawing overlay */}
          {counterMode === 'draw' && (
            <canvas ref={counterCanvasRef}
              style={{ position: 'absolute', inset: 0, zIndex: 25, touchAction: 'none', cursor: 'crosshair' }}
              onMouseDown={startCounterDraw} onMouseMove={moveCounterDraw}
              onMouseUp={endCounterDraw} onMouseLeave={endCounterDraw}
              onTouchStart={startCounterDraw} onTouchMove={moveCounterDraw}
              onTouchEnd={endCounterDraw}
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

        {/* Mode buttons moved to tab bar at bottom */}

        {/* Counter: draw mode instruction banner */}
        {counterMode === 'draw' && (
          <div style={{
            margin: `0 ${R.layout.padding}px 4px`, padding: '8px 12px', borderRadius: 8,
            background: '#f9731615', border: '1px solid #f9731640',
            fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#f97316',
          }}>
            🎯 Draw enemy run path — drag finger on map
          </div>
        )}

        {/* Counter: computing progress */}
        {counterMode === 'active' && vis.isLoading && vis.progress && (
          <div style={{
            margin: `0 ${R.layout.padding}px 4px`, padding: '8px 12px', borderRadius: 8,
            background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>
                ⚙️ Computing counter-play... {vis.progress.pct}%
                <span style={{ color: COLORS.textMuted, marginLeft: 6 }}>
                  {vis.progress.phase === 'counter-bump' ? 'bump heatmap' : 'positions behind bunkers'}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: COLORS.border, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${vis.progress.pct}%`, background: '#f97316', borderRadius: 2, transition: 'width 0.1s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Counter: results panel */}
        {counterMode === 'active' && vis.counterData && !vis.isLoading && (() => {
          const { counters, enemyTotalTime } = vis.counterData;
          // Best bump spot
          const { bumpGrid, bumpCols, bumpRows } = vis.counterData;
          let bestBumpP = 0, bestBumpX = 0, bestBumpY = 0;
          for (let i = 0; i < bumpGrid.length; i++) {
            if (bumpGrid[i] > bestBumpP) {
              bestBumpP = bumpGrid[i];
              bestBumpX = (i % bumpCols + 0.5) / bumpCols;
              bestBumpY = (Math.floor(i / bumpCols) + 0.5) / bumpRows;
            }
          }

          return (
            <div style={{
              margin: `0 ${R.layout.padding}px 4px`, borderRadius: 10,
              background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '8px 12px', background: '#f9731618',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: '#f97316', fontWeight: 700, flex: 1 }}>
                  🎯 Counter-play — {counters.length} opcji · {enemyTotalTime}s bieg wroga
                </span>
                <Btn variant="ghost" size="sm" onClick={() => {
                  setCounterMode('idle'); setShowCounter(false);
                  vis.clearCounter(); setCounterPath(null); setSelectedCounterBunkerId(null);
                }}>✕</Btn>
              </div>

              {/* Best bump */}
              {bestBumpP > 0.05 && (
                <div style={{ padding: '6px 12px', borderBottom: `1px solid ${COLORS.border}30` }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                    💥 Best bump stop: ({Math.round(bestBumpX*100)}%, {Math.round(bestBumpY*100)}%)
                    {' — '}
                    <strong style={{ color: '#22d3ee' }}>P(hit) {Math.round(bestBumpP*100)}%</strong>
                  </span>
                </div>
              )}

              {/* Bunker counter list */}
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {counters.slice(0, 5).map((c, i) => {
                  const isSelected = c.bunkerId === selectedCounterBunkerId;
                  const pHit = c.safe?.pHit || c.arc?.pHit || c.exposed?.pHit || 0;
                  const bestWindow = c.safe || c.arc || c.exposed;
                  const channelColor = c.safe ? '#22c55e' : c.arc ? '#f97316' : '#3b82f6';
                  const channelIcon = c.safe ? '🟢' : c.arc ? '🟠' : '🔵';
                  return (
                    <div key={c.bunkerId}
                      onClick={() => setSelectedCounterBunkerId(isSelected ? null : c.bunkerId)}
                      style={{
                        padding: '7px 12px', cursor: 'pointer',
                        background: isSelected ? channelColor+'18' : 'transparent',
                        borderBottom: `1px solid ${COLORS.border}20`,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, minWidth: 16 }}>
                        #{i+1}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 16 }}>{channelIcon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>
                          {c.bunkerName}
                          {!c.canIntercept && <span style={{ color: '#f97316', fontSize: 9, marginLeft: 6 }}>*too late</span>}
                        </div>
                        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>
                          {c.arrivalTime}s arrival · {bestWindow ? `${bestWindow.duration.toFixed(1)}s window` : '—'}
                        </div>
                      </div>
                      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: channelColor }}>
                        {Math.round(pHit * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div style={{ padding: '5px 12px', display: 'flex', gap: 12, borderTop: `1px solid ${COLORS.border}20` }}>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>🟢 behind cover</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>🟠 lob/arc</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>🔵 exposed</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>* too late</span>
              </div>
            </div>
          );
        })()}

        <div style={{ padding: `4px ${R.layout.padding}px`, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {step.players.map((p, i) => (
            <PlayerChip key={i} idx={i} player={p}
              label={getChipLabel(i)}
              color={COLORS.playerColors[i]}
              selected={selPlayer === i}
              shotCount={step.shots?.[i]?.length || 0}
              size="sm"
              onClick={() => p && setSelPlayer(selPlayer === i ? null : i)}
              onRemove={() => removePlayer(i)}
            />
          ))}
        </div>

        {/* Bump: pending destination banner */}
        {pendingBump !== null && (
          <div style={{
            margin: `0 ${R.layout.padding}px 4px`,
            padding: '8px 12px', borderRadius: 8,
            background: COLORS.bumpStop + '22', border: `1px solid ${COLORS.bumpStop}60`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.bumpStop, flex: 1 }}>
              ⏱ Bump P{pendingBump + 1} — tap destination
            </span>
            <Btn variant="ghost" size="sm" onClick={() => {
              clearBump(pendingBump);
              setPendingBump(null);
            }}>✕</Btn>
          </div>
        )}

        {/* Bump clear buttons per-player */}
        {step.bumps?.some(Boolean) && (
          <div style={{ padding: `0 ${R.layout.padding}px 4px`, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {step.bumps.map((b, i) => b ? (
              <Btn key={i} variant="ghost" size="sm"
                style={{ color: COLORS.bumpStop, borderColor: COLORS.bumpStop + '40', fontSize: 10 }}
                onClick={() => clearBump(i)}>
                ⏱P{i+1} ✕
              </Btn>
            ) : null)}
          </div>
        )}

        {selPlayer !== null && step.players[selPlayer] && (
          <div style={{ padding: `4px ${R.layout.padding}px 6px`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${COLORS.border}30`, paddingTop: 8 }}>
            <Select value={step.assignments?.[selPlayer] || ''}
              onChange={v => updateStep(currentStep, s => {
                const n = { ...s, assignments: [...(s.assignments || E5())] };
                n.assignments[selPlayer] = v || null;
                return n;
              })} style={{ flex: 1, minWidth: 110 }}>
              <option value="">— Player —</option>
              {getAvailableRoster(selPlayer).map(p => <option key={p.id} value={p.id}>#{p.number} {p.nickname || p.name}</option>)}
            </Select>
          </div>
        )}
      </div>

      {/* ═══ MODE TABS ═══ */}
      <ModeTabBar
        modes={[
          { id: 'place', icon: '📍', label: 'Place' },
          { id: 'shoot', icon: '🎯', label: 'Shots' },
          { id: 'draw', icon: '✏️', label: 'Draw' },
          { id: 'counter', icon: '🎯', label: 'Counter' },
          { id: 'save', icon: '💾', label: isDirty ? 'Save*' : 'Save' },
        ]}
        activeMode={freehandOn ? 'draw' : counterMode !== 'idle' ? 'counter' : mode === 'shoot' ? 'shoot' : 'place'}
        onModeChange={id => {
          if (id === 'place') { setMode('place'); setFreehandOn(false); }
          else if (id === 'shoot') { setMode('shoot'); setFreehandOn(false); }
          else if (id === 'draw') { setFreehandOn(!freehandOn); if (!freehandOn) setTimeout(() => drawFreehand(), 50); }
          else if (id === 'counter') {
            if (counterMode === 'idle') { setFreehandOn(false); setMode('place'); setCounterMode('draw'); vis.clearCounter(); setCounterPath(null); }
            else { setCounterMode('idle'); setShowCounter(false); vis.clearCounter(); setCounterPath(null); setSelectedCounterBunkerId(null); }
          }
          else if (id === 'save') handleSave();
        }}
      />
    </div>
  );
}