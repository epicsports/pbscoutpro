import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TEAM_COLORS, responsive } from '../../utils/theme';
import { useDevice } from '../../hooks/useDevice';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * PerTeamHeatmapToggle (§ 50 sibling — single-row redesign 2026-04-24)
 *
 * Single-row toggle aligned 1:1 with the match-header scoreboard card grid:
 *   [ Team A capsule (flex:1) ] [ spacer minWidth:110 ] [ Team B capsule (flex:1) ]
 * which mirrors MatchPage.jsx:1184 scoreboard:
 *   [ Left team flex:1 ] [ Score zone minWidth:110 ] [ Right team flex:1 ]
 *
 * Each capsule = a small segmented control with two chips:
 *   "Positions" / "Pozycje" + "Shots" / "Strzały"
 * Chip active = full team color fill (red #ef4444 / blue #3b82f6) + white text.
 * Chip inactive = transparent, dim text, no border (chip "embedded" inside capsule).
 *
 * Team-name labels intentionally NOT rendered here — the scoreboard card above
 * already names them; toggle alignment makes the relationship obvious.
 *
 * Logic identical to prior version: 4 independent on/off states, parent owns
 * `visibility` + `onChange`. Only the visual layout changed.
 */
export default function PerTeamHeatmapToggle({ teamA, teamB, visibility, onChange }) {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);

  const labelPositions = t('conf_pill_positions') || 'Positions';
  const labelShots = t('conf_pill_shots') || 'Shots';

  const update = (team, key) => {
    onChange({
      ...visibility,
      [team]: { ...visibility[team], [key]: !visibility[team][key] },
    });
  };

  const colorA = teamA?.color || TEAM_COLORS.A;
  const colorB = teamB?.color || TEAM_COLORS.B;

  return (
    <div style={{
      background: COLORS.surface,
      // Mirror header card horizontal envelope (MatchPage:1183 wraps the
      // scoreboard in `padding: SPACE.md R.layout.padding 0`). Vertical
      // padding keeps the row breathing inside the heatmap section.
      padding: `${SPACE.md}px ${R.layout.padding}px`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
      }}>
        <Capsule
          color={colorA}
          positions={visibility.teamA.positions}
          shots={visibility.teamA.shots}
          onTogglePositions={() => update('teamA', 'positions')}
          onToggleShots={() => update('teamA', 'shots')}
          labelPositions={labelPositions}
          labelShots={labelShots}
          align="left"
        />

        {/* Spacer mirrors the score zone width on the header card so the
            two capsules visually flank the score column above. minWidth
            must equal scoreboard score-zone minWidth (MatchPage.jsx:1218). */}
        <div style={{ flex: '0 0 auto', minWidth: 110 }} />

        <Capsule
          color={colorB}
          positions={visibility.teamB.positions}
          shots={visibility.teamB.shots}
          onTogglePositions={() => update('teamB', 'positions')}
          onToggleShots={() => update('teamB', 'shots')}
          labelPositions={labelPositions}
          labelShots={labelShots}
          align="right"
        />
      </div>
    </div>
  );
}

function Capsule({ color, positions, shots, onTogglePositions, onToggleShots, labelPositions, labelShots }) {
  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      alignItems: 'stretch',
      gap: 6,
      height: 44,
      padding: 4,
      borderRadius: RADIUS.md,        // 10px — brief spec
      background: COLORS.surfaceDark, // inner-element token, contrasts with COLORS.surface wrapper
      border: `1px solid ${COLORS.border}`,
      boxSizing: 'border-box',
    }}>
      <Chip color={color} active={positions} onClick={onTogglePositions} label={labelPositions} />
      <Chip color={color} active={shots}     onClick={onToggleShots}     label={labelShots} />
    </div>
  );
}

function Chip({ color, active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Capsule is 44px tall with 4px padding → chip is 36px (brief OK
        // for analysis context, below the 44px gloves-friendly minimum).
        minHeight: 36,
        padding: '0 8px',
        borderRadius: RADIUS.sm,        // 6px — brief spec
        border: '1.5px solid transparent',
        background: active ? color : 'transparent',
        color: active ? '#fff' : COLORS.textMuted,
        fontFamily: FONT,
        fontSize: FONT_SIZE.sm,
        fontWeight: 700,
        letterSpacing: '0.2px',
        cursor: 'pointer',
        transition: 'background 120ms ease, color 120ms ease',
        WebkitTapHighlightColor: 'transparent',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >{label}</button>
  );
}
