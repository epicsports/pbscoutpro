import React from 'react';
import { LAYOUT_TIERS } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

/**
 * <Screen> — arc B page-shell primitive (mockup-5, ratified-by-proof).
 *
 * Standardizes the per-page outer chrome that was ad-hoc per screen:
 *   - one centered content column whose max-width comes from the archetype
 *     TIER TABLE (theme.js LAYOUT_TIERS) instead of a per-page magic number
 *   - the existing document-scroll + sticky-header model (UNCHANGED app-wide)
 *   - safe-area-aware bottom padding (replaces the recurring magic `80`)
 *
 * It does NOT restyle: a `detail` Screen emits exactly the shell the detail
 * pages already had (`minHeight:100vh; maxWidth:640; margin:0 auto;
 * paddingBottom:80`), so migrating a page to <Screen> is pixel-identical at
 * phone widths (the diff=0 merge gate). The only deliberate visual delta in
 * the whole migration is the `list` tier widening 640→760 on desktop, which
 * is gated separately.
 *
 * `paddingBottom` uses `calc(80px + env(safe-area-inset-bottom, 0px))`: on a
 * viewport with no inset (all test viewports + most desktops) it computes to
 * exactly 80px → identical pixels to the old literal; on a notched device it
 * adds the inset (the documented improvement). Pass `padBottom={false}` for
 * shells that intentionally had no bottom padding.
 *
 * API:  <Screen archetype="detail|list|form" header={<PageHeader …/>}>…</Screen>
 */
export default function Screen({
  archetype = 'detail',
  header = null,
  padBottom = true,
  style,
  children,
}) {
  // Model C — DESKTOP-ONLY cap: full-width below the desktop breakpoint (phone +
  // tablet untouched, by construction identical to the old R.layout full/768),
  // tier only on desktop. device.isDesktop = ≥1024 AND non-touch (a touch device
  // <1200 stays 'tablet' → full-width, so real tablets never narrow).
  const device = useDevice();
  const cap = LAYOUT_TIERS[archetype] || LAYOUT_TIERS.detail;
  const maxWidth = device.isDesktop ? cap : '100%';
  return (
    <div style={{
      minHeight: '100vh',
      maxWidth,
      margin: '0 auto',
      ...(padBottom ? { paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' } : null),
      ...style,
    }}>
      {header}
      {children}
    </div>
  );
}
