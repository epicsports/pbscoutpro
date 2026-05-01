import { ZONE_COLORS } from './theme';

/**
 * Shared zone constants — single source of truth for break/quick-shot zones.
 *
 * Used by:
 *   - QuickShotPanel.jsx (zone toggles for shot direction)
 *   - QuickLogView.jsx Stage 2 (zone toggles for player position pre-fill)
 *
 * Icons are emoji literals (rendered by OS — not color-customizable). Borders
 * and background tints use `color` from `theme.ZONE_COLORS` for active state.
 *
 * `key` is the persisted shape ('dorito'|'center'|'snake'); QuickLogView's
 * legacy `zones` state still uses 'D'|'C'|'S' single-char keys for storage —
 * see ZONE_KEY_TO_SHORT below.
 */
export const ZONES = [
  { key: 'dorito', short: 'D', icon: '🔺', label: 'Dorito', color: ZONE_COLORS.dorito },
  { key: 'center', short: 'C', icon: '➕', label: 'Center', color: ZONE_COLORS.center },
  { key: 'snake',  short: 'S', icon: '🐍', label: 'Snake',  color: ZONE_COLORS.snake  },
];

/**
 * Map short keys (legacy QuickLogView storage) ↔ full keys (canonical).
 * QuickLogView writes 'D'/'C'/'S' to its `zones` state; W3 _meta writer
 * (MatchPage / TrainingScoutTab onSavePoint) translates to 'dorito' /
 * 'center' / 'snake' for `playersMeta[i].syntheticZone`.
 */
export const ZONE_SHORT_TO_KEY = { D: 'dorito', C: 'center', S: 'snake' };
export const ZONE_KEY_TO_SHORT = { dorito: 'D', center: 'C', snake: 'S' };
