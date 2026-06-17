import React from 'react';
import { COLORS, FONT, TOUCH } from '../../utils/theme';

/**
 * RailZones — the STRUCTURED rail control-language for the Field View shell
 * (Field View archetype Phase B; `docs/mockups/fieldview_matrix.html` + §8/§27).
 *
 * The mockup is a MINIATURE preview — its literal px (8–10px fonts, 26×15 switches)
 * are preview-scale, NOT implementation sizes. These primitives honor the mockup's
 * STRUCTURE + control-language + color-semantics at REAL scale via theme tokens, so
 * §27 touch targets (≥44px) hold.
 *
 * Fixed control vocabulary, applied system-wide so the whole Field View speaks one
 * language (§27 consistency):
 *   - scope     → `SegmentedControl` (ui.jsx) — pick-one. (Imported by the view/config.)
 *   - layers    → `RailToggleList` — on/off, label + iOS switch, aligned rows.
 *   - isolate   → `RailItemList` — select an avatar/item.
 * Each lives inside a `RailZone` (labelled block, mockup `.zone`/`.zone-h`).
 */

/** RailZone — a labelled block in the rail. `last` drops the bottom divider.
 * `collapsible` makes the label a tap-to-expand header (chevron); `defaultCollapsed`
 * starts it folded. Folding a long zone (e.g. a 14-player isolate list) is what keeps
 * the rail's report column (a flex sibling below the zones) from being squeezed to a
 * sliver in landscape. `headerExtra` shows beside the label while collapsed (e.g. the
 * active selection), so folding doesn't hide that a filter is engaged. */
export function RailZone({ label, children, last = false, style, collapsible = false, defaultCollapsed = false, headerExtra = null, testId }) {
  const [open, setOpen] = React.useState(!defaultCollapsed);
  const labelStyle = {
    fontSize: 11, fontWeight: 600, color: COLORS.textSubtle,
    textTransform: 'uppercase', letterSpacing: 0.5,
  };
  return (
    <div style={{ padding: '9px 11px', borderBottom: last ? 'none' : `1px solid ${COLORS.border}`, ...style }}>
      {label != null && (collapsible ? (
        <div role="button" aria-expanded={open} data-testid={testId} onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', minHeight: TOUCH.minTarget }}>
          <span style={labelStyle}>{label}</span>
          {!open && headerExtra}
          <span aria-hidden style={{ marginLeft: 'auto', color: COLORS.textMuted, fontSize: 15, transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
        </div>
      ) : (
        <div style={{ ...labelStyle, marginBottom: 7 }}>{label}</div>
      ))}
      {(!collapsible || open) && children}
    </div>
  );
}

/** TeamChip — a compact ≥44px A|B toggle (GAP F). Team color is SEMANTIC here (whose
 * data: A=red, B=blue) — distinct from the dropped layer-tone (GAP E). On → team-color
 * fill; off → muted outline. */
function TeamChip({ letter, color, on, onToggle, layerKey }) {
  return (
    <div role="switch" aria-checked={!!on} aria-label={`${layerKey} ${letter}`}
      data-testid={`rail-toggle-${layerKey}-${letter.toLowerCase()}`}
      onClick={() => onToggle && onToggle(!on)}
      style={{
        minWidth: 44, minHeight: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
        fontFamily: FONT, fontSize: 13, fontWeight: 800,
      }}>
      <span style={{
        minWidth: 30, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: on ? color : 'transparent', color: on ? '#fff' : COLORS.textMuted,
        border: `1.5px solid ${on ? color : COLORS.border}`, transition: 'all 0.12s',
      }}>{letter}</span>
    </div>
  );
}

/**
 * RailToggleList — full-width on/off LIST (mockup `.tgl` rows). NOT wrapped pills.
 * items: [{ key, icon?, label, on, onToggle, disabled? }] — single switch (on → amber).
 * GAP F per-team variant: [{ key, icon?, label, perTeam: true, a:{on,onToggle}, b:{on,onToggle} }]
 *   → one layer row, two compact A|B toggles on the right (A=red, B=blue; team color is
 *   semantic = whose data). Used by the two-team scouting views.
 * §27: amber = interactive/active only; no layer-tone (GAP E). Row is the tap context.
 */
export function RailToggleList({ items = [] }) {
  return (
    <div role="group">
      {items.map((it, i) => {
        const perTeam = !!it.perTeam;
        const on = !!it.on;
        const disabled = !!it.disabled;
        const rowStyle = {
          display: 'flex', alignItems: 'center', gap: 9, minHeight: TOUCH.minTarget,
          padding: '4px 0', borderTop: i === 0 ? 'none' : `1px solid ${COLORS.border}44`,
          opacity: disabled ? 0.4 : 1, WebkitTapHighlightColor: 'transparent', userSelect: 'none',
        };
        const iconEl = it.icon != null && (
          <span style={{ width: 16, textAlign: 'center', flexShrink: 0, fontStyle: 'normal',
            fontSize: 14, color: (perTeam ? (it.a?.on || it.b?.on) : on) ? COLORS.accent : COLORS.textDim }}>{it.icon}</span>
        );

        if (perTeam) {
          return (
            <div key={it.key} style={rowStyle}>
              {iconEl}
              <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 500, color: COLORS.text }}>{it.label}</span>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <TeamChip letter="A" color={COLORS.A} on={it.a?.on} onToggle={it.a?.onToggle} layerKey={it.key} />
                <TeamChip letter="B" color={COLORS.B} on={it.b?.on} onToggle={it.b?.onToggle} layerKey={it.key} />
              </div>
            </div>
          );
        }

        return (
          <div key={it.key} role="switch" aria-checked={on} aria-label={it.label}
            data-testid={`rail-toggle-${it.key}`}
            onClick={disabled ? undefined : () => it.onToggle && it.onToggle(it.key, !on)}
            style={{ ...rowStyle, cursor: disabled ? 'default' : 'pointer' }}>
            {iconEl}
            <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: 13, fontWeight: 500,
              color: on ? COLORS.text : COLORS.textMuted }}>{it.label}</span>
            {/* iOS-style switch (real scale) */}
            <span aria-hidden style={{
              position: 'relative', width: 40, height: 24, borderRadius: 12, flexShrink: 0,
              background: on ? COLORS.accent : COLORS.border, transition: 'background 0.15s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: on ? 18 : 2, width: 20, height: 20,
                borderRadius: '50%', background: '#fff', transition: 'left 0.15s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * RailItemList — full-width SELECT list (isolate / avatar). mockup "isolate" zone.
 * items: [{ key, label, sublabel?, avatar?, active, onSelect, accent? }]. Each row a
 * ≥44px tap target; active = subtle surfaceLight bg + accent border (§27 active = bg
 * change, not just border).
 */
export function RailItemList({ items = [] }) {
  return (
    <div role="listbox">
      {items.map(it => {
        const active = !!it.active;
        return (
          <div key={it.key} role="option" aria-selected={active}
            data-testid={`rail-item-${it.key}`}
            onClick={() => it.onSelect && it.onSelect(it.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, minHeight: TOUCH.minTarget,
              padding: '5px 8px', marginBottom: 4, borderRadius: 10, cursor: 'pointer',
              background: active ? COLORS.surfaceLight : 'transparent',
              border: `1px solid ${active ? COLORS.accent : 'transparent'}`,
              WebkitTapHighlightColor: 'transparent', userSelect: 'none',
            }}>
            {it.avatar != null && (
              <span style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#fff',
                background: it.accent || COLORS.surfaceDark,
              }}>{it.avatar}</span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: FONT, fontSize: 13, fontWeight: 600,
                color: active ? COLORS.text : COLORS.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
              {it.sublabel != null && (
                <span style={{ display: 'block', fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.textMuted }}>{it.sublabel}</span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
