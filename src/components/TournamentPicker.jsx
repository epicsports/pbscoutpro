import React, { useMemo, useState } from 'react';
import BottomSheet from './BottomSheet';
import { useTournaments, useTrainings, useActiveTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import { leagueDisplayName } from '../hooks/useLeagues';
import { useLanguage } from '../hooks/useLanguage';

/**
 * TournamentPicker — bottom sheet listing tournaments AND trainings
 * (DESIGN_DECISIONS § 31, § 32).
 *
 * Each row carries a `kind` ('tournament' | 'training'). Selecting calls
 * onSelect(id, kind). Active tournament → green dot + amber border.
 * Training sessions get a cyan "Training" badge.
 *
 * Closed items collapsed by default — tap header to expand.
 */
export default function TournamentPicker({ open, onClose, onSelect, onNew, activeTournamentId, activeTrainingId }) {
  const { t } = useLanguage();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { teams } = useActiveTeams();
  const [showClosed, setShowClosed] = useState(false);

  const { activeRows, closedRows } = useMemo(() => {
    const combined = [
      ...tournaments.map(t => ({ kind: 'tournament', ...t })),
      ...trainings.map(t => ({ kind: 'training', ...t })),
    ];
    const sortBy = (a, b) => {
      const aActive = (a.kind === 'tournament' && a.id === activeTournamentId)
        || (a.kind === 'training' && a.id === activeTrainingId);
      const bActive = (b.kind === 'tournament' && b.id === activeTournamentId)
        || (b.kind === 'training' && b.id === activeTrainingId);
      if (aActive !== bActive) return aActive ? -1 : 1;
      const ta = a.lastAccess?.seconds || a.createdAt?.seconds || 0;
      const tb = b.lastAccess?.seconds || b.createdAt?.seconds || 0;
      return tb - ta;
    };
    return {
      activeRows: combined.filter(r => r.status !== 'closed').sort(sortBy),
      closedRows: combined.filter(r => r.status === 'closed').sort(sortBy),
    };
  }, [tournaments, trainings, activeTournamentId, activeTrainingId]);

  const teamName = (teamId) => teams.find(team => team.id === teamId)?.name || t('training');

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
        {t('tournament_picker_title')}
      </div>

      {activeRows.length === 0 && closedRows.length === 0 && (
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          color: COLORS.textMuted,
          textAlign: 'center',
          padding: SPACE.xl,
        }}>
          {t('tournament_picker_empty_all')}
        </div>
      )}

      {/* Active items */}
      {activeRows.map(row => {
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

      {/* Empty state when only closed exist */}
      {activeRows.length === 0 && closedRows.length > 0 && (
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.sm,
          color: COLORS.textMuted,
          textAlign: 'center',
          padding: `${SPACE.lg}px ${SPACE.md}px`,
        }}>
          {t('tournament_picker_empty_closed_only')}
        </div>
      )}

      {/* Closed section — collapsible */}
      {closedRows.length > 0 && (
        <>
          <div onClick={() => setShowClosed(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: SPACE.sm,
              padding: `${SPACE.md}px ${SPACE.xs}px ${SPACE.sm}px`,
              marginTop: activeRows.length > 0 ? SPACE.sm : 0,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}>
            <span style={{
              fontFamily: FONT, fontSize: 11, color: COLORS.textDim,
              transform: showClosed ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}>›</span>
            <span style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', color: COLORS.textDim,
              letterSpacing: '.5px',
            }}>
              {t('tournament_picker_closed_section_header', closedRows.length)}
            </span>
          </div>
          {showClosed && closedRows.map(row => (
            <Row key={`${row.kind}-${row.id}`}
              row={row}
              active={false}
              teamName={teamName}
              onClick={() => onSelect?.(row.id, row.kind)}
            />
          ))}
        </>
      )}

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
        {t('main_new_event_btn')}
      </div>
    </BottomSheet>
  );
}

function Row({ row, active, teamName, onClick }) {
  const { t } = useLanguage();
  const isClosed = row.status === 'closed';
  const isTraining = row.kind === 'training';
  const dotColor = active ? COLORS.success : isClosed ? COLORS.textMuted : COLORS.borderLight;
  const label = isTraining
    ? (row.name || `${teamName(row.teamId)} — ${row.date || t('training_practice_fallback')}`)
    : row.name;
  const subtitle = isTraining
    ? [row.name ? teamName(row.teamId) : null, row.date, t('squads_players_subtitle', (row.attendees || []).length)].filter(Boolean).join(' · ')
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

      {/* Status badges — CLOSED is ADDITIVE to the event-type chip (D6a, Jacek
          2026-06-12): a closed row shows BOTH "CLOSED" and its event-type
          (Training / league), side by side on the same surface. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {isClosed && (
          <Badge label={t('tournament_picker_closed_badge')} bg={`${COLORS.textMuted}20`} color={COLORS.textMuted} />
        )}
        {isTraining ? (
          <Badge label={t('training')} bg="#22d3ee18" color="#22d3ee" />
        ) : row.league ? (
          <Badge label={leagueDisplayName(row.league)} bg={`${COLORS.accent}15`} color={COLORS.accent} />
        ) : null}
      </div>
    </div>
  );
}

export function TestBadge() {
  const { t } = useLanguage();
  return (
    <span style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700,
      color: COLORS.textMuted, background: COLORS.surfaceLight,
      border: `1px solid ${COLORS.borderLight}`, borderRadius: 3,
      padding: '1px 4px', marginLeft: 4,
      verticalAlign: 'middle',
    }}>{t('test_tag')}</span>
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
