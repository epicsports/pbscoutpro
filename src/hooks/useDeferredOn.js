import { useState, useEffect } from 'react';

/**
 * useDeferredOn(active, delay = 300) — returns true only once `active` has stayed
 * true continuously for `delay` ms. Anti-flicker gate for the Preloader: a heavy
 * screen that resolves from a warm cache in <300ms never flashes the loader.
 * Resets the instant `active` goes false.
 */
export function useDeferredOn(active, delay = 300) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!active) { setHeld(false); return undefined; }
    const id = setTimeout(() => setHeld(true), delay);
    return () => clearTimeout(id);
  }, [active, delay]);
  return active && held;
}
