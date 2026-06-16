/**
 * fieldViewConfig — SINGLE SOURCE OF TRUTH for the Field View archetype contract
 * (Field View shell Phase B; `docs/CC_BRIEF_FIELDVIEW_SHELL_BUILD.md` per-view table +
 * `docs/mockups/fieldview_matrix.html`). One module so a redesign edits ONE place.
 *
 * This is a DECLARATIVE DESCRIPTOR (data only — no JSX, no handlers). Each page reads
 * its descriptor for STRUCTURE (which rail zones in what order, which layers are pinned
 * to the collapsed strip, whether phaseControl/primaryAction exist + their kind) and
 * supplies the live state/handlers itself. Keeps the shell-shape decisions centralized
 * while the page owns data binding.
 *
 *   phaseControl kind: 'capture' (PaT "E", no ▶) | 'review' (full + ▶) | 'coach' (read-bar + ▶)
 *                      | 'filter' (optional) | null (none — Konfig)  ← enum-agnostic per D4/§8
 *   primaryAction kind: 'save' (amber) | 'end' (danger) | 'mode' (mode-dependent) | null
 *   railZones: ordered list of { type: 'scope'|'layers'|'isolate'|'status'|'tabs', key }
 *   pinned: collapsed-strip semantic LAYER/TOOL keys (phaseControl + primaryAction stay
 *           floating on the field even when collapsed — NOT in the strip).
 */

/** Canonical layer/tool registry — shared icon + label per key (views don't redefine). */
export const FIELD_LAYERS = {
  positions:   { icon: '◉', label: 'Positions' },
  shots:       { icon: '◎', label: 'Shots' },
  bunkers:     { icon: '◇', label: 'Bunkers' },
  directions:  { icon: '↗', label: 'Directions' },
  lines:       { icon: '╱', label: 'Lines' },
  zones:       { icon: '▢', label: 'Zones' },
  labels:      { icon: 'A', label: 'Labels' },
  shooter:     { icon: '◦', label: 'Shooter' },
  visibility:  { icon: '◠', label: 'Visibility' },
  coachPlan:   { icon: '✎', label: 'Coach plan' },
  notes:       { icon: '☰', label: 'Notes' },
  place:       { icon: '✛', label: 'Place' },
  sourceFilter:{ icon: '⒡', label: 'Source' },
};

/**
 * Per-view descriptors. Keys are stable Field View ids. `railZones[].key` is a layer
 * key (FIELD_LAYERS) for 'layers'/'isolate' rows, or a domain key for scope/status/tabs.
 */
export const FIELD_VIEWS = {
  'scout-point': {
    phaseControl: 'capture',          // PaT "E" — capture subset, no ▶ replay (live)
    primaryAction: 'save',            // Save point
    pinned: ['positions', 'shots', 'place'],
    railZones: [
      { type: 'scope', key: 'start' },          // start-side (from LEFT ⇄) — PaT-owned bar in portrait
      { type: 'layers', key: 'layers' },
      { type: 'isolate', key: 'players' },
    ],
  },
  'match-review': {
    phaseControl: 'review',           // full + ▶ replay
    primaryAction: 'end',             // End match (danger)
    pinned: ['positions', 'shots'],
    railZones: [{ type: 'layers', key: 'layers' }],
  },
  'scouted-team': {
    phaseControl: 'coach',            // coach read-bar + ▶
    primaryAction: 'save',            // Save (coach notes)
    pinned: ['positions', 'coachPlan', 'notes'],
    railZones: [
      { type: 'scope', key: 'scope' },
      { type: 'layers', key: 'layers' },
      { type: 'isolate', key: 'isolate' },
    ],
  },
  'player-stats': {
    phaseControl: 'filter',           // optional + ▶
    primaryAction: null,
    pinned: [],                       // tab-less → generic expand
    railZones: [
      { type: 'scope', key: 'scope' },
      { type: 'layers', key: 'layers' },
    ],
  },
  'heatmap': {                        // TrainingResults + match heatmap summary
    phaseControl: 'review',           // ▶ replay
    primaryAction: null,              // review — nothing to commit
    pinned: ['sourceFilter'],
    railZones: [{ type: 'scope', key: 'sourceFilter' }],
  },
  'layout-analytics': {
    phaseControl: 'filter',           // optional filter
    primaryAction: null,
    pinned: ['scope'],
    railZones: [
      { type: 'scope', key: 'scope' },
      { type: 'layers', key: 'layers' },
    ],
  },
  'hitability': {
    phaseControl: 'filter',           // optional
    primaryAction: 'mode',            // mode-dependent (track commits a hit)
    pinned: ['config', 'track', 'sum'],
    railZones: [{ type: 'tabs', key: 'tabs' }],   // existing config/track/sum tabs
  },
  'ballistics': {
    phaseControl: 'filter',           // optional, NO ▶
    primaryAction: null,              // query
    pinned: ['shooter', 'visibility'],
    railZones: [
      { type: 'layers', key: 'layers' },
      { type: 'status', key: 'status' },
    ],
  },
  'layout-detail': {                  // Konfig — geometry, NO time axis
    phaseControl: null,               // empty slot — corner stays clean
    primaryAction: 'save',            // Save (after edit)
    pinned: ['labels', 'zones', 'lines'],
    railZones: [{ type: 'layers', key: 'layers' }],
  },
  'tactic': {                         // migrated LAST; SHELL only, internals untouched
    phaseControl: 'review',           // full (per-phase setup)
    primaryAction: 'save',            // Save
    pinned: ['players', 'coachPlan'],
    railZones: [{ type: 'layers', key: 'layers' }],
  },
};

/** Lookup helper — returns the descriptor or null for an unknown id. */
export function fieldViewConfig(id) {
  return FIELD_VIEWS[id] || null;
}
