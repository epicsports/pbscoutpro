import React, { useState, useEffect, useRef } from 'react';
import PlayerAvatar from '../PlayerAvatar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * LivePointTracker — real-time elimination tracker for a training point.
 *
 * Scout picks players (upstream in QuickLogView), hits "Start punktu",
 * this view takes over:
 * - Running timer (mm:ss)
 * - One card per player with Trafiony/Cofnij toggle
 * - Tap player → marks as hit at current timer value, opens cause picker
 * - Cause picker: Break / Gunfight / Przebieg / Faja / za Karę / Nie wiadomo
 * - Tap W or L → onSave({ outcome, eliminations, eliminationTimes,
 *                         eliminationCauses, pointDuration })
 *
 * All collected state is kept internal; parent receives the final shape
 * and folds it into the normal point save pipeline.
 */

const CAUSES = [
  { id: 'break',    label: 'Break' },
  { id: 'gunfight', label: 'Gunfight' },
  { id: 'przebieg', label: 'Przebieg' },
  { id: 'faja',     label: 'Faja' },
  { id: 'kara',     label: 'za Karę' },
  { id: 'unknown',  label: 'Nie wiadomo' },
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function LivePointTracker({
  pickedPlayers,       // [{ id, name, nickname, number, photoURL, ... }]
  pointNumber,
  teamALabel,
  teamBLabel,
  teamAColor,          // color for team A button
  teamBColor,          // color for team B button
  onSave,              // ({ outcome, eliminations, eliminationTimes, eliminationCauses, pointDuration }) => Promise
  onCancel,
}) {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const startedAtRef = useRef(Date.now());
  const pausedOffsetRef = useRef(0); // accumulated paused time
  const pauseStartedAtRef = useRef(null);

  // state[pid] = { hit, t, cause, pickerOpen }
  const [state, setState] = useState(() => {
    const s = {};
    pickedPlayers.forEach(p => { s[p.id] = { hit: false, t: null, cause: null, pickerOpen: false }; });
    return s;
  });

  // Timer tick
  useEffect(() => {
    const id = setInterval(() => {
      if (paused) return;
      const elapsed = Math.floor((Date.now() - startedAtRef.current - pausedOffsetRef.current) / 1000);
      setSeconds(elapsed);
    }, 200);
    return () => clearInterval(id);
  }, [paused]);

  const togglePause = () => {
    if (paused) {
      // Resuming: add the paused duration to offset
      pausedOffsetRef.current += Date.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    } else {
      pauseStartedAtRef.current = Date.now();
    }
    setPaused(p => !p);
  };

  const handleTapCard = (pid) => {
    setState(prev => {
      const cur = prev[pid];
      // If already hit and picker open → undo
      if (cur.hit && cur.pickerOpen) {
        return { ...prev, [pid]: { hit: false, t: null, cause: null, pickerOpen: false } };
      }
      // If hit + picker closed → reopen picker
      if (cur.hit && !cur.pickerOpen) {
        return { ...prev, [pid]: { ...cur, pickerOpen: true } };
      }
      // Otherwise → mark hit + open picker
      return { ...prev, [pid]: { hit: true, t: seconds, cause: null, pickerOpen: true } };
    });
  };

  const handlePickCause = (pid, causeId) => {
    setState(prev => {
      const cur = prev[pid];
      // Tap same cause → toggle off
      return { ...prev, [pid]: { ...cur, cause: cur.cause === causeId ? null : causeId } };
    });
  };

  const closePicker = (pid) => {
    setState(prev => ({ ...prev, [pid]: { ...prev[pid], pickerOpen: false } }));
  };

  const handleSave = async (outcome) => {
    if (saving) return;
    setSaving(true);
    try {
      // Build arrays indexed by player slot (0..4), aligned with pickedPlayers order
      const eliminations = Array(5).fill(false);
      const eliminationTimes = Array(5).fill(null);
      const eliminationCauses = Array(5).fill(null);
      pickedPlayers.slice(0, 5).forEach((p, idx) => {
        const s = state[p.id];
        if (s?.hit) {
          eliminations[idx] = true;
          eliminationTimes[idx] = s.t;
          eliminationCauses[idx] = s.cause || 'unknown';
        }
      });
      await onSave({
        outcome,
        eliminations,
        eliminationTimes,
        eliminationCauses,
        pointDuration: seconds,
      });
    } catch (e) {
      console.error(e);
      alert('Błąd zapisu: ' + (e?.message || 'nieznany'));
      setSaving(false);
    }
  };

  const aliveCount = pickedPlayers.filter(p => !state[p.id]?.hit).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: COLORS.bg }}>
      {/* Header: back, point#, timer, pause */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px', borderBottom: `1px solid ${COLORS.border}`,
        background: '#0d1117', flexShrink: 0,
      }}>
        <div onClick={() => !saving && onCancel?.()}
          style={{ color: COLORS.accent, fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '4px 6px', WebkitTapHighlightColor: 'transparent' }}>
          ‹
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text, letterSpacing: '-0.1px' }}>
            {t('point') || 'Punkt'} #{pointNumber}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 1 }}>
            {teamALabel} vs {teamBLabel}
          </div>
        </div>
        <div style={{
          fontVariantNumeric: 'tabular-nums', fontFamily: FONT,
          fontSize: 24, fontWeight: 700, color: paused ? COLORS.textMuted : COLORS.accent,
          letterSpacing: '-0.5px',
        }}>{fmt(seconds)}</div>
        <div onClick={togglePause}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: `1px solid ${COLORS.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: paused ? COLORS.accent : COLORS.textDim,
            fontSize: 11, fontWeight: 700,
            WebkitTapHighlightColor: 'transparent',
          }}>{paused ? '▶' : '❚❚'}</div>
      </div>

      {/* Context strip */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px 6px',
      }}>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>
          {t('players_title') || 'Gracze'} · <span style={{ color: COLORS.textDim }}>{aliveCount} w polu</span>
        </span>
        {aliveCount === pickedPlayers.length && (
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#22d3ee' }}>
            Tknij, gdy ktoś spadł
          </span>
        )}
      </div>

      {/* Player cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {pickedPlayers.map(p => {
          const s = state[p.id] || { hit: false };
          return (
            <PlayerCard key={p.id}
              player={p} state={s}
              onTap={() => handleTapCard(p.id)}
              onPickCause={(cid) => handlePickCause(p.id, cid)}
              onClosePicker={() => closePicker(p.id)}
            />
          );
        })}
      </div>

      {/* Outcome footer */}
      <div style={{
        padding: 14, borderTop: `1px solid ${COLORS.border}`,
        background: '#0d1117', flexShrink: 0,
      }}>
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 8 }}>
          Kto wygrał punkt?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div onClick={() => !saving && handleSave('win_a')}
            style={{
              background: `${teamAColor || COLORS.success}15`, border: `1.5px solid ${teamAColor || COLORS.success}50`,
              color: teamAColor || COLORS.success, padding: 14, borderRadius: 10,
              fontFamily: FONT, fontSize: 15, fontWeight: 800,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.5 : 1,
              textAlign: 'center', letterSpacing: '-0.1px',
              WebkitTapHighlightColor: 'transparent',
            }}>{teamALabel}</div>
          <div onClick={() => !saving && handleSave('win_b')}
            style={{
              background: `${teamBColor || COLORS.danger}15`, border: `1.5px solid ${teamBColor || COLORS.danger}50`,
              color: teamBColor || COLORS.danger, padding: 14, borderRadius: 10,
              fontFamily: FONT, fontSize: 15, fontWeight: 800,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.5 : 1,
              textAlign: 'center', letterSpacing: '-0.1px',
              WebkitTapHighlightColor: 'transparent',
            }}>{teamBLabel}</div>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, state, onTap, onPickCause, onClosePicker }) {
  const { hit, t: elimT, cause, pickerOpen } = state;
  const causeLabel = cause ? CAUSES.find(c => c.id === cause)?.label : null;
  return (
    <div style={{
      background: hit ? '#1a0f0f' : COLORS.surfaceDark,
      border: `1px solid ${hit ? '#ef444430' : COLORS.border}`,
      borderRadius: RADIUS.lg, overflow: 'hidden',
      transition: 'background 0.15s, border-color 0.15s',
    }}>
      <div onClick={onTap}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', minHeight: 56,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{ opacity: hit ? 0.45 : 1, filter: hit ? 'grayscale(1)' : 'none' }}>
          <PlayerAvatar player={player} size={36} />
        </div>
        <span style={{
          fontFamily: FONT, fontWeight: 800, fontSize: 13,
          color: hit ? COLORS.textMuted : COLORS.accent,
          minWidth: 36,
        }}>#{player.number || '00'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT, fontSize: 14, fontWeight: 500,
            color: hit ? COLORS.textDim : COLORS.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {player.nickname || player.name || '?'}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {hit ? (
              <>
                <span style={{ color: COLORS.danger, fontWeight: 600 }}>✕ {fmt(elimT)}</span>
                {causeLabel && <span style={{ color: COLORS.textDim }}>· {causeLabel}</span>}
                {!causeLabel && <span style={{ color: COLORS.textMuted }}>· sposób?</span>}
              </>
            ) : (
              <>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.success, display: 'inline-block' }}></span>
                <span style={{ color: COLORS.success }}>w polu</span>
              </>
            )}
          </div>
        </div>
        <div style={{
          minWidth: 80, textAlign: 'center', padding: '8px 10px',
          borderRadius: 8, fontSize: 11, fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase',
          background: hit ? 'transparent' : `${COLORS.danger}20`,
          border: `1px solid ${hit ? COLORS.border : `${COLORS.danger}60`}`,
          color: hit ? COLORS.textMuted : COLORS.danger,
        }}>
          {hit ? 'Cofnij' : 'Trafiony'}
        </div>
      </div>

      {hit && pickerOpen && (
        <div style={{ borderTop: `1px solid ${COLORS.border}80`, padding: '8px 10px 10px', background: '#0d1117' }}>
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 6 }}>
            Jak spadł?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {CAUSES.map(c => {
              const sel = cause === c.id;
              return (
                <div key={c.id} onClick={(e) => { e.stopPropagation(); onPickCause(c.id); }}
                  style={{
                    padding: '8px 4px',
                    background: sel ? `${COLORS.accent}20` : COLORS.surfaceDark,
                    border: `1px solid ${sel ? `${COLORS.accent}60` : COLORS.border}`,
                    color: sel ? COLORS.accent : COLORS.textDim,
                    borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    textAlign: 'center', cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  {c.label}
                </div>
              );
            })}
          </div>
          <div onClick={(e) => { e.stopPropagation(); onClosePicker(); }}
            style={{ textAlign: 'center', padding: '8px 0 2px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
            <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
              {cause ? 'Zapisz i zwiń ▲' : 'Zwiń (bez kategorii)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
