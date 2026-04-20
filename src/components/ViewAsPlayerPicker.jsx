import React, { useState, useMemo } from 'react';
import { Modal, Input } from './ui';
import { useLanguage } from '../hooks/useLanguage';
import { usePlayers, useTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

/**
 * ViewAsPlayerPicker — picks which roster player to impersonate when
 * the admin selects the 'player' role from the dropdown (§ 38.5).
 *
 * Preference order: linked players (have real `linkedUid` mapping) first,
 * then alphabetical by name. Search matches name or jersey number.
 */
export default function ViewAsPlayerPicker({ open, onClose, onPick }) {
  const { t } = useLanguage();
  const { players } = usePlayers();
  const { teams } = useTeams();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const s = (search || '').toLowerCase().trim();
    const teamById = new Map((teams || []).map(tm => [tm.id, tm]));
    return (players || [])
      .filter(p => {
        if (!s) return true;
        return (p.name || '').toLowerCase().includes(s)
            || String(p.number || '').includes(s);
      })
      .map(p => ({ ...p, team: teamById.get(p.teamId) }))
      .sort((a, b) => {
        const aLinked = !!a.linkedUid;
        const bLinked = !!b.linkedUid;
        if (aLinked !== bLinked) return aLinked ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [players, teams, search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('view_as_player_picker_title')}
    >
      <Input
        value={search}
        onChange={setSearch}
        placeholder={t('view_as_player_picker_search')}
        autoFocus
      />
      <div style={{
        marginTop: SPACE.md,
        maxHeight: '50dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {rows.length === 0 ? (
          <div style={{
            padding: SPACE.lg, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>{t('view_as_player_picker_no_linked')}</div>
        ) : rows.map(p => (
          <PlayerRow key={p.id} player={p} onPick={() => onPick(p.id)} />
        ))}
      </div>
    </Modal>
  );
}

function PlayerRow({ player, onPick }) {
  return (
    <div onClick={onPick} style={{
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      padding: `${SPACE.sm}px ${SPACE.xs}px`,
      minHeight: 52,
      borderBottom: `1px solid ${COLORS.border}`,
      cursor: 'pointer',
      opacity: player.linkedUid ? 1 : 0.75,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: COLORS.surfaceLight,
        border: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
        color: COLORS.textDim, flexShrink: 0,
      }}>
        {player.number || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
          color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{player.name || '—'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
          marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.team?.name || '—'}
          {player.linkedUid && <span style={{ color: COLORS.accent, marginLeft: 6 }}>· linked</span>}
        </div>
      </div>
    </div>
  );
}
