import { COLORS, FONT, FONT_COND, FONT_SIZE, RADIUS, SPACE, ELEV } from '../utils/theme';
import PlayerAvatar from './PlayerAvatar';
import { useDisplayName } from '../utils/playerName';
import { useLanguage } from '../hooks/useLanguage';

/**
 * RosterGrid — roster selection for the scout capture point.
 *
 * Two render variants (same data + handlers, byte-stable selection logic):
 *   'chips' (default) — the shipped horizontal-scroll chip row used in the
 *                       portrait editor + the !immersive paths. UNCHANGED.
 *   'grid'            — the landscape-rail "klocek V3" 2-col grid (design handoff
 *                       "Scout point — consolidated", §4). 32px avatar + SURNAME
 *                       (top) + #N + first name (bottom). It is a full-height card
 *                       (header + the only scroll inside the rail) so the host can
 *                       give it `flex:1`.
 *
 * The klocek is a simple 2-state on/off toggle = "who plays THIS point" (in /
 * out of the selected roster). Per-player alive/eliminated lives on the CANVAS
 * markers, NOT here — out of scope for this selection list.
 *
 * Amber (§27) is reserved for the active/selected state + the #number.
 */
export default function RosterGrid({
  roster, selected, onToggle, max = 5, heroPlayerIds = [],
  variant = 'chips', teamName,
}) {
  const dn = useDisplayName();
  const count = selected.length;
  const isFull = count >= max;

  if (variant === 'grid') {
    return (
      <RosterGridV3
        roster={roster} selected={selected} onToggle={onToggle}
        heroPlayerIds={heroPlayerIds}
        teamName={teamName} count={count} dn={dn}
      />
    );
  }

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

// ── Klocek V3 — landscape-rail 2-col grid (design handoff §4) ──────────────────
function RosterGridV3({ roster, selected, onToggle, heroPlayerIds, teamName, count, dn }) {
  const { t } = useLanguage();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
      background: ELEV.surface, border: `1px solid ${ELEV.hairline}`,
      borderRadius: 14, overflow: 'hidden', boxShadow: ELEV.innerTop,
    }}>
      {/* card header — "Lineup · {team}" + on-field count */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '10px 12px', borderBottom: `1px solid ${ELEV.hairline}`,
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: '1px',
          textTransform: 'uppercase', color: COLORS.textMuted,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>{t('scout_rail_lineup', teamName || '—')}</span>
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textDim,
          letterSpacing: '.4px', flexShrink: 0,
        }}>{t('scout_rail_on_field', count)}</span>
      </div>

      {/* the only scroll inside the rail */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', padding: 6,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, alignContent: 'start',
        WebkitOverflowScrolling: 'touch',
      }}>
        {roster.map(player => {
          const isOn = selected.includes(player.id);
          const isHero = heroPlayerIds.includes(player.id) || !!player.hero;

          // PII-aware split: operate on the already-formatted display name so
          // 'short' surname-truncation / nicknames are never bypassed.
          const tokens = String(dn(player) || '').trim().split(/\s+/).filter(Boolean);
          const surname = tokens.length ? tokens[tokens.length - 1] : '?';
          const firstName = tokens.length > 1 ? tokens.slice(0, -1).join(' ') : '';

          return (
            <div key={player.id} onClick={() => onToggle(player.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, minWidth: 0,
                padding: '5px 7px 5px 5px', borderRadius: 10, cursor: 'pointer',
                minHeight: 44,
                WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                background: isOn ? ELEV.raised : 'transparent',
                border: `1px solid ${isOn ? ELEV.hairlineStrong : 'transparent'}`,
                boxShadow: isOn ? `inset 0 0 0 1px ${COLORS.accent}28` : 'none',
                opacity: isOn ? 1 : 0.45,
              }}>
              <span style={{ flexShrink: 0, display: 'flex', filter: isOn ? 'none' : 'grayscale(0.65)' }}>
                <PlayerAvatar player={player} size={32} ringColor={isOn ? COLORS.accent : null} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{
                    flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 800,
                    color: COLORS.text, lineHeight: 1.1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{surname}</span>
                  {isHero && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent, flexShrink: 0 }} />
                  )}
                  <span style={{
                    flexShrink: 0, fontFamily: FONT_COND, fontSize: 11, fontWeight: 700,
                    color: isOn ? COLORS.accent : COLORS.textMuted,
                  }}>#{player.number}</span>
                </span>
                {firstName && (
                  <span style={{
                    display: 'block', fontFamily: FONT, fontSize: 9.5, fontWeight: 600,
                    letterSpacing: '.2px', color: COLORS.textMuted, lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{firstName}</span>
                )}
              </span>
              {isOn && (
                <span style={{
                  width: 6, height: 6, flexShrink: 0, borderRadius: '50%',
                  background: COLORS.accent, boxShadow: COLORS.accentGlow,
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
