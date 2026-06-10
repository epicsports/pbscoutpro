// § 88 — Unified zones model: helpers shared by editor, renderer, scouting
// pill and the Strefy summary section.
//
// One unified zone object replaces the three hardcoded layout fields
// (`dangerZone` / `sajgonZone` / `bigMoveZone`). A zone is:
//   {
//     id      : string,            // stable; never reused; UUID at persist
//     name    : string,            // EDITABLE callout name (e.g. "ORANGE")
//     color   : string,            // hex from COLORS.zonePalette (amber reserved)
//     polygon : [{x,y},…] | null,  // normalized 0-1; null = created-but-not-drawn
//     type    : 'danger' | 'sajgon' | 'bigMove' | null   // internal — drives
//                                                       // legacy dual-write +
//                                                       // BigMove special section
//   }
//
// Migration semantics (v1 — non-destructive):
//   - Read-time synth: layouts that still carry only the legacy `dangerZone /
//     sajgonZone / bigMoveZone` fields appear to consumers as a synthesized
//     zones[] (3 typed entries, polygon-or-null per source). Synth IDs use the
//     stable string `legacy-<type>` so React keys stay stable across renders.
//   - Write-time dual-write: whenever zones[] is persisted, the three legacy
//     fields are mirrored from the typed entries (or explicitly nulled if the
//     user deleted that typed zone). Existing readers (coachingStats danger/
//     sajgon + generateInsights computeBigMoves) keep working unchanged.
//   - ID promotion: any zone with `id` starting `legacy-` gets a fresh
//     `crypto.randomUUID()` at the first persist — the synth IDs never reach
//     Firestore.

import { COLORS } from './theme';

export const ZONE_TYPE = {
  DANGER: 'danger',
  SAJGON: 'sajgon',
  BIG_MOVE: 'bigMove',
};

// Legacy defaults — names match the prior hardcoded UI labels; the user can
// rename freely after the first save.
const LEGACY_SYNTH = [
  { type: ZONE_TYPE.DANGER,   field: 'dangerZone',  name: 'Danger',   color: '#ef4444' },
  { type: ZONE_TYPE.SAJGON,   field: 'sajgonZone',  name: 'Sajgon',   color: '#3b82f6' },
  { type: ZONE_TYPE.BIG_MOVE, field: 'bigMoveZone', name: 'Big Move', color: COLORS.accent }, // amber: reserved accent + BigMove default (theme.js)
];

const LEGACY_PREFIX = 'legacy-';

/** True if the id was assigned by read-time synthesis (never persisted). */
export function isSyntheticZoneId(id) {
  return typeof id === 'string' && id.startsWith(LEGACY_PREFIX);
}

/**
 * Synthesize a zones[] array from legacy layout fields. Returns [] when no
 * legacy fields are present. The synthesized entries carry deterministic
 * `legacy-<type>` ids so consumers can use them as stable React keys; those
 * ids are promoted to UUIDs at the first persist via `promoteSyntheticIds`.
 *
 * polygon-or-null semantics preserved from the legacy fields (null is a
 * valid "zone exists conceptually but not drawn yet" state — but in legacy
 * shape we ONLY synthesize a zone if the field has ≥1 vertex, so v1 synth
 * always yields drawn polygons).
 */
export function synthesizeZonesFromLegacy(layout) {
  if (!layout) return [];
  const out = [];
  for (const { type, field, name, color } of LEGACY_SYNTH) {
    const poly = layout[field];
    if (Array.isArray(poly) && poly.length >= 3) {
      out.push({
        id: LEGACY_PREFIX + type,
        name,
        color,
        polygon: poly.map(p => ({ x: p.x, y: p.y })),
        type,
      });
    }
  }
  return out;
}

/**
 * Resolve the effective zones array for a layout. Prefers persisted
 * `layout.zones`; falls back to legacy-field synthesis. Always returns an
 * array (never undefined) so consumers can iterate without guards.
 */
export function resolveZones(layout) {
  if (!layout) return [];
  if (Array.isArray(layout.zones) && layout.zones.length > 0) return layout.zones;
  return synthesizeZonesFromLegacy(layout);
}

/**
 * Promote any synthesized (`legacy-*`) ids in a zones array to real UUIDs.
 * Idempotent — non-synthesized ids pass through unchanged. Called by every
 * persist path so synth ids never reach Firestore.
 */
export function promoteSyntheticIds(zones) {
  if (!Array.isArray(zones)) return [];
  return zones.map(z => {
    if (!z) return z;
    if (isSyntheticZoneId(z.id)) {
      return { ...z, id: crypto.randomUUID() };
    }
    return z;
  });
}

/**
 * Derive the legacy mirror patch from a zones[] array. Returns an object
 * with all three legacy fields set explicitly (either the polygon of the
 * matching typed entry, or `null` when no such typed zone exists). The
 * explicit null is load-bearing: it CLEARS the legacy field when the user
 * deletes the typed zone, keeping the dual-write contract tight.
 *
 * Custom (untyped) zones do NOT touch any legacy field — they're additive
 * to the new model only.
 */
export function dualWriteLegacyFromZones(zones) {
  const patch = { dangerZone: null, sajgonZone: null, bigMoveZone: null };
  if (!Array.isArray(zones)) return patch;
  for (const z of zones) {
    if (!z || !Array.isArray(z.polygon) || z.polygon.length < 3) continue;
    if (z.type === ZONE_TYPE.DANGER) patch.dangerZone = z.polygon;
    else if (z.type === ZONE_TYPE.SAJGON) patch.sajgonZone = z.polygon;
    else if (z.type === ZONE_TYPE.BIG_MOVE) patch.bigMoveZone = z.polygon;
  }
  return patch;
}

/**
 * Build a brand-new zone for "+ Dodaj strefę". Picks the next free palette
 * color (cycling if all 7 are in use) and a default name like "Strefa 4".
 * Untyped by default — typed zones are only the migrated three legacies.
 */
export function makeNewZone(existingZones = []) {
  const palette = COLORS.zonePalette || [];
  const usedColors = new Set((existingZones || []).map(z => z?.color).filter(Boolean));
  const nextColor = palette.find(c => !usedColors.has(c)) || palette[(existingZones?.length || 0) % palette.length] || '#ef4444';
  // Number = first available "Strefa N" not in existing names. Custom names
  // like "ORANGE" do not collide with the auto-numbering.
  const usedNumbers = new Set(
    (existingZones || [])
      .map(z => z?.name)
      .filter(Boolean)
      .map(n => {
        const m = /^Strefa\s+(\d+)$/.exec(n);
        return m ? Number(m[1]) : null;
      })
      .filter(n => n != null)
  );
  let n = 1;
  while (usedNumbers.has(n)) n++;
  return {
    id: crypto.randomUUID(),
    name: `Strefa ${n}`,
    color: nextColor,
    polygon: null,
    type: null,
  };
}

// § OSTRZAŁ (A) — computeZonePresence retired: the "Strefy: off-break presence"
// section it fed was removed from ScoutedTeamPage (superseded by the Callout-zones
// break sub-section + the heatmap post-breakout presence, brief B). No other
// consumer. `pointInPolygon` import dropped with it.
