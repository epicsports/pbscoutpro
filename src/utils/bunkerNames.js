/**
 * Per-workspace bunker display-name resolution — § b2a re-key (2026-06-04).
 *
 * Per-workspace bunker names live on the workspace OVERLAY (never the shared
 * base geometry). They were originally keyed by `positionName`, which COLLIDES
 * when two distinct obstacles share a name (e.g. "NXL EUROPE #2 - UK" has two
 * "Dykta" obstacles) — renaming one rewrote both. The fix re-keys by STABLE
 * BUNKER IDENTITY.
 *
 * stableKey = `b.masterId || b.id`:
 *   - a mirror carries `masterId` = its master's id  → master+mirror collapse to
 *     ONE key, so a single rename still covers the pair (pair-rename preserved);
 *   - a master / un-mirrored bunker → its own `id` (unique per obstacle), so two
 *     distinct obstacles sharing a `positionName` get INDEPENDENT keys.
 *
 * Mirrors are linked by the explicit `masterId` field (set by computeMirrors /
 * VisionScan / BunkerEditorPage) — NOT by an id suffix (two variants exist in
 * prod: `_mirror` and `_m`, and masters carry random suffixes), so suffix rules
 * are unreliable. See docs/DESIGN_DECISIONS.md (layout bunker-naming re-key).
 *
 * Decision (A), Jacek 2026-06-04: overlay layer ONLY — no global /layouts write,
 * no masterId backfill on the 4 legacy layouts (Prague/PLX/Tampa/sample) that
 * predate the masterId convention. Those keep per-bunker-id keys (names
 * preserved by the migration below; mirror pair-rename simply doesn't propagate
 * there — accepted, they're frozen). Current + future layouts are authored via
 * the editor/VisionScan, which stamp masterId → fully correct.
 */

/** Stable per-obstacle key: master's id for a mirror, own id otherwise. */
export function bunkerStableKey(b) {
  return (b && (b.masterId || b.id)) || null;
}

/**
 * Normalize an overlay's stored name maps into ONE stableKey-keyed map,
 * preserving the currently-rendered names exactly (lazy migration — the result
 * is persisted on the overlay's next write by LayoutDetailPage).
 *
 * Sources, low→high precedence (name-keyed currently supersedes id-keyed):
 *   1. legacy id-keyed `bunkerNames` ({ [bunkerId]: name }) → mapped to stableKey
 *   2. `bunkerNameOverrides` — already stableKey-keyed (post-migration, kept) OR
 *      legacy positionName-keyed (expanded to every bunker with that name)
 * Stale keys (no matching bunker / positionName) are dropped.
 *
 * @param {Array<{id, masterId?, positionName?}>} bunkers - base geometry
 * @param {{bunkerNames?: object, bunkerNameOverrides?: object}} overlay
 * @returns {Object<string,string>} stableKey → display name
 */
export function normalizeBunkerNames(bunkers, overlay) {
  const list = Array.isArray(bunkers) ? bunkers : [];
  const validKeys = new Set(list.map(bunkerStableKey).filter(Boolean));
  const byId = new Map(list.map(b => [b.id, b]));
  const posToKeys = new Map(); // positionName → Set(stableKey)
  for (const b of list) {
    const p = b.positionName;
    if (!p) continue;
    if (!posToKeys.has(p)) posToKeys.set(p, new Set());
    posToKeys.get(p).add(bunkerStableKey(b));
  }

  const out = {};
  // 1. legacy id-keyed bunkerNames → stableKey (id may be a mirror id → master).
  for (const [id, name] of Object.entries(overlay?.bunkerNames || {})) {
    const b = byId.get(id);
    const key = b ? bunkerStableKey(b) : (validKeys.has(id) ? id : null);
    if (key) out[key] = name;
  }
  // 2. bunkerNameOverrides — stableKey-keyed (keep) or positionName-keyed (expand).
  for (const [k, name] of Object.entries(overlay?.bunkerNameOverrides || {})) {
    if (validKeys.has(k)) { out[k] = name; continue; }   // already migrated
    const keys = posToKeys.get(k);                        // legacy positionName
    if (keys) for (const key of keys) out[key] = name;
    // else: stale key (no bunker, no positionName) → dropped
  }
  return out;
}

/** Display name for a bunker given a normalized stableKey→name map. */
export function displayNameForBunker(b, normalizedMap) {
  return (normalizedMap && normalizedMap[bunkerStableKey(b)]) || b.positionName || b.name || '';
}
