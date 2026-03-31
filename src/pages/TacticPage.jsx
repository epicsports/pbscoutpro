import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import FieldEditor from '../components/FieldEditor';
import { Btn, SectionTitle, Select, Icons, EmptyState, Input , PlayerChip} from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, usePlayers, useTactics, useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH , responsive } from '../utils/theme';
import { useField } from '../hooks/useField';
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
  const [freehandOn, setFreehandOn] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(null);
  const [showBreakoutUnder, setShowBreakoutUnder] = useState(true);
  
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
      shots: ensureArray(s.shots, E5A()).map(sh => ensureArray(sh))
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
        dangerZone: activeLayout?.dangerZone, sajgonZone: activeLayout?.sajgonZone }
    : tournamentField;

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
        description: s.description || '',
      }));
      const data = { steps: stepsToSave, freehandStrokes: strokesRef.current };
      if (isLayoutMode) {
        await ds.updateLayoutTactic(layoutId, tacticId, data);
      } else {
        await ds.updateTactic(tournamentId, tacticId, data);
      }
      setLocalSteps(null);
    } catch (e) {
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handlePlacePlayer = (pos) => {
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
    }));
    setSelPlayer(null);
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

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={isLayoutMode
        ? [{ label: 'Layout Library', path: '/layouts' }, `⚔️ ${tactic.name}`]
        : [{ label: tournament.name, path: `/tournament/${tournamentId}` }, `⚔️ ${tactic.name}`]
      } />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {myTeam && (
          <div style={{ padding: `8px ${R.layout.padding}px`, background: COLORS.surfaceLight, borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
            🏴 Team: <strong style={{ color: COLORS.text }}>{myTeam.name}</strong>
          </div>
        )}

        <div style={{ padding: `8px ${R.layout.padding}px 4px`, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <Btn key={i} variant={currentStep === i ? 'accent' : 'ghost'} size="sm"
              onClick={() => { setCurrentStep(i); setSelPlayer(null); setMode('place'); setVisibleSteps(null); }}>
              {i + 1}. {s.description?.slice(0, 10) || `Step ${i + 1}`}
            </Btn>
          ))}
          {steps.length < 3 && <Btn variant="ghost" size="sm" onClick={addStep}><Icons.Plus /> Step</Btn>}
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
          <FieldEditor
            hasBunkers={!!field.bunkers?.length} hasZones={!!(field.dangerZone || field.sajgonZone)} hasLines
            showLines showZoom
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
              onPlacePlayer={freehandOn ? undefined : handlePlacePlayer}
              onMovePlayer={freehandOn ? undefined : handleMovePlayer}
              onPlaceShot={freehandOn ? undefined : handlePlaceShot}
              onDeleteShot={freehandOn ? undefined : handleDeleteShot}
              onSelectPlayer={freehandOn ? undefined : (idx) => setSelPlayer(selPlayer === idx ? null : idx)}
              editable={!freehandOn} selectedPlayer={freehandOn ? null : selPlayer}
              mode={freehandOn ? 'place' : mode}
              playerAssignments={step.assignments} rosterPlayers={roster}
              discoLine={field.discoLine || 0}
              zeekerLine={field.zeekerLine || 0}
              bunkers={field.bunkers || []}
              dangerZone={field.dangerZone} sajgonZone={field.sajgonZone} />
          </FieldEditor>
        </div>

        <div style={{ padding: `4px ${R.layout.padding}px 8px`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn variant="default" active={mode === 'place' && !freehandOn} onClick={() => { setMode('place'); setFreehandOn(false); }}>✋ Positions</Btn>
          <Btn variant="default" active={mode === 'shoot' && !freehandOn} onClick={() => { setMode('shoot'); setFreehandOn(false); }}><Icons.Target /> Shots</Btn>
          <Btn variant={freehandOn ? 'accent' : 'default'} onClick={() => {
              const newState = !freehandOn;
              setFreehandOn(newState);
              if (newState) setTimeout(() => drawFreehand(), 50);
            }}>✏️ Freehand</Btn>
          
          {freehandOn && (
            <Btn variant={showBreakoutUnder ? 'default' : 'ghost'} size="sm" onClick={() => setShowBreakoutUnder(v => !v)}>
              {showBreakoutUnder ? '👁 Breakout On' : '👁 Breakout Off'}
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          {steps.length > 1 && <Btn variant="ghost" size="sm" onClick={() => removeStep(currentStep)}><Icons.Trash /> Step</Btn>}
        </div>

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

      <div style={{ padding: `12px ${R.layout.padding}px`, borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface, display: 'flex', gap: 8 }}>
        <Btn variant="default" onClick={() => window.print()} style={{ minHeight: 52, padding: '0 18px' }}>🖨️</Btn>
        <Btn variant="accent" disabled={!isDirty || saving}
          onClick={handleSave} style={{ flex: 1, justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
          <Icons.Check /> {saving ? 'Saving...' : 'SAVE TACTIC'}
        </Btn>
      </div>
    </div>
  );
}