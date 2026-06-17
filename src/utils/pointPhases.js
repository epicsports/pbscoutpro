// Canonical, SINGLE-SOURCE Point-as-Timeline phase axis (charter D4, enum 5→6).
// Every phase consumer (capture switcher, MatchPage, dataService.buildTimeline,
// generateInsights, HeatmapCanvas, ScoutedTeam coach report) imports from HERE —
// adding/renaming/remapping a phase is one edit in this file.
//
// Axis (ordered): preBreakout · breakout · settle · mid · endgame · outcome.
//   - kind 'play'     → a field state on the timeline.
//   - kind 'terminal' → the buzzer/result (outcome); NOT a capture/heatmap tab.
//   - captureEnabled  → the scout can record this phase (preBreakout/outcome can't).
//   - reasonRadial    → the 2b elimination-reason radial applies (Settle/Mid/Endgame).
//   - persistedLiteral→ the verbatim Firestore `timeline[].stage` value. Breakout is
//     keyframe #0 (homeData/awayData) and persists under the LEGACY literal 'break';
//     settle/mid/endgame persist verbatim. → D4 migration-safe, no data rewrite.
//
// STATUS (alive/dead) is a SEPARATE dimension — NOT a phase (deathTaxonomy owns it;
// full reconcile is a separate ticket). The legacy shims break↔breakout and
// postBreakout↔settle are centralized in ALIAS below.

export const PHASES = [
  { key: 'preBreakout', i18nKey: 'phase_prebreakout', kind: 'play',     seq: 0, captureEnabled: false, positional: false, reasonRadial: false },
  { key: 'breakout',    i18nKey: 'phase_breakout',    kind: 'play',     seq: 1, captureEnabled: true,  positional: true,  reasonRadial: false, persistedLiteral: 'break' },
  { key: 'settle',      i18nKey: 'phase_settle',      kind: 'play',     seq: 2, captureEnabled: true,  positional: true,  reasonRadial: true,  persistedLiteral: 'settle' },
  { key: 'mid',         i18nKey: 'phase_mid',         kind: 'play',     seq: 3, captureEnabled: true,  positional: true,  reasonRadial: true,  persistedLiteral: 'mid' },
  { key: 'endgame',     i18nKey: 'phase_endgame',     kind: 'play',     seq: 4, captureEnabled: true,  positional: true,  reasonRadial: true,  persistedLiteral: 'endgame' },
  { key: 'outcome',     i18nKey: 'phase_outcome',     kind: 'terminal', seq: 5, captureEnabled: false, positional: false, reasonRadial: false },
];

// LEGACY ALIAS MAP (the one place the scattered shims live). Maps any historical or
// persisted token → canonical key. 'break' (kf#0 literal) → breakout; 'postBreakout'
// (old obstacle/settle shim) → settle. Canonical keys map to themselves.
const ALIAS = {
  break: 'breakout', breakout: 'breakout',
  postBreakout: 'settle', obstacle: 'settle', settle: 'settle',
  preBreakout: 'preBreakout', mid: 'mid', endgame: 'endgame', outcome: 'outcome',
};

/** Canonicalize any phase token (legacy literal / alias) → canonical key. */
export const normalizeKey = (k) => ALIAS[k] || k;

const BY_KEY = Object.fromEntries(PHASES.map((p) => [p.key, p]));
const phase = (k) => BY_KEY[normalizeKey(k)] || null;

// DERIVED axes.
export const INPLAY = ['mid', 'endgame'];                                   // post-settle live play

// SELECTORS — consumers iterate these instead of hardcoding literals.
export const capturePhases = () => PHASES.filter((p) => p.captureEnabled);                       // breakout/settle/mid/endgame
export const playPhases = () => PHASES.filter((p) => p.kind === 'play');                          // preBreakout..endgame
export const coachReportPhases = () => PHASES.filter((p) => p.kind === 'play' && p.captureEnabled); // the coach report tabs

export const isTerminal = (k) => phase(k)?.kind === 'terminal';
export const isReasonRadial = (k) => !!phase(k)?.reasonRadial;
export const label = (k, t) => { const p = phase(k); return p ? (t ? t(p.i18nKey) : p.key) : k; };
export const order = (k) => phase(k)?.seq ?? 99;

// Persisted-literal ⇄ canonical key. Breakout ⇄ 'break' (kf#0); others verbatim.
export const toPersistedLiteral = (k) => phase(k)?.persistedLiteral || normalizeKey(k);
export const fromPersistedLiteral = (lit) => normalizeKey(lit);
