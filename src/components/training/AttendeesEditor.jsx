import React, { useState, useMemo } from 'react';
import { Input } from '../ui';
import { usePlayers, useTeams, useTrainings } from '../../hooks/useFirestore';
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

  const toggleAttendee = async (playerId) => {
    const next = attendees.includes(playerId)
      ? attendees.filter(id => id !== playerId)
      : [...attendees, playerId];
    await ds.updateTraining(trainingId, { attendees: next });
  };

  const applyPreset = async (playerIds) => {
    await ds.updateTraining(trainingId, { attendees: [...new Set(playerIds)] });
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
        <PresetPill label={`All (${roster.length})`} onClick={() => applyPreset(roster.map(p => p.id))} />
        {lastTraining && (
          <PresetPill label={`Last (${(lastTraining.attendees || []).length})`}
            onClick={() => applyPreset(lastTraining.attendees || [])} />
        )}
        {childTeams.map(ct => {
          const cp = players.filter(p => p.teamId === ct.id);
          return <PresetPill key={ct.id} label={`${ct.name} (${cp.length})`} onClick={() => applyPreset(cp.map(p => p.id))} />;
        })}
        <PresetPill label="Clear" onClick={() => applyPreset([])} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: SPACE.sm }}>
        <Input value={search} onChange={setSearch} placeholder="Search players…" />
      </div>

      {/* Here */}
      <SubHeader label="Here" count={attendees.length} color="#22c55e" />
      {here.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
          Tap players below to mark them as here.
        </div>
      ) : (
        <ChipGrid players={here} active onToggle={toggleAttendee} />
      )}

      {/* Not here */}
      <div style={{ marginTop: SPACE.md }}>
        <SubHeader label="Not here" count={roster.length - attendees.length} color={COLORS.textMuted} />
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
      cursor: 'pointer', minHeight: 32, display: 'inline-flex', alignItems: 'center',
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
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0 12px', height: 44, minHeight: TOUCH.minTarget,
          borderRadius: RADIUS.lg,
          background: active ? '#22c55e10' : '#0f172a',
          border: `1px solid ${active ? '#22c55e60' : '#1e293b'}`,
          cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>
          {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: active ? '#22c55e' : COLORS.textDim }}>
            {p.nickname || p.name || '?'}
          </span>
          {p.number && (
            <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: active ? '#22c55e80' : COLORS.textMuted }}>#{p.number}</span>
          )}
        </div>
      ))}
    </div>
  );
}
