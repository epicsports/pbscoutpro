import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * Shared building blocks for the More tab (training + tournament).
 *
 * Information architecture:
 *  1. SESSION  — what you're working on now (edit + layout)
 *  2. BROWSE   — workspace data (layouts/teams/players/scouts)
 *  3. ACTIONS  — single adaptive row (end/close when live → delete when ended)
 *  4. ACCOUNT  — profile + workspace + sign out
 *
 * Status display lives in the global context bar (AppShell) — the More tab
 * does not re-render it. "Create new tournament/training" lives in the
 * context picker (header "Change" button).
 */

export function MoreShell({ children }) {
  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 32,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.lg,
      maxWidth: 720,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

export function MoreSection({ title, tone = 'default', children }) {
  const isDanger = tone === 'danger';
  return (
    <div style={{ marginTop: isDanger ? SPACE.md : 0 }}>
      <div style={{
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 600,
        color: isDanger ? `${COLORS.danger}99` : COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '.5px',
        padding: '0 4px 8px',
      }}>{title}</div>
      <div style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${isDanger ? `${COLORS.danger}22` : COLORS.border}`,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

export function MoreItem({ icon, label, sub, onClick, danger, accent, isLast, rightSlot }) {
  const labelColor = danger ? COLORS.danger : accent ? COLORS.accent : COLORS.text;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', minHeight: 52,
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: isLast ? 'none' : `1px solid ${COLORS.border}`,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <span style={{
        fontSize: 17, width: 22, textAlign: 'center', opacity: 0.85,
        flexShrink: 0, color: labelColor,
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 500,
          color: labelColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
        {sub && (
          <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
            marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{sub}</div>
        )}
      </div>
      {rightSlot ? rightSlot : onClick && (
        <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.borderLight, flexShrink: 0 }}>›</span>
      )}
    </div>
  );
}
