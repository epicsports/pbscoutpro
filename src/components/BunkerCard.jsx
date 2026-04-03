/**
 * BunkerCard — bottom sheet for editing or creating a bunker.
 * Slides up from bottom when user taps a bunker or empty space on canvas.
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
const GROUP_LABEL = { low: 'Niskie ≤0.9m', med: 'Średnie 1.0–1.2m', tall: 'Wysokie ≥1.4m' };

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

export default function BunkerCard({ bunker, isNew, position, mirror = true, onSave, onDelete, onClose }) {
  const [name, setName] = useState(bunker?.name || '');
  const [type, setType] = useState(bunker?.baType || 'Br');
  const [showTypes, setShowTypes] = useState(false);
  const [doMirror, setDoMirror] = useState(mirror);

  useEffect(() => {
    if (bunker) {
      setName(bunker.name || '');
      setType(bunker.baType || guessType(bunker.name));
    } else {
      setName('');
      setType('Br');
    }
    setShowTypes(false);
  }, [bunker?.id, isNew]);

  const td = typeData(type);

  const handleSave = () => {
    if (!name.trim()) return;
    const t = typeData(type);
    onSave({
      name: name.trim(),
      baType: type,
      heightM: t.height,
      widthM: t.w,
      depthM: t.d,
      ...(isNew && position ? { x: position.x, y: position.y } : {}),
    }, isNew && doMirror);
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 90, animation: 'fadeIn 0.15s ease-out',
      }} />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        borderRadius: '14px 14px 0 0', padding: '8px 16px 16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight: '55vh', overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>

        {/* Title */}
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, marginBottom: 10 }}>
          {isNew ? '+ Nowy bunkier' : `🏷️ ${bunker?.name || 'Bunker'}`}
        </div>

        {/* Name input */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Nazwa</div>
          <Input value={name} onChange={v => { setName(v); if (isNew) setType(guessType(v)); }}
            placeholder="np. D1, SNAKE, C50..."
            autoFocus={isNew}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }} />
        </div>

        {/* Type selector */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Typ</div>
          <div onClick={() => setShowTypes(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            borderRadius: 6, border: `1px solid ${COLORS.border}`, cursor: 'pointer',
            background: COLORS.surfaceLight,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: GROUP_COLOR[td.group] }} />
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>
              {td.abbr}
            </span>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, flex: 1 }}>
              {td.name} · {td.height}m
            </span>
            <span style={{ color: COLORS.textMuted, fontSize: 10 }}>{showTypes ? '▴' : '▾'}</span>
          </div>

          {showTypes && (
            <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}` }}>
              {['low', 'med', 'tall'].map(group => (
                <div key={group} style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: FONT, fontSize: 9, color: GROUP_COLOR[group], fontWeight: 700, marginBottom: 4 }}>
                    {GROUP_LABEL[group]}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {BUNKER_TYPES.filter(t => t.group === group).map(t => (
                      <button key={t.abbr}
                        onClick={() => { setType(t.abbr); setShowTypes(false); }}
                        style={{
                          padding: '6px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                          border: `1px solid ${type === t.abbr ? GROUP_COLOR[group] : COLORS.border}`,
                          background: type === t.abbr ? GROUP_COLOR[group] + '20' : COLORS.surface,
                          fontFamily: FONT, fontSize: 11,
                        }}>
                        <strong style={{ color: type === t.abbr ? GROUP_COLOR[group] : COLORS.text }}>{t.abbr}</strong>
                        <span style={{ color: COLORS.textDim }}> {t.name} · {t.height}m</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mirror checkbox (new bunker only) */}
        {isNew && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
            <input type="checkbox" checked={doMirror} onChange={e => setDoMirror(e.target.checked)} style={{ accentColor: COLORS.accent }} />
            Mirror (dodaj lustrzany bunkier)
          </label>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && onDelete && (
            <Btn variant="ghost" onClick={() => { onDelete(bunker); onClose(); }} style={{ color: COLORS.danger }}>
              <Icons.Trash /> Usuń
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          <Btn variant="default" onClick={onClose}>Anuluj</Btn>
          <Btn variant="accent" disabled={!name.trim()} onClick={() => { handleSave(); onClose(); }}>
            <Icons.Check /> {isNew ? 'Dodaj' : 'Zapisz'}
          </Btn>
        </div>
      </div>
    </>
  );
}
