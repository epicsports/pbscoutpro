import React, { useState, useEffect, useRef } from 'react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';
import { Btn } from '../ui';

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
 * `collapsed = { tabs: [{ key, icon, active, onSelect }], pins: [{ key, icon, on, onToggle, label }],
 * count: { value, label }|null, onBack }` — they implement NO collapse logic.
 *   - `tabs` mirror the rail's own tabs; tapping one calls `onSelect` (page switches its
 *     tab) and OPENS the overlay (switch semantics).
 *   - `pins` (GAP D) are semantic LAYER pins; tapping one calls `onToggle` and TOGGLES the
 *     layer IN PLACE (no overlay) — the most-used layers stay reachable while collapsed.
 *     `on` → amber active. tabs + pins coexist; a view supplies whichever it declares.
 *
 * COORDINATE GUARDRAIL (do not break): the `artifact` MUST be a canvas that sizes from
 * its OWN container via ResizeObserver. This layout sizes the artifact's BOX from CSS;
 * the canvas re-fits + keeps its live-rect tap transform correct across the reflow
 * (incl. the collapse, which only changes the hero's residual width).
 *
 * ── FIELD VIEW SHELL slots (Field View archetype, 2026-06-16 — ADDITIVE to the above) ──
 * Three optional slots float chrome ON the field so a redesign happens systemically and
 * height is preserved (Jacek's tablet pain). The boundary with Point-as-Timeline is
 * `docs/POINT_AS_TIMELINE.md §8` — the shell HOSTS these slots, it does NOT define a
 * phase model. When ALL three are null (today's 4 rail-views), the artifact renders with
 * the EXACT prior DOM (no FieldFrame wrapper) → guaranteed pixel-diff=0.
 *   - `phaseControl` (node) — the phase segment + transport (▶ lives inside it), floated
 *     top-right ON the field. Enum-agnostic (D4) — widening the phase enum needs NO change
 *     here. `null` → corner stays clean (Konfig case).
 *   - `fieldTools` (node) — floating icon buttons (draw pencil, fullscreen ⛶), top-right
 *     UNDER phaseControl. Icons only.
 *   - `primaryAction` ({ label, onClick, variant?: 'default'|'danger', disabled?, testId? })
 *     — the ONE commit CTA. LANDSCAPE → floats bottom-right ON the field (zero height cost);
 *     PORTRAIT → full-width bar pinned at the very bottom. `danger` = destructive (End match);
 *     `default` = amber (Save). `null` → none (review/query views). §27: single CTA, no
 *     competing amber; reuses the shared `Btn` (accent/danger) for one button language.
 * phaseControl + primaryAction stay floating EVEN WHEN COLLAPSED (never lost behind the
 * 56px strip — the core §116 fix). The strip pins LAYERS/TOOLS only. Floating chrome uses
 * pointerEvents:none on its wrapper (auto on the controls) so empty field corners keep
 * passing taps to the canvas → coordinate guardrail intact.
 */
const GAP = 8;
const STRIP_W = 56;

/**
 * FieldFrame — wraps the artifact and overlays the floating Field View slots. Only
 * mounted when at least one floating slot is active; otherwise the caller renders the
 * bare artifact (identical prior DOM → pixel-diff=0). `primaryAction` floats here ONLY in
 * landscape (portrait renders it as a bottom bar outside the frame).
 */
function FieldFrame({ artifact, phaseControl, fieldTools, primaryAction, landscape }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', minWidth: 0 }}>
      {artifact}
      {(phaseControl || fieldTools) && (
        // mockup `.fld-top`: phase + tools share ONE horizontal row, anchored
        // top-right (phase left, tools right) — NOT stacked.
        <div data-testid="field-corner-controls" style={{
          position: 'absolute', top: 8, right: 8, zIndex: 4,
          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6,
          pointerEvents: 'none', // empty corner keeps passing taps to the canvas
        }}>
          {phaseControl && <div data-testid="field-phase-control" style={{ pointerEvents: 'auto' }}>{phaseControl}</div>}
          {fieldTools && <div data-testid="field-tools" style={{ pointerEvents: 'auto', display: 'flex', gap: 6 }}>{fieldTools}</div>}
        </div>
      )}
      {landscape && primaryAction && (
        <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 4 }}>
          <PrimaryAction action={primaryAction} portrait={false} />
        </div>
      )}
    </div>
  );
}

/**
 * PrimaryAction — the single commit CTA. Reuses the shared `Btn` (amber `accent` /
 * `danger`) so the whole app speaks one button language (§27 consistency). Wrapped in a
 * data-testid container (Btn forwards no testid) for e2e targeting.
 */
function PrimaryAction({ action, portrait }) {
  if (!action) return null;
  const { label, onClick, variant = 'default', disabled, testId = 'rail-primary-action' } = action;
  const btnVariant = variant === 'danger' ? 'danger' : 'accent';
  return (
    <div data-testid={testId} style={{ width: portrait ? '100%' : 'auto', display: portrait ? 'block' : 'inline-block' }}>
      <Btn variant={btnVariant} size="lg" onClick={onClick} disabled={disabled}
        style={{ borderRadius: 12, width: portrait ? '100%' : 'auto', ...(portrait ? {} : { boxShadow: COLORS.accentGlow }) }}>
        {label}
      </Btn>
    </div>
  );
}

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
  const { tabs = [], pins = [], count = null, onBack = null } = collapsed || {};
  const btn = (active) => ({
    width: 44, height: 44, minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent', fontFamily: FONT, fontSize: 17, flexShrink: 0,
    background: active ? COLORS.surfaceLight : 'transparent',
    color: active ? COLORS.accent : COLORS.textDim,
    border: `1px solid ${active ? COLORS.accent : 'transparent'}`,
  });
  const divider = <div style={{ width: 24, borderTop: `1px solid ${COLORS.border}`, margin: '3px 0', flexShrink: 0 }} />;
  // The generic expand (☰) opens the overlay = the FULL rail. Pins are a quick-toggle
  // SUBSET (layers only) — they do NOT open the overlay, so the rest of the rail (scope /
  // isolate / report column) stays unreachable without ☰. So expand shows whenever there
  // are no TABS (tabs open the overlay on tap); pins never substitute for it.
  const needsExpand = tabs.length === 0;
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
      {onBack && divider}
      {/* TABS — tap switches the rail's tab AND opens the overlay (switch semantics). */}
      {tabs.map(tb => (
        <div key={tb.key} role="button" aria-pressed={!!tb.active} title={tb.label || tb.key}
          data-testid={`rail-strip-tab-${tb.key}`}
          onClick={() => { tb.onSelect && tb.onSelect(tb.key); onOpen(); }}
          style={btn(tb.active)}>{tb.icon}</div>
      ))}
      {/* PINS (GAP D) — semantic LAYER pins: tap TOGGLES the layer in place (no overlay),
          so the most-used layers stay reachable when collapsed. `on` → amber active. */}
      {pins.length > 0 && tabs.length > 0 && divider}
      {pins.map(pn => (
        <div key={pn.key} role="switch" aria-checked={!!pn.on} title={pn.label || pn.key}
          data-testid={`rail-strip-pin-${pn.key}`}
          onClick={() => pn.onToggle && pn.onToggle(pn.key, !pn.on)}
          style={btn(!!pn.on)}>{pn.icon}</div>
      ))}
      {needsExpand && pins.length > 0 && divider}
      {needsExpand && (
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
  // ── Field View shell slots (additive, all optional; null → prior behavior) ──
  phaseControl = null, fieldTools = null, primaryAction = null,
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

  // Field View shell: wrap the artifact only when a floating slot is active. With no
  // slots (today's 4 rail-views) the bare `artifact` is rendered → identical prior DOM →
  // pixel-diff=0. `primaryAction` floats on the field in landscape only (portrait = bar).
  const hasFieldFloating = !!(phaseControl || fieldTools);
  const frameArtifact = (ctxLandscape) => (
    (hasFieldFloating || (ctxLandscape && primaryAction))
      ? <FieldFrame artifact={artifact} phaseControl={phaseControl} fieldTools={fieldTools} primaryAction={primaryAction} landscape={ctxLandscape} />
      : artifact
  );

  if (landscape) {
    const hero = (
      <div key="hero" style={{ flex: '0 1 auto', height: '100%', aspectRatio: String(aspect), minWidth: 0, display: 'flex' }}>
        {frameArtifact(true)}
      </div>
    );

    if (isCollapsed) {
      const strip = <CollapsedStrip key="strip" collapsed={collapsed} side={side} onOpen={() => setOverlayOpen(true)} />;
      // Field gets the residual width (W − strip − gap); the canvas self-refits.
      const heroCollapsed = (
        <div key="hero" style={{ flex: '1 1 0', minWidth: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: '100%', aspectRatio: String(aspect), maxWidth: '100%', display: 'flex' }}>{frameArtifact(true)}</div>
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

  // Portrait: header full-bleed top · padded field(capped) over rail · hint full-bleed
  // bottom · primaryAction full-width bar pinned at the very bottom (today's Save placement).
  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px 6px' }}>
        <div style={{ flex: rail ? `0 0 ${portraitArtifactVh}vh` : 1, minWidth: 0, minHeight: 0, display: 'flex' }}>{frameArtifact(false)}</div>
        {rail && (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{rail}</div>
        )}
      </div>
      {hint}
      {primaryAction && (
        <div style={{ padding: '8px 12px', borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg, ...safeArea }}>
          <PrimaryAction action={primaryAction} portrait />
        </div>
      )}
    </div>
  );
}
