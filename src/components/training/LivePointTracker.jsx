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
 * - Tap player → marks as hit at current timer value, opens 2-step picker
 *
 * 2-step picker (per § 54.4 + Brief A 2026-04-29 implementation):
 *   Step 1 — "Jak spadł?" (stage): break / inplay / endgame.
 *            'alive' is omitted — coach tapped Trafiony, so by definition
 *            the player IS eliminated. Stage is required (no skip).
 *   Step 2 — "Jak go trafili?" (reason): 7 canonical options + Pomiń.
 *            Pomiń saves with deathReason=null (stage-only capture).
 *            Back chevron returns to Step 1 (re-pick stage).
 *
 * Tap "Zapisz" → onSave({ outcome: undefined, eliminations, eliminationTimes,
 *                          eliminationStages, eliminationReasons, eliminationReasonTexts,
 *                          pointDuration })
 *
 * Hotfix 2026-05-02 (Issue #1): winner pick removed from this stage. The
 * "Kto wygrał punkt?" buttons (win_a / win_b) duplicated Stage 4's
 * outcome-confirmation step in QuickLogView — coach picked the winner here
 * and *again* on the next screen. QuickLogView's handleWin already
 * discards `outcome` from this payload (only takes elims/stages/reasons/
 * times/duration), so dropping outcome from the contract is loss-free.
 * Stage 4 ('win') in QuickLogView is the sole winner-pick surface.
 *
 * Schema (per D1.A — slot-indexed array preserved, no per-playerId map):
 *   eliminations[i]            : boolean — same as before
 *   eliminationTimes[i]        : number  — same as before
 *   eliminationStages[i]       : 'break'|'inplay'|'endgame'|null  — NEW
 *   eliminationReasons[i]      : canonical reason key | null      — NEW (renamed)
 *   eliminationReasonTexts[i]  : string for 'inaczej' free text | null — NEW
 *
 * Legacy `eliminationCauses` field NOT written by this component anymore.
 * Read consumers normalize via deathTaxonomy.normalizeLegacyReason.
 */

const STAGE_OPTIONS = [
  { id: 'break',   labelKey: 'death_stage_break' },
  { id: 'inplay',  labelKey: 'death_stage_inplay' },
  { id: 'endgame', labelKey: 'death_stage_endgame' },
];

const REASON_OPTIONS = [
  { id: 'gunfight',         labelKey: 'death_reason_gunfight' },
  { id: 'przejscie',        labelKey: 'death_reason_przejscie' },
  { id: 'faja',             labelKey: 'death_reason_faja' },
  { id: 'na_przeszkodzie',  labelKey: 'death_reason_na_przeszkodzie' },
  { id: 'za_kare',          labelKey: 'death_reason_za_kare' },
  { id: 'nie_wiem',         labelKey: 'death_reason_nie_wiem' },
  { id: 'inaczej',          labelKey: 'death_reason_inaczej' },
];

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function LivePointTracker({
  pickedPlayers,       // [{ id, name, nickname, number, photoURL, ... }]
  pointNumber,
  teamALabel,
  teamBLabel,
  onSave,              // ({ outcome: undefined, eliminations, eliminationTimes, eliminationStages, eliminationReasons, eliminationReasonTexts, pointDuration }) => Promise
  onCancel,
}) {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const startedAtRef = useRef(Date.now());
  const pausedOffsetRef = useRef(0); // accumulated paused time
  const pauseStartedAtRef = useRef(null);

  // state[pid] = { hit, t, stage, reason, reasonText, pickerStep }
  // pickerStep: null | 'stage' | 'reason' — null means picker closed.
  const [state, setState] = useState(() => {
    const s = {};
    pickedPlayers.forEach(p => {
      s[p.id] = { hit: false, t: null, stage: null, reason: null, reasonText: null, pickerStep: null };
    });
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
      // If already hit and picker open → undo entire elim (revert to alive)
      if (cur.hit && cur.pickerStep) {
        return { ...prev, [pid]: { hit: false, t: null, stage: null, reason: null, reasonText: null, pickerStep: null } };
      }
      // If hit + picker closed → reopen picker at the next-needed step
      if (cur.hit && !cur.pickerStep) {
        // No stage yet → open stage step. Stage exists but no reason → open reason step.
        const nextStep = !cur.stage ? 'stage' : 'reason';
        return { ...prev, [pid]: { ...cur, pickerStep: nextStep } };
      }
      // Otherwise → mark hit + open picker at stage step
      return { ...prev, [pid]: { hit: true, t: seconds, stage: null, reason: null, reasonText: null, pickerStep: 'stage' } };
    });
  };

  const handlePickStage = (pid, stageId) => {
    // Step 1 → tap stage → advance to Step 2 (reason picker).
    // Same-stage re-tap (when going back to step 1 then tapping same): just advance.
    setState(prev => ({
      ...prev,
      [pid]: { ...prev[pid], stage: stageId, pickerStep: 'reason' },
    }));
  };

  const handlePickReason = (pid, reasonId) => {
    // Step 2 → tap reason → save reason + close picker.
    // 'inaczej' opens an inline text input instead of immediate save.
    setState(prev => {
      const cur = prev[pid];
      if (reasonId === 'inaczej') {
        // Stay on step 'reason' but mark inaczej selected; user enters text below.
        return { ...prev, [pid]: { ...cur, reason: 'inaczej' } };
      }
      // Same-reason re-tap → just close (treated as confirm per F1 pattern from old code).
      return { ...prev, [pid]: { ...cur, reason: reasonId, reasonText: null, pickerStep: null } };
    });
  };

  const handleSaveInaczejText = (pid) => {
    // Accept current reasonText buffer + close picker.
    setState(prev => ({ ...prev, [pid]: { ...prev[pid], pickerStep: null } }));
  };

  const handleChangeReasonText = (pid, text) => {
    setState(prev => ({ ...prev, [pid]: { ...prev[pid], reasonText: text } }));
  };

  // "Pomiń" — save stage-only, dismiss reason step. deathReason stays null.
  const handleSkipReason = (pid) => {
    setState(prev => ({ ...prev, [pid]: { ...prev[pid], reason: null, reasonText: null, pickerStep: null } }));
  };

  // Back chevron on Step 2 → return to Step 1, clearing the chosen stage so
  // user can pick afresh. Reason already null at this point.
  const handleBackToStage = (pid) => {
    setState(prev => ({ ...prev, [pid]: { ...prev[pid], stage: null, reason: null, reasonText: null, pickerStep: 'stage' } }));
  };

  // Explicit close without picking anything (cancel path) — leaves prior choices intact.
  const closePicker = (pid) => {
    setState(prev => ({ ...prev, [pid]: { ...prev[pid], pickerStep: null } }));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Build arrays indexed by player slot (0..4), aligned with pickedPlayers order
      const eliminations = Array(5).fill(false);
      const eliminationTimes = Array(5).fill(null);
      const eliminationStages = Array(5).fill(null);
      const eliminationReasons = Array(5).fill(null);
      const eliminationReasonTexts = Array(5).fill(null);
      pickedPlayers.slice(0, 5).forEach((p, idx) => {
        const s = state[p.id];
        if (s?.hit) {
          eliminations[idx] = true;
          eliminationTimes[idx] = s.t;
          eliminationStages[idx] = s.stage;
          eliminationReasons[idx] = s.reason;
          eliminationReasonTexts[idx] = s.reason === 'inaczej' ? (s.reasonText || '') : null;
        }
      });
      await onSave({
        outcome: undefined,
        eliminations,
        eliminationTimes,
        eliminationStages,
        eliminationReasons,
        eliminationReasonTexts,
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
              player={p}
              state={s}
              onTap={() => handleTapCard(p.id)}
              onPickStage={(stageId) => handlePickStage(p.id, stageId)}
              onPickReason={(reasonId) => handlePickReason(p.id, reasonId)}
              onSkipReason={() => handleSkipReason(p.id)}
              onBackToStage={() => handleBackToStage(p.id)}
              onClosePicker={() => closePicker(p.id)}
              onChangeReasonText={(text) => handleChangeReasonText(p.id, text)}
              onSaveInaczejText={() => handleSaveInaczejText(p.id)}
              t={t}
            />
          );
        })}
      </div>

      {/* Save footer — winner pick lives in QuickLogView Stage 4 ('win'),
          not here. This stage owns observations only. */}
      <div style={{
        padding: 14, borderTop: `1px solid ${COLORS.border}`,
        background: '#0d1117', flexShrink: 0,
      }}>
        <div onClick={() => !saving && handleSave()}
          style={{
            background: `${COLORS.accent}20`,
            border: `1.5px solid ${COLORS.accent}60`,
            color: COLORS.accent,
            padding: '14px 16px', minHeight: 48,
            borderRadius: 10,
            fontFamily: FONT, fontSize: 15, fontWeight: 800,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.5 : 1,
            textAlign: 'center', letterSpacing: '-0.1px',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {saving ? '…' : (t('quicklog_save_tracking') || 'Zapisz tracking')}
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  player, state,
  onTap, onPickStage, onPickReason, onSkipReason, onBackToStage, onClosePicker,
  onChangeReasonText, onSaveInaczejText,
  t,
}) {
  const { hit, t: elimT, stage, reason, reasonText, pickerStep } = state;

  // Compose summary label shown on collapsed card row: "Stage · Reason"
  const stageLabel = stage ? t(`death_stage_${stage}`) : null;
  const reasonLabel = reason ? t(`death_reason_${reason}`) : null;
  const summaryParts = [stageLabel, reasonLabel].filter(Boolean);
  const summary = summaryParts.join(' · ');

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
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {hit ? (
              <>
                <span style={{ color: COLORS.danger, fontWeight: 600 }}>✕ {fmt(elimT)}</span>
                {summary && <span style={{ color: COLORS.textDim }}>· {summary}</span>}
                {!summary && <span style={{ color: COLORS.textMuted }}>· {t('death_section_stage_coach_q')}</span>}
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

      {hit && pickerStep === 'stage' && (
        <PickerPanel
          questionLabel={t('death_section_stage_coach_q')}
          options={STAGE_OPTIONS}
          selected={stage}
          onPick={onPickStage}
          onClose={onClosePicker}
          t={t}
          gridCols={3}
        />
      )}

      {hit && pickerStep === 'reason' && (
        <PickerPanel
          questionLabel={t('death_section_reason_coach_q')}
          options={REASON_OPTIONS}
          selected={reason}
          onPick={onPickReason}
          onClose={onClosePicker}
          onSkip={onSkipReason}
          onBack={onBackToStage}
          t={t}
          gridCols={3}
          inaczejText={reason === 'inaczej' ? (reasonText || '') : null}
          onChangeInaczejText={onChangeReasonText}
          onSaveInaczej={onSaveInaczejText}
        />
      )}
    </div>
  );
}

/**
 * PickerPanel — generic 1-step option grid used for both stage and reason
 * inline pickers. Adds optional Back chevron, Skip ("Pomiń"), and an
 * "Inaczej" textarea expand when relevant.
 */
function PickerPanel({
  questionLabel, options, selected, onPick, onClose, onSkip, onBack, t,
  gridCols = 3,
  inaczejText = null, onChangeInaczejText, onSaveInaczej,
}) {
  return (
    <div style={{ borderTop: `1px solid ${COLORS.border}80`, padding: '8px 10px 10px', background: '#0d1117' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, minHeight: 24 }}>
        {onBack && (
          <div onClick={(e) => { e.stopPropagation(); onBack(); }}
            style={{
              fontFamily: FONT, fontSize: 14, fontWeight: 700,
              color: COLORS.accent, cursor: 'pointer',
              padding: '2px 6px', borderRadius: 6,
              WebkitTapHighlightColor: 'transparent',
            }}>‹</div>
        )}
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px',
          textTransform: 'uppercase', color: COLORS.textMuted, flex: 1,
        }}>{questionLabel}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 4 }}>
        {options.map(o => {
          const sel = selected === o.id;
          return (
            <div key={o.id} onClick={(e) => { e.stopPropagation(); onPick(o.id); }}
              style={{
                minHeight: 44,
                padding: '12px 4px',
                background: sel ? `${COLORS.accent}20` : COLORS.surfaceDark,
                border: `1px solid ${sel ? `${COLORS.accent}60` : COLORS.border}`,
                color: sel ? COLORS.accent : COLORS.textDim,
                borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600,
                textAlign: 'center', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
              }}>
              {t(o.labelKey)}
            </div>
          );
        })}
      </div>

      {/* Inline 'inaczej' text input — only when reason picker has 'inaczej' selected */}
      {inaczejText !== null && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <textarea
            value={inaczejText}
            onChange={(e) => onChangeInaczejText?.(e.target.value)}
            placeholder="Opisz własnymi słowami…"
            rows={2}
            style={{
              width: '100%', minHeight: 44,
              borderRadius: 8,
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
              padding: '8px 10px',
              fontFamily: FONT, fontSize: 12, fontWeight: 500,
              resize: 'vertical', boxSizing: 'border-box', outline: 'none',
            }}
          />
          <div onClick={(e) => { e.stopPropagation(); onSaveInaczej?.(); }}
            style={{
              minHeight: 36,
              padding: '8px 10px',
              background: `${COLORS.accent}20`,
              border: `1px solid ${COLORS.accent}60`,
              color: COLORS.accent,
              borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 700,
              textAlign: 'center', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}>
            ✓ Zapisz
          </div>
        </div>
      )}

      {/* Footer affordances: Skip ("Pomiń") on reason step; collapse on either */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 2px' }}>
        {onSkip ? (
          <div onClick={(e) => { e.stopPropagation(); onSkip(); }}
            style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', minHeight: 32, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '.3px' }}>
              {t('death_section_skip')}
            </span>
          </div>
        ) : <span />}
        <div onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ cursor: 'pointer', WebkitTapHighlightColor: 'transparent', minHeight: 32, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
            Zwiń ▲
          </span>
        </div>
      </div>
    </div>
  );
}
