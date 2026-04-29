/**
 * Death Reason Taxonomy — canonical dictionary.
 *
 * See docs/DESIGN_DECISIONS.md § 54 for the full spec, § 54.4 for the
 * coach UI flow (2-step stage → reason), and § 54.5 for the schema.
 *
 * Implementation choices (Brief A pre-implementation escalation 2026-04-29):
 *   D1.A — slot-indexed array schema preserved (no migration to per-playerId map).
 *   D2.no-migrate — legacy storage values stay literal in old docs;
 *                   normalize on read via `normalizeLegacyStage` /
 *                   `normalizeLegacyReason`.
 *   D3.four — stage axis is alive | break | inplay | endgame (NOT 3).
 *   D4.inline 2-step — coach picker inline in LivePointTracker player card.
 *   D5.full label alignment — PPT player wizard labels + coach labels share
 *                             the same canonical PL/EN strings via i18n keys.
 */

// Canonical stage keys (when in the point did the elim happen).
export const DEATH_STAGES = ['alive', 'break', 'inplay', 'endgame'];

// Canonical reason keys (how was player hit). Reason is captured ONLY when
// stage ∈ {break, inplay, endgame} per § 54.3. When stage='alive', reason=null.
export const DEATH_REASONS = [
  'gunfight',
  'przejscie',
  'faja',
  'na_przeszkodzie',
  'za_kare',
  'nie_wiem',
  'inaczej',
];

// Validators
export function isValidStage(s) { return DEATH_STAGES.includes(s); }
export function isValidReason(r) { return DEATH_REASONS.includes(r); }

// Reason capture window per § 54.3. NOTE: § 54.3 was amended 2026-04-29 to
// 4 stages; reason is now allowed for endgame too (was 3 stages before).
export function reasonAllowed(stage) {
  return stage === 'break' || stage === 'inplay' || stage === 'endgame';
}

/**
 * Legacy → canonical stage mapping. Pre-§ 54 storage used HotSheet's outcome
 * field with values {alive, elim_break, elim_mid, elim_midgame, elim_end}.
 * No batch migration per D2 — normalize on every read.
 *
 * Coach legacy `eliminationCauses[i]` array did NOT carry a stage at all
 * (single flat reason field mixed semantics — see normalizeLegacyReason).
 * For coach-legacy data the stage is null unless we can infer it from the
 * special legacy reason value 'break' (which semantically meant "elim on
 * break, reason unknown" per Brief A discovery 2026-04-29).
 */
export function normalizeLegacyStage(rawStage) {
  if (!rawStage) return null;
  if (DEATH_STAGES.includes(rawStage)) return rawStage; // already canonical
  if (rawStage === 'elim_break') return 'break';
  if (rawStage === 'elim_mid' || rawStage === 'elim_midgame') return 'inplay';
  if (rawStage === 'elim_end') return 'endgame';
  return null; // unknown legacy key → null (no automatic <5s mapping per § 54.5)
}

/**
 * Legacy → canonical reason mapping. Pre-§ 54 coach `eliminationCauses[i]`
 * used 6 flat values mixing stage and reason semantics:
 *   'break'    → semantically "elim on break, reason unknown" → STAGE break, REASON null
 *   'gunfight' → reason gunfight, stage unknown
 *   'przebieg' → renamed to canonical 'przejscie'
 *   'faja'    → unchanged
 *   'kara'    → renamed to canonical 'za_kare'
 *   'unknown' → renamed to canonical 'nie_wiem'
 *
 * The ambiguity around legacy 'break' is why this function returns a
 * STRUCTURED hint — caller can distinguish "this was a stage hint, not a
 * reason" via the `inferredStage` field.
 */
export function normalizeLegacyReason(rawReason) {
  if (!rawReason) return { reason: null, inferredStage: null };
  if (DEATH_REASONS.includes(rawReason)) return { reason: rawReason, inferredStage: null };
  switch (rawReason) {
    case 'break':    return { reason: null, inferredStage: 'break' }; // legacy stage-as-reason
    case 'gunfight': return { reason: 'gunfight', inferredStage: null };
    case 'przebieg': return { reason: 'przejscie', inferredStage: null }; // RENAMED
    case 'faja':     return { reason: 'faja', inferredStage: null };
    case 'kara':     return { reason: 'za_kare', inferredStage: null }; // RENAMED
    case 'unknown':  return { reason: 'nie_wiem', inferredStage: null }; // RENAMED
    default:         return { reason: null, inferredStage: null }; // unknown legacy key
  }
}

/**
 * Builds a normalized per-player elimination record from new-schema or
 * legacy data. Output matches the structured shape in § 54.5:
 *   { eliminated, deathStage, deathReason, deathReasonText, eliminationTime,
 *     filledBy, filledAt }
 *
 * Accepts either:
 *   (a) New schema: an object with `deathStage` field already set
 *   (b) Legacy slot-indexed: { eliminated, eliminationTime, eliminationCause }
 *       (callers extract per-slot then pass an object here)
 */
export function buildEliminationRecord({
  stage = null, reason = null, reasonText = null,
  eliminated = null, eliminationTime = null,
  filledBy = null, filledAt = null,
}) {
  // If stage is explicit, derive `eliminated` from it; otherwise keep input.
  const elimDerived = eliminated == null
    ? (stage != null && stage !== 'alive')
    : !!eliminated;
  const finalStage = isValidStage(stage) ? stage : null;
  const finalReason = (reasonAllowed(finalStage) && isValidReason(reason)) ? reason : null;
  const finalReasonText = (finalReason === 'inaczej') ? (reasonText || '') : null;
  return {
    eliminated: elimDerived,
    deathStage: finalStage,
    deathReason: finalReason,
    deathReasonText: finalReasonText,
    eliminationTime,
    filledBy,
    filledAt: filledAt || (filledBy ? new Date().toISOString() : null),
  };
}

/**
 * Read-side helper for slot-indexed team data (point.homeData / point.awayData).
 * Returns a normalized eliminations array of length 5 — each entry either null
 * (player not eliminated / no data) or an elimination record per § 54.5.
 *
 * Reads new-schema fields `eliminationStages` + `eliminationReasons` if present,
 * falls back to legacy `eliminationCauses` with normalize otherwise.
 */
export function readNormalizedEliminations(teamData) {
  if (!teamData) return [null, null, null, null, null];
  const elim = teamData.eliminations || [];
  const times = teamData.eliminationTimes || [];
  const newStages = teamData.eliminationStages || [];
  const newReasons = teamData.eliminationReasons || [];
  const legacyCauses = teamData.eliminationCauses || [];
  const out = [];
  for (let i = 0; i < 5; i += 1) {
    if (!elim[i]) { out.push(null); continue; }
    let stage = normalizeLegacyStage(newStages[i]);
    let reason = isValidReason(newReasons[i]) ? newReasons[i] : null;
    // Legacy fallback only when new-schema fields are absent for this slot.
    if (!stage && !reason && legacyCauses[i]) {
      const norm = normalizeLegacyReason(legacyCauses[i]);
      reason = norm.reason;
      stage = stage || norm.inferredStage;
    }
    out.push(buildEliminationRecord({
      stage, reason,
      eliminated: true,
      eliminationTime: times[i] != null ? times[i] : null,
      filledBy: 'coach', // best guess for legacy; new writes set explicitly
    }));
  }
  return out;
}
