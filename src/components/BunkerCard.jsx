/**
 * BunkerCard — bottom sheet for editing/creating a bunker.
 * Redesigned per CC_BRIEF_LAYOUT_REDESIGN Part 4:
 *   - Pair indicator (master ⟷ mirror)
 *   - Position pills filtered by side
 *   - Type bar with expand grid
 *   - Snake beam simplified sheet
 */
import React, { useState, useEffect } from 'react';
import { Btn, Input, Icons, Checkbox } from './ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, POSITION_NAMES, POSITION_TYPE_SUGGEST, guessType } from '../utils/theme';
import { getBunkerSide } from '../utils/helpers';

const BUNKER_TYPES = [
  { abbr: 'SB',  name: 'Snake Beam',   height: 0.76, w: 3.0, d: 0.76, group: 'low' },
  { abbr: 'SD',  name: 'Small Dorito', height: 0.85, w: 1.0, d: 1.20, group: 'low' },
  { abbr: 'Tr',  name: 'Tree',         height: 0.90, w: 0.6, d: 0.60, group: 'low' },
  { abbr: 'MD',  name: 'Med. Dorito',  height: 1.00, w: 1.2, d: 1.80, group: 'med' },
  { abbr: 'Ck',  name: 'Cake',         height: 1.00, w: 1.5, d: 1.50, group: 'med' },
  { abbr: 'Br',  name: 'Brick',        height: 1.15, w: 1.5, d: 0.90, group: 'med' },
  { abbr: 'C',   name: 'Can',          height: 1.20, w: 0.9, d: 0.90, group: 'med' },
  { abbr: 'MW',  name: 'Mini Wedge',   height: 1.20, w: 1.5, d: 0.80, group: 'med' },
  { abbr: 'Wg',  name: 'Wing',         height: 1.40, w: 2.0, d: 1.00, group: 'tall' },
  { abbr: 'GP',  name: 'Giant Plus',   height: 1.50, w: 2.5, d: 2.50, group: 'tall' },
  { abbr: 'T',   name: 'Temple',       height: 1.50, w: 1.8, d: 1.50, group: 'tall' },
  { abbr: 'GB',  name: 'Giant Brick',  height: 1.50, w: 3.0, d: 1.50, group: 'tall' },
  { abbr: 'TCK', name: 'Tall Cake',    height: 1.60, w: 1.5, d: 1.50, group: 'tall' },
  { abbr: 'GW',  name: 'Giant Wing',   height: 1.70, w: 2.4, d: 1.50, group: 'tall' },
  { abbr: 'MT',  name: 'Maya Temple',  height: 1.80, w: 2.5, d: 2.00, group: 'tall' },
];
const GROUP_COLOR = { low: COLORS.success, med: COLORS.accent, tall: COLORS.danger };
const GROUP_LABEL = { low: 'Low (0.9m)', med: 'Medium (1.0-1.2m)', tall: 'Tall (1.4m+)' };
const SIDE_COLOR = { dorito: '#ef4444', snake: '#3b82f6', center: '#f59e0b' };

function typeData(abbr) {
  return BUNKER_TYPES.find(t => t.abbr === abbr) || BUNKER_TYPES.find(t => t.abbr === 'Br');
}

export { BUNKER_TYPES, typeData, guessType, GROUP_COLOR, GROUP_LABEL };

// ── Type grid (expandable) ──
function TypeGrid({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
      {['low', 'med', 'tall'].map(group => (
        <div key={group}>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: GROUP_COLOR[group], fontWeight: 700, marginBottom: SPACE.xs }}>
            {GROUP_LABEL[group]}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.xs }}>
            {BUNKER_TYPES.filter(t => t.group === group).map(t => (
              <div key={t.abbr}
                onClick={() => onChange(t.abbr)}
                style={{
                  padding: '6px 8px', borderRadius: RADIUS.sm, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${value === t.abbr ? GROUP_COLOR[group] : COLORS.border}`,
                  background: value === t.abbr ? GROUP_COLOR[group] + '20' : COLORS.surface,
                  fontFamily: FONT, fontSize: FONT_SIZE.xs,
                }}>
                <strong style={{ color: value === t.abbr ? GROUP_COLOR[group] : COLORS.text }}>{t.abbr}</strong>
                <span style={{ color: COLORS.textDim }}> {t.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Bottom sheet wrapper ──
function Sheet({ onClose, children }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 90, animation: 'fadeIn 0.15s ease-out',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, padding: `${SPACE.sm}px ${SPACE.lg}px ${SPACE.lg}px`,
        paddingBottom: `calc(${SPACE.lg}px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight: '60dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${SPACE.xs}px 0 ${SPACE.sm}px` }}>
          <div style={{ width: 36, height: SPACE.xs, borderRadius: 2, background: COLORS.border }} />
        </div>
        {children}
      </div>
    </>
  );
}

// ── Pair indicator ──
function PairIndicator({ side, isSingle }) {
  const color = SIDE_COLOR[side] || COLORS.textMuted;
  const label = side === 'dorito' ? 'Dorito side' : side === 'snake' ? 'Snake side' : 'Center';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: SPACE.sm }}>
      <span style={{ width: 10, height: 10, borderRadius: 5, background: color, display: 'inline-block' }} />
      {!isSingle && <>
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>---</span>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: color, display: 'inline-block' }} />
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginLeft: 4 }}>x 2</span>
      </>}
      {isSingle && <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>(single)</span>}
      <span style={{ flex: 1 }} />
      <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color }}>{label}</span>
    </div>
  );
}

export default function BunkerCard({ bunker, isNew, position, mirror = true, doritoSide = 'top', onSave, onDelete, onClose }) {
  const [positionName, setPositionName] = useState('');
  const [type, setType] = useState('Br');
  const [doMirror, setDoMirror] = useState(mirror);
  const [showTypeGrid, setShowTypeGrid] = useState(false);
  const [customInput, setCustomInput] = useState(false);

  const bx = bunker?.x ?? position?.x ?? 0.5;
  const by = bunker?.y ?? position?.y ?? 0.5;
  const side = getBunkerSide(bx, by, doritoSide);
  const isCenterSingle = side === 'center' && Math.abs(bx - 0.5) <= 0.02;
  const isBeam = type === 'SB';

  useEffect(() => {
    if (bunker) {
      setPositionName(bunker.positionName ?? bunker.name ?? '');
      setType(bunker.baType || bunker.type || 'Br');
    } else {
      setPositionName('');
      setType('Br');
    }
    setShowTypeGrid(false);
    setCustomInput(false);
  }, [bunker?.id, isNew, position?.x, position?.y]);

  const td = typeData(type);

  const buildData = () => {
    const t = typeData(type);
    return {
      name: positionName.trim(), positionName: positionName.trim(), baType: type, type,
      heightM: t.height, widthM: t.w, depthM: t.d,
    };
  };

  const handleSave = () => {
    onSave(buildData(), isNew && doMirror);
    onClose();
  };

  const handlePickPosition = (name) => {
    setPositionName(name);
    setCustomInput(false);
    const suggested = POSITION_TYPE_SUGGEST[name];
    if (suggested) setType(suggested);
  };

  // ── SNAKE BEAM: simplified sheet ──
  if (isBeam && !isNew) {
    return (
      <Sheet onClose={onClose}>
        <PairIndicator side={side} isSingle={isCenterSingle} />
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: SPACE.sm }}>
          Snake Beam
        </div>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginBottom: SPACE.md }}>
          Structural cover. Affects ballistics only.
        </div>
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          {onDelete && (
            <Btn variant="ghost" onClick={() => { onDelete(bunker); onClose(); }} style={{ color: COLORS.danger }}>
              <Icons.Trash /> Delete
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          <Btn variant="default" onClick={onClose}>Close</Btn>
        </div>
      </Sheet>
    );
  }

  // ── MAIN CARD (new + existing) ──
  const sideNames = POSITION_NAMES[side] || [];

  return (
    <Sheet onClose={onClose}>
      {/* Pair indicator */}
      <PairIndicator side={side} isSingle={isCenterSingle} />

      {/* Position pills */}
      <div style={{ marginBottom: SPACE.sm }}>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>
          Position name
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sideNames.map(n => (
            <div key={n} onClick={() => handlePickPosition(n)}
              style={{
                padding: '5px 10px', borderRadius: RADIUS.md, cursor: 'pointer',
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                border: `1px solid ${positionName === n ? COLORS.accent : COLORS.border}`,
                background: positionName === n ? COLORS.accent + '20' : COLORS.surface,
                color: positionName === n ? COLORS.accent : COLORS.text,
              }}>
              {n}
            </div>
          ))}
          <div onClick={() => setCustomInput(!customInput)}
            style={{
              padding: '5px 10px', borderRadius: RADIUS.md, cursor: 'pointer',
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
              border: `1px dashed ${COLORS.border}`, color: COLORS.textMuted,
              background: customInput ? COLORS.surfaceLight : 'transparent',
            }}>
            + Custom
          </div>
        </div>
        {customInput && (
          <Input value={positionName} onChange={v => { setPositionName(v); const s = POSITION_TYPE_SUGGEST[v]; if (s) setType(s); }}
            placeholder="Custom name..." autoFocus
            style={{ marginTop: SPACE.xs }} />
        )}
      </div>

      {/* Type bar */}
      <div style={{ marginBottom: SPACE.sm }}>
        <div onClick={() => setShowTypeGrid(!showTypeGrid)}
          style={{
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
            padding: '8px 12px', borderRadius: RADIUS.md,
            border: `1px solid ${COLORS.border}`, background: COLORS.surfaceLight,
            cursor: 'pointer',
          }}>
          <strong style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: GROUP_COLOR[td.group] }}>{td.abbr}</strong>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.text, flex: 1 }}>{td.name}</span>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.accent }}>
            {showTypeGrid ? 'collapse' : 'change'}
          </span>
        </div>
        {showTypeGrid && <TypeGrid value={type} onChange={v => { setType(v); setShowTypeGrid(false); }} />}
      </div>

      {/* Mirror checkbox (new bunkers only) */}
      {isNew && (
        <Checkbox label="Mirror (add symmetric bunker)" checked={doMirror} onChange={setDoMirror} style={{ marginBottom: SPACE.sm }} />
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: SPACE.sm }}>
        {!isNew && onDelete && (
          <Btn variant="ghost" onClick={() => { onDelete(bunker); onClose(); }} style={{ color: COLORS.danger }}>
            <Icons.Trash /> Delete pair
          </Btn>
        )}
        <div style={{ flex: 1 }} />
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
        <Btn variant="accent" onClick={handleSave}>
          <Icons.Check /> Done
        </Btn>
      </div>
    </Sheet>
  );
}
