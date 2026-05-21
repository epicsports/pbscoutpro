/**
 * Self-report matcher — § 70 / Klocek 2 Stage 2. Pure resolution logic, no
 * Firestore. Resolves a training selfReport to a point slot.
 *
 *   IDENTITY  — primary locator: assignments.indexOf(playerId) → side + slot.
 *   TEMPORAL  — sequence: a player's reports (by createdAt) align 1:1 to their
 *               located points (by order).
 *   POSITION  — confidence only: the self-reported breakout bunker, mapped to a
 *               synthetic coord, vs the slot's recorded players[slot].
 *
 * See docs/architecture/MULTISOURCE_RECONCILIATION.md § 4.
 */
import { bunkerToPosition } from './bunkerToPosition';

// High/low-confidence cutoff — normalized field distance between the
// self-reported breakout bunker (→ bunkerToPosition) and the slot's recorded
// players[slot] coord. 12% of the normalized field (§ 70 Stage 2 default).
export const POSITION_CONFIDENCE_THRESHOLD = 0.12;

const SIDE_KEYS = ['homeData', 'awayData'];

/**
 * Identity locator. Returns { sideKey, slot } for the point side whose
 * assignments[] contains playerId, or null when the player is not in the point.
 */
export function locatePlayerInPoint(point, playerId) {
  if (!point || !playerId) return null;
  for (const sideKey of SIDE_KEYS) {
    const a = point[sideKey]?.assignments;
    if (Array.isArray(a)) {
      const slot = a.indexOf(playerId);
      if (slot >= 0) return { sideKey, slot };
    }
  }
  return null;
}

/** Firestore Timestamp | null → millis (0 when unresolved / pending). */
export function tsMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return 0;
}

/**
 * Greedy 1:1 sequence alignment for one player: reports sorted by createdAt,
 * points by order, paired up to min(N, M). Surplus on either side is left
 * unpaired (orphan). Deterministic on the FULL input — callers pass every
 * report (propagated or not) so re-runs and late additions yield stable pairs.
 *
 * @returns {Array<{selfReport, point}>}
 */
export function alignSequence(reports, points) {
  const r = [...reports].sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));
  const p = [...points].sort((a, b) => (a.order || 0) - (b.order || 0));
  const n = Math.min(r.length, p.length);
  const pairs = [];
  for (let i = 0; i < n; i += 1) pairs.push({ selfReport: r[i], point: p[i] });
  return pairs;
}

/**
 * Position confidence for an identity-located slot. Resolves the report's
 * breakout bunker NAME → layout bunker doc → synthetic coord (bunkerToPosition,
 * fieldSide from the matched side), compared to the slot's players[slot] coord.
 *
 *   'high'    — within threshold (position corroborates identity)
 *   'low'     — beyond threshold (position contradicts → flag for review)
 *   'unknown' — slot has no recorded coord, or bunker not in the layout
 *               (cannot verify; identity stands — caller treats as write-back)
 */
export function positionConfidence(selfReport, point, sideKey, slot, layoutBunkers) {
  const slotCoord = point?.[sideKey]?.players?.[slot];
  const bunkerName = selfReport?.breakout?.bunker;
  if (!slotCoord || typeof slotCoord.x !== 'number' || !bunkerName) return 'unknown';
  const bunker = (layoutBunkers || []).find(
    b => (b.positionName || b.name) === bunkerName,
  );
  if (!bunker) return 'unknown';
  const synth = bunkerToPosition(bunker, point[sideKey]?.fieldSide || null);
  if (!synth) return 'unknown';
  const dist = Math.hypot(synth.x - slotCoord.x, synth.y - slotCoord.y);
  return dist <= POSITION_CONFIDENCE_THRESHOLD ? 'high' : 'low';
}
