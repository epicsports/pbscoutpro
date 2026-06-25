import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import PlayerAvatar from './PlayerAvatar';
import { useDisplayName } from '../utils/playerName';

export default function RosterGrid({ roster, selected, onToggle, max = 5, heroPlayerIds = [] }) {
  const dn = useDisplayName();
  const count = selected.length;
  const isFull = count >= max;
  return (
    <div style={{
      padding: `${SPACE.sm}px ${SPACE.md}px 10px`,
      background: COLORS.bg,
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
        color: isFull ? COLORS.accent : COLORS.textDim, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />
        Playing: {count}/{max}
      </div>
      <div style={{
        display: 'flex', gap: SPACE.sm,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
        maskImage: roster.length > 4 ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
        WebkitMaskImage: roster.length > 4 ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
      }}>
        {roster.map(player => {
          const isOn = selected.includes(player.id);
          const isHero = heroPlayerIds.includes(player.id) || !!player.hero;
          // Roster chips are intentionally compact (nickname or last-name only).
          // dn(player) is the PII-aware full label; when it differs from the raw
          // value (short mode mangled the surname) prefer it so no full surname
          // leaks here either. Otherwise keep the existing compact last-name.
          const piiName = dn(player);
          const rawName = player.nickname || player.name || '';
          const displayName = piiName !== rawName
            ? piiName
            : (player.nickname || player.name?.split(' ').pop() || '');
          return (
            <div key={player.id} onClick={() => onToggle(player.id)}
              style={{
                flexShrink: 0,
                padding: '8px 12px 8px 8px',
                borderRadius: RADIUS.lg,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer',
                background: isOn ? COLORS.accent + '10' : COLORS.surface,
                color: isOn ? COLORS.accent : COLORS.textMuted,
                border: `1.5px solid ${isOn ? COLORS.accent + '60' : COLORS.border}`,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <PlayerAvatar player={player} size={28}
                ringColor={isOn ? COLORS.accent : null} />
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 800, whiteSpace: 'nowrap' }}>
                #{player.number}
              </span>
              {isHero && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent, flexShrink: 0 }} />
              )}
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
