import { useRef, useState, useEffect } from 'react';

/**
 * useWide(threshold) — container-query hook (premium "North Star" redesign).
 *
 * Returns `[ref, wide]`: attach `ref` to an element; `wide` is `true` when that
 * element's measured width is >= `threshold` (px), tracked live via ResizeObserver.
 *
 * Ported verbatim from the prototype (`prototype/redesign6.jsx`). The *Wide screens
 * use this to pick their OWN internal layout (column count, rails, master-detail
 * split) from their container width — so a screen renders the same whether it sits
 * in the wide shell's detail pane or full-bleed. Distinct from the viewport-level
 * shell switch (mobile bottom-tab vs `AppShellPremiumWide`), which keys off device.
 *
 * Defaults to `wide = true` so SSR/first-paint assume the roomy layout (the prototype
 * convention); the first ResizeObserver tick corrects it within a frame.
 */
export function useWide(threshold) {
  const ref = useRef(null);
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWide(el.offsetWidth >= threshold));
    ro.observe(el);
    setWide(el.offsetWidth >= threshold);
    return () => ro.disconnect();
  }, [threshold]);
  return [ref, wide];
}
