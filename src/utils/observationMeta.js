/**
 * Provenance metadata helper for § 57 multi-source observations.
 *
 * Every write that touches `point.{home,away}Data.{players,shots,eliminations}`
 * also writes a sibling `_meta` entry of this shape so downstream readers
 * (and the Phase 1b propagator + conflict resolver) can reason about WHO
 * recorded the observation and WHEN.
 *
 *   source:    'scout' | 'self' | 'kiosk'
 *   writerUid: identity of the recording user (coach / player / tapped player)
 *   ts:        client millisecond timestamp (Date.now() — number, not Firestore
 *              sentinel). Firestore rejects serverTimestamp() inside array
 *              fields ("Function addDoc() called with invalid data.
 *              serverTimestamp() is not currently supported inside arrays")
 *              and _meta lives inside per-side arrays (playersMeta[],
 *              shotsMeta[], eliminationsMeta[]). Tradeoff: client clock not
 *              server clock — acceptable for § 57 provenance tracking;
 *              § 57.7 conflict resolution does ts comparison which works
 *              equally well with client ms.
 *
 * For QuickLogView's zone-derived synthetic positions, callers spread an
 * additional `syntheticZone: 'dorito'|'center'|'snake'` tag so Phase 1b
 * can weight zone-tapped vs canvas-tapped positions differently.
 *
 * @param {'scout'|'self'|'kiosk'} source
 * @param {string|null|undefined} writerUid
 * @returns {{source: string, writerUid: string, ts: number}}
 */
export function makeMeta(source, writerUid) {
  if (!writerUid) {
    console.warn('makeMeta called without writerUid', { source });
  }
  return {
    source,
    writerUid: writerUid || 'unknown',
    ts: Date.now(),
  };
}
