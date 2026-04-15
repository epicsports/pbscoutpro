import React, { useMemo } from 'react';
import BottomSheet from './BottomSheet';
import { useTournaments, useTrainings, useTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

/**
 * TournamentPicker — bottom sheet listing tournaments AND trainings
 * (DESIGN_DECISIONS § 31, § 32).
 *
 * Each row carries a `kind` ('tournament' | 'training'). Selecting calls
 * onSelect(id, kind). Active tournament → green dot + amber border.
 * Training sessions get a cyan "Training" badge.
 */
export default function TournamentPicker({ open, onClose, onSelect, onNew, activeTournamentId, activeTrainingId }) {
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { teams } = useTeams();

  const rows = useMemo(() => {
    const combined = [
      ...tournaments.map(t => ({ kind: 'tournament', ...t })),
      ...trainings.map(t => ({ kind: 'training', ...t })),
    ];
    // Sort: active first, open before closed, then by recency.
    return combined.sort((a, b) => {
      const aActive = (a.kind === 'tournament' && a.id === activeTournamentId)
        || (a.kind === 'training' && a.id === activeTrainingId);
      const bActive = (b.kind === 'tournament' && b.id === activeTournamentId)
        || (b.kind === 'training' && b.id === activeTrainingId);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const aClosed = a.status === 'closed';
      const bClosed = b.status === 'closed';
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      const ta = a.lastAccess?.seconds || a.createdAt?.seconds || 0;
      const tb = b.lastAccess?.seconds || b.createdAt?.seconds || 0;
      return tb - ta;
    });
  }, [tournaments, trainings, activeTournamentId, activeTrainingId]);

  const teamName = (teamId) => teams.find(t => t.id === teamId)?.name || 'Training';

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
        Tournaments & trainings
      </div>

      {rows.length === 0 && (
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          color: COLORS.textMuted,
          textAlign: 'center',
          padding: SPACE.xl,
        }}>
          No tournaments or trainings yet
        </div>
      )}

      {rows.map(row => {
        const active = row.kind === 'tournament'
          ? row.id === activeTournamentId
          : row.id === activeTrainingId;
        return (
          <Row key={`${row.kind}-${row.id}`}
            row={row}
            active={active}
            teamName={teamName}
            onClick={() => onSelect?.(row.id, row.kind)}
          />
        );
      })}

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

function Row({ row, active, teamName, onClick }) {
  const isClosed = row.status === 'closed';
  const isTraining = row.kind === 'training';
  const dotColor = active ? '#22c55e' : isClosed ? '#475569' : '#334155';
  const label = isTraining
    ? `${teamName(row.teamId)} — ${row.date || 'Practice'}`
    : row.name;
  const subtitle = isTraining
    ? `${(row.attendees || []).length} players`
    : (row.year ? String(row.year) : '');

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
          {label}
          {row.isTest && <TestBadge />}
        </div>
        {subtitle && (
          <div style={{
            fontFamily: FONT,
            fontSize: 10,
            color: COLORS.textMuted,
            marginTop: 2,
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Status badge */}
      {isClosed ? (
        <Badge label="CLOSED" bg={`${COLORS.textMuted}20`} color={COLORS.textMuted} />
      ) : isTraining ? (
        <Badge label="Training" bg="#22d3ee18" color="#22d3ee" />
      ) : row.league ? (
        <Badge label={row.league} bg={`${COLORS.accent}15`} color={COLORS.accent} />
      ) : null}
    </div>
  );
}

export function TestBadge() {
  return (
    <span style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700,
      color: '#64748b', background: '#1e293b',
      border: '1px solid #334155', borderRadius: 3,
      padding: '1px 4px', marginLeft: 4,
      verticalAlign: 'middle',
    }}>TEST</span>
  );
}

function Badge({ label, bg, color }) {
  return (
    <span style={{
      fontFamily: FONT,
      fontSize: 10,
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
