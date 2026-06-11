import React, { useState, useEffect, useRef } from 'react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * CanvasRailLayout — responsive Canvas/Tool archetype primitive (§113 / §116;
 * DESIGN_DECISIONS). One component tree, reflows on orientation:
 *
 *   - PORTRAIT  → `header` full-bleed on top, then the field HERO (capped height,
 *                 full-width) over the `rail` content, then `hint` full-bleed at the
 *                 bottom. Unchanged from the original stacked layout.
 *   - LANDSCAPE → the field/heatmap is the HERO and fills 100% OF HEIGHT (100dvh
 *                 minus safe-area); its native `aspect` drives its width. The rail is
 *                 RESIDUAL (leftover width, down to `railMin`) and holds ALL chrome.
 *   - LANDSCAPE + residual < railMin (§116 variant A) → the rail COLLAPSES to a 56px
 *                 icon strip; tapping a strip icon opens a TRANSIENT overlay panel
 *                 (scrim + the EXACT rail content) over the field. Closing it (scrim /
 *                 × / back) leaves the field clean — the panel never auto-reopens and
 *                 never permanently occludes the field. Geometry-triggered, not a
 *                 device class (§114). Collapse only engages when a `collapsed` config
 *                 is supplied; otherwise the rail yields width (legacy behavior).
 *
 * ACTIVATION: orientation is decided by VIEWPORT GEOMETRY (`innerWidth > innerHeight`).
 * Pass `isLandscape` to override (tests); omit to self-determine.
 *
 * COLLAPSE = SHELL-LEVEL MECHANISM, DECLARATIVE PAGE DATA (§116). Pages pass only
 * `collapsed = { tabs: [{ key, icon, active, onSelect }], count: { value, label }|null,
 * onBack }` — they implement NO collapse logic. `tabs` mirror the rail's own tabs;
 * tapping one calls `onSelect` (page switches its tab) and opens the overlay.
 *
 * COORDINATE GUARDRAIL (do not break): the `artifact` MUST be a canvas that sizes from
 * its OWN container via ResizeObserver. This layout sizes the artifact's BOX from CSS;
 * the canvas re-fits + keeps its live-rect tap transform correct across the reflow
 * (incl. the collapse, which only changes the hero's residual width).
 */
const GAP = 8;
const STRIP_W = 56;

function useViewportLandscape() {
  const read = () => (typeof window !== 'undefined' ? window.innerWidth > window.innerHeight : false);
  const [ls, setLs] = useState(read);
  useEffect(() => {
    const on = () => setLs(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, []);
  return ls;
}

function CollapsedStrip({ collapsed, side, onOpen }) {
  const { tabs = [], count = null, onBack = null } = collapsed || {};
  const btn = (active) => ({
    width: 44, height: 44, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: FONT, fontSize: 17, flexShrink: 0,
    background: active ? COLORS.surfaceLight : 'transparent',
    color: active ? COLORS.accent : COLORS.textDim,
    border: `1px solid ${active ? COLORS.accent : 'transparent'}`,
  });
  const divider = <div style={{ width: 24, borderTop: `1px solid ${COLORS.border}`, margin: '3px 0', flexShrink: 0 }} />;
  return (
    <div key="strip" style={{
      width: STRIP_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 0', gap: 4, minHeight: 0,
      [side === 'left' ? 'borderRight' : 'borderLeft']: `1px solid ${COLORS.border}`,
    }}>
      {onBack && (
        <div role="button" aria-label="Back" data-testid="rail-strip-back" onClick={onBack}
          style={{ ...btn(false), color: COLORS.accent, fontSize: 22 }}>‹</div>
      )}
      {onBack && (tabs.length > 0 || true) && divider}
      {tabs.map(tb => (
        <div key={tb.key} role="button" aria-pressed={!!tb.active} title={tb.label || tb.key}
          data-testid={`rail-strip-tab-${tb.key}`}
          onClick={() => { tb.onSelect && tb.onSelect(tb.key); onOpen(); }}
          style={btn(tb.active)}>{tb.icon}</div>
      ))}
      {/* Tab-less pages (e.g. PlayerStats) get a generic expand affordance so the
          rail/report panel is still reachable when collapsed. */}
      {tabs.length === 0 && (
        <div role="button" aria-label="Open panel" data-testid="rail-strip-expand"
          onClick={onOpen} style={btn(false)}>☰</div>
      )}
      {count && (
        <div data-testid="rail-strip-count" style={{
          marginTop: 'auto', paddingBottom: 4, textAlign: 'center', lineHeight: 1.1,
          fontFamily: FONT, fontSize: TOUCH.fontXs - 2, fontWeight: 700, color: COLORS.textMuted,
        }}>{count.value}<br />{count.label}</div>
      )}
    </div>
  );
}

function OverlayPanel({ header, rail, hint, side, onClose }) {
  return (
    <>
      <div data-testid="rail-overlay-scrim" onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(5,8,15,.45)', backdropFilter: 'blur(1px)', zIndex: 1,
      }} />
      <div data-testid="rail-overlay-panel" style={{
        position: 'absolute', top: 0, bottom: 0, [side === 'left' ? 'left' : 'right']: 0, width: 280, zIndex: 2,
        background: COLORS.surfaceDark, [side === 'left' ? 'borderRight' : 'borderLeft']: `1px solid ${COLORS.border}`,
        boxShadow: `${side === 'left' ? '' : '-'}8px 0 32px rgba(0,0,0,.5)`,
        display: 'flex', flexDirection: 'column', minHeight: 0,
      }}>
        <div style={{ position: 'absolute', top: 6, [side === 'left' ? 'right' : 'left']: 6, zIndex: 3 }}>
          <div role="button" aria-label="Close" data-testid="rail-overlay-close" onClick={onClose} style={{
            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: COLORS.textMuted, fontSize: 20, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}>×</div>
        </div>
        {header}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
        {hint}
      </div>
    </>
  );
}

export default function CanvasRailLayout({
  isLandscape, artifact, rail, header = null, hint = null,
  aspect = 16 / 10, railMin = 200, portraitArtifactVh = 46, side = 'left',
  collapsed = null,
}) {
  const auto = useViewportLandscape();
  const landscape = isLandscape !== undefined ? isLandscape : auto;
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(entries => {
      const r = entries[0]?.contentRect;
      if (r) setDims({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // §116 collapse trigger: a FULL rail (railMin) would push the field below
  // COLLAPSE_AT of the viewport height → collapse to the 56px strip instead.
  // The gated mockup formula ("residual = W − field@100%height − gap < railMin")
  // is the 100% case; literally applied it also collapses 1920×1080 (residual
  // 184 < 200), which contradicts the brief's "desktop-wide unchanged" + the
  // existing desktop e2e. 0.90 keeps near-full-height WIDE desktops on the full
  // rail while collapsing the cramped iPad-landscape (the actual intent).
  // Verified: iPad 1194×834 ≈71–74% → collapse; desktop 1920×1080 ≈97–99% →
  // full rail; phone-landscape 896×414 ≈98% → full rail. Only when a `collapsed`
  // config is supplied (else legacy width-yield).
  const COLLAPSE_AT = 0.90;
  const fullRailFieldH = (dims.w - railMin - GAP) / aspect;
  const isCollapsed = landscape && !!collapsed && dims.w > 0 && dims.h > 0 && fullRailFieldH < COLLAPSE_AT * dims.h;
  useEffect(() => { if (!isCollapsed && overlayOpen) setOverlayOpen(false); }, [isCollapsed, overlayOpen]);

  const safeArea = {
    paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)',
  };

  if (landscape) {
    const hero = (
      <div key="hero" style={{ flex: '0 1 auto', height: '100%', aspectRatio: String(aspect), minWidth: 0, display: 'flex' }}>
        {artifact}
      </div>
    );

    if (isCollapsed) {
      const strip = <CollapsedStrip key="strip" collapsed={collapsed} side={side} onOpen={() => setOverlayOpen(true)} />;
      // Field gets the residual width (W − strip − gap); the canvas self-refits.
      const heroCollapsed = (
        <div key="hero" style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: '100%', aspectRatio: String(aspect), maxWidth: '100%', display: 'flex' }}>{artifact}</div>
        </div>
      );
      return (
        <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: GAP, alignItems: 'stretch', position: 'relative', ...safeArea }}>
          {side === 'left' ? [strip, heroCollapsed] : [heroCollapsed, strip]}
          {overlayOpen && <OverlayPanel header={header} rail={rail} hint={hint} side={side} onClose={() => setOverlayOpen(false)} />}
        </div>
      );
    }

    const railEl = (
      <div key="rail" style={{ flex: '1 1 0', minWidth: railMin, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {header}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
        {hint}
      </div>
    );
    return (
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: GAP, alignItems: 'stretch', ...safeArea }}>
        {side === 'left' ? [railEl, hero] : [hero, railEl]}
      </div>
    );
  }

  // Portrait: header full-bleed top · padded field(capped) over rail · hint full-bleed bottom.
  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px 6px' }}>
        <div style={{ flex: rail ? `0 0 ${portraitArtifactVh}vh` : 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{artifact}</div>
        {rail && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
        )}
      </div>
      {hint}
    </div>
  );
}
