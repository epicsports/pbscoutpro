import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Skull, X, Check, Plus } from 'lucide-react';
import { Btn } from '../ui';
import BreakoutBtn from './BreakoutBtn';
import BreakoutCollapsed from './BreakoutCollapsed';
import ShotCell from './ShotCell';
import NewVariantModal from './NewVariantModal';
import { usePlayerBreakoutHistory } from '../../hooks/usePlayerBreakoutHistory';
import { useLayoutShotHistory } from '../../hooks/useLayoutShotHistory';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

const BREAKOUT_BOOTSTRAP_THRESHOLD = 5;
const SHOTS_BOOTSTRAP_THRESHOLD = 20;
const MAX_SHOTS = 3;

/**
 * HotSheet — bottom-sheet Tier 1 self-log editor.
 *
 * 4 fields (stacked): breakout → variant (optional) → shots → outcome.
 * Adaptive pickers (bootstrap vs mature) based on history thresholds.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {object} layout - { id, bunkers, doritoSide }
 * @param {string} playerId
 * @param {string|null} teamId - for shared variant pool
 * @param {Array<{id, order, selfLogs?}>} points - match points (to find pending)
 * @param {(data) => Promise<string>} onSave - parent persists; returns pointId
 */
export default function HotSheet({ open, onClose, layout, playerId, teamId, points, onSave }) {
  const { t } = useLanguage();
  const [breakout, setBreakout] = useState(null);
  const [breakoutVariant, setBreakoutVariant] = useState(null);
  const [shots, setShots] = useState({}); // { targetBunker: 'hit'|'miss'|'unknown' }
  const [outcome, setOutcome] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAllBreakouts, setShowAllBreakouts] = useState(false);
  const [showAllShots, setShowAllShots] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variants, setVariants] = useState([]);

  const { playerBreakoutHistory, totalLogs } = usePlayerBreakoutHistory(playerId);
  const { topShots, totalShots } = useLayoutShotHistory(layout?.id, breakout);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setBreakout(null);
      setBreakoutVariant(null);
      setShots({});
      setOutcome(null);
      setShowAllBreakouts(false);
      setShowAllShots(false);
    }
  }, [open]);

  // Subscribe to team variants filtered by current breakout
  useEffect(() => {
    if (!teamId || !breakout) { setVariants([]); return; }
    const unsub = ds.subscribeBreakoutVariants(teamId, breakout, setVariants);
    return unsub;
  }, [teamId, breakout]);

  // Filter master bunkers (no mirrors) for pickers
  const masterBunkers = useMemo(
    () => (layout?.bunkers || []).filter(b => b.role !== 'mirror'),
    [layout?.bunkers]
  );
  const bunkerByName = useMemo(() => {
    const m = new Map();
    masterBunkers.forEach(b => m.set(b.positionName || b.name, b));
    return m;
  }, [masterBunkers]);

  // Adaptive breakout picker
  const breakoutBootstrap = totalLogs < BREAKOUT_BOOTSTRAP_THRESHOLD;
  const breakoutHistoryWithMeta = useMemo(
    () => playerBreakoutHistory
      .map(h => ({ bunker: bunkerByName.get(h.name), count: h.count }))
      .filter(h => h.bunker),
    [playerBreakoutHistory, bunkerByName]
  );
  const breakoutOptions = breakoutBootstrap
    ? masterBunkers
    : breakoutHistoryWithMeta.slice(0, 5).map(h => h.bunker);

  // Adaptive shots picker
  const shotsBootstrap = totalShots < SHOTS_BOOTSTRAP_THRESHOLD;
  const shotTopWithBunker = useMemo(
    () => topShots
      .map(s => ({ bunker: bunkerByName.get(s.name), freq: s.freq }))
      .filter(s => s.bunker),
    [topShots, bunkerByName]
  );
  const shotTop6 = shotTopWithBunker.slice(0, 6);
  const shotTop6Names = new Set(shotTop6.map(s => s.bunker.positionName || s.bunker.name));
  const shotRest = masterBunkers.filter(b => !shotTop6Names.has(b.positionName || b.name));
  const shotsOptions = shotsBootstrap ? masterBunkers : shotTop6.map(s => s.bunker);

  function cycleShot(targetName) {
    setShots(prev => {
      const current = prev[targetName];
      const next = { ...prev };
      if (!current) {
        // Soft limit — allow adding but warn at max via hint below
        if (Object.keys(prev).length >= MAX_SHOTS) return prev;
        next[targetName] = 'hit';
      }
      else if (current === 'hit') next[targetName] = 'miss';
      else if (current === 'miss') next[targetName] = 'unknown';
      else delete next[targetName];
      return next;
    });
  }

  const canSave = breakout && outcome && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        breakout,
        breakoutVariant,
        outcome,
        shots,
        variants, // so parent can find variantId for increment
      });
      onClose();
    } catch (e) {
      console.error('HotSheet save failed:', e);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const selectedBreakoutBunker = breakout ? bunkerByName.get(breakout) : null;
  const doritoSide = layout?.doritoSide || 'top';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 200,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />
      {/* Bottom sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          borderRadius: `${RADIUS.xxl}px ${RADIUS.xxl}px 0 0`,
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          zIndex: 201,
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${SPACE.sm}px 0 ${SPACE.xs}px` }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>

        <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.lg}px` }}>
          {/* ═══ Field 1: Breakout ═══ */}
          <SectionLabel text={t('selflog_section_breakout') || 'Gdzie pobiegłem'} />
          {breakoutBootstrap && selectedBreakoutBunker ? (
            <BreakoutCollapsed
              bunker={selectedBreakoutBunker}
              doritoSide={doritoSide}
              onChange={() => { setBreakout(null); setBreakoutVariant(null); }}
            />
          ) : (
            <>
              {breakoutBootstrap && (
                <Hint text={t('selflog_bootstrap_breakout_hint') || 'Pierwsze punkty — wybierz z pełnej listy. Po 5 logach zapamiętamy ulubione.'} />
              )}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xs,
                marginTop: SPACE.xs,
              }}>
                {breakoutOptions.map(b => {
                  const name = b.positionName || b.name;
                  const meta = breakoutHistoryWithMeta.find(h => (h.bunker.positionName || h.bunker.name) === name);
                  return (
                    <BreakoutBtn
                      key={b.id || name}
                      bunker={b}
                      doritoSide={doritoSide}
                      selected={breakout === name}
                      count={meta?.count}
                      onClick={() => {
                        setBreakout(name);
                        setShots({});
                        setBreakoutVariant(null);
                      }}
                    />
                  );
                })}
                {!breakoutBootstrap && (
                  <button
                    onClick={() => setShowAllBreakouts(true)}
                    style={{
                      padding: `${SPACE.sm}px`,
                      minHeight: TOUCH.minTarget,
                      background: 'transparent',
                      border: `1px dashed ${COLORS.border}`,
                      borderRadius: RADIUS.md,
                      color: COLORS.textDim,
                      fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >{t('selflog_other') || 'Inne…'}</button>
                )}
              </div>
              {/* "Inne…" full list expansion */}
              {showAllBreakouts && !breakoutBootstrap && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xs,
                  marginTop: SPACE.xs,
                  paddingTop: SPACE.xs,
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  {masterBunkers.map(b => {
                    const name = b.positionName || b.name;
                    if (breakoutOptions.some(bb => (bb.positionName || bb.name) === name)) return null;
                    return (
                      <BreakoutBtn
                        key={b.id || name}
                        bunker={b}
                        doritoSide={doritoSide}
                        selected={breakout === name}
                        onClick={() => {
                          setBreakout(name);
                          setShots({});
                          setBreakoutVariant(null);
                          setShowAllBreakouts(false);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ═══ Field 2: Variant chips (optional, after breakout) ═══ */}
          {breakout && teamId && (
            <>
              <SectionLabel
                text={t('selflog_section_variant') || 'Wariant'}
                subtle={t('selflog_section_variant_optional') || '(opcjonalnie)'}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.xs }}>
                {variants.map(v => {
                  const isSel = breakoutVariant === v.variantName;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setBreakoutVariant(isSel ? null : v.variantName)}
                      style={{
                        padding: `${SPACE.xs}px ${SPACE.md}px`,
                        minHeight: TOUCH.chipHeight,
                        borderRadius: RADIUS.full,
                        background: isSel ? `${COLORS.accent}20` : COLORS.surfaceLight,
                        border: `1px solid ${isSel ? COLORS.accent : COLORS.border}`,
                        color: isSel ? COLORS.accent : COLORS.textDim,
                        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >{v.variantName}</button>
                  );
                })}
                <button
                  onClick={() => setVariantModalOpen(true)}
                  style={{
                    padding: `${SPACE.xs}px ${SPACE.md}px`,
                    minHeight: TOUCH.chipHeight,
                    borderRadius: RADIUS.full,
                    background: 'transparent',
                    border: `1px dashed ${COLORS.border}`,
                    color: COLORS.textDim,
                    fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                ><Plus size={12} /> {t('variant_new') || '+ Nowy'}</button>
              </div>
            </>
          )}

          {/* ═══ Field 3: Shots ═══ */}
          {breakout && (
            <>
              <SectionLabel
                text={t('selflog_section_shots') || 'Co strzelałem'}
                subtle={t('selflog_shots_counter', Object.keys(shots).length)}
              />
              {shotsBootstrap && (
                <Hint text={t('selflog_bootstrap_shots_hint') || 'Nowy layout — wszystkie bunkry dostępne.'} />
              )}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xs,
                marginTop: SPACE.xs,
              }}>
                {shotsOptions.map(b => {
                  const name = b.positionName || b.name;
                  const freq = shotTopWithBunker.find(s => (s.bunker.positionName || s.bunker.name) === name)?.freq;
                  return (
                    <ShotCell
                      key={b.id || name}
                      bunker={b}
                      doritoSide={doritoSide}
                      result={shots[name]}
                      freq={freq}
                      onClick={() => cycleShot(name)}
                    />
                  );
                })}
              </div>
              {!shotsBootstrap && shotRest.length > 0 && !showAllShots && (
                <button
                  onClick={() => setShowAllShots(true)}
                  style={{
                    marginTop: SPACE.sm,
                    width: '100%', padding: `${SPACE.sm}px`,
                    minHeight: TOUCH.minTarget,
                    background: 'transparent',
                    border: `1px dashed ${COLORS.border}`,
                    borderRadius: RADIUS.md,
                    color: COLORS.textDim,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('selflog_other_shots_n', shotRest.length)}
                </button>
              )}
              {showAllShots && !shotsBootstrap && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACE.xs,
                  marginTop: SPACE.xs,
                  paddingTop: SPACE.xs,
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  {shotRest.map(b => {
                    const name = b.positionName || b.name;
                    return (
                      <ShotCell
                        key={b.id || name}
                        bunker={b}
                        doritoSide={doritoSide}
                        result={shots[name]}
                        onClick={() => cycleShot(name)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ═══ Field 4: Outcome (2x2) ═══ */}
          <SectionLabel text={t('selflog_section_outcome') || 'Jak skończyłem'} />
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACE.xs,
            marginTop: SPACE.xs,
          }}>
            <OutcomeBtn
              label={t('outcome_alive') || 'Przeżyłem'}
              icon={<Shield size={16} />}
              color={COLORS.success}
              selected={outcome === 'alive'}
              onClick={() => setOutcome('alive')}
            />
            <OutcomeBtn
              label={t('outcome_elim_break') || 'Brejk'}
              icon={<Skull size={16} />}
              color={COLORS.danger}
              selected={outcome === 'elim_break'}
              onClick={() => setOutcome('elim_break')}
            />
            <OutcomeBtn
              label={t('outcome_elim_mid') || 'Środek'}
              icon={<Skull size={16} />}
              color={COLORS.danger}
              selected={outcome === 'elim_mid'}
              onClick={() => setOutcome('elim_mid')}
            />
            <OutcomeBtn
              label={t('outcome_elim_end') || 'Koniec'}
              icon={<Skull size={16} />}
              color={COLORS.danger}
              selected={outcome === 'elim_end'}
              onClick={() => setOutcome('elim_end')}
            />
          </div>

          {/* ═══ Save ═══ */}
          <div style={{ marginTop: SPACE.lg, display: 'flex', gap: SPACE.sm }}>
            <Btn variant="ghost" onClick={onClose} style={{ flex: 1 }}>
              {t('cancel')}
            </Btn>
            <Btn
              variant="accent"
              size="lg"
              onClick={handleSave}
              disabled={!canSave}
              style={{ flex: 2, justifyContent: 'center' }}
            >
              <Check size={18} /> {t('selflog_save') || 'Zapisz'}
            </Btn>
          </div>
        </div>
      </div>

      {/* New variant modal */}
      <NewVariantModal
        open={variantModalOpen}
        bunkerName={breakout}
        existingVariants={variants}
        onSave={async (name) => {
          if (!teamId || !breakout) return;
          await ds.addBreakoutVariant(teamId, breakout, name, playerId);
          setBreakoutVariant(name);
        }}
        onClose={() => setVariantModalOpen(false)}
      />
    </>
  );
}

function SectionLabel({ text, subtle }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
      letterSpacing: 0.6, textTransform: 'uppercase',
      color: COLORS.textMuted,
      marginTop: SPACE.md, marginBottom: SPACE.xs,
      display: 'flex', alignItems: 'baseline', gap: SPACE.sm,
    }}>
      {text}
      {subtle && (
        <span style={{
          fontSize: FONT_SIZE.xxs, color: COLORS.textMuted,
          textTransform: 'none', letterSpacing: 0, fontWeight: 500,
        }}>{subtle}</span>
      )}
    </div>
  );
}

function Hint({ text }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim,
      fontStyle: 'italic', lineHeight: 1.5,
      padding: `${SPACE.sm}px ${SPACE.md}px`,
      background: COLORS.surfaceLight,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.md,
      marginBottom: SPACE.sm,
    }}>{text}</div>
  );
}

function OutcomeBtn({ label, icon, color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: SPACE.xs,
        padding: `${SPACE.sm}px`,
        minHeight: TOUCH.minTarget,
        background: selected ? `${color}20` : COLORS.surfaceLight,
        border: `1px solid ${selected ? color : COLORS.border}`,
        borderRadius: RADIUS.md,
        color: selected ? color : COLORS.text,
        fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
