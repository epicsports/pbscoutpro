import { useMemo } from 'react';
import { useTournaments, useTrainings, useLayouts } from './useFirestore';

/**
 * useLayoutScope — given a layoutId, return the layout itself and every
 * tournament / training session that references it.
 *
 * Used by stats pages that want to aggregate across multiple events sharing
 * the same field layout (e.g. "all results on NXL Tampa 2026").
 */
export function useLayoutScope(layoutId) {
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();
  return useMemo(() => {
    const layout = layouts.find(l => l.id === layoutId) || null;
    const scopedTournaments = layoutId
      ? tournaments.filter(t => t.layoutId === layoutId)
      : [];
    const scopedTrainings = layoutId
      ? trainings.filter(t => t.layoutId === layoutId)
      : [];
    return { layout, tournaments: scopedTournaments, trainings: scopedTrainings };
  }, [layoutId, tournaments, trainings, layouts]);
}
