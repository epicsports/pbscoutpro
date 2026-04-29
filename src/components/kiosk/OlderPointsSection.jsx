import React, { useState } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * OlderPointsSection — § 55.6 collapsible list of past points where at
 * least one player has missing self-log data.
 *
 * MVP scope (per Brief B): renders the collapsed pill row only. Tap
 * expands a placeholder list. Switching lobby context to a past point
 * (per § 55.6 second paragraph) is deferred — TODO comment marks the
 * follow-up integration point.
 */
export default function OlderPointsSection({
  olderPoints,        // [{ id, pointNumber, scoreLine, missingCount }, ...]
  onTapPoint,         // optional — when wired, switches lobby context
  t,
}) {
  const [expanded, setExpanded] = useState(false);
  const count = olderPoints?.length || 0;

  if (count === 0) return null;

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      flexShrink: 0,
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          padding: `12px 14px`, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span style={{
          fontFamily: FONT, fontSize: 12, fontWeight: 600,
          color: COLORS.textMuted,
        }}>{t('kiosk_older_points')}</span>
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
          color: COLORS.accent,
          background: 'rgba(245, 158, 11, 0.1)',
          padding: '4px 10px', borderRadius: 8,
        }}>{count} {expanded ? '▴' : '▾'}</span>
      </div>

      {/* TODO Brief B follow-up: wire onTapPoint to switch lobby context
          per § 55.6 second paragraph. For MVP we render row stubs;
          tapping a row currently no-ops. */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
          {olderPoints.map(p => (
            <div
              key={p.id}
              onClick={onTapPoint ? () => onTapPoint(p.id) : undefined}
              style={{
                padding: `12px 14px`, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: `1px solid ${COLORS.border}`,
                cursor: onTapPoint ? 'pointer' : 'default',
                WebkitTapHighlightColor: 'transparent',
                opacity: onTapPoint ? 1 : 0.6,
              }}
            >
              <span style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 600,
                color: COLORS.text,
              }}>#{p.pointNumber || '?'} {p.scoreLine || ''}</span>
              <span style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: COLORS.danger,
              }}>{p.missingCount} {t('kiosk_older_missing_suffix')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
