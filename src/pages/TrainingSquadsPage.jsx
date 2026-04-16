import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Btn, EmptyState, SkeletonList } from '../components/ui';
import { usePlayers, useTrainings } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

/**
 * TrainingSquadsPage — drag & drop squad builder (§ 32 step 2).
 *
 * Squads are color-keyed (red, blue, green, yellow) and limited 2-4.
 * Coach drags player chips between zones; assignment persists to
 * Firestore on every drop.
 */
export default function TrainingSquadsPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { trainings, loading: tLoading } = useTrainings();
  const { players, loading: pLoading } = usePlayers();

  const training = trainings.find(t => t.id === trainingId);

  // Squads live in local state and persist via debounced writes so drag
  // doesn't thrash the network.
  const [squads, setSquads] = useState(null);
  const [squadCount, setSquadCount] = useState(2);
  useEffect(() => {
    if (!training || squads !== null) return;
    const initial = training.squads || {};
    const activeKeys = SQUAD_META.filter(m => Array.isArray(initial[m.key])).map(m => m.key);
    const count = activeKeys.length >= 2 ? activeKeys.length : 2;

    const next = {};
    SQUAD_META.slice(0, count).forEach(m => {
      next[m.key] = Array.isArray(initial[m.key]) ? [...initial[m.key]] : [];
    });

    // Auto-distribute any attendees not yet placed (round-robin).
    const assigned = new Set(Object.values(next).flat());
    const unplaced = (training.attendees || []).filter(pid => !assigned.has(pid));
    unplaced.forEach((pid, i) => {
      const key = SQUAD_META[i % count].key;
      next[key].push(pid);
    });

    setSquads(next);
    setSquadCount(count);
  }, [training, squads]);

  // Persist squads to Firestore — debounced so drag doesn't flood writes.
  const saveTimer = useRef(null);
  const scheduleSave = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      ds.updateTraining(trainingId, { squads: next }).catch(e => console.error('Save squads failed:', e));
    }, 300);
  }, [trainingId]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  // ── Drag state ──
  const [drag, setDrag] = useState(null); // { playerId, fromSquad, x, y }
  const [hoverSquad, setHoverSquad] = useState(null);
  const zoneRefs = useRef({});

  const playerById = useMemo(() => {
    const m = {};
    players.forEach(p => { m[p.id] = p; });
    return m;
  }, [players]);

  const findSquadAt = useCallback((clientX, clientY) => {
    for (const [key, el] of Object.entries(zoneRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return key;
      }
    }
    return null;
  }, []);

  const getClient = (e) => {
    const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    return t ? { x: t.clientX, y: t.clientY } : { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = (e, playerId, fromSquad) => {
    e.preventDefault();
    const { x, y } = getClient(e);
    setDrag({ playerId, fromSquad, x, y });
    setHoverSquad(fromSquad);
  };

  const handleDragMove = useCallback((e) => {
    if (!drag) return;
    if (e.preventDefault) e.preventDefault();
    const { x, y } = getClient(e);
    setDrag(prev => prev ? { ...prev, x, y } : prev);
    setHoverSquad(findSquadAt(x, y));
  }, [drag, findSquadAt]);

  const handleDragEnd = useCallback((e) => {
    if (!drag) return;
    const { x, y } = getClient(e);
    const target = findSquadAt(x, y);
    if (target && target !== drag.fromSquad) {
      setSquads(prev => {
        const next = { ...prev };
        next[drag.fromSquad] = (prev[drag.fromSquad] || []).filter(pid => pid !== drag.playerId);
        next[target] = [...(prev[target] || []), drag.playerId];
        scheduleSave(next);
        return next;
      });
    }
    setDrag(null);
    setHoverSquad(null);
  }, [drag, findSquadAt, scheduleSave]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => handleDragMove(e);
    const onEnd = (e) => handleDragEnd(e);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [drag, handleDragMove, handleDragEnd]);

  const changeSquadCount = (delta) => {
    const next = Math.max(2, Math.min(4, squadCount + delta));
    if (next === squadCount) return;
    setSquads(prev => {
      const result = {};
      SQUAD_META.slice(0, next).forEach(m => {
        result[m.key] = prev[m.key] ? [...prev[m.key]] : [];
      });
      if (next < squadCount) {
        // Redistribute players from removed squads into remaining squads.
        const orphans = [];
        SQUAD_META.slice(next).forEach(m => {
          (prev[m.key] || []).forEach(pid => orphans.push(pid));
        });
        orphans.forEach((pid, i) => {
          result[SQUAD_META[i % next].key].push(pid);
        });
      }
      scheduleSave(result);
      return result;
    });
    setSquadCount(next);
  };

  if (tLoading || pLoading || !squads) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <SkeletonList count={4} />
      </div>
    );
  }
  if (!training) return <EmptyState icon="⏳" text="Training not found" />;

  const attendees = training.attendees || [];
  const activeSquads = SQUAD_META.slice(0, squadCount);
  const grid4 = squadCount === 4;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: `/training/${trainingId}/setup` }}
        title="Squads"
        subtitle={`${attendees.length} players`}
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <SquadCountBtn label="−" onClick={() => changeSquadCount(-1)} disabled={squadCount <= 2} />
            <span style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
              color: COLORS.text, minWidth: 14, textAlign: 'center',
            }}>{squadCount}</span>
            <SquadCountBtn label="+" onClick={() => changeSquadCount(+1)} disabled={squadCount >= 4} />
          </div>
        }
      />

      {/* Squad zones fill remaining height */}
      <div style={{
        flex: 1,
        display: grid4 ? 'grid' : 'flex',
        flexDirection: grid4 ? undefined : 'column',
        gridTemplateColumns: grid4 ? '1fr 1fr' : undefined,
        gridTemplateRows: grid4 ? '1fr 1fr' : undefined,
        gap: 1,
        background: COLORS.surfaceLight,
        overflow: 'hidden',
      }}>
        {activeSquads.map(meta => {
          const squadPlayers = (squads[meta.key] || []).map(pid => playerById[pid]).filter(Boolean);
          const isHover = hoverSquad === meta.key && drag && drag.fromSquad !== meta.key;
          return (
            <div
              key={meta.key}
              ref={el => { zoneRefs.current[meta.key] = el; }}
              style={{
                background: isHover ? COLORS.surfaceDark : COLORS.bg,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'background .12s',
              }}>
              {/* Zone header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderBottom: `2.5px solid ${meta.color}`,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: meta.color, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: FONT, fontSize: 12, fontWeight: 800,
                  color: meta.color, letterSpacing: '.3px',
                  textTransform: 'uppercase',
                }}>{meta.name}</span>
                <span style={{
                  fontFamily: FONT, fontSize: 10, fontWeight: 600,
                  color: meta.color, opacity: 0.5,
                }}>{squadPlayers.length}</span>
              </div>
              {/* Chip body */}
              <div style={{
                flex: 1,
                padding: SPACE.md,
                display: 'flex',
                flexWrap: 'wrap',
                gap: SPACE.sm,
                alignContent: 'flex-start',
                overflowY: 'auto',
              }}>
                {squadPlayers.length === 0 && (
                  <div style={{
                    fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
                    padding: SPACE.sm, width: '100%', textAlign: 'center',
                  }}>
                    Drop players here
                  </div>
                )}
                {squadPlayers.map(p => {
                  const isDragging = drag?.playerId === p.id;
                  return (
                    <div
                      key={p.id}
                      onMouseDown={e => handleDragStart(e, p.id, meta.key)}
                      onTouchStart={e => handleDragStart(e, p.id, meta.key)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0 12px',
                        height: 44,
                        minHeight: TOUCH.minTarget,
                        borderRadius: RADIUS.md,
                        border: `1px solid ${meta.color}80`,
                        background: `${meta.color}18`,
                        color: meta.color,
                        fontFamily: FONT,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'grab',
                        userSelect: 'none',
                        opacity: isDragging ? 0.35 : 1,
                        touchAction: 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                      {p.nickname || p.name || '?'}
                      {p.number ? (
                        <span style={{ opacity: 0.55, fontSize: 10 }}>#{p.number}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag ghost */}
      {drag && (() => {
        const p = playerById[drag.playerId];
        return (
          <div style={{
            position: 'fixed',
            left: drag.x, top: drag.y,
            transform: 'translate(-50%, -50%)',
            padding: '8px 14px',
            borderRadius: RADIUS.md,
            border: `1.5px solid ${COLORS.accent}`,
            background: COLORS.surface,
            color: COLORS.text,
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 1000,
          }}>
            {p?.nickname || p?.name || '?'}
          </div>
        );
      })()}

      {/* Sticky footer */}
      <div style={{
        padding: `${SPACE.md}px ${SPACE.lg}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        <Btn
          variant="accent"
          onClick={() => navigate(`/training/${trainingId}`)}
          style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
        >
          Start training
        </Btn>
      </div>
    </div>
  );
}

function SquadCountBtn({ label, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width: 44, height: 44, borderRadius: RADIUS.md,
        border: `1px solid ${COLORS.border}`,
        background: disabled ? 'transparent' : COLORS.surfaceDark,
        color: disabled ? COLORS.textMuted : COLORS.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: 14, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}>
      {label}
    </div>
  );
}
