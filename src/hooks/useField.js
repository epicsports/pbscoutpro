/**
 * useField — resolves field data from tournament + layouts
 * Replaces repeated resolveField/resolveFieldFull calls across pages
 */
import { useMemo } from 'react';
import { resolveField, resolveFieldFull } from '../utils/helpers';

export function useField(tournament, layouts, full = false) {
  return useMemo(() => {
    if (!tournament || !layouts) return {};
    return full ? resolveFieldFull(tournament, layouts) : resolveField(tournament, layouts);
  }, [tournament, layouts, full]);
}
