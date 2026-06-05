import React from 'react';
import { Btn } from './ui';
import { COLORS, FONT, RADIUS, SPACE } from '../utils/theme';

// Sticky bottom action bar for player multi-select.
// Rendered by both PlayersPage (workspace) and AdminPlayersPage (global).
// Callers own the delete + merge semantics — the bar is presentation only.
//
// Props:
//   count        — selected.size (when 0 the bar hides)
//   canMerge     — boolean (typically count >= 2)
//   canDelete    — boolean (default true). When false the Delete CTA is hidden —
//                  e.g. PlayersPage gates hard catalog delete to super_admin.
//   onClear      — () => void
//   onDelete     — () => void           // caller confirms before destructive write
//   onMerge      — () => void
//   pending      — disables CTAs while a write is in-flight
export default function PlayerMultiSelectBar({ count, canMerge, canDelete = true, onClear, onDelete, onMerge, pending }) {
  if (!count) return null;
  return (
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: SPACE.sm,
      padding: '10px 12px',
      background: COLORS.surface,
      borderTop: `1px solid ${COLORS.border}`,
      boxShadow: '0 -2px 12px rgba(0,0,0,.3)',
    }}>
      <div style={{
        flex: 1, minWidth: 0,
        fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text,
      }}>
        {count} selected
      </div>
      <Btn variant="ghost" size="sm" onClick={onClear} disabled={pending}
        style={{ color: COLORS.textDim, fontFamily: FONT, fontSize: 12 }}>
        Cancel
      </Btn>
      <Btn variant="default" size="sm" onClick={onMerge}
        disabled={pending || !canMerge}
        style={{ fontFamily: FONT, fontSize: 12, minHeight: 36 }}>
        Merge ({count})
      </Btn>
      {canDelete && (
        <Btn variant="danger" size="sm" onClick={onDelete} disabled={pending}
          style={{ fontFamily: FONT, fontSize: 12, minHeight: 36 }}>
          Delete ({count})
        </Btn>
      )}
    </div>
  );
}

// Reusable row checkbox helper — kept here so both pages render the
// selection chrome identically. Sits at the left of each Card.
export function SelectCheckbox({ checked, onChange, size = 22, disabled }) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange?.(!checked); }}
      style={{
        width: size, height: size, borderRadius: 6,
        background: checked ? COLORS.accent : 'transparent',
        border: `2px solid ${checked ? COLORS.accent : COLORS.textDim}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: disabled ? 'default' : 'pointer',
        transition: 'all .12s',
        WebkitTapHighlightColor: 'transparent',
      }}>
      {checked && (
        <span style={{ color: COLORS.bg, fontSize: Math.round(size * 0.6), fontWeight: 900, lineHeight: 1 }}>
          ✓
        </span>
      )}
    </div>
  );
}
