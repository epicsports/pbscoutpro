import React from 'react';
import { Plus } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, ZONE_COLORS, FONT, FONT_SIZE, RADIUS } from '../../utils/theme';

/**
 * BunkerPickerGrid — shared 2-column grid for Steps 1 (breakout, single)
 * and 3 (shots, multi). Cell visual matches § 48.3 spec: 88px cells with
 * side label (colored per § 34) + 20px position name + optional freq%
 * top-right (hidden when selected) + optional order badge top-right
 * (multi-select mode).
 *
 * Props:
 *   cells          — [{ positionName, side, freqPct? }]
 *   selectedId     — single-select: selected positionName (or null)
 *   selectedOrders — multi-select: Map<positionName, number> (order 1..N)
 *     Pass exactly one of selectedId / selectedOrders. selectedOrders
 *     being a Map switches the cell chrome to order-badge mode.
 *   onTap          — (bunker) ⇒ void
 *   showInneChip   — if true, render the dashed "Inne bunkry" chip
 *   onInneTap      — handler for the chip
 *   inneLabel      — translated label (caller passes t('ppt_inne_bunkers'))
 */

export function BunkerCell({ bunker, selected, freqPct, orderBadge, onTap }) {
  const sideLabel = (bunker.side || '').toUpperCase();
  const showFreq = freqPct != null && !selected;
  return (
    <div
      onClick={onTap}
      role="button"
      style={{
        minHeight: 88,
        borderRadius: RADIUS.lg,
        border: `2px solid ${selected ? COLORS.accent : COLORS.border}`,
        background: selected ? `${COLORS.accent}10` : COLORS.surfaceDark,
        boxShadow: selected ? `0 0 0 4px ${COLORS.accent}1f` : 'none',
        padding: 12,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color .12s, background .12s, box-shadow .12s',
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
      {showFreq && (
        <div style={{
          position: 'absolute', top: 10, right: 12,
          fontFamily: FONT, fontSize: 10, fontWeight: 700,
          color: COLORS.textMuted,
        }}>
          {freqPct}%
        </div>
      )}
      {orderBadge != null && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 26, height: 26, borderRadius: '50%',
          background: COLORS.accent, color: COLORS.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: 14, fontWeight: 800,
        }}>
          {orderBadge}
        </div>
      )}
    </div>
  );
}

export default function BunkerPickerGrid({
  cells,
  selectedId = null,
  selectedOrders = null,
  onTap,
  showInneChip = false,
  onInneTap,
  inneLabel,
}) {
  const { t } = useLanguage();
  const isMultiMode = selectedOrders instanceof Map;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {cells.map(b => {
        const singleSelected = !isMultiMode && b.positionName === selectedId;
        const orderIdx = isMultiMode ? selectedOrders.get(b.positionName) : null;
        const selected = singleSelected || orderIdx != null;
        return (
          <BunkerCell
            key={b.id || b.positionName}
            bunker={b}
            selected={selected}
            freqPct={b.freqPct}
            orderBadge={orderIdx != null ? orderIdx : null}
            onTap={() => onTap(b)}
          />
        );
      })}
      {showInneChip && (
        <div
          onClick={onInneTap}
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
          <Plus size={16} strokeWidth={2.5} /> {inneLabel || t('ppt_inne_bunkers')}
        </div>
      )}
    </div>
  );
}
