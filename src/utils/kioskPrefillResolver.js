/**
 * KIOSK Prefill Resolver — § 55.4 + § 55.5.
 *
 * Pure function. At wizard open in KIOSK lobby, snapshots coach-set
 * data into a prefill object that step components consume (rendering
 * outlined-amber tiles + hint banners per § 55.5). Player override on
 * any field clears that field's prefill flag — recorded as filledBy:
 * 'self' at save time, distinct from 'coach' for unedited prefills.
 *
 * SOURCES IMPLEMENTED (per CC_BRIEF_KIOSK_C_PREFILL + Hotfix-3-class
 * runtime schema verification 2026-04-29):
 *
 * - **Source A — scouting positions + shots** (§ 11 full FieldCanvas
 *   scouting on this point, NOT Quick Log). Reads positions from
 *   `homeData.players[slot]` (xy objects, per Hotfix #3 schema fix —
 *   players=positions, assignments=IDs) and shot lists from
 *   `homeData.shots[slot]` (after shotsFromFirestore deserialization).
 *   Maps each xy to nearest bunker (15% normalized threshold per § 30).
 *
 * - **Source D — coach Live Tracking elimination** (§ 54). Reads
 *   `point.<side>Data.eliminationStages[slot]` etc. (slot-indexed
 *   per Brief A D1.A schema, NOT `point.eliminations[playerId]` as
 *   § 55.4 spec text claimed — that field doesn't exist). Uses
 *   `readNormalizedEliminations(teamData)` from deathTaxonomy.js to
 *   produce per-slot {deathStage, deathReason, deathReasonText}
 *   regardless of whether storage was new-schema or legacy-cause.
 *
 * SOURCES SKIPPED:
 *
 * - **Source B — drawing on layout** (sposób 1) — separate brief per
 *   § 55.10. Not implemented here; resolver tolerates absence.
 *
 * - **Source C — Quick Log zone narrowing** — Quick Log's `zones`
 *   field is local React state in QuickLogView, never persisted to
 *   `point.<side>Data.zones`. Reading it returns undefined always.
 *   Per Brief C STEP 4.1 escalation default: flag for separate brief
 *   to add zone persistence; skip Source C here. Resolver returns
 *   `bunkerPickerFilter: null` so Krok 1 picker shows full layout-wide
 *   top 6 (no narrowing).
 *
 * KEY TRANSLATION (Hotfix-3-class lesson — verify before trust):
 *
 * Coach Live Tracking writes canonical § 54.1 reason keys:
 *   gunfight / przejscie / faja / na_przeszkodzie / za_kare / nie_wiem / inaczej
 *
 * PPT Step4bDetail uses hyphen+abbreviated slugs:
 *   gunfight / przejscie / faja / na-przeszkodzie / inne / nie-wiem
 *
 * Translation map below. `za_kare` has no PPT equivalent — falls back
 * to no prefill (player picks fresh; coach's reason intel preserved
 * in coach-side data, just not echoed in player wizard). Slug
 * unification can be addressed in a future brief; out of scope here.
 */

import { readNormalizedEliminations } from './deathTaxonomy';
import { getBunkerSide } from './helpers';

const SHOT_DISTANCE_THRESHOLD = 0.15; // § 30 — 15% normalized

function emptyPrefill() {
  return {
    bunker: null,            // { side, bunker, source: 'scouting' } | null
    bunkerPickerFilter: null, // { zone, source: 'quicklog' } | null (Source C — disabled)
    way: null,               // { value, source } | null (Source A — coach scouting rarely tags)
    shots: null,             // { value: [{side, bunker}, ...], source } | null
    stage: null,             // { value: PPT outcome slug, source: 'coach' } | null
    reason: null,            // { value: PPT detail slug, source: 'coach' } | null
    reasonText: null,        // { value, source } | null (for inne free text)
  };
}

// Local nearest-bunker helper that returns the FULL bunker object
// (so caller can use both .positionName and .x/.y for getBunkerSide).
// generateInsights.findNearestBunker returns just the name; we need both.
function findNearestBunkerObj(pos, bunkers) {
  if (!pos || pos.x == null || pos.y == null || !bunkers?.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const b of bunkers) {
    const dx = (b.x - pos.x);
    const dy = (b.y - pos.y);
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = b; }
  }
  if (bestDist > SHOT_DISTANCE_THRESHOLD * SHOT_DISTANCE_THRESHOLD) return null;
  return best;
}

// Source A shots are stored via shotsToFirestore as `{0: [...], 1: [...], ...}`.
// Need shotsFromFirestore equivalent. Inline to avoid cyclical service import.
function shotsFromFirestoreObj(obj, slot) {
  if (Array.isArray(obj)) return obj[slot] || [];
  if (!obj) return [];
  return obj[String(slot)] || obj[slot] || [];
}

// Coach canonical reason key → PPT Step4bDetail slug. za_kare unmapped
// (falls through to undefined → resolver records no reason prefill).
const REASON_CANONICAL_TO_PPT = {
  gunfight: 'gunfight',
  przejscie: 'przejscie',
  faja: 'faja',
  na_przeszkodzie: 'na-przeszkodzie',
  nie_wiem: 'nie-wiem',
  inaczej: 'inne',
  // za_kare: undefined — no PPT slug exists yet
};

// Death stage canonical → PPT outcome slug.
const STAGE_CANONICAL_TO_PPT = {
  alive: 'alive',
  break: 'elim_break',
  inplay: 'elim_midgame',
  endgame: 'elim_endgame',
};

/**
 * Resolves the prefill snapshot for a wizard open. Defensive — never
 * throws; returns emptyPrefill() on missing data so wizard renders
 * vanilla (Tier 1 from § 35) when coach has set nothing.
 *
 * @param {Object} point — Firestore point document
 * @param {string} playerId — KIOSK active player (the player whose tile was tapped)
 * @param {Object} layout — training/match layout (with bunkers + doritoSide)
 * @returns {Object} prefill snapshot — keys per emptyPrefill() shape
 */
export function resolveKioskPrefill(point, playerId, layout) {
  if (!point || !playerId) return emptyPrefill();

  // Find the side + slot the player occupies via assignments lookup.
  // (Hotfix #3: IDs in assignments[], NOT players[].)
  let teamData = null;
  let slotIdx = -1;
  for (const sideKey of ['homeData', 'awayData']) {
    const d = point[sideKey];
    if (!d?.assignments) continue;
    const idx = d.assignments.findIndex(a => a === playerId);
    if (idx >= 0) { teamData = d; slotIdx = idx; break; }
  }
  if (!teamData || slotIdx < 0) return emptyPrefill();

  const result = emptyPrefill();
  const bunkers = layout?.bunkers || [];
  const doritoSide = layout?.doritoSide || 'top';

  // ── Source A: scouting position → bunker ──
  const pos = teamData.players?.[slotIdx];
  const nearest = findNearestBunkerObj(pos, bunkers);
  if (nearest) {
    result.bunker = {
      value: { side: getBunkerSide(nearest.x, nearest.y, doritoSide), bunker: nearest.positionName || nearest.name },
      source: 'scouting',
    };
  }

  // ── Source A: scouting shots → list ──
  const shotsList = shotsFromFirestoreObj(teamData.shots, slotIdx);
  if (Array.isArray(shotsList) && shotsList.length > 0 && bunkers.length > 0) {
    const mapped = shotsList
      .map(s => {
        const b = findNearestBunkerObj(s, bunkers);
        if (!b) return null;
        return {
          side: getBunkerSide(b.x, b.y, doritoSide),
          bunker: b.positionName || b.name,
          // Source A is coach-scouted; result is unknown to coach
          // (coach observes that shot was thrown, doesn't know hit/miss).
          // PPT default-result for prefilled shots is 'unknown' →
          // player can override to hit/miss in Step 3 ShotCell cycle.
          result: 'unknown',
        };
      })
      .filter(Boolean);
    if (mapped.length > 0) {
      result.shots = { value: mapped, source: 'scouting' };
    }
  }

  // ── Source D: coach Live Tracking eliminations ──
  const elims = readNormalizedEliminations(teamData);
  const elim = elims[slotIdx];
  if (elim) {
    if (elim.deathStage) {
      const pptStage = STAGE_CANONICAL_TO_PPT[elim.deathStage];
      if (pptStage) {
        result.stage = { value: pptStage, source: 'coach' };
      }
    }
    if (elim.deathReason) {
      const pptReason = REASON_CANONICAL_TO_PPT[elim.deathReason];
      if (pptReason) {
        result.reason = { value: pptReason, source: 'coach' };
        if (pptReason === 'inne' && elim.deathReasonText) {
          result.reasonText = { value: elim.deathReasonText, source: 'coach' };
        }
      }
      // za_kare and any future canonical reason unmapped to PPT slug
      // produces no reason prefill — player picks fresh in Step 4b.
    }
  }

  return result;
}
