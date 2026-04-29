/**
 * Squad metadata — single source of truth for training squad colors + names.
 * Used by TrainingScoutTab, TrainingCoachTab, SquadEditor, etc.
 *
 * § 53 (Custom Squad Names + 5-squad limit, 2026-04-28):
 *   - 5th squad `purple` added (was 4-squad limit per § 32).
 *   - `defaultName` (Ranger/Ring/Rage/Rush/Rebel) is the brand default for
 *     fresh trainings; `name` (R1-R5) is the legacy fallback for trainings
 *     created before § 53 (no `squadNames` field on the training doc).
 *   - Per-training custom names live in `training.squadNames` (Firestore
 *     map keyed by squad key). Resolver: getSquadName(training, key).
 */
export const SQUADS = [
  { key: 'red',    name: 'R1', defaultName: 'Ranger', color: '#ef4444' },
  { key: 'blue',   name: 'R2', defaultName: 'Ring',   color: '#3b82f6' },
  { key: 'green',  name: 'R3', defaultName: 'Rage',   color: '#22c55e' },
  { key: 'yellow', name: 'R4', defaultName: 'Rush',   color: '#eab308' },
  { key: 'purple', name: 'R5', defaultName: 'Rebel',  color: '#a855f7' },
];

export const SQUAD_KEYS = SQUADS.map(s => s.key);
export const SQUAD_ORDER = SQUAD_KEYS; // alias for clarity at call sites

export const squadByKey = (k) => SQUADS.find(s => s.key === k);
export const squadColor = (k) => squadByKey(k)?.color || '#64748b';

// Legacy raw label (R1-R5) — only used as fallback when training context
// is unavailable (e.g. global stats views). Prefer getSquadName(training, k).
export const squadName = (k) => squadByKey(k)?.name || k;

// Default brand name (Ranger/Ring/Rage/Rush/Rebel) — used at training-creation
// time and as the fallback when an explicit squadNames slot is empty/missing.
export const squadDefaultName = (k) => squadByKey(k)?.defaultName || squadName(k);

// Object format for quick lookup: { red: { name, color, defaultName }, ... }
export const SQUAD_MAP = Object.fromEntries(
  SQUADS.map(s => [s.key, { name: s.name, defaultName: s.defaultName, color: s.color }])
);

/**
 * Resolves the display name for a squad in the context of a given training.
 *
 *   New training (squadNames exists, slot non-empty)  → custom name
 *   New training (squadNames exists, slot missing)    → brand default
 *   Old training (no squadNames field at all)         → legacy R1-R5 label
 *   No training context (e.g. global stats screen)    → legacy R1-R5 label
 *
 * The "no field at all" fallback preserves visual identity for trainings
 * created before § 53 — per Jacek's call: don't migrate, just resolve.
 *
 * Edge case (§ 53.6): if a coach renames any slot in an old training,
 * `dataService.updateTrainingSquadName` writes a single dotted key
 * (`squadNames.red = 'Foo'`). The resulting Firestore doc has a
 * `squadNames` field with only that one slot populated; other slots fall
 * to the brand default branch above (Ring/Rage/Rush/Rebel). Per Brief's
 * Option A — only the explicitly-renamed slot transitions away from
 * legacy; untouched slots adopt brand defaults rather than R2-R5. This
 * matches user expectation that "rename one, the rest become real names
 * too" rather than "rename one, rest stay R-coded".
 */
export function getSquadName(training, squadKey) {
  if (training && training.squadNames && typeof training.squadNames === 'object') {
    const stored = training.squadNames[squadKey];
    if (stored && typeof stored === 'string' && stored.trim()) {
      return stored;
    }
    // squadNames object exists but this slot is empty/missing → brand default
    return squadDefaultName(squadKey);
  }
  // No squadNames field at all → legacy training, use R1-R5
  return squadName(squadKey);
}

/**
 * Builds the full default squadNames object for a fresh training. Always
 * returns all 5 slots so trainings carry the complete vocabulary even if
 * the coach uses only 2-4 squads — switching to 5 mid-training picks up
 * the persisted Rebel default rather than seeing R5 unexpectedly. (Per
 * § 53.5: "tylko gdy 5 squadów" was the persistence semantic; we
 * over-fulfill harmlessly, since extra slots aren't displayed unless
 * squadCount reaches them.)
 */
export function buildDefaultSquadNames() {
  return Object.fromEntries(SQUADS.map(s => [s.key, s.defaultName]));
}
