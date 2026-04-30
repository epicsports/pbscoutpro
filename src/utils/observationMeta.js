import { serverTimestamp } from 'firebase/firestore';

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
 *   ts:        server-authoritative timestamp
 *
 * For QuickLogView's zone-derived synthetic positions, callers spread an
 * additional `syntheticZone: 'dorito'|'center'|'snake'` tag so Phase 1b
 * can weight zone-tapped vs canvas-tapped positions differently.
 *
 * @param {'scout'|'self'|'kiosk'} source
 * @param {string|null|undefined} writerUid
 * @returns {{source: string, writerUid: string, ts: object}}
 */
export function makeMeta(source, writerUid) {
  if (!writerUid) {
    console.warn('makeMeta called without writerUid', { source });
  }
  return {
    source,
    writerUid: writerUid || 'unknown',
    ts: serverTimestamp(),
  };
}
