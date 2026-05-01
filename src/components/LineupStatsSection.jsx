import React from 'react';
import { COLORS, FONT } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { usePlayers } from '../hooks/useFirestore';
import { winRateColor } from '../utils/colorScale';
import { DataSourcePill } from './ui';
import PlayerAvatar from './PlayerAvatar';

/**
 * LineupStatsSection — § 59.5 chemistry sections.
 *
 * Two surfaces, both with overlapping-avatar cards (sub-variant of BarRow):
 *   "Najlepiej gra w duecie z:"  — pairs (top by winRate)
 *   "Najlepiej gra w trójce z:"  — trios (top by winRate)
 *
 * Avatar pattern (§ 59.5): each player avatar 40px, 2px border = card bg
 * (creates a cutout), `margin-left: -10px` from the second avatar onward,
 * z-index high → low so the first avatar visually sits on top. Bg color
 * comes from `getPlayerColor(player, idx)` per § 59.5; falls back to
 * COLORS.surfaceLight (slate).
 *
 * Right column: big % (winRateColor) + "N punktów" sublabel.
 *
 * Pre-§ 59 grouping (Dorito pairs / Snake pairs / Dorito trios / Snake
 * trios) is collapsed: brief calls for two sections only ("duo" / "trio")
 * sorted by winRate. The side dimension was redundant noise per § 59.2
 * "descriptive verb-phrases over abstract nouns".
 *
 * Hidden when the input array is empty.
 */
export default function LineupStatsSection({ lineupStats, t: tProp }) {
  const { t: tHook } = useLanguage();
  const { players } = usePlayers();
  const t = tProp || tHook;
  if (!lineupStats?.length) return null;

  // Sort each by winRate desc, take top 3 — § 59.10 "≤3 chemistry cards".
  const pairs = lineupStats.filter(l => l.type === 'pair').sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  const trios = lineupStats.filter(l => l.type === 'trio').sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  if (!pairs.length && !trios.length) return null;

  const lookup = (pid) => players?.find(p => p.id === pid) || null;

  return (
    <>
      {pairs.length > 0 && (
        <ChemistrySection title={t('stats_najlepiej_w_duecie')} items={pairs} lookup={lookup} t={t} />
      )}
      {trios.length > 0 && (
        <ChemistrySection title={t('stats_najlepiej_w_trojce')} items={trios} lookup={lookup} t={t} />
      )}
    </>
  );
}

function ChemistrySection({ title, items, lookup, t }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '0 2px 8px',
      }}>
        <span style={{
          fontFamily: FONT, fontSize: 13, fontWeight: 700,
          color: COLORS.text, letterSpacing: '-0.1px',
        }}>{title}</span>
        {/* § 59.6: chemistry sections are scout-only — Phase 1b unlocks
            self-log lineup pairing inferred from synth-pairs in self-log. */}
        <DataSourcePill source="scout-only" t={t} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => {
          const memberPids = [...(item.pids || []), ...(item.centerPid ? [item.centerPid] : [])];
          const members = memberPids.map(lookup).filter(Boolean);
          return (
            <ChemistryCard key={item.key}
              members={members}
              winRate={item.winRate}
              played={item.played}
              dim={item.lowSample}
              t={t}
            />
          );
        })}
      </div>
    </div>
  );
}

// § 59.5 — overlapping-avatar card.
function ChemistryCard({ members, winRate, played, dim, t }) {
  const wrColor = winRateColor(winRate);
  const stackWidth = members.length === 0
    ? 0
    : 40 + Math.max(0, members.length - 1) * 30; // 40px first, then +30 per overlap
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', minHeight: 60,
      background: COLORS.surfaceDark,
      border: '1px solid #1a2234',
      borderRadius: 10,
      opacity: dim ? 0.65 : 1,
    }}>
      {/* Avatar stack — 40px circles, -10px overlap, z-index high→low.
          Hotfix 2026-05-02 (Issue #2): canonical <PlayerAvatar> renders
          the photoURL when present, falls back to initial+stable color
          when not. Wrapper div keeps the absolute-position overlap +
          cutout border (PlayerAvatar's `ringColor` paints the 2px ring
          in card-bg color, hiding the underlying circle edge). */}
      <div style={{
        position: 'relative', display: 'inline-flex',
        width: stackWidth, height: 40, flexShrink: 0,
      }}>
        {members.map((p, i) => (
          <div key={p.id} style={{
            position: 'absolute', left: i * 30,
            zIndex: members.length - i,
          }}>
            <PlayerAvatar player={p} size={40} ringColor={COLORS.surfaceDark} />
          </div>
        ))}
      </div>
      {/* Middle column — names + mini bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: members.length >= 3 ? 13 : 14,
          fontWeight: 600, color: COLORS.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {members.map(m => m.nickname || m.name).join(' + ')}
        </div>
        <div style={{
          marginTop: 6, height: 4, background: COLORS.surfaceLight,
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${Math.max(0, Math.min(100, winRate))}%`,
            background: wrColor,
          }} />
        </div>
      </div>
      {/* Right column — big % + N punktów */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: 2, minWidth: 80,
      }}>
        <span style={{
          fontFamily: FONT, fontSize: 18, fontWeight: 800,
          color: wrColor, letterSpacing: '-0.02em',
        }}>{winRate}%</span>
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 500,
          color: COLORS.textDim,
        }}>
          {(t && t('stats_punktow', played)) || `${played} pkt`}
        </span>
      </div>
    </div>
  );
}
