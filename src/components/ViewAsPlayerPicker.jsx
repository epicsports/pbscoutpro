import React, { useMemo } from 'react';
import EntityPickerModal from './EntityPickerModal';
import { useLanguage } from '../hooks/useLanguage';
import { usePlayers, useActiveTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
import { useDisplayName } from '../utils/playerName';

/**
 * ViewAsPlayerPicker — picks which roster player to impersonate when
 * the admin selects the 'player' role from the dropdown (§ 38.5).
 *
 * Migrated onto the shared EntityPickerModal (§ search/filter Stage D): search
 * via matchEntity (name + number). Preference order preserved by pre-sorting the
 * items (linked players first, then alphabetical) before handing them to the
 * picker, which renders `items` in order.
 */
export default function ViewAsPlayerPicker({ open, onClose, onPick }) {
  const { t } = useLanguage();
  const dn = useDisplayName();
  const { players } = usePlayers();
  const { teams } = useActiveTeams();

  // Linked-first, then alpha; attach the team for the row subtitle.
  const items = useMemo(() => {
    const teamById = new Map((teams || []).map(tm => [tm.id, tm]));
    return (players || [])
      .map(p => ({ ...p, team: teamById.get(p.teamId) }))
      .sort((a, b) => {
        const aLinked = !!a.linkedUid;
        const bLinked = !!b.linkedUid;
        if (aLinked !== bLinked) return aLinked ? -1 : 1;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [players, teams]);

  const renderItem = (p) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', opacity: p.linkedUid ? 1 : 0.75 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
        color: COLORS.textDim, flexShrink: 0,
      }}>
        {p.number || '?'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{dn(p) || '—'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {p.team?.name || '—'}
          {p.linkedUid && <span style={{ color: COLORS.accent, marginLeft: 6 }}>· linked</span>}
        </div>
      </div>
    </div>
  );

  return (
    <EntityPickerModal
      open={open}
      onClose={onClose}
      title={t('view_as_player_picker_title')}
      items={items}
      fields={['name', 'number']}
      onPick={(id) => onPick(id)}
      renderItem={renderItem}
      emptyText={t('view_as_player_picker_no_linked')}
    />
  );
}
