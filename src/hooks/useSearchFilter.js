import { useMemo } from 'react';
import { matchEntity } from '../utils/entityFilters';

/**
 * useSearchFilter — shared filter → sort → paginate pipeline for list screens.
 * Pure (no URL): the caller owns state (and URL-backing on lists, via
 * useSearchParams). `predicate` carries the structured filters (e.g. derived
 * division/league via utils/entityFilters). Returns {filtered, sorted, paged,
 * total, totalPages}.
 */
export function useSearchFilter({
  items = [], search = '', fields = ['name', 'nickname', 'number'],
  predicate, sort, page = 0, pageSize = 0,
}) {
  const filtered = useMemo(
    () => items.filter(it => matchEntity(search, it, fields) && (!predicate || predicate(it))),
    [items, search, fields, predicate],
  );
  const sorted = useMemo(() => (sort ? [...filtered].sort(sort) : filtered), [filtered, sort]);
  const total = sorted.length;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const paged = useMemo(() => {
    if (pageSize <= 0) return sorted;
    const safe = Math.min(Math.max(0, page), totalPages - 1);
    return sorted.slice(safe * pageSize, safe * pageSize + pageSize);
  }, [sorted, page, pageSize, totalPages]);
  return { filtered, sorted, paged, total, totalPages };
}
