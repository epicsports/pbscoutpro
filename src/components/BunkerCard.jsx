/**
 * BunkerCard — bottom sheet for editing or creating a bunker.
 * New bunkers: 2-step wizard (name+position → type).
 * Existing bunkers: single view with all fields.
 */
import React, { useState, useEffect } from 'react';
import { Btn, Input, Icons } from './ui';
import { COLORS, FONT, TOUCH } from '../utils/theme';

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
const GROUP_COLOR = { low: '#22c55e', med: '#f59e0b', tall: '#ef4444' };
const GROUP_LABEL = { low: 'Low ≤0.9m', med: 'Medium 1.0–1.2m', tall: 'Tall ≥1.4m' };

function typeData(abbr) {
  return BUNKER_TYPES.find(t => t.abbr === abbr) || BUNKER_TYPES.find(t => t.abbr === 'Br');
}

function guessType(name) {
  if (!name) return 'Br';
  const n = name.toUpperCase();
  if (/^SB\d?$|SNAKE|^S\d/.test(n)) return 'SB';
  if (/^SD/.test(n)) return 'SD';
  if (/^MD|DORITO|^D\d|^D50/.test(n)) return 'MD';
  if (/^TR|TREE/.test(n)) return 'Tr';
  if (/^C\d?$|CAN/.test(n)) return 'C';
  if (/^GB|GIANT.?B/.test(n)) return 'GB';
  if (/^BR|BRICK/.test(n)) return 'Br';
  if (/^MW|MINI.?W/.test(n)) return 'MW';
  if (/^GW|GIANT.?W/.test(n)) return 'GW';
  if (/^WG|^WING/.test(n)) return 'Wg';
  if (/^TCK|TALL.?C/.test(n)) return 'TCK';
  if (/^CK|CAKE/.test(n)) return 'Ck';
  if (/^MT|MAYA/.test(n)) return 'MT';
  if (/^T\d?$|TEMPLE/.test(n)) return 'T';
  if (/^GP|PLUS|STAR/.test(n)) return 'GP';
  return 'Br';
}

export { BUNKER_TYPES, typeData, guessType, GROUP_COLOR, GROUP_LABEL };

// ── Type chips grid ──
function TypeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {['low', 'med', 'tall'].map(group => (
        <div key={group}>
          <div style={{ fontFamily: FONT, fontSize: 9, color: GROUP_COLOR[group], fontWeight: 700, marginBottom: 4 }}>
            {GROUP_LABEL[group]}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {BUNKER_TYPES.filter(t => t.group === group).map(t => (
              <button key={t.abbr}
                onClick={() => onChange(t.abbr)}
                style={{
                  padding: '6px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                  border: `1px solid ${value === t.abbr ? GROUP_COLOR[group] : COLORS.border}`,
                  background: value === t.abbr ? GROUP_COLOR[group] + '20' : COLORS.surface,
                  fontFamily: FONT, fontSize: 11,
                }}>
                <strong style={{ color: value === t.abbr ? GROUP_COLOR[group] : COLORS.text }}>{t.abbr}</strong>
                <span style={{ color: COLORS.textDim }}> {t.name} · {t.height}m</span>
              </button>
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
        borderRadius: '14px 14px 0 0', padding: '8px 16px 16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight: '60vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>
        {children}
      </div>
    </>
  );
}

export default function BunkerCard({ bunker, isNew, position, mirror = true, onSave, onDelete, onClose, onPositionChange }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Br');
  const [doMirror, setDoMirror] = useState(mirror);
  const [posX, setPosX] = useState(0.5);
  const [posY, setPosY] = useState(0.5);
  const [step, setStep] = useState(1); // wizard step for new bunkers

  useEffect(() => {
    if (bunker) {
      setName(bunker.name || '');
      setType(bunker.baType || guessType(bunker.name));
      setPosX(bunker.x ?? 0.5);
      setPosY(bunker.y ?? 0.5);
    } else {
      setName('');
      setType('Br');
      setPosX(position?.x ?? 0.5);
      setPosY(position?.y ?? 0.5);
    }
    setStep(1);
  }, [bunker?.id, isNew, position?.x, position?.y]);

  const td = typeData(type);

  const buildData = () => {
    const t = typeData(type);
    return {
      name: name.trim(), baType: type,
      heightM: t.height, widthM: t.w, depthM: t.d,
      ...(isNew ? { x: posX, y: posY } : {}),
    };
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(buildData(), isNew && doMirror);
    onClose();
  };

  // Live position update on slider change
  const handlePosChange = (axis, val) => {
    if (axis === 'x') setPosX(val); else setPosY(val);
    if (onPositionChange) onPositionChange({ x: axis === 'x' ? val : posX, y: axis === 'y' ? val : posY });
  };

  // ── NEW BUNKER: 2-step wizard ──
  if (isNew) {
    return (
      <Sheet onClose={onClose}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
            + New bunker {step === 1 ? '— Name & Position' : '— Type'}
          </div>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>
            Step {step}/2
          </span>
        </div>

        {step === 1 && (
          <>
            {/* Name */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Name</div>
              <Input value={name} onChange={v => { setName(v); setType(guessType(v)); }}
                placeholder="e.g. D1, SNAKE, C50..."
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep(2); if (e.key === 'Escape') onClose(); }} />
            </div>

            {/* Position sliders */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Position</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'X', value: posX, set: v => handlePosChange('x', v) },
                  { label: 'Y', value: posY, set: v => handlePosChange('y', v) },
                ].map(({ label, value, set }) => (
                  <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 14 }}>{label}</span>
                    <input type="range" min="0" max="1" step="0.01" value={value}
                      onChange={e => set(Number(e.target.value))}
                      style={{ flex: 1, accentColor: COLORS.accent }} />
                    <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, minWidth: 28 }}>{(value * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mirror */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
              <input type="checkbox" checked={doMirror} onChange={e => setDoMirror(e.target.checked)} style={{ accentColor: COLORS.accent }} />
              Mirror (add symmetric bunker)
            </label>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="default" onClick={onClose}>Cancel</Btn>
              <div style={{ flex: 1 }} />
              <Btn variant="accent" disabled={!name.trim()} onClick={() => setStep(2)}>
                Next →
              </Btn>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Auto-guessed type shown */}
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 8 }}>
              Auto-detected: <strong style={{ color: GROUP_COLOR[td.group] }}>{td.abbr} {td.name}</strong> — tap to change
            </div>

            <TypeSelector value={type} onChange={setType} />

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn variant="default" onClick={() => setStep(1)}>← Back</Btn>
              <div style={{ flex: 1 }} />
              <Btn variant="accent" onClick={handleSave}>
                <Icons.Check /> Save
              </Btn>
            </div>
          </>
        )}
      </Sheet>
    );
  }

  // ── EXISTING BUNKER: single view ──
  return (
    <Sheet onClose={onClose}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 10 }}>
        🏷️ {bunker?.name || 'Bunker'}
      </div>

      {/* Name */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Name</div>
        <Input value={name} onChange={setName} />
      </div>

      {/* Type */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Type</div>
        <TypeSelector value={type} onChange={setType} />
      </div>

      {/* Drag hint */}
      <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, marginBottom: 12, fontStyle: 'italic' }}>
        Drag bunker on canvas to reposition
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {onDelete && (
          <Btn variant="ghost" onClick={() => { onDelete(bunker); onClose(); }} style={{ color: COLORS.danger }}>
            <Icons.Trash /> Delete
          </Btn>
        )}
        <div style={{ flex: 1 }} />
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
        <Btn variant="accent" disabled={!name.trim()} onClick={handleSave}>
          <Icons.Check /> Save
        </Btn>
      </div>
    </Sheet>
  );
}
