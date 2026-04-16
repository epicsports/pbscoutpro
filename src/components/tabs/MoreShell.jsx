import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * Shared building blocks for the More tab (training + tournament).
 *
 * Apple HIG–inspired information architecture:
 *  1. SESSION       — what you're working on now (status + edit + layout)
 *  2. BROWSE        — workspace data (layouts/teams/players/scouts)
 *  3. ACCOUNT       — profile + sign out
 *  4. DANGER ZONE   — destructive actions (end/reopen/delete), visually offset
 *  5. WORKSPACE     — bottom footer band (workspace name + change link)
 *
 * "Create new tournament/training" is intentionally NOT in the More tab —
 * it belongs to the context picker (header "Change" button), where you'd
 * naturally look to switch what you're working on.
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

/**
 * Section with a small uppercase label above a card group.
 * `tone` controls the visual treatment of destructive sections.
 */
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

/**
 * Status header — top card showing live/closed/test state + LIVE toggle.
 * Always visible at the top of the More tab so the current state is obvious.
 */
export function StatusHeader({ status, onToggleLive, isTest, type = 'training' }) {
  const isLive = status === 'live';
  const isClosed = status === 'closed';
  const dotColor = isLive ? COLORS.success : isClosed ? COLORS.textMuted : COLORS.borderLight;
  const dotShadow = isLive ? `0 0 8px ${COLORS.success}60` : 'none';
  const stateLabel = isLive ? 'LIVE' : isClosed ? 'Zakończony' : 'Nieaktywny';
  const stateColor = isLive ? COLORS.success : isClosed ? COLORS.textMuted : COLORS.text;
  const subline = isLive
    ? (type === 'training' ? 'Trening widoczny dla innych' : 'Turniej widoczny dla innych')
    : isClosed
    ? 'Tylko do odczytu — można otworzyć ponownie'
    : 'Dotknij przełącznika aby uruchomić';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px',
      background: COLORS.surfaceDark,
      border: `1px solid ${isLive ? `${COLORS.success}30` : COLORS.border}`,
      borderRadius: RADIUS.lg,
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: '50%',
        background: dotColor, boxShadow: dotShadow,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
          color: stateColor, letterSpacing: '-.1px',
        }}>
          <span>{stateLabel}</span>
          {isTest && (
            <span style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 700,
              color: COLORS.textMuted, background: COLORS.surfaceLight,
              border: `1px solid ${COLORS.border}`, borderRadius: 3,
              padding: '1px 5px', letterSpacing: '.3px',
            }}>TEST</span>
          )}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 11,
          color: COLORS.textMuted, marginTop: 2,
        }}>{subline}</div>
      </div>
      {!isClosed && onToggleLive && (
        <div onClick={onToggleLive} style={{
          width: 44, height: 26, borderRadius: 13,
          background: isLive ? COLORS.success : COLORS.border,
          position: 'relative', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          flexShrink: 0,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11, background: 'white',
            position: 'absolute', top: 2,
            left: isLive ? 'auto' : 2, right: isLive ? 2 : 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            transition: 'all 0.15s',
          }} />
        </div>
      )}
    </div>
  );
}

/**
 * Single row in a section — icon, label, optional sub line, chevron.
 * `danger` tints text red. `accent` tints text amber.
 */
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

/**
 * Workspace footer — minimal-prominence band with workspace name and change link.
 * Sits visually below the danger zone but is not a destructive action.
 */
export function WorkspaceFooter({ workspaceName, onChangeWorkspace }) {
  return (
    <div style={{
      marginTop: SPACE.lg,
      paddingTop: SPACE.md,
      borderTop: `1px solid ${COLORS.border}`,
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: FONT, fontSize: 12,
      color: COLORS.textMuted,
    }}>
      <span>Workspace:</span>
      {workspaceName && (
        <span style={{ color: COLORS.textDim, fontWeight: 600 }}>{workspaceName}</span>
      )}
      {onChangeWorkspace && (
        <span onClick={onChangeWorkspace} style={{
          marginLeft: 'auto', color: COLORS.accent,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>Zmień ›</span>
      )}
    </div>
  );
}
