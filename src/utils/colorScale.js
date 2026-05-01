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
 * @param {number|null|undefined} rate — 0-100 percentage (or null for "no data")
 * @returns {string} hex color from theme tokens
 */
export function winRateColor(rate) {
  if (rate == null || Number.isNaN(rate)) return COLORS.textMuted;
  if (rate > 70) return COLORS.success;
  if (rate >= 40) return COLORS.accent;
  return COLORS.danger;
}
