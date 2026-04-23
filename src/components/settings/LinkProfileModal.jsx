import React, { useMemo, useState } from 'react';
import { Modal, Btn, Input } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useUserProfiles } from '../../hooks/useUserNames';

/**
 * LinkProfileModal — admin picks a player profile to link to a user (§ 50.4).
 *
 * Search filters by nickname / name / PBLI. Players already linked to a
 * different uid are surfaced but disabled (with the linked user's email as
 * subtext) so admin sees the conflict instead of silently overwriting.
 *
 * Selection calls back via onSelect(player) — caller (UserDetailPage)
 * runs the dataService write so this modal stays presentation-only.
 */
export default function LinkProfileModal({
  open, onClose, players, currentLinkedPlayer, onSelect, busy,
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  // Resolve emails for players whose linkedUid != null AND != currentUid
  // (visible "already linked" subtext).
  const conflictUids = useMemo(() => {
    const s = new Set();
    (players || []).forEach(p => {
      if (p.linkedUid && p.linkedUid !== currentLinkedPlayer?.linkedUid) s.add(p.linkedUid);
    });
    return [...s];
  }, [players, currentLinkedPlayer]);
  const profiles = useUserProfiles(conflictUids);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (players || []).slice().sort((a, b) => {
      // Surface unlinked first, then current link, then conflicts.
      const aLinked = !!a.linkedUid;
      const bLinked = !!b.linkedUid;
      if (aLinked !== bLinked) return aLinked ? 1 : -1;
      const an = (a.nickname || a.name || '').toLowerCase();
      const bn = (b.nickname || b.name || '').toLowerCase();
      return an.localeCompare(bn);
    });
    if (!q) return list;
    return list.filter(p => {
      const nick = (p.nickname || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const pbli = (p.pbliId || p.pbliIdFull || '').toString().toLowerCase();
      return nick.includes(q) || name.includes(q) || pbli.includes(q);
    });
  }, [players, query]);

  return (
    <Modal open={open} onClose={busy ? undefined : onClose}
      title={t('link_profile_title') || 'Wybierz profil gracza'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <Input
          value={query}
          onChange={setQuery}
          placeholder={t('link_profile_search_ph') || 'Szukaj po pseudonimie lub PBLI…'}
        />
        <div style={{
          display: 'flex', flexDirection: 'column', gap: SPACE.xs,
          maxHeight: '60dvh', overflowY: 'auto',
          margin: `0 -${SPACE.xs}px`, padding: `0 ${SPACE.xs}px`,
        }}>
          {filtered.length === 0 ? (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
              textAlign: 'center', padding: SPACE.lg,
            }}>{t('no_matches') || 'Brak wyników'}</div>
          ) : filtered.map(p => {
            const isCurrent = p.id === currentLinkedPlayer?.id;
            const conflictEmail = p.linkedUid && p.linkedUid !== currentLinkedPlayer?.linkedUid
              ? (profiles[p.linkedUid]?.email || profiles[p.linkedUid]?.displayName || null)
              : null;
            return (
              <PlayerOption
                key={p.id}
                player={p}
                current={isCurrent}
                conflictLabel={conflictEmail}
                disabled={busy}
                onSelect={() => onSelect(p)}
                t={t}
              />
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

function PlayerOption({ player, current, conflictLabel, disabled, onSelect, t }) {
  const name = player.nickname || player.name || 'Player';
  const number = player.number ? `#${player.number}` : '';
  const pbli = player.pbliId ? `PBLI #${String(player.pbliId).replace(/^#?/, '')}` : '';
  const subBits = [pbli, conflictLabel ? `${t('link_profile_already_taken') || 'Already linked'}: ${conflictLabel}` : null]
    .filter(Boolean).join(' · ');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      padding: `${SPACE.sm}px ${SPACE.md}px`, minHeight: 56,
      background: current ? `${COLORS.accent}12` : COLORS.surfaceDark,
      border: `1px solid ${current ? `${COLORS.accent}55` : COLORS.border}`,
      borderRadius: RADIUS.md,
    }}>
      <PlayerAvatar player={player} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
          color: current ? COLORS.accent : COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name} {number}</div>
        {subBits && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
            marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subBits}</div>
        )}
      </div>
      <Btn
        variant={current ? 'default' : 'accent'}
        onClick={onSelect}
        disabled={disabled || current}
      >{current ? '✓' : (t('link_profile_select') || 'Wybierz')}</Btn>
    </div>
  );
}
