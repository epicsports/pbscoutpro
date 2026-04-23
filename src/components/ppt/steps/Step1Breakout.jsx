import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, ZONE_COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../../utils/theme';
import { getBunkerSide } from '../../../utils/helpers';
import { getPlayerBreakoutFrequencies } from '../../../services/playerPerformanceTrackerService';

/**
 * Step 1 — breakout bunker picker. See DESIGN_DECISIONS § 48.3 Step 1
 * and § 48.6 adaptive thresholds.
 *
 * Bootstrap (fewer than 5 player logs): show ALL layout bunkers, sorted
 * snake → center → dorito, no freq. No "Inne" chip — every bunker visible.
 *
 * Mature (≥ 5 player logs): show top 6 by frequency + "Inne bunkry"
 * chip → bottom sheet with remaining bunkers. Each cell shows "{pct}%".
 *
 * Aggregation runs on mount per § 48.6 — while loading, bootstrap render
 * keeps the step usable. Graceful degradation if the getDocs call fails.
 */

const SIDE_ORDER = { snake: 0, center: 1, dorito: 2 };

function bunkerListFromLayout(layout) {
  if (!layout?.bunkers) return [];
  const doritoSide = layout.doritoSide || 'top';
  return layout.bunkers
    .filter(b => b.role !== 'mirror')
    .map(b => ({
      ...b,
      side: getBunkerSide(b.x, b.y, doritoSide),
    }))
    .filter(b => b.positionName); // skip anonymous bunkers
}

function BunkerCell({ bunker, selected, freqPct, onTap }) {
  const sideLabel = (bunker.side || '').toUpperCase();
  return (
    <div
      onClick={onTap}
      role="button"
      style={{
        minHeight: 88,
        borderRadius: RADIUS.lg,
        border: `2px solid ${selected ? COLORS.accent : COLORS.border}`,
        background: selected ? `${COLORS.accent}10` : COLORS.surfaceDark,
        padding: 12,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color .12s, background .12s',
      }}
    >
      <div style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 700,
        letterSpacing: 0.6, textTransform: 'uppercase',
        color: ZONE_COLORS[bunker.side] || COLORS.textMuted,
      }}>
        {sideLabel}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 20, fontWeight: 800,
        letterSpacing: '-0.5px',
        color: selected ? COLORS.accent : COLORS.text,
      }}>
        {bunker.positionName}
      </div>
      {freqPct != null && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          fontFamily: FONT, fontSize: 10, fontWeight: 700,
          color: COLORS.textMuted,
        }}>
          {freqPct}%
        </div>
      )}
    </div>
  );
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

  // Mature mode: join freq.top with bunker records by positionName so we
  // have side + coords for rendering. Drop frequencies that don't match
  // any current-layout bunker (stale names from renamed bunkers etc).
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          {cells.map(b => (
            <BunkerCell
              key={b.id || b.positionName}
              bunker={b}
              selected={b.positionName === selectedName}
              freqPct={b.freqPct}
              onTap={() => pickBunker(b)}
            />
          ))}

          {freq.mature && innerBunkers.length > 0 && (
            <div
              onClick={() => setInnerOpen(true)}
              role="button"
              style={{
                gridColumn: '1 / -1',
                minHeight: 64,
                borderRadius: RADIUS.lg,
                border: `2px dashed ${COLORS.borderLight}`,
                background: 'transparent',
                color: COLORS.textDim,
                fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Plus size={16} strokeWidth={2.5} /> {t('ppt_inne_bunkers')}
            </div>
          )}
        </div>
      )}

      <Modal
        open={innerOpen}
        onClose={() => setInnerOpen(false)}
        title={t('ppt_inne_bunkers')}
      >
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          {innerBunkers.map(b => (
            <BunkerCell
              key={b.id || b.positionName}
              bunker={b}
              selected={b.positionName === selectedName}
              onTap={() => pickBunker(b)}
            />
          ))}
          {innerBunkers.length === 0 && (
            <div style={{
              gridColumn: '1 / -1', padding: SPACE.md, textAlign: 'center',
              fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            }}>
              —
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
