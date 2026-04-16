import React, { useState, useMemo } from 'react';
import { Input, Modal, Btn } from '../ui';
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
  const [inviteOpen, setInviteOpen] = useState(false);

  const playerById = useMemo(() => {
    const m = {};
    players.forEach(p => { m[p.id] = p; });
    return m;
  }, [players]);
  const teamById = useMemo(() => {
    const m = {};
    teams.forEach(t => { m[t.id] = t; });
    return m;
  }, [teams]);

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

  // Guest attendees: in attendees list but not in this team's roster.
  // This covers TWO cases that look the same to the coach:
  //   (a) Player intentionally invited from another club (e.g. for national-team
  //       training, or a friend trying out)
  //   (b) Player who WAS on the team but got removed mid-training (orphan)
  // Both are surfaced as "Goście" — the coach can keep them (if invited) or
  // tap to remove (if accidental). Each chip shows the player's primary
  // team in the subtitle so origin is clear.
  const rosterIds = new Set(roster.map(p => p.id));
  const guestAttendees = attendees
    .filter(id => !rosterIds.has(id))
    .map(id => {
      const p = playerById[id];
      if (!p) return { id, name: t('player_deleted') || 'Zawodnik usunięty', _missing: true };
      const homeTeam = teamById[p.teamId];
      return { ...p, _guest: true, _homeTeamName: homeTeam?.name || null };
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

      {/* Guests — players from outside this team (invited or removed) */}
      {(guestAttendees.length > 0 || true) && (
        <div style={{ marginBottom: SPACE.md }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: `${SPACE.xs}px 2px`,
          }}>
            <SubHeader label={t('guests_section') || 'Goście'} count={guestAttendees.length} color={COLORS.accent} inline />
            <div onClick={() => setInviteOpen(true)} style={{
              fontFamily: FONT, fontSize: 12, fontWeight: 700,
              color: COLORS.accent,
              padding: '6px 10px', borderRadius: 8,
              background: `${COLORS.accent}10`,
              border: `1px solid ${COLORS.accent}30`,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              minHeight: 32, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              + {t('invite_guest') || 'Zaproś gościa'}
            </div>
          </div>
          {guestAttendees.length > 0 ? (
            <ChipGrid players={guestAttendees} variant="guest" onToggle={toggleAttendee} />
          ) : (
            <div style={{
              fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
              padding: '4px 2px',
            }}>
              {t('guests_hint') || 'Zawodnicy spoza drużyny zaproszeni na trening (np. reprezentacja).'}
            </div>
          )}
        </div>
      )}

      {/* Here */}
      <SubHeader label={t('here')} count={here.length} color="#22c55e" />
      {here.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
          Tap players below to mark them as here.
        </div>
      ) : (
        <ChipGrid players={here} variant="active" onToggle={toggleAttendee} />
      )}

      {/* Not here */}
      <div style={{ marginTop: SPACE.md }}>
        <SubHeader label={t('not_here')} count={notHere.length} color={COLORS.textMuted} />
        {notHere.length === 0 ? (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: `${SPACE.sm}px 0`, textAlign: 'center' }}>
            Everyone is here.
          </div>
        ) : (
          <ChipGrid players={notHere} variant="inactive" onToggle={toggleAttendee} />
        )}
      </div>

      {/* Invite guest modal */}
      <InviteGuestModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        allPlayers={players}
        teams={teams}
        excludeIds={new Set([...attendees, ...roster.map(p => p.id)])}
        onInvite={(pid) => { toggleAttendee(pid); }}
      />
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

function SubHeader({ label, count, color, inline }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: inline ? 0 : `${SPACE.xs}px 2px`,
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
        const isGuest  = v === 'guest';
        const isDanger = v === 'danger';
        const isActive = v === 'active';
        const accent = isGuest ? COLORS.accent : isDanger ? COLORS.danger : isActive ? '#22c55e' : null;
        const bg = accent ? `${accent}10` : COLORS.surfaceDark;
        const bd = accent ? `${accent}60` : COLORS.surfaceLight;
        const numCol = accent || COLORS.textDim;
        const txCol = isGuest ? COLORS.text : isDanger ? COLORS.danger : isActive ? COLORS.success : COLORS.text;
        const showSub = isGuest && (p._homeTeamName || p._missing);
        return (
          <div key={p.id} onClick={() => onToggle(p.id)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 12px 4px 4px',
            minHeight: showSub ? 52 : 44,
            borderRadius: 22,
            background: bg, border: `1px solid ${bd}`,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            opacity: p._missing ? 0.7 : 1,
          }}>
            <PlayerAvatar player={p} size={34} />
            {p.number && (
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: numCol, letterSpacing: '-0.2px' }}>#{p.number}</span>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: txCol, lineHeight: 1.1 }}>
                {p.nickname || p.name || '?'}
              </span>
              {showSub && (
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 1 }}>
                  {p._missing ? '(usunięty z workspace)' : `z ${p._homeTeamName}`}
                </span>
              )}
            </div>
            {(isDanger || isGuest) && (
              <span style={{ fontSize: 14, color: accent, marginLeft: 2, opacity: 0.7 }}>×</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * InviteGuestModal — search-and-add picker for inviting workspace players
 * who aren't on the current team to a training. Used for national-team-style
 * sessions where the roster is composed from across multiple clubs.
 */
function InviteGuestModal({ open, onClose, allPlayers, teams, excludeIds, onInvite }) {
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  if (!open) return null;
  const teamById = {};
  teams.forEach(t => { teamById[t.id] = t; });

  const lower = q.trim().toLowerCase();
  const matches = (p) => !lower
    || (p.nickname || '').toLowerCase().includes(lower)
    || (p.name || '').toLowerCase().includes(lower);

  // Eligible: anyone in workspace not already in this training and not in the
  // current team's roster (those are already shown as Tutaj/Nie tutaj).
  const eligible = allPlayers
    .filter(p => !excludeIds.has(p.id) && matches(p))
    .sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || ''));

  // Group by team for clarity
  const grouped = {};
  eligible.forEach(p => {
    const teamName = teamById[p.teamId]?.name || (t('no_team') || 'Bez drużyny');
    (grouped[teamName] ||= []).push(p);
  });

  return (
    <Modal open={open} onClose={onClose}
      title={t('invite_guest_title') || 'Zaproś gościa na trening'}
      footer={<Btn variant="default" onClick={onClose}>{t('done') || 'Gotowe'}</Btn>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <Input value={q} onChange={setQ} placeholder={t('search_players') || 'Szukaj…'} autoFocus />
        {eligible.length === 0 ? (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            padding: SPACE.lg, textAlign: 'center',
          }}>
            {q
              ? (t('no_matches') || 'Brak wyników')
              : (t('all_invited_or_member') || 'Wszyscy zawodnicy z workspace są już na liście lub w drużynie.')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md, maxHeight: 360, overflowY: 'auto' }}>
            {Object.entries(grouped).map(([teamName, list]) => (
              <div key={teamName}>
                <div style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 700,
                  color: COLORS.textMuted, textTransform: 'uppercase',
                  letterSpacing: '.4px', padding: '0 2px 6px',
                }}>{teamName} <span style={{ fontWeight: 500, color: COLORS.textDim }}>· {list.length}</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
                  {list.map(p => (
                    <div key={p.id} onClick={() => onInvite(p.id)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '4px 12px 4px 4px', minHeight: TOUCH.minTarget,
                      borderRadius: 22,
                      background: COLORS.surfaceDark,
                      border: `1px solid ${COLORS.surfaceLight}`,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                    }}>
                      <PlayerAvatar player={p} size={32} />
                      {p.number && (
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textDim }}>#{p.number}</span>
                      )}
                      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                        {p.nickname || p.name || '?'}
                      </span>
                      <span style={{ fontSize: 14, color: COLORS.accent, marginLeft: 2 }}>+</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
