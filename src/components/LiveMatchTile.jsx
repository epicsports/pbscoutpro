import React from 'react';
import { COLORS, FONT, SPACE, ELEV } from '../utils/theme';

/**
 * LiveMatchTile — the single split-tap match-tile FRAME primitive.
 *
 * Extracted from MatchCard (the canonical tournament live/scheduled/completed
 * tile) so the training scout view can render the SAME tile language instead of
 * a forked copy. This owns ONLY the chrome that was duplicated: the flex-row
 * card, its live/resting border + radius + shadow, the three non-overlapping
 * tap zones (left flex:1 · center flex:0 0 auto · right flex:1) and the hairline
 * dividers between them. Zone CONTENT is passed in as nodes so each consumer
 * keeps its own visuals byte-identical:
 *   - MatchCard (tournament): TeamZone crest + name + W/L/tap-to-scout, score well.
 *   - TrainingScoutTab (squads): squad crest + name + tap-to-scout, score/LIVE.
 *
 * Tap routing stays with the caller (each zone gets its own onTap) — MatchCard
 * keeps `?scout=`/review nav; training keeps its `setQuickLogMatchupId` side
 * callbacks. This primitive never knows about tournaments OR squads.
 *
 * Props:
 *   left, center, right   ReactNode — zone bodies (caller-styled)
 *   onLeft, onCenter, onRight   tap handlers (receive the event; caller stops
 *                                propagation as before)
 *   live          true → accent live border (else resting hairline)
 *   dimmed        true → completed/closed look (opacity 0.55)
 */
export default function LiveMatchTile({
  left, center, right,
  onLeft, onCenter, onRight,
  live = false, dimmed = false,
}) {
  return (
    <div style={{
      display: 'flex',
      marginBottom: SPACE.xs,
      background: ELEV.surface,
      border: `1px solid ${live ? `${COLORS.accent}40` : ELEV.hairline}`,
      borderRadius: 14,
      overflow: 'hidden',
      opacity: dimmed ? 0.55 : 1,
      minHeight: 62,
      boxShadow: ELEV.shadow1,
    }}>
      {/* Left team zone */}
      <div onClick={onLeft} style={{
        flex: 1, minWidth: 0,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        {left}
      </div>
      <div style={{ width: 1, background: ELEV.hairline }} />
      {/* Center score / status well */}
      <div onClick={onCenter} style={{
        flex: '0 0 auto', minWidth: 82,
        padding: '10px 12px',
        background: ELEV.sunken,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {center}
      </div>
      <div style={{ width: 1, background: ELEV.hairline }} />
      {/* Right team zone */}
      <div onClick={onRight} style={{
        flex: 1, minWidth: 0,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        cursor: 'pointer',
      }}>
        {right}
      </div>
    </div>
  );
}
