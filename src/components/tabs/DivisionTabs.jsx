import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, ELEV } from '../../utils/theme';

/**
 * DivisionTabs — shared premium division pill row for the Scout + Coach tabs.
 * ONE source of truth for the division-filter UI, extracted from the divergent
 * inline rows in ScoutTabContent / CoachTabContent (Coach's premium look is the
 * target). Presentation only — the filter SEMANTICS live in each tab's data
 * layer (lenient: never hide unclassified/foreign teams, per c10a282e).
 *
 * Props:
 *   divisions  string[] — the tournament's divisions (caller passes [] / falsy → renders nothing)
 *   active     the resolved active division
 *   onChange   (division) => void
 */
export default function DivisionTabs({ divisions = [], active, onChange }) {
  if (!divisions || divisions.length === 0) return null;
  return (
    <div style={{
      display: 'flex',
      background: ELEV.sunken,
      borderRadius: RADIUS.lg,
      border: `1px solid ${ELEV.hairline}`,
      padding: 3,
      flexShrink: 0,
    }}>
      {divisions.map(d => {
        const on = active === d;
        return (
          <div key={d} onClick={() => onChange(d)}
            style={{
              flex: 1, padding: `${SPACE.sm}px ${SPACE.xs}px`,
              borderRadius: RADIUS.md,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: on ? 800 : 600,
              cursor: 'pointer', textAlign: 'center',
              color: on ? COLORS.accent : COLORS.textMuted,
              background: on ? COLORS.accentA12 : 'transparent',
              border: `1px solid ${on ? COLORS.accentA40 : 'transparent'}`,
              transition: 'all .12s',
              minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            {d}
          </div>
        );
      })}
    </div>
  );
}
