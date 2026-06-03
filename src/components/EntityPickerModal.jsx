import React, { useState, useMemo } from 'react';
import { Modal } from './ui';
import PlayerAvatar from './PlayerAvatar';
import SearchFilterPanel from './SearchFilterPanel';
import { matchEntity } from '../utils/entityFilters';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

/**
 * EntityPickerModal — the shared add-to-event picker. SearchFilterPanel
 * (search → Liga → Dywizja) + a list that EXCLUDES already-added entities and
 * supports single or multi select. Filters are CONTROLLED by the caller (it owns
 * filter state + passes a `predicate` for derived division/league); search is
 * local/transient. Replaces the tripled modal-select + the 5 bespoke event
 * pickers so every picker filters identically.
 *
 * Props: open, onClose, title, items, fields, filters (for SearchFilterPanel),
 * predicate (extra (item)=>bool), excludeIds, multi, selectedIds, onPick (single),
 * onToggle (multi), renderItem? (item,{selected})=>node, emptyText?, note?
 * (optional caption under the panel — e.g. "descendants + retired excluded").
 */
export default function EntityPickerModal({
  open, onClose, title = 'Select',
  items = [], fields = ['name', 'nickname', 'number'],
  filters = [], predicate,
  excludeIds = [], multi = false, selectedIds = [],
  onPick, onToggle, renderItem, emptyText = 'No matches', note,
}) {
  const [search, setSearch] = useState('');
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);
  const sel = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filtered = useMemo(
    () => items.filter(it => !exclude.has(it.id) && matchEntity(search, it, fields) && (!predicate || predicate(it))),
    [items, exclude, search, fields, predicate],
  );

  const defaultRow = (it, selected) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
      <PlayerAvatar player={it} size={28} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {it.nickname || it.name || '—'}{it.number ? ` · #${it.number}` : ''}
      </span>
      {selected ? <span style={{ color: COLORS.accent, fontWeight: 800 }}>✓</span> : null}
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
        <SearchFilterPanel search={search} onSearchChange={setSearch} filters={filters} />
        {note ? (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>{note}</div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '50vh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: SPACE.lg, textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{emptyText}</div>
          ) : filtered.map(it => {
            const selected = sel.has(it.id);
            return (
              <div key={it.id}
                onClick={() => { if (multi) onToggle?.(it.id); else { onPick?.(it.id); onClose?.(); } }}
                style={{
                  padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.md,
                  minHeight: TOUCH.minTarget, cursor: 'pointer',
                  background: selected ? `${COLORS.accent}14` : COLORS.surfaceDark,
                  border: `1px solid ${selected ? COLORS.accent : COLORS.border}`,
                }}>
                {renderItem ? renderItem(it, { selected }) : defaultRow(it, selected)}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
