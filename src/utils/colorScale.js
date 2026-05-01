import { COLORS } from './theme';

/**
 * Performance bucket → color helper. Used in QuickLog Stage 1 player tiles
 * for win-rate and survival-rate metrics, and reusable for any 0-100% rate
 * that follows the standard "good / medium / bad / no-data" semantics.
 *
 * Buckets:
 *   > 70  → green  (success)
 *   40-70 → amber  (accent)
 *   < 40  → red    (danger)
 *   null/NaN → grey (textMuted) — used when player has 0 plays
 *
 * Bucket boundaries match § 58.2 player-tile spec. Theme tokens used so the
 * scale follows the dark theme palette and inherits future palette changes.
 *
 * § 59 (PlayerStatsPage redesign 2026-05-01): same helper drives win rate +
 * survival + per-bunker survival color tiers. § 59.4 narratively documents
 * the threshold as 50/70 — actual code keeps 40/70 to match the existing
 * QuickLog behavior so a single helper governs both surfaces. If the spec
 * boundary needs to shift, do it once here and both surfaces follow.
 *
 * @param {number|null|undefined} rate — 0-100 percentage (or null for "no data")
 * @returns {string} hex color from theme tokens
 */
export function winRateColor(rate) {
  if (rate == null || Number.isNaN(rate)) return COLORS.textMuted;
  if (rate > 70) return COLORS.success;
  if (rate >= 40) return COLORS.accent;
  return COLORS.danger;
}

/**
 * Plus/minus color helper — § 59.9 PlayerStatsPage HeroMetric grid.
 * Threshold is symmetrical around zero, matching coach intuition that
 * "small +/-" is acceptable noise but big swings either way are signal.
 *
 *   > +5  → green  (success)
 *   -5..+5 → amber  (accent)
 *   < -5  → red    (danger)
 *   null/NaN → grey (textMuted)
 *
 * Note: brief code sample referenced `COLORS.warning` which is not a token
 * in `theme.js`. We use `COLORS.accent` (the project amber) for parity
 * with `winRateColor`'s mid bucket.
 */
export function plusMinusColor(value) {
  if (value == null || Number.isNaN(value)) return COLORS.textMuted;
  if (value > 5) return COLORS.success;
  if (value >= -5) return COLORS.accent;
  return COLORS.danger;
}
