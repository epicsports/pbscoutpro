import { useState, useEffect, useCallback } from 'react';
import { useDeferredOn } from './useDeferredOn';
import { useCreepProgress } from './useCreepProgress';

/**
 * useScreenLoader(active, opts) — lifecycle glue for the premium <Preloader> on a
 * heavy screen. Combines:
 *   - anti-flicker (useDeferredOn 300ms — a warm-cache load never flashes the loader)
 *   - progress: pass `opts.progress` for REAL staged progress (e.g. fetch→compute→
 *     render), or omit it to get creep-and-snap from the single `active` boolean.
 *   - a sticky `shown` that stays true through the Preloader's ~820ms finish-hold so
 *     `onDone` (→ `close`) reveals the content after the flourish, not the instant
 *     loading flips false.
 *
 * Returns { shown, progress, close }. Render the Preloader while `shown`, pass
 * `progress`, and wire `onDone={close}`.
 */
export function useScreenLoader(active, { progress: staged = null, ...creepOpts } = {}) {
  const creep = useCreepProgress(staged == null && active, creepOpts);
  const progress = staged == null ? creep : staged;
  const armed = useDeferredOn(active, 300);
  const [shown, setShown] = useState(false);
  useEffect(() => { if (armed) setShown(true); }, [armed]);
  const close = useCallback(() => setShown(false), []);
  return { shown, progress, close };
}
