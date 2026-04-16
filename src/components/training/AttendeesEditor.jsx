import React, { useState, useMemo } from 'react';
import { Input } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import { usePlayers, useTeams, useTrainings } from '../../hooks/useFirestore';
import { useLanguage } from '../../hooks/useLanguage';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';

/**
 * AttendeesEditor — inline attendance picker.
 * Reusable in both TrainingSetupPage and TrainingScoutTab.
 */
export default function AttendeesEditor({ trainingId, training }) {
  const { players } = usePlayers();
  const { teams } = useTeams();
  const { trainings } = useTrainings();
  const { t } = useLanguage();

  const team = training ? teams.find(t => t.id === training.teamId) : null;

  const teamIds = useMemo(() => {
    if (!team) return [];
    const children = teams.filter(t => t.parentTeamId === team.id).map(t => t.id);
    return [team.id, ...children];
  }, [team, teams]);

  const roster = useMemo(() => {
    if (!team) return [];
    return players
      .filter(p => teamIds.includes(p.teamId))
      .sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || ''));
  }, [players, teamIds, team]);

  const attendees = training?.attendees || [];
  const [search, setSearch] = useState('');

  const lastTraining = useMemo(() => {
    if (!training) return null;
    return trainings
      .filter(t => t.id !== trainingId && t.teamId === training.teamId && (t.attendees || []).length)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0] || null;
  }, [trainings, training, trainingId]);

  // When attendance changes, also clean squad rosters — they must be a
  // subset of attendees. Adding a player to attendance does NOT auto-assign
  // them to any squad (coach decides). Removing cleans them from their squad.
  const syncSquads = (newAttendees) => {
    const currentSquads = training?.squads || {};
    const attendeeSet = new Set(newAttendees);
    const cleaned = {};
    let modified = false;
    Object.entries(currentSquads).forEach(([key, pids]) => {
      const filtered = (pids || []).filter(id => attendeeSet.has(id));
      if (filtered.length !== (pids || []).length) modified = true;
      cleaned[key] = filtered;
    });
    return modified ? cleaned : null;
  };

  const toggleAttendee = async (playerId) => {
    const next = attendees.includes(playerId)
      ? attendees.filter(id => id !== playerId)
      : [...attendees, playerId];
    const updates = { attendees: next };
    const cleanedSquads = syncSquads(next);
    if (cleanedSquads) updates.squads = cleanedSquads;
    await ds.updateTraining(trainingId, updates);
  };

  const applyPreset = async (playerIds) => {
    const next = [...new Set(playerIds)];
    const updates = { attendees: next };
    const cleanedSquads = syncSquads(next);
    if (cleanedSquads) updates.squads = cleanedSquads;
    await ds.updateTraining(trainingId, updates);
  };

  const q = search.trim().toLowerCase();
  const matches = (p) => {
    if (!q) return true;
    return (p.nickname || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q);
  };
  const here = roster.filter(p => attendees.includes(p.id) && matches(p));
  const notHere = roster.filter(p => !attendees.includes(p.id) && matches(p));
  const childTeams = teams.filter(t => t.parentTeamId === team?.id);

  return (
    <div>
      {/* Preset pills */}
      <div style={{
        display: 'flex', gap: SPACE.sm, overflowX: 'auto',
        paddingBottom: SPACE.sm, marginBottom: SPACE.sm,
      }}>
        <PresetPill label={t('all_preset', roster.length)} onClick={() => applyPreset(roster.map(p => p.id))} />
        {lastTraining && (
          <PresetPill label={t('last_preset', (lastTraining.attendees || []).length)}
            onClick={() => applyPreset(lastTraining.attendees || [])} />
        )}
        {childTeams.map(ct => {
          const cp = players.filter(p => p.teamId === ct.id);
          return <PresetPill key={ct.id} label={`${ct.name} (${cp.length})`} onClick={() => applyPreset(cp.map(p => p.id))} />;
        })}
        <PresetPill label={t('clear_preset')} onClick={() => applyPreset([])} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: SPACE.sm }}>
        <Input value={search} onChange={setSearch} placeholder={t('search_players')} />
      </div>

      {/* Here */}
      <SubHeader label={t('here')} count={attendees.length} color="#22c55e" />
      {here.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
          Tap players below to mark them as here.
        </div>
      ) : (
        <ChipGrid players={here} active onToggle={toggleAttendee} />
      )}

      {/* Not here */}
      <div style={{ marginTop: SPACE.md }}>
        <SubHeader label={t('not_here')} count={roster.length - attendees.length} color={COLORS.textMuted} />
        {notHere.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
            Everyone is here.
          </div>
        ) : (
          <ChipGrid players={notHere} active={false} onToggle={toggleAttendee} />
        )}
      </div>
    </div>
  );
}

function PresetPill({ label, onClick }) {
  return (
    <div onClick={onClick} style={{
      flexShrink: 0, padding: '6px 12px', borderRadius: RADIUS.full,
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
      fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textDim,
      cursor: 'pointer', minHeight: 44, display: 'inline-flex', alignItems: 'center',
      WebkitTapHighlightColor: 'transparent',
    }}>{label}</div>
  );
}

function SubHeader({ label, count, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: `${SPACE.xs}px 2px`,
      fontFamily: FONT, fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '.4px',
    }}>
      <span>{label}</span>
      <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>{count}</span>
    </div>
  );
}

function ChipGrid({ players, active, onToggle }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
      {players.map(p => (
        <div key={p.id} onClick={() => onToggle(p.id)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 12px 4px 4px', height: 44, minHeight: TOUCH.minTarget,
          borderRadius: 22,
          background: active ? '#22c55e10' : COLORS.surfaceDark,
          border: `1px solid ${active ? '#22c55e60' : COLORS.surfaceLight}`,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
          <PlayerAvatar player={p} size={34} />
          {p.number && (
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: active ? '#22c55e' : COLORS.textDim, letterSpacing: '-0.2px' }}>#{p.number}</span>
          )}
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: active ? COLORS.success : COLORS.text }}>
            {p.nickname || p.name || '?'}
          </span>
        </div>
      ))}
    </div>
  );
}
