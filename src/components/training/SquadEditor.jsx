import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { usePlayers } from '../../hooks/useFirestore';
import PlayerAvatar from '../PlayerAvatar';
import { Modal, Input, Btn } from '../ui';
import RdIcon from '../RdIcon';
import { useLanguage } from '../../hooks/useLanguage';
import { useDevice } from '../../hooks/useDevice';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ELEV, TRACKING } from '../../utils/theme';
import { SQUADS as SQUAD_META, getSquadName } from '../../utils/squads';

// § 53: max 5 squads (was 4 per § 32). Anchored as a constant so other call
// sites can reference the limit without re-reading SQUAD_META length.
const MAX_SQUADS = 5;
const MIN_SQUADS = 2;

// Set-equal compare on per-key player arrays. Used by the mount effect to
// gate the auto-distribute persist so we don't schedule a no-op write on
// every re-render.
const squadsDiffer = (a, b) => {
  const ka = Object.keys(a || {});
  const kb = Object.keys(b || {});
  if (ka.length !== kb.length) return true;
  for (const k of kb) {
    const va = (a && a[k]) || [];
    const vb = b[k] || [];
    if (va.length !== vb.length) return true;
    const sa = new Set(va);
    for (const pid of vb) if (!sa.has(pid)) return true;
  }
  return false;
};

/**
 * SquadEditor — inline drag & drop squad builder.
 * Reusable in both TrainingSquadsPage and TrainingScoutTab.
 */
export default function SquadEditor({ trainingId, training }) {
  const { players } = usePlayers();
  const { t } = useLanguage();
  const device = useDevice();
  const wide = device.width >= 720;

  const [squads, setSquads] = useState(null);
  const [squadCount, setSquadCount] = useState(2);

  const saveTimer = useRef(null);
  const scheduleSave = useCallback((next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      ds.updateTraining(trainingId, { squads: next }).catch(e => console.error('Save squads failed:', e));
    }, 300);
  }, [trainingId]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

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
    // Persist the cleaned + auto-distributed result when it differs from
    // what's stored. Today this redistribution was local-only — if the
    // coach opened the editor (e.g. via TrainingScoutTab's embedded
    // SquadEditor) and navigated away without dragging anyone, the
    // recovered placement was thrown away and any unplaced attendees
    // (typically guests invited before squads were formed) stayed under
    // "Bez składu" in the coach summary. AttendeesEditor's atomic
    // invite-time placement covers the squads-already-exist path; this
    // covers the squads-formed-after-invite path.
    if (squadsDiffer(initial, next)) scheduleSave(next);
  }, [training?.id, training?.attendees?.length, scheduleSave]);

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
    const next = Math.max(MIN_SQUADS, Math.min(MAX_SQUADS, squadCount + delta));
    if (next === squadCount) return;
    setSquads(prev => {
      const result = {};
      SQUAD_META.slice(0, next).forEach(m => { result[m.key] = prev[m.key] ? [...prev[m.key]] : []; });
      if (next < squadCount) {
        // § 53: shrinking 5→4 redistributes purple players across r/b/g/y
        // round-robin. squadNames.purple stays in Firestore (graceful: if
        // user grows back to 5, the custom name persists per § 53.5).
        const orphans = [];
        SQUAD_META.slice(next).forEach(m => { (prev[m.key] || []).forEach(pid => orphans.push(pid)); });
        orphans.forEach((pid, i) => { result[SQUAD_META[i % next].key].push(pid); });
      }
      scheduleSave(result);
      return result;
    });
    setSquadCount(next);
  };

  // § 53.4 rename UX — single Modal, full-header tap target. State is
  // local; on save we write to Firestore and the live snapshot updates
  // the `training` prop, so the header re-renders with the new label.
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  const openRenameModal = useCallback((squadKey) => {
    setRenameTarget(squadKey);
    setRenameValue(getSquadName(training, squadKey));
  }, [training]);

  const closeRenameModal = useCallback(() => {
    setRenameTarget(null);
    setRenameValue('');
  }, []);

  const saveRename = useCallback(async () => {
    if (!renameTarget) return;
    setRenameSaving(true);
    try {
      await ds.updateTrainingSquadName(trainingId, renameTarget, renameValue);
      closeRenameModal();
    } catch (e) {
      console.error('Rename squad failed:', e);
      // Leave modal open so user can retry; keep their typed value.
    } finally {
      setRenameSaving(false);
    }
  }, [trainingId, renameTarget, renameValue, closeRenameModal]);

  if (!squads) return null;

  const activeSquads = SQUAD_META.slice(0, squadCount);

  return (
    <div>
      {/* Squad count control */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: SPACE.md,
      }}>
        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, letterSpacing: TRACKING.label, textTransform: 'uppercase', color: COLORS.textDim, marginRight: 2 }}>{t('squads_count')}</span>
        <CountBtn label="−" onClick={() => changeSquadCount(-1)} disabled={squadCount <= MIN_SQUADS} />
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800, color: COLORS.text, minWidth: 16, textAlign: 'center' }}>{squadCount}</span>
        <CountBtn label="+" onClick={() => changeSquadCount(+1)} disabled={squadCount >= MAX_SQUADS} />
      </div>

      {/* Squad zones — ELEV cards; stacked on phone, grid on wide (≥720) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: wide ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr',
        gap: SPACE.sm, alignItems: 'start',
      }}>
        {activeSquads.map(meta => {
          const squadPlayers = (squads[meta.key] || []).map(pid => playerById[pid]).filter(Boolean);
          const isHover = hoverSquad === meta.key && drag && drag.fromSquad !== meta.key;
          return (
            <div key={meta.key} ref={el => { zoneRefs.current[meta.key] = el; }} style={{
              background: ELEV.surface, border: `1px solid ${isHover ? meta.color : ELEV.hairline}`,
              borderRadius: RADIUS.lg, boxShadow: ELEV.shadow1, overflow: 'hidden', transition: 'border-color .12s',
            }}>
              {/* § 53.4 — whole header is the tap target for rename. Pencil
                  icon is decorative affordance only (textDim, not amber) to
                  avoid a competing CTA per § 27. Keyboard-accessible (tabIndex
                  + Enter/Space → global :focus-visible ring). minHeight 44. */}
              <div
                role="button" tabIndex={0}
                onClick={() => openRenameModal(meta.key)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openRenameModal(meta.key); } }}
                className="rd-press"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 14px', minHeight: TOUCH.min,
                  background: ELEV.sunken, borderBottom: `2.5px solid ${meta.color}`,
                  cursor: 'pointer', userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: meta.color, letterSpacing: TRACKING.label, textTransform: 'uppercase' }}>{getSquadName(training, meta.key)}</span>
                <span style={{ color: COLORS.textDim, opacity: 0.6, display: 'flex', flexShrink: 0 }}><RdIcon name="pencil" size={12} /></span>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: meta.color, background: `${meta.color}1c`, border: `1px solid ${meta.color}40`, borderRadius: 999, padding: '1px 8px', marginLeft: 'auto' }}>{squadPlayers.length}</span>
              </div>
              <div style={{
                padding: `${SPACE.sm}px ${SPACE.md}px ${SPACE.md}px`,
                display: 'flex', flexWrap: 'wrap', gap: SPACE.sm,
                alignContent: 'flex-start', minHeight: 56,
                background: isHover ? ELEV.sunken : 'transparent', transition: 'background .12s',
              }}>
                {squadPlayers.length === 0 && (
                  <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, padding: SPACE.sm, width: '100%', textAlign: 'center' }}>
                    {t('squads_drop_hint')}
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
                        color: meta.color, fontFamily: FONT, fontSize: 13, fontWeight: 700,
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
            background: ELEV.surface, color: COLORS.text, fontFamily: FONT, fontSize: 13, fontWeight: 700,
            boxShadow: ELEV.shadow2 || '0 8px 24px rgba(0,0,0,0.6)', pointerEvents: 'none', zIndex: 1000,
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            <PlayerAvatar player={p} size={32} />
            {p?.number && <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.accent, letterSpacing: '-0.2px' }}>#{p.number}</span>}
            <span>{p?.nickname || p?.name || '?'}</span>
          </div>
        );
      })()}

      {/* § 53.4 — Rename squad Modal. Empty input = revert to brand default. */}
      <Modal
        open={renameTarget !== null}
        onClose={closeRenameModal}
        title={t('rename_squad_title')}
      >
        <div style={{ padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <Input
            value={renameValue}
            onChange={value => setRenameValue((value || '').slice(0, 16))}
            placeholder={t('rename_squad_placeholder')}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && !renameSaving) saveRename();
              if (e.key === 'Escape') closeRenameModal();
            }}
          />
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>
            {t('rename_squad_max_length_hint')}
          </div>
          <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'flex-end', marginTop: SPACE.sm }}>
            <Btn variant="ghost" onClick={closeRenameModal} disabled={renameSaving}>
              {t('rename_squad_cancel')}
            </Btn>
            <Btn variant="accent" onClick={saveRename} disabled={renameSaving}>
              {t('rename_squad_save')}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CountBtn({ label, onClick, disabled }) {
  return (
    <div
      role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } })}
      className={disabled ? undefined : 'rd-press'}
      style={{
        width: 36, height: 36, borderRadius: RADIUS.sm,
        border: `1px solid ${disabled ? ELEV.hairline : ELEV.hairlineStrong}`,
        background: disabled ? 'transparent' : ELEV.surface,
        color: disabled ? COLORS.textMuted : COLORS.text,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: 16, fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        WebkitTapHighlightColor: 'transparent',
      }}>{label}</div>
  );
}
