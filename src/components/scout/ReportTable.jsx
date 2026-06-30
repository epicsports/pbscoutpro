import React from 'react';
import { COLORS, FONT } from '../../utils/theme';

/**
 * ReportTable — the shared scouting-report table primitive (audit finding #1).
 *
 * ScoutedTeamPage carried ~5 near-identical report tables (Rozbiegi, Strzały,
 * Elimination-reasons, Callout-zones, Key-players) that each re-built the SAME
 * idiom by hand: a `surfaceDark` rounded container, a `surface` header strip
 * with 9px/700 uppercase muted right-aligned cells, semantic per-cell colours,
 * and `flex` body rows separated by `surface` hairlines. This consolidates that
 * idiom into ONE column-config-driven primitive — display-only, zero compute.
 *
 * The Rozbiegi @390 clip-fix is folded in as the DEFAULT column behaviour:
 *   • fixed-width columns get `flexShrink:0` (never collapse on phone),
 *   • the flex (name) column gets `flex:1 + minWidth:0` (absorbs the shrink),
 *   • every header cell gets overflow+ellipsis (a long localized label can
 *     never spill into the neighbouring column).
 * So NO table clips a column at 390px, regardless of label length.
 *
 * Column config — `columns={[{ key, label, width, flex, align, headStyle,
 * headTestId, cellStyle, cellTestId, render, show }]}`:
 *   key        unique id (also the value accessor when no `render`).
 *   label      header text/node. Omitted on header-less tables (showHeader=false).
 *   width      px → fixed-width cell (flexShrink:0). Omit + flex → the name col.
 *              Omit both → an intrinsic-width, shrink:0 cell (e.g. the +/- block).
 *   flex       true → flex:1 + minWidth:0 (the clipping name column).
 *   align      'left' | 'center' | 'right' → textAlign.
 *   headStyle  per-column header-cell style override.
 *   headTestId data-testid on the header cell.
 *   cellStyle  body-cell style; object OR (row,i)=>object (for semantic colour).
 *   cellTestId data-testid on the body cell; string OR (row,i)=>string.
 *   render     (row,i)=>node — cell content (default: row[key]).
 *   show       false → column omitted entirely (e.g. the roster-only column).
 *
 * Row config — `rowKey`, `rowTestId`, `rowStyle((row,i)=>style)`, `onRowClick`
 * (adds cursor:pointer), and `belowRow((row,i)=>node)` for a second line under
 * the flex row (the callout player chips). Section chrome — CollapsibleSection
 * wrappers, reliability/weak-data banners, footer notes — stays in the page;
 * this renders ONLY the table container.
 */

// Shared header text idiom: 9px/700 uppercase muted, with the Rozbiegi
// clip-guard (overflow+ellipsis) folded in as the default for EVERY table.
const HEADER_TEXT = {
  fontFamily: FONT, fontSize: 9, fontWeight: 700, color: COLORS.textMuted,
  letterSpacing: 0.6, textTransform: 'uppercase',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};

// Per-column layout — fixed width ⇒ flexShrink:0 (the @390 clip-fix); flex ⇒
// flex:1 + minWidth:0 (absorbs shrink, clips via ellipsis in its own cellStyle);
// neither ⇒ an intrinsic-width shrink:0 column.
function layoutStyle(col) {
  if (col.flex) return { flex: 1, minWidth: 0 };
  if (col.width != null) return { width: col.width, flexShrink: 0 };
  return { flexShrink: 0 };
}

const alignStyle = (col) => (col.align ? { textAlign: col.align } : null);

export default function ReportTable({
  columns = [],
  rows = [],
  rowKey,
  gap = 8,
  showHeader = false,
  headStyle,
  rowPadding = '10px 14px',
  rowStyle,
  onRowClick,
  rowTestId,
  belowRow,
  containerStyle,
  containerTestId,
}) {
  const cols = columns.filter((c) => c && c.show !== false);
  const usesBelow = !!belowRow;

  const renderCells = (row, i) =>
    cols.map((col, ci) => {
      const tid = typeof col.cellTestId === 'function' ? col.cellTestId(row, i) : col.cellTestId;
      const cs = typeof col.cellStyle === 'function' ? col.cellStyle(row, i) : col.cellStyle;
      return (
        <div
          key={col.key ?? ci}
          data-testid={tid}
          style={{ ...layoutStyle(col), ...alignStyle(col), ...cs }}
        >
          {col.render ? col.render(row, i) : row[col.key]}
        </div>
      );
    });

  return (
    <div
      data-testid={containerTestId}
      style={{
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.surfaceLight}`,
        borderRadius: 12,
        overflow: 'hidden',
        ...containerStyle,
      }}
    >
      {showHeader && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap,
            padding: '8px 14px', background: COLORS.surface,
            borderBottom: `1px solid ${COLORS.surfaceLight}`,
          }}
        >
          {cols.map((col, ci) => (
            <div
              key={col.key ?? ci}
              data-testid={col.headTestId}
              style={{ ...layoutStyle(col), ...alignStyle(col), ...HEADER_TEXT, ...headStyle, ...col.headStyle }}
            >
              {col.label}
            </div>
          ))}
        </div>
      )}

      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        const tid = rowTestId ? rowTestId(row, i) : undefined;
        const extra = rowStyle ? rowStyle(row, i) : null;
        const sep = { borderBottom: last ? 'none' : `1px solid ${COLORS.surface}` };
        const click = onRowClick ? { onClick: () => onRowClick(row, i) } : null;
        const cursor = onRowClick ? { cursor: 'pointer' } : null;

        if (usesBelow) {
          const below = belowRow(row, i);
          return (
            <div
              key={rowKey ? rowKey(row, i) : i}
              data-testid={tid}
              {...click}
              style={{ padding: rowPadding, ...sep, ...cursor, ...extra }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap, marginBottom: below ? 6 : 0 }}>
                {renderCells(row, i)}
              </div>
              {below}
            </div>
          );
        }

        return (
          <div
            key={rowKey ? rowKey(row, i) : i}
            data-testid={tid}
            {...click}
            style={{ display: 'flex', alignItems: 'center', gap, padding: rowPadding, ...sep, ...cursor, ...extra }}
          >
            {renderCells(row, i)}
          </div>
        );
      })}
    </div>
  );
}
