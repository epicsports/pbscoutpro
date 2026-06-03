import React from 'react';
import SearchField from './SearchField';
import FilterBar from './FilterBar';
import { SPACE } from '../utils/theme';

/**
 * SearchFilterPanel — the ONE unified search + filter panel. Canonical order:
 * search → Liga → Dywizja → extras (the caller passes `filters` already in that
 * order). Device-agnostic, theme tokens only. Used by list screens AND (via
 * EntityPickerModal) the add-to-event pickers so they filter identically.
 *
 * State is owned by the caller (lists URL-back it; pickers keep it local).
 * Pair with `matchEntity` + the derived division/league resolvers
 * (utils/entityFilters) for the actual filtering.
 */
export default function SearchFilterPanel({
  search = '', onSearchChange, searchPlaceholder,
  filters = [], style,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, ...style }}>
      <SearchField value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      <FilterBar filters={filters} />
    </div>
  );
}
