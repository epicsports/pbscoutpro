import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Btn, Input, EmptyState, SkeletonList } from '../components/ui';
import { usePlayers, useTeams, useTrainings } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

/**
 * TrainingSetupPage — "Who's here" roster attendance picker (§ 32).
 *
 * Accessible at /training/:trainingId/setup. Editable any time during a
 * training to add late arrivals or remove early departures.
 */
export default function TrainingSetupPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { trainings, loading: tLoading } = useTrainings();
  const { players, loading: pLoading } = usePlayers();
  const { teams } = useTeams();

  const training = trainings.find(t => t.id === trainingId);
  const team = training ? teams.find(t => t.id === training.teamId) : null;

  // Child-team helpers: include parent team's children + direct team players.
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

  // Local attendance state — initialised from training doc.
  const [attendees, setAttendees] = useState(null);
  useEffect(() => {
    if (!training || attendees !== null) return;
    setAttendees(training.attendees || []);
  }, [training, attendees]);

  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Last-training preset (most recent training for the same team, excluding current).
  const lastTraining = useMemo(() => {
    if (!training) return null;
    return trainings
      .filter(t => t.id !== trainingId && t.teamId === training.teamId && (t.attendees || []).length)
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0] || null;
  }, [trainings, training, trainingId]);

  if (tLoading || pLoading || attendees === null) {
    return (
      <div style={{ padding: SPACE.lg }}>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (!training) {
    return <EmptyState icon="⏳" text="Training not found" />;
  }

  const toggleAttendee = (playerId) => {
    setAttendees(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const applyPreset = (playerIds) => setAttendees([...new Set(playerIds)]);

  const handleFormSquads = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Auto-distribute attendees into 2 squads on first setup so the squad
      // page has a starting point. If squads already exist, keep them.
      let squads = training.squads || {};
      const existing = Object.values(squads).flat();
      const needsInit = !existing.length;
      if (needsInit) {
        squads = { red: [], blue: [] };
        attendees.forEach((pid, i) => {
          squads[i % 2 === 0 ? 'red' : 'blue'].push(pid);
        });
      }
      await ds.updateTraining(trainingId, { attendees, squads });
      navigate(`/training/${trainingId}/squads`);
    } catch (e) {
      console.error('Save attendees failed:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    }
    setSaving(false);
  };

  // Filter chips by search text.
  const q = search.trim().toLowerCase();
  const matches = (p) => {
    if (!q) return true;
    const nick = (p.nickname || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    return nick.includes(q) || name.includes(q);
  };
  const here = roster.filter(p => attendees.includes(p.id) && matches(p));
  const notHere = roster.filter(p => !attendees.includes(p.id) && matches(p));

  const childTeams = teams.filter(t => t.parentTeamId === team?.id);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: '/' }}
        title="Who's at practice?"
        subtitle={team?.name || '—'}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 96 }}>
        {/* Preset pills */}
        <div style={{
          display: 'flex',
          gap: SPACE.sm,
          overflowX: 'auto',
          paddingBottom: SPACE.sm,
          marginBottom: SPACE.md,
        }}>
          <PresetPill
            label={`All (${roster.length})`}
            onClick={() => applyPreset(roster.map(p => p.id))}
          />
          {lastTraining && (
            <PresetPill
              label={`Last training (${(lastTraining.attendees || []).length})`}
              onClick={() => applyPreset(lastTraining.attendees || [])}
            />
          )}
          {childTeams.map(ct => {
            const childPlayers = players.filter(p => p.teamId === ct.id);
            return (
              <PresetPill
                key={ct.id}
                label={`${ct.name} (${childPlayers.length})`}
                onClick={() => applyPreset(childPlayers.map(p => p.id))}
              />
            );
          })}
          <PresetPill label="Clear" onClick={() => setAttendees([])} />
        </div>

        {/* Search */}
        <div style={{ marginBottom: SPACE.md }}>
          <Input value={search} onChange={setSearch} placeholder="Search players…" />
        </div>

        {/* Here */}
        <SectionHeader label="Here" count={attendees.length} color="#22c55e" />
        {here.length === 0 ? (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            padding: `${SPACE.md}px 0`, textAlign: 'center',
          }}>
            Tap players below to mark them as here.
          </div>
        ) : (
          <ChipGrid players={here} active onToggle={toggleAttendee} />
        )}

        {/* Not here */}
        <div style={{ marginTop: SPACE.lg }}>
          <SectionHeader label="Not here" count={roster.length - attendees.length} color={COLORS.textMuted} />
          {notHere.length === 0 ? (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
              padding: `${SPACE.md}px 0`, textAlign: 'center',
            }}>
              Everyone is here.
            </div>
          ) : (
            <ChipGrid players={notHere} active={false} onToggle={toggleAttendee} />
          )}
        </div>
      </div>

      {/* Sticky footer CTA */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 20,
        padding: `${SPACE.md}px ${SPACE.lg}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      }}>
        <Btn
          variant="accent"
          disabled={attendees.length === 0 || saving}
          onClick={handleFormSquads}
          style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
        >
          {attendees.length === 0 ? 'Select players to continue' : `${attendees.length} here — Form squads`}
        </Btn>
      </div>
    </div>
  );
}

function PresetPill({ label, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderRadius: RADIUS.full,
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        fontFamily: FONT,
        fontSize: FONT_SIZE.xs,
        fontWeight: 600,
        color: COLORS.textDim,
        cursor: 'pointer',
        minHeight: 44,
        display: 'inline-flex',
        alignItems: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}>
      {label}
    </div>
  );
}

function SectionHeader({ label, count, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: `${SPACE.xs}px 2px`,
      fontFamily: FONT,
      fontSize: 11,
      fontWeight: 600,
      color,
      textTransform: 'uppercase',
      letterSpacing: '.4px',
    }}>
      <span>{label}</span>
      <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>{count}</span>
    </div>
  );
}

function ChipGrid({ players, active, onToggle }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: SPACE.sm,
    }}>
      {players.map(p => (
        <div key={p.id}
          onClick={() => onToggle(p.id)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 12px',
            height: 44,
            minHeight: TOUCH.minTarget,
            borderRadius: RADIUS.lg,
            background: active ? '#22c55e10' : '#0f172a',
            border: `1px solid ${active ? '#22c55e60' : '#1e293b'}`,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>
          {active && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', flexShrink: 0,
            }} />
          )}
          <span style={{
            fontFamily: FONT,
            fontSize: 13,
            fontWeight: 700,
            color: active ? '#22c55e' : COLORS.textDim,
          }}>
            {p.nickname || p.name || '?'}
          </span>
          {p.number && (
            <span style={{
              fontFamily: FONT,
              fontSize: 10,
              fontWeight: 600,
              color: active ? '#22c55e80' : COLORS.textMuted,
            }}>
              #{p.number}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
