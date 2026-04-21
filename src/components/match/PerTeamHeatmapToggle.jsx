import React from 'react';
import { COLORS, FONT, FONT_SIZE, SPACE, TEAM_COLORS, TOUCH } from '../../utils/theme';

const ACTIVE_BG = '#f59e0b08';
const ACTIVE_BORDER = 'rgba(245, 158, 11, 0.5)';
const POSITION_ICON_COLOR = '#22c55e';
const SHOT_ICON_COLOR = '#ef4444';

function Chip({ label, iconKind, active, onClick }) {
  const iconColor = active ? COLORS.accent : (iconKind === 'positions' ? POSITION_ICON_COLOR : SHOT_ICON_COLOR);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: SPACE.xs + 2,
        minHeight: TOUCH.minTarget,
        padding: `${SPACE.sm}px ${SPACE.md}px`,
        borderRadius: 16,
        background: active ? ACTIVE_BG : 'transparent',
        border: `1.5px solid ${active ? ACTIVE_BORDER : COLORS.border}`,
        color: active ? COLORS.accent : COLORS.textMuted,
        fontFamily: FONT,
        fontSize: FONT_SIZE.xs,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 120ms ease',
      }}
    >
      {iconKind === 'positions' ? (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: iconColor, display: 'inline-block',
        }} />
      ) : (
        <span style={{ color: iconColor, lineHeight: 1, fontWeight: 700 }}>⊕</span>
      )}
      {label}
    </button>
  );
}

function TeamRow({ teamName, teamColor, positions, shots, onTogglePositions, onToggleShots, isSecond }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: SPACE.sm,
      flexWrap: 'wrap',
      padding: `${SPACE.sm}px 0`,
      ...(isSecond ? {
        borderTop: `1px solid ${COLORS.border}`,
        marginTop: SPACE.sm,
        paddingTop: SPACE.md,
      } : null),
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.xs + 2,
        padding: `${SPACE.xs}px ${SPACE.sm}px`,
        background: COLORS.bg,
        borderRadius: 16,
        border: `1px solid ${COLORS.border}`,
        minWidth: 90,
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: teamColor, display: 'inline-block',
        }} />
        <span style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.xs,
          fontWeight: 700,
          color: COLORS.text,
          letterSpacing: '-0.1px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 120,
        }}>{teamName}</span>
      </div>
      <Chip label="Positions" iconKind="positions" active={positions} onClick={onTogglePositions} />
      <Chip label="Shots" iconKind="shots" active={shots} onClick={onToggleShots} />
    </div>
  );
}

export default function PerTeamHeatmapToggle({ teamA, teamB, visibility, onChange }) {
  const update = (team, key) => {
    onChange({
      ...visibility,
      [team]: { ...visibility[team], [key]: !visibility[team][key] },
    });
  };

  return (
    <div style={{
      background: COLORS.surface,
      padding: `${SPACE.md}px ${SPACE.md}px`,
    }}>
      <TeamRow
        teamName={teamA?.name || 'Home'}
        teamColor={teamA?.color || TEAM_COLORS.A}
        positions={visibility.teamA.positions}
        shots={visibility.teamA.shots}
        onTogglePositions={() => update('teamA', 'positions')}
        onToggleShots={() => update('teamA', 'shots')}
      />
      <TeamRow
        teamName={teamB?.name || 'Away'}
        teamColor={teamB?.color || TEAM_COLORS.B}
        positions={visibility.teamB.positions}
        shots={visibility.teamB.shots}
        onTogglePositions={() => update('teamB', 'positions')}
        onToggleShots={() => update('teamB', 'shots')}
        isSecond
      />
    </div>
  );
}
