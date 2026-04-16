import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayers } from '../../hooks/useFirestore';
import PlayerAvatar from '../PlayerAvatar';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { SQUADS as SQUAD_META } from '../../utils/squads';

/**
 * SquadEditor — inline drag & drop squad builder.
 * Reusable in both TrainingSquadsPage and TrainingScoutTab.
 */
export default function SquadEditor({ trainingId, training }) {
  const { players } = usePlayers();
  const { t } = useLanguage();

  const [squads, setSquads] = useState(null);
  const [squadCount, setSquadCount] = useState(2);

  useEffect(() => {
    if (!training) return;
    const initial = training.squads || {};
    const activeKeys = SQUAD_META.filter(m => Array.isArray(initial[m.key])).map(m => m.key);
    const count = activeKeys.length >= 2 ? activeKeys.length : 2;
    const attendeeSet = new Set(training.attendees || []);
    const next = {};
    // Filter existing squads to only include current attendees — cleans up
    // any orphans left behind by attendance changes done elsewhere.
    SQUAD_META.slice(0, count).forEach(m => {
      next[m.key] = Array.isArray(initial[m.key])
        ? initial[m.key].filter(pid => attendeeSet.has(pid))
        : [];
    });
    const assigned = new Set(Object.values(next).flat());
    const unplaced = (training.attendees || []).filter(pid => !assigned.has(pid));
    unplaced.forEach((pid, i) => {
      const key = SQUAD_META[i % count].key;
      next[key].push(pid);
    });
    setSquads(next);
    setSquadCount(count);
  }, [training?.id, training?.attendees?.length]);

  const saveTimer = useRef(null);
  const scheduleSave = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      ds.updateTraining(trainingId, { squads: next }).catch(e => console.error('Save squads failed:', e));
    }, 300);
  }, [trainingId]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const [drag, setDrag] = useState(null);
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
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return key;
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
      SQUAD_META.slice(0, next).forEach(m => { result[m.key] = prev[m.key] ? [...prev[m.key]] : []; });
      if (next < squadCount) {
        const orphans = [];
        SQUAD_META.slice(next).forEach(m => { (prev[m.key] || []).forEach(pid => orphans.push(pid)); });
        orphans.forEach((pid, i) => { result[SQUAD_META[i % next].key].push(pid); });
      }
      scheduleSave(result);
      return result;
    });
    setSquadCount(next);
  };

  if (!squads) return null;

  const activeSquads = SQUAD_META.slice(0, squadCount);

  return (
    <div>
      {/* Squad count control */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: SPACE.sm,
      }}>
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>{t('squads_count')}</span>
        <CountBtn label="−" onClick={() => changeSquadCount(-1)} disabled={squadCount <= 2} />
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: COLORS.text, minWidth: 14, textAlign: 'center' }}>{squadCount}</span>
        <CountBtn label="+" onClick={() => changeSquadCount(+1)} disabled={squadCount >= 4} />
      </div>

      {/* Squad zones */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 1,
        background: COLORS.surfaceLight, borderRadius: RADIUS.lg, overflow: 'hidden',
      }}>
        {activeSquads.map(meta => {
          const squadPlayers = (squads[meta.key] || []).map(pid => playerById[pid]).filter(Boolean);
          const isHover = hoverSquad === meta.key && drag && drag.fromSquad !== meta.key;
          return (
            <div key={meta.key} ref={el => { zoneRefs.current[meta.key] = el; }} style={{
              background: isHover ? COLORS.surfaceDark : COLORS.bg, transition: 'background .12s',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderBottom: `2.5px solid ${meta.color}`,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: meta.color, letterSpacing: '.3px', textTransform: 'uppercase' }}>{meta.name}</span>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: meta.color, opacity: 0.5 }}>{squadPlayers.length}</span>
              </div>
              <div style={{
                padding: `${SPACE.sm}px ${SPACE.md}px ${SPACE.md}px`,
                display: 'flex', flexWrap: 'wrap', gap: SPACE.sm,
                alignContent: 'flex-start', minHeight: 52,
              }}>
                {squadPlayers.length === 0 && (
                  <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, padding: SPACE.sm, width: '100%', textAlign: 'center' }}>
                    Drop players here
                  </div>
                )}
                {squadPlayers.map(p => {
                  const isDragging = drag?.playerId === p.id;
                  return (
                    <div key={p.id}
                      onMouseDown={e => handleDragStart(e, p.id, meta.key)}
                      onTouchStart={e => handleDragStart(e, p.id, meta.key)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '3px 12px 3px 3px', height: 40, borderRadius: 20,
                        border: `1px solid ${meta.color}80`, background: `${meta.color}18`,
                        color: meta.color, fontFamily: FONT, fontSize: 13, fontWeight: 600,
                        cursor: 'grab', userSelect: 'none', opacity: isDragging ? 0.35 : 1,
                        touchAction: 'none', WebkitTapHighlightColor: 'transparent',
                      }}>
                      <PlayerAvatar player={p} size={32} />
                      {p.number ? <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, letterSpacing: '-0.2px' }}>#{p.number}</span> : null}
                      <span>{p.nickname || p.name || '?'}</span>
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
            position: 'fixed', left: drag.x, top: drag.y, transform: 'translate(-50%, -50%)',
            padding: '4px 14px 4px 4px', borderRadius: 22,
            border: `1.5px solid ${COLORS.accent}`,
            background: COLORS.surface, color: COLORS.text, fontFamily: FONT, fontSize: 13, fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: 1000,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <PlayerAvatar player={p} size={32} />
            {p?.number && <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.accent, letterSpacing: '-0.2px' }}>#{p.number}</span>}
            <span>{p?.nickname || p?.name || '?'}</span>
          </div>
        );
      })()}
    </div>
  );
}

function CountBtn({ label, onClick, disabled }) {
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      width: 32, height: 32, borderRadius: RADIUS.sm,
      border: `1px solid ${COLORS.border}`,
      background: disabled ? 'transparent' : COLORS.surfaceDark,
      color: disabled ? COLORS.textMuted : COLORS.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, fontSize: 14, fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
      WebkitTapHighlightColor: 'transparent',
    }}>{label}</div>
  );
}
