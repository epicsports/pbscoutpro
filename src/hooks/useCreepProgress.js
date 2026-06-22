import { useState, useEffect } from 'react';

/**
 * useCreepProgress(active, { target, stepMs }) — creep-and-snap progress for a
 * single-boolean load (no granular stages). While `active`, eases toward `target`
 * (<100) so the bar visibly moves; the moment `active` goes false it snaps to 100
 * — so the Preloader still reflects REAL completion, not a blind timer. Pair with
 * the Preloader's `progress` prop and `useDeferredOn` for anti-flicker.
 */
export function useCreepProgress(active, { target = 90, stepMs = 90 } = {}) {
  const [p, setP] = useState(active ? 0 : 100);
  useEffect(() => {
    if (!active) { setP(100); return undefined; }
    setP(0);
    let cur = 0;
    const id = setInterval(() => {
      cur = Math.min(target, cur + (target - cur) * 0.08 + 0.6); // ease toward target
      setP(Math.round(cur));
    }, stepMs);
    return () => clearInterval(id);
  }, [active, target, stepMs]);
  return p;
}
