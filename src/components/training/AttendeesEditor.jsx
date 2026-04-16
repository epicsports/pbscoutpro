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

  // Ghost attendees: in attendees list but no longer in this team's roster
  // (player was moved/removed from team mid-training, or deleted entirely).
  // We need to surface them so they can be removed from training, otherwise
  // they're stuck in squads with no way to delete them.
  const rosterIds = new Set(roster.map(p => p.id));
  const ghostAttendees = attendees
    .filter(id => !rosterIds.has(id))
    .map(id => {
      const p = players.find(pp => pp.id === id);
      return p
        ? { ...p, _ghost: true }
        : { id, name: t('player_deleted') || 'Zawodnik usunięty', _ghost: true, _missing: true };
    });

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

      {/* Ghost attendees — players removed from team mid-training */}
      {ghostAttendees.length > 0 && (
        <div style={{ marginBottom: SPACE.md }}>
          <SubHeader label={t('removed_from_team') || 'Wypadł z drużyny'} count={ghostAttendees.length} color={COLORS.danger} />
          <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
            padding: '0 2px 6px',
          }}>
            {t('removed_from_team_hint') || 'Dotknij aby usunąć z treningu (cofnie też z każdego składu)'}
          </div>
          <ChipGrid players={ghostAttendees} variant="danger" onToggle={toggleAttendee} />
        </div>
      )}

      {/* Here */}
      <SubHeader label={t('here')} count={attendees.length - ghostAttendees.length} color="#22c55e" />
      {here.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
          Tap players below to mark them as here.
        </div>
      ) : (
        <ChipGrid players={here} variant="active" onToggle={toggleAttendee} />
      )}

      {/* Not here */}
      <div style={{ marginTop: SPACE.md }}>
        <SubHeader label={t('not_here')} count={roster.length - (attendees.length - ghostAttendees.length)} color={COLORS.textMuted} />
        {notHere.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
            Everyone is here.
          </div>
        ) : (
          <ChipGrid players={notHere} variant="inactive" onToggle={toggleAttendee} />
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

function ChipGrid({ players, variant = 'inactive', active, onToggle }) {
  // Back-compat: legacy `active` prop maps to variant
  const v = variant !== 'inactive' ? variant : (active ? 'active' : 'inactive');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
      {players.map(p => {
        const isDanger = v === 'danger';
        const isActive = v === 'active';
        const bg = isDanger ? `${COLORS.danger}15` : isActive ? '#22c55e10' : COLORS.surfaceDark;
        const bd = isDanger ? `${COLORS.danger}70` : isActive ? '#22c55e60' : COLORS.surfaceLight;
        const numCol = isDanger ? COLORS.danger : isActive ? '#22c55e' : COLORS.textDim;
        const txCol = isDanger ? COLORS.danger : isActive ? COLORS.success : COLORS.text;
        return (
          <div key={p.id} onClick={() => onToggle(p.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px 4px 4px', height: 44, minHeight: TOUCH.minTarget,
            borderRadius: 22,
            background: bg, border: `1px solid ${bd}`,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            opacity: p._missing ? 0.7 : 1,
          }}>
            <PlayerAvatar player={p} size={34} />
            {p.number && (
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: numCol, letterSpacing: '-0.2px' }}>#{p.number}</span>
            )}
            <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: txCol }}>
              {p.nickname || p.name || '?'}
            </span>
            {isDanger && (
              <span style={{ fontSize: 14, color: COLORS.danger, marginLeft: 2 }}>×</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
