/**
 * Scout point autosave draft — § 89 / B5.
 *
 * Local pre-commit buffer for the MatchPage scout editor. Debounced
 * localStorage snapshot of the in-progress point (draftA / draftB +
 * outcome + ancillary state); restores on return; clears on commit /
 * explicit discard. Adds resilience to refresh / tab close / accidental
 * back-nav. **Does NOT** change the commit path — `savePoint` stays
 * outcome-gated; concurrent Firestore `status:'partial'` semantics
 * are orthogonal and untouched.
 *
 * Pattern mirrors the § 48.8 PPT WizardShell persistence
 * (`components/ppt/WizardShell.jsx:56-87`) — NOT the pptPendingQueue
 * (that's the offline-write retry queue, a different concern).
 *
 * Key shape:
 *   scout_draft__<kind>__<eventId>__<containerId>__<scoutingSide>__<editingId||'new'>
 *
 *   kind         ∈ { 'tournament', 'training' }
 *   eventId      = tournamentId  | trainingId
 *   containerId  = matchId       | matchupId
 *   scoutingSide ∈ { 'home', 'away' }
 *   editingId    = saved-point id when editing existing, 'new' otherwise
 *
 * Both `scoutingSide` and `editingId||'new'` are load-bearing — they
 * prevent cross-side bleed and prevent a new-shell draft from hydrating
 * into an existing-point edit context.
 *
 * TTL = 24h. Bigger than WizardShell's 10 min because a scout point edit
 * can sit longer (cross-day tournament context). Stale snapshots are
 * dropped without restore; load returns null and the user starts fresh.
 *
 * All storage ops wrapped in try/catch — quota / private mode / parse
 * errors are non-fatal (user's autosave silently disabled rather than
 * the scout flow crashing).
 */

export const SCOUT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Build the deterministic localStorage key for a draft scope.
 * Returns null when any required identifier is missing — callers should
 * skip persist/load in that case (e.g. URL not yet resolved).
 */
export function buildScoutDraftKey({
  kind,             // 'tournament' | 'training'
  eventId,          // tournamentId | trainingId
  containerId,      // matchId | matchupId
  scoutingSide,     // 'home' | 'away'
  editingId,        // saved-point id | null/undefined → 'new'
}) {
  if (!kind || !eventId || !containerId || !scoutingSide) return null;
  const ed = editingId || 'new';
  return `scout_draft__${kind}__${eventId}__${containerId}__${scoutingSide}__${ed}`;
}

/**
 * Load a persisted draft for the given key. Returns null when:
 *   - localStorage unavailable / parse error
 *   - key absent
 *   - snapshot older than TTL (stale-draft ghost guard — load-bearing)
 *   - shape malformed
 */
export function loadScoutDraft(key) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (!data.updatedAt || Date.now() - data.updatedAt > SCOUT_DRAFT_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Persist a draft snapshot under `key`. Stamps `updatedAt` server-side
 * (=device clock) so loadScoutDraft can apply the TTL guard.
 *
 * Callers must apply their own "non-pristine" guard upstream — this
 * helper does NOT inspect snapshot content. Persisting an empty/pristine
 * draft would leak keys and risk ghost-restore of empty editors.
 *
 * Quota / private-mode failures are swallowed — user gets no autosave
 * but the scout flow is unaffected.
 */
export function saveScoutDraft(key, snapshot) {
  if (!key || !snapshot) return;
  try {
    const payload = { ...snapshot, updatedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private mode — non-fatal */
  }
}

/**
 * Remove a persisted draft. Called on commit success, explicit discard,
 * and ClearAll. Idempotent (no-op if key absent or storage unavailable).
 */
export function clearScoutDraft(key) {
  if (!key) return;
  try { localStorage.removeItem(key); } catch { /* non-fatal */ }
}

/**
 * Non-pristine predicate — true iff the snapshot has any user content
 * worth persisting. Mirrors the brief: "≥1 player placed OR any shot/
 * elim/outcome." Comment + annotations alone don't justify a save
 * (they're auxiliary; an empty editor with stray text would otherwise
 * ghost-restore).
 *
 * Accepts the full snapshot shape `{ draftA, draftB, outcome, ... }`.
 */
export function isScoutDraftNonPristine(snapshot) {
  if (!snapshot) return false;
  const sides = [snapshot.draftA, snapshot.draftB].filter(Boolean);
  for (const d of sides) {
    if (Array.isArray(d.players) && d.players.some(Boolean)) return true;
    if (Array.isArray(d.shots) && d.shots.some(arr => Array.isArray(arr) && arr.length > 0)) return true;
    if (Array.isArray(d.elim) && d.elim.some(Boolean)) return true;
  }
  if (snapshot.outcome) return true;
  return false;
}
