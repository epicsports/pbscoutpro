import { useState, useEffect, useCallback } from 'react';

/**
 * useWide(threshold) — container-query hook (premium "North Star" redesign).
 *
 * Returns `[ref, wide]`: attach `ref` to an element; `wide` is `true` when that
 * element's measured width is >= `threshold` (px), tracked live via ResizeObserver.
 *
 * Ported from the prototype (`prototype/redesign6.jsx`). The *Wide screens use this
 * to pick their OWN internal layout (column count, rails, master-detail split) from
 * their container width — so a screen renders the same whether it sits in the wide
 * shell's detail pane or full-bleed. Distinct from the viewport-level shell switch
 * (mobile bottom-tab vs `AppShellPremiumWide`), which keys off device.
 *
 * Uses a CALLBACK ref (not a ref object) so the ResizeObserver attaches whenever the
 * element MOUNTS — including after a parent's loading early-return (e.g. ScoutedTeamPage
 * renders `<EmptyState>` while data loads, then the ref'd container). With a plain ref
 * the mount-time effect saw `ref.current === null` and `wide` stayed stuck at the
 * default `true` (the bug: phones rendered the 2-col grid → field squished to 0px).
 *
 * Defaults to `wide = true` (prototype convention — assume the roomy layout for the
 * first paint); the callback ref + observer correct it within a frame of the real mount.
 */
export function useWide(threshold) {
  const [wide, setWide] = useState(true);
  const [el, setEl] = useState(null);
  const ref = useCallback((node) => { setEl(node); }, []);
  useEffect(() => {
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setWide(el.offsetWidth >= threshold));
    ro.observe(el);
    setWide(el.offsetWidth >= threshold);
    return () => ro.disconnect();
  }, [el, threshold]);
  return [ref, wide];
}
