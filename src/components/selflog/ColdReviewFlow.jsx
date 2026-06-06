import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Btn, Modal } from '../ui';
import HotSheet from './HotSheet';
import * as ds from '../../services/dataService';
import { makeMeta } from '../../utils/observationMeta';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';

/**
 * ColdReviewFlow — claim flow Phase 1b (W4): the player picks an EXISTING
 * scouted point they were assigned to and adds their self-log after the fact.
 *
 * Distinct from the live-match HotSheet (auto-grabs the recent pending point)
 * and the PPT hot-log (W5 flat /selfReports/). Matcher-free (the pick IS the
 * point id) + propagator-free (player ∈ assignments[] → §57 slot-meta stamps
 * directly). Self-contained: entry CTA → per-event picker → reused HotSheet
 * wizard + a read-only coach-context strip.
 *
 * Reads via ds.fetchColdReviewCandidates (events_index 30d → rollup enumerate →
 * live-selfLogs freshness filter — NO collectionGroup('points') scan). Quiet at
 * N=0 (renders nothing) per the sparse-assignment reality.
 *
 * @param {string} playerId  - the linked player's global id (assignments key)
 * @param {string} uid       - auth uid (scoutedBy + playerLinkedUid stamp)
 * @param {string|null} teamId - for the shared breakout-variant pool
 * @param {Array} layouts     - merged layouts (resolve bunkers per picked event)
 * @param {string|null} controlledEventId - when set (PPT cross-type picker, §63),
 *        skip the own CTA and open the picker directly, scoped to this event.
 * @param {Function} onControlledClose - close handler for the controlled picker.
 */
export default function ColdReviewFlow({ playerId, uid, teamId, layouts, controlledEventId = null, onControlledClose }) {
  const [candidates, setCandidates] = useState(null); // null = loading, [] = none
  const [picker, setPicker] = useState(false);
  const [active, setActive] = useState(null);         // candidate being logged | null
  const [saving, setSaving] = useState(false);

  const layoutsById = useMemo(() => {
    const m = new Map();
    (layouts || []).forEach(l => m.set(l.id, l));
    return m;
  }, [layouts]);

  const load = useCallback(() => {
    if (!playerId) { setCandidates([]); return undefined; }
    let cancelled = false;
    ds.fetchColdReviewCandidates(playerId)
      .then(rows => { if (!cancelled) setCandidates(rows); })
      .catch(() => { if (!cancelled) setCandidates([]); });
    return () => { cancelled = true; };
  }, [playerId]);

  useEffect(() => load(), [load]);

  // Group candidates per event (preserves the newest-event-first order from the
  // service, then ascending point order within each event).
  const groups = useMemo(() => {
    const byEvent = new Map();
    (candidates || []).forEach(c => {
      if (!byEvent.has(c.eventId)) {
        byEvent.set(c.eventId, { eventId: c.eventId, eventName: c.eventName, eventDate: c.eventDate, rows: [] });
      }
      byEvent.get(c.eventId).rows.push(c);
    });
    return [...byEvent.values()];
  }, [candidates]);

  // Externally-controlled mode (PPT cross-type picker) — scope to one event,
  // open the picker directly, hide the own CTA.
  const externallyControlled = controlledEventId != null;
  const visibleGroups = useMemo(
    () => (externallyControlled ? groups.filter(g => g.eventId === controlledEventId) : groups),
    [groups, externallyControlled, controlledEventId],
  );

  const activeLayout = active?.layoutId ? layoutsById.get(active.layoutId) : null;

  const handleSave = useCallback(async ({ breakout, breakoutVariant, outcome, shots, variants }) => {
    if (!active || !playerId) return;
    setSaving(true);
    try {
      const { eventId, mid, pid, isTraining, side, slot, layoutId } = active;
      const logData = { breakout, breakoutVariant, outcome };
      // 1. self-log on the picked point
      if (isTraining) await ds.setPlayerSelfLogTraining(eventId, mid, pid, playerId, logData);
      else await ds.setPlayerSelfLog(eventId, mid, pid, playerId, logData);
      // 2. shot docs (synthetic bunker-center coords; addSelfLogShot stamps
      //    source/workspaceSlug/playerLinkedUid + bumps the layout aggregate)
      const bunkers = activeLayout?.bunkers || [];
      for (const [targetBunker, result] of Object.entries(shots || {})) {
        const b = bunkers.find(bb => (bb.positionName || bb.name) === targetBunker);
        const shotDoc = {
          playerId, scoutedBy: uid, breakout, breakoutVariant,
          targetBunker, result, x: b?.x ?? 0.5, y: b?.y ?? 0.5,
          layoutId, tournamentId: eventId,
        };
        if (isTraining) await ds.addSelfLogShotTraining(eventId, mid, pid, shotDoc);
        else await ds.addSelfLogShot(eventId, mid, pid, shotDoc);
      }
      // 3. §57 slot-meta — player ∈ assignments[] so we stamp the slot directly
      //    (propagator-free). Dot-notation so sibling slots aren't clobbered.
      const metaUpdate = { [`${side}.playersMeta.${slot}`]: makeMeta('self', uid) };
      if (shots && Object.keys(shots).length > 0) metaUpdate[`${side}.shotsMeta.${slot}`] = makeMeta('self', uid);
      if (typeof outcome === 'string' && outcome.startsWith('elim_')) {
        metaUpdate[`${side}.eliminationsMeta.${slot}`] = makeMeta('self', uid);
      }
      if (isTraining) await ds.updateTrainingPoint(eventId, mid, pid, metaUpdate);
      else await ds.updatePoint(eventId, mid, pid, metaUpdate);
      // 4. shared breakout-variant usage
      if (breakoutVariant && teamId) {
        const v = (variants || []).find(vv => vv.variantName === breakoutVariant);
        if (v) await ds.incrementVariantUsage(teamId, v.id);
      }
    } finally {
      setSaving(false);
      setActive(null);
      load(); // refetch — the saved point drops out of the candidate set
    }
  }, [active, activeLayout, playerId, uid, teamId, load]);

  const n = candidates?.length || 0;
  if (!playerId || candidates === null) return null;          // loading
  if (!externallyControlled && n === 0) return null;          // quiet CTA at N=0

  const pickerOpen = externallyControlled ? true : picker;
  const closePicker = externallyControlled ? onControlledClose : () => setPicker(false);

  return (
    <>
      {/* ── Entry CTA — amber (interactive). Own-panel mode only (hidden when the
           PPT picker drives this flow via controlledEventId). ── */}
      {!externallyControlled && (
      <div
        onClick={() => setPicker(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: SPACE.md,
          minHeight: TOUCH.minTarget + 8,
          margin: `${SPACE.md}px 0`,
          padding: `${SPACE.md}px ${SPACE.lg}px`,
          background: `${COLORS.accent}14`,
          border: `1px solid ${COLORS.accent}40`,
          borderRadius: RADIUS.lg,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <span style={{ fontSize: 18 }}>📝</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
            color: COLORS.accent, letterSpacing: '-.1px',
          }}>
            Complete {n} point{n === 1 ? '' : 's'}
          </div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 }}>
            Add your self-log to points you were scouted in
          </div>
        </div>
        <span style={{ fontFamily: FONT, fontSize: 16, color: COLORS.accent, opacity: 0.7 }}>›</span>
      </div>
      )}

      {/* ── Point picker — grouped per event, whole-row tap. ── */}
      <Modal open={pickerOpen} onClose={closePicker} title="Review a point">
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          {visibleGroups.length === 0 && (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
              textAlign: 'center', padding: `${SPACE.lg}px 0`,
            }}>
              Nothing to complete.
            </div>
          )}
          {visibleGroups.map(g => (
            <div key={g.eventId}>
              {/* Per-event section header (#111827 panel elevation) */}
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
                letterSpacing: 0.5, textTransform: 'uppercase', color: COLORS.textMuted,
                padding: `${SPACE.xs}px ${SPACE.sm}px`, marginBottom: SPACE.xs,
                background: COLORS.surface, borderRadius: RADIUS.sm,
                display: 'flex', justifyContent: 'space-between', gap: SPACE.sm,
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.eventName}</span>
                {g.eventDate && <span style={{ flexShrink: 0, fontWeight: 500 }}>{g.eventDate}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
                {g.rows.map(c => (
                  <div
                    key={`${c.mid}_${c.pid}`}
                    onClick={() => { setPicker(false); setActive(c); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: SPACE.md,
                      minHeight: 52,
                      padding: `${SPACE.sm}px ${SPACE.md}px`,
                      background: COLORS.surfaceDark,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: RADIUS.md,
                      cursor: 'pointer',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>
                        Point {c.pointNo}
                      </div>
                      {c.coachOutcome && (
                        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 1 }}>
                          {c.coachOutcome}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* ── Self-log wizard (reused HotSheet) + read-only coach-context strip. ── */}
      {active && (
        <HotSheet
          open={!!active && !saving}
          onClose={() => setActive(null)}
          layout={activeLayout}
          playerId={playerId}
          teamId={teamId}
          points={[]}
          onSave={handleSave}
          contextStrip={<CoachContextStrip candidate={active} />}
        />
      )}
    </>
  );
}

// Read-only context: what the scout recorded for the picked point. Recessed,
// neutral — never amber (informational), never pre-fills the player's answer.
function CoachContextStrip({ candidate }) {
  return (
    <div style={{
      margin: `${SPACE.sm}px 0 ${SPACE.xs}px`,
      padding: `${SPACE.sm}px ${SPACE.md}px`,
      background: '#0b1120',
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.md,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase', color: COLORS.textMuted, marginBottom: 2,
      }}>
        Coach recorded
      </div>
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim }}>
        {candidate.eventName} · Point {candidate.pointNo}
        {candidate.coachOutcome ? ` · ${candidate.coachOutcome}` : ''}
      </div>
    </div>
  );
}
