import { useState, useEffect } from 'react';

/**
 * arc C — `prefers-reduced-motion: reduce` tracker. Returns true when the user
 * has asked the OS to minimize motion; consumed by withViewTransition callers
 * and <Skeleton>/animation surfaces so motion is suppressed for them.
 *
 * SSR/no-matchMedia safe (returns false). Subscribes to media-query changes
 * (with the legacy addListener fallback for older Safari).
 */
const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setReduced(e.matches);
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else mq.addListener(onChange); // Safari < 14
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  return reduced;
}
