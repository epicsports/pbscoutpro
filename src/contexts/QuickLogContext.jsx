import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * QuickLogContext — lifted "QuickLog active" flag.
 *
 * QuickLogView mounts in two deep places (MatchPage's tournament path
 * and TrainingScoutTab's training path) and neither URL has a deterministic
 * flag for it. AppShell needs to know so it can hide the tournament context
 * bar (`AppShell.jsx:72-143`) — the bar duplicates the QuickLog header and
 * pushes the Stage 1 CTA off-screen on desktop landscape.
 *
 * Contract:
 *   QuickLogView calls `setQuickLogActive(true)` on mount, `false` on
 *   unmount via useEffect. AppShell consumes via `useQuickLogActive()`.
 *
 * Cross-ref: § 58.7 (added in this hotfix) — context bar visibility rule.
 */
const QuickLogContext = createContext(null);

export function QuickLogProvider({ children }) {
  const [active, setActive] = useState(false);
  // Stable setter — QuickLogView's useEffect dep array shouldn't churn.
  const setQuickLogActive = useCallback((v) => setActive(!!v), []);
  const value = useMemo(() => ({ active, setQuickLogActive }), [active, setQuickLogActive]);
  return <QuickLogContext.Provider value={value}>{children}</QuickLogContext.Provider>;
}

/**
 * Consumer hook for components that need to react to QuickLog active state
 * (e.g. AppShell hiding the context bar). Returns `false` if no provider —
 * safe default so the bar still renders for non-QuickLog routes.
 */
export function useQuickLogActive() {
  const ctx = useContext(QuickLogContext);
  return ctx?.active ?? false;
}

/**
 * Setter hook — QuickLogView only. Call from useEffect on mount/unmount.
 * Returns a no-op if no provider so the component still works in isolation
 * (e.g. tests / Storybook).
 */
export function useQuickLogSetter() {
  const ctx = useContext(QuickLogContext);
  return ctx?.setQuickLogActive ?? (() => {});
}
