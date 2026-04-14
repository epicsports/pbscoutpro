import React from 'react';
import BottomSheet from './BottomSheet';
import { useTournaments } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

/**
 * TournamentPicker — bottom sheet listing tournaments (DESIGN_DECISIONS § 31).
 *
 * Sort: active first, then open, then closed.
 * Each row: status dot + name + badge (league / Training / Closed).
 * Dashed card at the bottom: "+ New tournament or training" → onNew callback.
 */
export default function TournamentPicker({ open, onClose, onSelect, onNew, activeTournamentId }) {
  const { tournaments } = useTournaments();

  // Sort: active first, then open (by lastAccess), then closed.
  const sorted = [...tournaments].sort((a, b) => {
    if (a.id === activeTournamentId) return -1;
    if (b.id === activeTournamentId) return 1;
    const aClosed = a.status === 'closed';
    const bClosed = b.status === 'closed';
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    const ta = a.lastAccess?.seconds || a.createdAt?.seconds || 0;
    const tb = b.lastAccess?.seconds || b.createdAt?.seconds || 0;
    return tb - ta;
  });

  const handleNew = () => {
    onClose?.();
    onNew?.();
  };

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="75dvh">
      <div style={{
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        color: COLORS.textDim,
        letterSpacing: '.5px',
        padding: `0 ${SPACE.xs}px ${SPACE.md}px`,
      }}>
        Tournaments
      </div>

      {sorted.length === 0 && (
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          color: COLORS.textMuted,
          textAlign: 'center',
          padding: SPACE.xl,
        }}>
          No tournaments yet
        </div>
      )}

      {sorted.map(t => (
        <TournamentRow key={t.id}
          tournament={t}
          active={t.id === activeTournamentId}
          onClick={() => onSelect?.(t.id)}
        />
      ))}

      {/* Dashed "+ New" card */}
      <div onClick={handleNew}
        style={{
          marginTop: SPACE.sm,
          padding: '16px',
          borderRadius: RADIUS.lg,
          border: `1px dashed ${COLORS.border}`,
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'center',
          color: COLORS.accent,
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          fontWeight: 600,
          minHeight: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          WebkitTapHighlightColor: 'transparent',
        }}>
        + New tournament or training
      </div>
    </BottomSheet>
  );
}

function TournamentRow({ tournament, active, onClick }) {
  const isClosed = tournament.status === 'closed';
  const isPractice = tournament.type === 'practice';

  const dotColor = active ? '#22c55e' : isClosed ? '#475569' : '#334155';

  return (
    <div onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.md,
        padding: '12px 14px',
        marginBottom: SPACE.xs,
        borderRadius: RADIUS.lg,
        background: active ? `${COLORS.accent}10` : COLORS.surfaceDark,
        border: `1px solid ${active ? `${COLORS.accent}40` : COLORS.border}`,
        cursor: 'pointer',
        opacity: isClosed ? 0.65 : 1,
        minHeight: 56,
        WebkitTapHighlightColor: 'transparent',
      }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: dotColor, flexShrink: 0,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          fontWeight: 600,
          color: COLORS.text,
          letterSpacing: '-.1px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {tournament.name}
        </div>
        {tournament.year && (
          <div style={{
            fontFamily: FONT,
            fontSize: 10,
            color: COLORS.textMuted,
            marginTop: 2,
          }}>
            {tournament.year}
          </div>
        )}
      </div>

      {/* Status badge */}
      {isClosed ? (
        <Badge label="CLOSED" bg={`${COLORS.textMuted}20`} color={COLORS.textMuted} />
      ) : isPractice ? (
        <Badge label="Training" bg="#22d3ee18" color="#22d3ee" />
      ) : tournament.league ? (
        <Badge label={tournament.league} bg={`${COLORS.accent}15`} color={COLORS.accent} />
      ) : null}
    </div>
  );
}

function Badge({ label, bg, color }) {
  return (
    <span style={{
      fontFamily: FONT,
      fontSize: 9,
      fontWeight: 800,
      padding: '3px 8px',
      borderRadius: RADIUS.xs,
      background: bg,
      color,
      letterSpacing: '.4px',
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}
