import { COLORS, FONT } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { usePlayers } from '../hooks/useFirestore';
import PlayerAvatar from './PlayerAvatar';

/**
 * LineupStatsSection — pair & trio win rates grouped by side.
 * Fed by `computeLineupStats()` from generateInsights.js.
 *
 * Hidden when the array is empty (no combos met the played >= 3 threshold).
 */
export default function LineupStatsSection({ lineupStats }) {
  const { t } = useLanguage();
  const { players } = usePlayers();
  if (!lineupStats?.length) return null;

  const dPairs = lineupStats.filter(l => l.type === 'pair' && l.side === 'D');
  const sPairs = lineupStats.filter(l => l.type === 'pair' && l.side === 'S');
  const dTrios = lineupStats.filter(l => l.type === 'trio' && l.side === 'D');
  const sTrios = lineupStats.filter(l => l.type === 'trio' && l.side === 'S');

  if (!dPairs.length && !sPairs.length && !dTrios.length && !sTrios.length) return null;

  return (
    <>
      <div style={{ padding: '12px 16px 4px' }}>
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600,
          color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>
          {t('lineup_title')}
        </span>
      </div>
      {dPairs.length > 0 && (
        <LineupGroup label={t('lineup_dorito_pairs')} items={dPairs} color="#fb923c" players={players} />
      )}
      {sPairs.length > 0 && (
        <LineupGroup label={t('lineup_snake_pairs')} items={sPairs} color="#22d3ee" players={players} />
      )}
      {dTrios.length > 0 && (
        <LineupGroup label={t('lineup_dorito_trios')} items={dTrios} color="#fb923c" showCenter players={players} />
      )}
      {sTrios.length > 0 && (
        <LineupGroup label={t('lineup_snake_trios')} items={sTrios} color="#22d3ee" showCenter players={players} />
      )}
    </>
  );
}

function LineupGroup({ label, items, color, showCenter, players }) {
  const { t } = useLanguage();
  return (
    <div style={{
      margin: '0 16px 8px', background: COLORS.surfaceDark,
      border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px 4px', borderBottom: '1px solid #111827',
        fontFamily: FONT, fontSize: 10, fontWeight: 600,
        color, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {label}
      </div>
      {items.slice(0, 5).map((item, i) => {
        const wr = item.winRate;
        const wrColor = wr >= 60 ? COLORS.success : wr >= 45 ? COLORS.accent : COLORS.danger;
        const lookupPlayer = (pid) => players?.find(p => p.id === pid) || null;
        const pairPlayers = (item.pids || []).map(lookupPlayer).filter(Boolean);
        const centerPlayer = item.centerPid ? lookupPlayer(item.centerPid) : null;
        return (
          <div key={item.key} style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '12px 14px',
            borderBottom: i < items.length - 1 ? '1px solid #111827' : 'none',
            opacity: item.lowSample ? 0.65 : 1,
          }}>
            {/* Pair / trio chips row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              {pairPlayers.map((p, idx) => (
                <PlayerChip key={p.id} player={p} dim={item.lowSample}
                  trailing={idx < pairPlayers.length - 1 ? '+' : null} />
              ))}
              {centerPlayer && (
                <>
                  <span style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>+</span>
                  <PlayerChip player={centerPlayer} dim={item.lowSample} centerHint />
                </>
              )}
            </div>
            {/* Win rate row: bar + % + sample */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 44px',
              alignItems: 'center', gap: 10,
            }}>
              <div style={{ height: 6, background: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${wr}%`, background: wrColor, borderRadius: 3 }} />
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 500,
                color: COLORS.textMuted, textAlign: 'right',
              }}>
                {t('lineup_pts', item.played)}{item.lowSample ? ` · ${t('lineup_low_sample')}` : ''}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: 14, fontWeight: 800,
                color: wrColor, textAlign: 'right',
              }}>
                {wr}%
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayerChip({ player, dim, trailing, centerHint }) {
  return (
    <>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 10px 3px 3px', borderRadius: 18,
        background: dim ? `${COLORS.surfaceLight}60` : COLORS.surfaceLight,
        border: `1px solid ${COLORS.border}`,
      }}>
        <PlayerAvatar player={player} size={28} />
        {player.number && (
          <span style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 800,
            color: centerHint ? COLORS.textDim : COLORS.accent,
            letterSpacing: '-0.2px',
          }}>#{player.number}</span>
        )}
        <span style={{
          fontFamily: FONT, fontSize: 12, fontWeight: 600,
          color: COLORS.text,
          whiteSpace: 'nowrap',
        }}>
          {player.nickname || player.name || '?'}
        </span>
      </div>
      {trailing && (
        <span style={{ color: COLORS.textMuted, fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>{trailing}</span>
      )}
    </>
  );
}
