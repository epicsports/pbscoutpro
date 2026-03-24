import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import { Btn, SectionTitle, Select, Icons, EmptyState, Input } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, usePlayers, useTactics, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH } from '../utils/theme';
import { resolveField } from '../utils/helpers';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];

export default function TacticPage() {
  const { tournamentId, tacticId } = useParams();
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { scouted } = useScoutedTeams(tournamentId);
  const { players } = usePlayers();
  const { tactics } = useTactics(tournamentId);
  const { layouts } = useLayouts();

  const [currentStep, setCurrentStep] = useState(0);
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place'); // place | shoot | freehand
  const [saving, setSaving] = useState(false);
  const [freehandOn, setFreehandOn] = useState(false);
  const [freehandColor, setFreehandColor] = useState('#ffffff');
  const [freehandWidth, setFreehandWidth] = useState(3);
  const [freehandStrokes, setFreehandStrokes] = useState([]); // [{points, color, width}]
  const freehandCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef([]);

  // Load saved freehand strokes
  useEffect(() => {
    if (tactic?.freehandStrokes?.length) setFreehandStrokes(tactic.freehandStrokes);
  }, [tactic?.id]);

  const tournament = tournaments.find(t => t.id === tournamentId);
  const tactic = tactics.find(t => t.id === tacticId);
  const field = resolveField(tournament, layouts);

  // Steps are stored as array on tactic doc
  const [localSteps, setLocalSteps] = useState(null);

  // Initialize from Firestore
  const steps = useMemo(() => {
    if (localSteps) return localSteps;
    if (!tactic?.steps?.length) return [{ players: E5(), shots: E5A(), assignments: E5(), description: 'Rozbieg' }];
    return tactic.steps;
  }, [tactic, localSteps]);

  const step = steps[currentStep] || steps[0];
  const myTeamScoutedId = tactic?.myTeamScoutedId;
  const myScoutedEntry = scouted.find(s => s.id === myTeamScoutedId);
  const myTeam = teams.find(t => t.id === myScoutedEntry?.teamId);
  const roster = (myScoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  if (!tournament || !tactic) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const updateStep = (stepIdx, updater) => {
    setLocalSteps(prev => {
      const s = prev || [...steps];
      const next = [...s];
      next[stepIdx] = updater({ ...next[stepIdx] });
      return next;
    });
  };

  const addStep = () => {
    // Copy assignments from previous step
    const prevStep = steps[steps.length - 1];
    setLocalSteps(prev => {
      const s = prev || [...steps];
      return [...s, {
        players: E5(), shots: E5A(),
        assignments: [...(prevStep?.assignments || E5())],
        description: `Krok ${s.length + 1}`,
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
    const stepsToSave = (localSteps || steps).map(s => ({
      players: s.players,
      shots: s.shots.map((arr, i) => {
        const o = {}; (arr || []).forEach((v, j) => { o[String(j)] = v; }); return o;
      }),
      assignments: s.assignments,
      description: s.description || '',
    }));
    await ds.updateTactic(tournamentId, tacticId, { steps: stepsToSave });
    setLocalSteps(null);
    setSaving(false);
  };

  // Canvas handlers
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

  const isDirty = localSteps !== null;

  // ─── Freehand helpers ───
  const getFreehandPos = useCallback((e) => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - rect.left) / rect.width, y: (cy - rect.top) / rect.height };
  }, []);

  const initFreehandCanvas = useCallback(() => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.offsetWidth - 32;
    canvas.height = parent.offsetHeight;
    drawFreehand();
  }, []);

  const drawFreehand = useCallback(() => {
    const canvas = freehandCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const renderStrokes = (strokes) => {
      strokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        ctx.strokeStyle = stroke.color || '#ffffff';
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

    renderStrokes(freehandStrokes);
    // Draw current stroke in progress
    if (currentStroke.current.length > 1) {
      renderStrokes([{ points: currentStroke.current, color: freehandColor }]);
    }
  }, [freehandStrokes, freehandColor]);

  // Redraw when strokes change
  useEffect(() => { if (freehandOn) drawFreehand(); }, [freehandStrokes, freehandOn, drawFreehand]);

  const saveFreehandAsTactic = async () => {
    if (!freehandStrokes.length) return;
    await ds.addTactic(tournamentId, {
      name: `${tactic.name} — rysunek`,
      myTeamScoutedId: tactic.myTeamScoutedId,
      steps: steps,
      freehandStrokes: freehandStrokes,
    });
    setFreehandStrokes([]);
    setFreehandOn(false);
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[
        { label: tournament.name, path: `/tournament/${tournamentId}` },
        `⚔️ ${tactic.name}`,
      ]} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Team info */}
        {myTeam && (
          <div style={{ padding: '8px 16px', background: COLORS.surfaceLight, borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
            🏴 Moja drużyna: <strong style={{ color: COLORS.text }}>{myTeam.name}</strong>
          </div>
        )}

        {/* Step tabs */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <Btn key={i} variant={currentStep === i ? 'accent' : 'default'} size="sm"
              onClick={() => { setCurrentStep(i); setSelPlayer(null); setMode('place'); }}>
              {i + 1}. {s.description?.slice(0, 10) || `Krok ${i + 1}`}
            </Btn>
          ))}
          {steps.length < 3 && (
            <Btn variant="ghost" size="sm" onClick={addStep}><Icons.Plus /> Krok</Btn>
          )}
        </div>

        {/* Step description */}
        <div style={{ padding: '4px 16px 8px' }}>
          <input value={step.description || ''} onChange={e => updateStep(currentStep, s => ({ ...s, description: e.target.value }))}
            placeholder="Opis kroku..." style={{
              fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '6px 10px', borderRadius: 6,
              background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`,
              width: '100%', minHeight: 32,
            }} />
        </div>

        {/* Canvas with freehand overlay */}
        <div style={{ padding: '0 16px 8px', position: 'relative' }}>
          <FieldCanvas fieldImage={field.fieldImage}
            players={freehandOn ? [] : step.players} shots={freehandOn ? [[], [], [], [], []] : step.shots}
            onPlacePlayer={freehandOn ? undefined : handlePlacePlayer}
            onMovePlayer={freehandOn ? undefined : handleMovePlayer}
            onPlaceShot={freehandOn ? undefined : handlePlaceShot}
            onDeleteShot={freehandOn ? undefined : handleDeleteShot}
            onSelectPlayer={freehandOn ? undefined : (idx) => setSelPlayer(selPlayer === idx ? null : idx)}
            editable={!freehandOn} selectedPlayer={freehandOn ? null : selPlayer} mode={freehandOn ? 'place' : mode}
            playerAssignments={step.assignments} rosterPlayers={roster}
            discoLine={field.discoLine || 0}
            zeekerLine={field.zeekerLine || 0} />
          {/* Saved freehand strokes — visible always when strokes exist */}
          {!freehandOn && freehandStrokes.length > 0 && (
            <svg style={{ position: 'absolute', top: 0, left: 16, right: 16, width: 'calc(100% - 32px)', height: '100%', pointerEvents: 'none' }}
              viewBox="0 0 1 1" preserveAspectRatio="none">
              {freehandStrokes.map((s, i) => s.points.length > 1 && (
                <polyline key={i} points={s.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none" stroke={s.color || '#fff'} strokeWidth={`${(s.width || 3) * 0.002}`} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          )}
          {/* Freehand drawing canvas overlay */}
          {freehandOn && (
            <canvas ref={freehandCanvasRef}
              style={{
                position: 'absolute', top: 0, left: 16, right: 16,
                width: 'calc(100% - 32px)', height: '100%',
                borderRadius: 10, cursor: 'crosshair', touchAction: 'none',
              }}
              onMouseDown={e => { isDrawing.current = true; currentStroke.current = [getFreehandPos(e)]; }}
              onMouseMove={e => { if (!isDrawing.current) return; currentStroke.current.push(getFreehandPos(e)); drawFreehand(); }}
              onMouseUp={() => { if (isDrawing.current && currentStroke.current.length > 1) { setFreehandStrokes(prev => [...prev, { points: [...currentStroke.current], color: freehandColor, width: freehandWidth }]); } isDrawing.current = false; currentStroke.current = []; drawFreehand(); }}
              onMouseLeave={() => { isDrawing.current = false; currentStroke.current = []; }}
              onTouchStart={e => { e.preventDefault(); isDrawing.current = true; currentStroke.current = [getFreehandPos(e)]; }}
              onTouchMove={e => { e.preventDefault(); if (!isDrawing.current) return; currentStroke.current.push(getFreehandPos(e)); drawFreehand(); }}
              onTouchEnd={e => { e.preventDefault(); if (isDrawing.current && currentStroke.current.length > 1) { setFreehandStrokes(prev => [...prev, { points: [...currentStroke.current], color: freehandColor, width: freehandWidth }]); } isDrawing.current = false; currentStroke.current = []; drawFreehand(); }}
            />
          )}
        </div>

        {/* Mode */}
        <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn variant="default" active={mode === 'place' && !freehandOn} onClick={() => { setMode('place'); setFreehandOn(false); }}>✋ Pozycje</Btn>
          <Btn variant="default" active={mode === 'shoot' && !freehandOn} onClick={() => { setMode('shoot'); setFreehandOn(false); }}><Icons.Target /> Strzały</Btn>
          <Btn variant={freehandOn ? 'accent' : 'default'} onClick={() => { setFreehandOn(!freehandOn); if (!freehandOn) setTimeout(initFreehandCanvas, 50); }}>
            ✏️ Freehand
          </Btn>
          <div style={{ flex: 1 }} />
          {steps.length > 1 && (
            <Btn variant="ghost" size="sm" onClick={() => removeStep(currentStep)}><Icons.Trash /> Krok</Btn>
          )}
        </div>

        {/* Freehand controls */}
        {freehandOn && (
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            {['#ffffff', '#ef4444', '#3b82f6'].map(c => (
              <div key={c} onClick={() => setFreehandColor(c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                border: `3px solid ${freehandColor === c ? COLORS.accent : COLORS.border}`,
              }} />
            ))}
            <div style={{ width: 1, height: 20, background: COLORS.border, margin: '0 2px' }} />
            {[2, 4, 7].map(w => (
              <div key={w} onClick={() => setFreehandWidth(w)} style={{
                width: 28, height: 28, borderRadius: '50%', background: COLORS.surface, cursor: 'pointer',
                border: `2px solid ${freehandWidth === w ? COLORS.accent : COLORS.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ width: w * 2, height: w * 2, borderRadius: '50%', background: freehandColor }} />
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <Btn variant="ghost" size="sm" onClick={() => { setFreehandStrokes(prev => prev.slice(0, -1)); drawFreehand(); }}>↩</Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setFreehandStrokes([]); drawFreehand(); }}><Icons.Trash /></Btn>
            {freehandStrokes.length > 0 && (
              <Btn variant="default" size="sm" onClick={saveFreehandAsTactic}>💾</Btn>
            )}
          </div>
        )}

        {/* Player chips */}
        <div style={{ padding: '4px 16px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {step.players.map((p, i) => {
            const color = COLORS.playerColors[i];
            return (
              <div key={i} onClick={() => p && setSelPlayer(selPlayer === i ? null : i)} style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 16, minHeight: 32,
                fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700,
                background: p ? color + '20' : COLORS.surface,
                border: `2px solid ${p ? color + (selPlayer === i ? 'ff' : '50') : COLORS.border}`,
                color: p ? color : COLORS.textMuted, cursor: p ? 'pointer' : 'default',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: p ? color : COLORS.textMuted + '40' }} />
                {getChipLabel(i)}
                {step.shots?.[i]?.length > 0 && <span style={{ fontSize: 8 }}>🎯{step.shots[i].length}</span>}
                {p && <span onClick={e => { e.stopPropagation(); removePlayer(i); }} style={{ cursor: 'pointer', opacity: 0.4, fontSize: 12, marginLeft: 2 }}>×</span>}
              </div>
            );
          })}
        </div>

        {/* Selected player controls */}
        {selPlayer !== null && step.players[selPlayer] && (
          <div style={{ padding: '4px 16px 6px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${COLORS.border}30`, paddingTop: 8 }}>
            <Select value={step.assignments?.[selPlayer] || ''}
              onChange={v => updateStep(currentStep, s => {
                const n = { ...s, assignments: [...(s.assignments || E5())] };
                n.assignments[selPlayer] = v || null;
                return n;
              })} style={{ flex: 1, minWidth: 110 }}>
              <option value="">— Zawodnik —</option>
              {getAvailableRoster(selPlayer).map(p => <option key={p.id} value={p.id}>#{p.number} {p.nickname || p.name}</option>)}
            </Select>
          </div>
        )}
      </div>

      {/* SAVE */}
      <div style={{ padding: '12px 16px', borderTop: `2px solid ${COLORS.accent}40`, background: COLORS.surface }}>
        <Btn variant="accent" disabled={!isDirty || saving}
          onClick={handleSave} style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
          <Icons.Check /> {saving ? 'Zapisywanie...' : 'ZAPISZ TAKTYKĘ'}
        </Btn>
      </div>
    </div>
  );
}
