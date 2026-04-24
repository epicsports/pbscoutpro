import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../../../utils/theme';
import { getBunkerSide } from '../../../utils/helpers';
import { getPlayerBreakoutFrequencies } from '../../../services/playerPerformanceTrackerService';
import BunkerPickerGrid from '../BunkerPickerGrid';

/**
 * Step 1 — breakout bunker picker. See DESIGN_DECISIONS § 48.3 Step 1
 * and § 48.6 adaptive thresholds.
 *
 * Bootstrap (fewer than 5 player logs): show ALL layout bunkers sorted
 * snake → center → dorito, no freq. No "Inne" chip — every bunker visible.
 *
 * Mature (≥ 5 player logs): show top 6 by player-history frequency with
 * "{pct}%" on each cell + "Inne bunkry" chip → bottom sheet for the rest.
 *
 * Aggregation fires once on mount; bootstrap is the fallback while loading
 * and on query error (§ 48.6 graceful degradation).
 */

const SIDE_ORDER = { snake: 0, center: 1, dorito: 2 };

// Defensive dedupe by positionName — mirrors the Step 3 fix from the
// 2026-04-24 sticky-training hotfix. Some layouts carry duplicate entries
// per bunker name (legacy docs without a `role` field, BunkerEditorPage's
// master+mirror persistence pattern with shared positionName). Step 1's
// mature path already dedupes via the byName Map in `top6`, but bootstrap
// (cells = sortedBunkers) needs the same defense to avoid twin cells.
function bunkerListFromLayout(layout) {
  if (!layout?.bunkers) return [];
  const doritoSide = layout.doritoSide || 'top';
  const seen = new Map();
  for (const b of layout.bunkers) {
    if (b.role === 'mirror') continue;
    if (!b.positionName) continue;
    if (seen.has(b.positionName)) continue;
    seen.set(b.positionName, { ...b, side: getBunkerSide(b.x, b.y, doritoSide) });
  }
  return Array.from(seen.values());
}

export default function Step1Breakout({ state, advance, layout, playerId }) {
  const { t } = useLanguage();
  const [innerOpen, setInnerOpen] = useState(false);
  const [freq, setFreq] = useState({ mature: false, total: 0, top: [] });

  useEffect(() => {
    let cancelled = false;
    if (!playerId) return;
    getPlayerBreakoutFrequencies(playerId)
      .then(r => { if (!cancelled) setFreq(r); })
      .catch(() => { /* bootstrap fallback */ });
    return () => { cancelled = true; };
  }, [playerId]);

  const allBunkers = useMemo(() => bunkerListFromLayout(layout), [layout]);
  const sortedBunkers = useMemo(() =>
    [...allBunkers].sort((a, b) => {
      const ra = SIDE_ORDER[a.side] ?? 99;
      const rb = SIDE_ORDER[b.side] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.positionName || '').localeCompare(b.positionName || '');
    }),
  [allBunkers]);

  // Mature: join freq.top with bunker records by positionName. Stale entries
  // (frequency recorded before a bunker was renamed) silently drop.
  const top6 = useMemo(() => {
    if (!freq.mature) return [];
    const byName = new Map(allBunkers.map(b => [b.positionName, b]));
    return freq.top
      .map(f => {
        const b = byName.get(f.bunker);
        return b ? { ...b, freqPct: f.pct } : null;
      })
      .filter(Boolean)
      .slice(0, 6);
  }, [freq, allBunkers]);

  const cells = freq.mature ? top6 : sortedBunkers;

  const innerBunkers = useMemo(() => {
    if (!freq.mature) return [];
    const topNames = new Set(top6.map(b => b.positionName));
    return sortedBunkers.filter(b => !topNames.has(b.positionName));
  }, [sortedBunkers, top6, freq.mature]);

  const pickBunker = (b) => {
    setInnerOpen(false);
    advance({ breakout: { side: b.side, bunker: b.positionName } });
  };

  const layoutName = layout?.name || '';
  const hintText = freq.mature
    ? t('ppt_step1_hint_mature', layoutName)
    : t('ppt_step1_hint_bootstrap', layoutName);

  const selectedName = state.breakout?.bunker;

  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step1_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {hintText}
      </div>

      {cells.length === 0 ? (
        <div style={{
          padding: SPACE.xl, textAlign: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          fontStyle: 'italic',
        }}>
          {t('ppt_step1_no_bunkers')}
        </div>
      ) : (
        <BunkerPickerGrid
          cells={cells}
          selectedId={selectedName}
          onTap={pickBunker}
          showInneChip={freq.mature && innerBunkers.length > 0}
          onInneTap={() => setInnerOpen(true)}
        />
      )}

      <Modal open={innerOpen} onClose={() => setInnerOpen(false)} title={t('ppt_inne_bunkers')}>
        {innerBunkers.length === 0 ? (
          <div style={{
            padding: SPACE.md, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>—</div>
        ) : (
          <BunkerPickerGrid cells={innerBunkers} selectedId={selectedName} onTap={pickBunker} />
        )}
      </Modal>
    </div>
  );
}
