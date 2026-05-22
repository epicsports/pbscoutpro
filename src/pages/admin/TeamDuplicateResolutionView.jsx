import React, { useMemo, useState } from 'react';
import { Btn, Modal } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { playerOnTeam } from '../../utils/playerTeams';
import { retireTeam, setParentTeam } from '../../services/dataService';

// Phase 2.3.c — Duplicate resolution view (inline modal).
// Side-by-side comparison of teams sharing an externalId; admin picks
// the canonical one and the other gets retired (soft delete via
// retiredAt + canonicalReplacementId pointer).
//
// Per § 63.15.2.X.1 mockup-locked decisions:
//   - Recommendation heuristic: children × 100 + tournamentRefs × 5 +
//     playerRefs × 1 + recency (0–50). Tournament refs deferred to MVP
//     (— placeholder, doesn't affect ranking for the 1 known case).
//   - Action checkboxes: "retire other" (default checked), "re-point
//     children to canonical" (default checked when applicable),
//     "re-point tournament/player references" (DISABLED — deferred per
//     § 63.15.2.X.1 / Phase 2.3.d).
//   - Safety note: green ✓ (safe) / yellow ⚠ (mixed) / red ⛔ (orphan risk)
//     based on canonical's child count vs non-canonical's child count.
//
// Props:
//   open
//   onClose
//   dupTeams         — the two (or more) teams sharing externalId
//   allTeams         — full /teams/ array
//   allPlayers       — full /players/ array for ref-count
//   childrenByParent — pre-computed map
export default function TeamDuplicateResolutionView({ open, onClose, dupTeams, allTeams, allPlayers, childrenByParent }) {
  const refCounts = useMemo(() => {
    const counts = {};
    for (const t of dupTeams) {
      const children = (childrenByParent[t.id] || []).filter(c => !c.retiredAt).length;
      const players = (allPlayers || []).filter(p => playerOnTeam(p, t.id)).length;
      counts[t.id] = { children, players, tournaments: null /* deferred */ };
    }
    return counts;
  }, [dupTeams, allPlayers, childrenByParent]);

  const scoredCandidates = useMemo(() => {
    return dupTeams.map(t => {
      const { children, players } = refCounts[t.id] || { children: 0, players: 0 };
      // Weights per § 63.15.2.X.1 — children >> tournaments > recency > players
      const childrenScore = children * 100;
      const playerScore = players * 1;
      // Recency: 0–50 points based on updatedAt freshness
      let recencyScore = 0;
      const ts = t.updatedAt;
      if (ts) {
        try {
          const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
          const daysSince = Math.max(0, (Date.now() - ms) / (1000 * 60 * 60 * 24));
          recencyScore = Math.max(0, 50 - daysSince / 7);
        } catch { /* noop */ }
      }
      const total = childrenScore + playerScore + recencyScore;
      return { team: t, score: total, breakdown: { childrenScore, playerScore, recencyScore } };
    }).sort((a, b) => b.score - a.score);
  }, [dupTeams, refCounts]);

  const recommendedId = scoredCandidates[0]?.team.id || null;
  const [pickedId, setPickedId] = useState(recommendedId);
  const [retireOther, setRetireOther] = useState(true);
  const [rePointChildren, setRePointChildren] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // Re-compute picked when recommended changes (e.g. data shifts)
  React.useEffect(() => { setPickedId(recommendedId); }, [recommendedId]);

  const canonical = dupTeams.find(t => t.id === pickedId);
  const others = dupTeams.filter(t => t.id !== pickedId);
  const otherWithChildren = others.find(o => (childrenByParent[o.id] || []).filter(c => !c.retiredAt).length > 0);

  // Safety note color logic
  const safetyState = useMemo(() => {
    if (!canonical) return null;
    const canonicalChildren = (childrenByParent[canonical.id] || []).filter(c => !c.retiredAt).length;
    const otherChildren = otherWithChildren ? (childrenByParent[otherWithChildren.id] || []).filter(c => !c.retiredAt).length : 0;
    if (otherChildren > 0 && !rePointChildren) {
      return { tone: 'danger', icon: '⛔', message: `${otherWithChildren.name} has ${otherChildren} active ${otherChildren === 1 ? 'child' : 'children'}. Retiring without re-point will orphan them.` };
    }
    if (otherChildren > 0 && rePointChildren) {
      return { tone: 'safe', icon: '✓', message: `${otherChildren} ${otherChildren === 1 ? 'child' : 'children'} will be re-pointed to ${canonical.name}.` };
    }
    if (canonicalChildren > 0) {
      return { tone: 'safe', icon: '✓', message: `${canonical.name} preserves ${canonicalChildren} ${canonicalChildren === 1 ? 'child' : 'children'} — safe.` };
    }
    return { tone: 'neutral', icon: 'ℹ', message: 'No active children involved. Standard retire.' };
  }, [canonical, otherWithChildren, rePointChildren, childrenByParent]);

  const handleConfirm = async () => {
    if (!canonical || !retireOther) return;
    setPending(true);
    setError(null);
    try {
      for (const o of others) {
        // Re-point children to canonical if requested
        if (rePointChildren) {
          const children = (childrenByParent[o.id] || []).filter(c => !c.retiredAt);
          for (const c of children) {
            await setParentTeam(c.id, canonical.id);
          }
        }
        // Retire the non-canonical
        await retireTeam(o.id, {
          reason: `Duplicate of ${canonical.id} (${canonical.name})`,
          canonicalReplacementId: canonical.id,
        });
      }
      onClose();
    } catch (err) {
      console.error('Duplicate resolution failed:', err);
      setError(err?.message || 'Resolution failed — see console');
    } finally {
      setPending(false);
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('pl-PL');
    } catch { return '—'; }
  };

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title={`Resolve duplicate · extId ${dupTeams[0]?.externalId?.slice(0, 12)}…`}
      footer={<>
        <Btn variant="default" onClick={onClose} disabled={pending}>Cancel</Btn>
        <Btn variant="accent" onClick={handleConfirm} disabled={!canonical || !retireOther || pending}>
          {pending ? 'Resolving…' : 'Confirm resolution'}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
          {dupTeams.length} teams share externalId <code style={{ color: COLORS.text }}>{dupTeams[0]?.externalId}</code>. Pick the canonical record. The other will be retired (soft delete, restorable).
        </div>

        {/* Side-by-side comparison cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${dupTeams.length}, 1fr)`,
          gap: SPACE.sm,
        }}>
          {scoredCandidates.map(({ team, breakdown }) => {
            const isPicked = team.id === pickedId;
            const isRecommended = team.id === recommendedId;
            const counts = refCounts[team.id] || {};
            return (
              <button
                key={team.id}
                onClick={() => setPickedId(team.id)}
                disabled={pending}
                style={{
                  display: 'flex', flexDirection: 'column', gap: SPACE.xs,
                  padding: SPACE.sm, borderRadius: RADIUS.md,
                  background: isPicked ? `${COLORS.accent}10` : COLORS.surfaceDark,
                  border: `2px solid ${isPicked ? COLORS.accent : COLORS.border}`,
                  cursor: pending ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontFamily: FONT, color: COLORS.text,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs }}>
                  <input type="radio" checked={isPicked} onChange={() => setPickedId(team.id)} style={{ accentColor: COLORS.accent }} readOnly />
                  <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{team.name || '—'}</span>
                  {isRecommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: `${COLORS.success}20`, color: COLORS.success,
                      letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>recommended</span>
                  )}
                </div>
                <code style={{ fontSize: 10, color: COLORS.textMuted, wordBreak: 'break-all' }}>{team.id}</code>
                <div style={{ fontSize: 11, color: COLORS.textDim, lineHeight: 1.5 }}>
                  <div>Created: {formatTs(team.createdAt)}</div>
                  <div>Updated: {formatTs(team.updatedAt)}</div>
                  <div>Children: <strong style={{ color: COLORS.text }}>{counts.children ?? 0}</strong></div>
                  <div>Player refs: <strong style={{ color: COLORS.text }}>{counts.players ?? 0}</strong></div>
                  <div>Tournament refs: <span style={{ color: COLORS.textMuted }}>— (deferred)</span></div>
                  {team.leagues?.length ? <div>Leagues: {team.leagues.join('/')}</div> : null}
                  {team.parentTeamId ? <div style={{ color: COLORS.textMuted }}>(child of another team)</div> : null}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: SPACE.xs }}>
                  Score: <strong style={{ color: COLORS.textDim }}>{Math.round(breakdown.childrenScore + breakdown.playerScore + breakdown.recencyScore)}</strong>
                  <span style={{ marginLeft: 4 }}>
                    (kids {breakdown.childrenScore} + plyrs {breakdown.playerScore} + recency {Math.round(breakdown.recencyScore)})
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action checkboxes */}
        {canonical && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            <CheckboxRow
              checked={retireOther}
              onChange={setRetireOther}
              label={`Retire ${others.length === 1 ? `${others[0].name}` : `${others.length} other docs`}`}
              hint="Sets retiredAt + canonicalReplacementId pointer. Reversible via 🗄 Retired filter."
              disabled={pending}
            />
            <CheckboxRow
              checked={rePointChildren}
              onChange={setRePointChildren}
              label="Re-point children's parentTeamId to canonical"
              hint={otherWithChildren ? `Affects ${(childrenByParent[otherWithChildren.id] || []).filter(c => !c.retiredAt).length} child team(s).` : 'N/A — non-canonical has no active children.'}
              disabled={pending || !otherWithChildren}
            />
            <CheckboxRow
              checked={false}
              onChange={() => {}}
              label="Re-point tournament / player references to canonical"
              hint="Deferred per § 63.15.2.X.1 / Phase 2.3.d. Retired team docs still resolve in lookups — references continue working with '(retired)' indicator in consumer UI."
              disabled
            />
          </div>
        )}

        {/* Safety note */}
        {safetyState && (
          <div style={{
            padding: SPACE.sm, borderRadius: RADIUS.sm,
            background: safetyState.tone === 'danger' ? `${COLORS.danger}18`
              : safetyState.tone === 'safe' ? `${COLORS.success}18`
              : COLORS.surfaceDark,
            border: `1px solid ${safetyState.tone === 'danger' ? COLORS.danger
              : safetyState.tone === 'safe' ? COLORS.success
              : COLORS.border}40`,
            fontFamily: FONT, fontSize: 12,
            color: safetyState.tone === 'danger' ? COLORS.danger
              : safetyState.tone === 'safe' ? COLORS.success
              : COLORS.textDim,
            display: 'flex', alignItems: 'center', gap: SPACE.xs,
          }}>
            <span style={{ fontSize: 16 }}>{safetyState.icon}</span>
            <span style={{ flex: 1 }}>{safetyState.message}</span>
          </div>
        )}

        {error && (
          <div style={{ padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.danger}18`, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function CheckboxRow({ checked, onChange, label, hint, disabled }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: SPACE.xs,
      padding: SPACE.xs, borderRadius: RADIUS.sm,
      background: disabled ? 'transparent' : COLORS.surfaceDark,
      border: `1px solid ${COLORS.border}`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      minHeight: 44,
    }}>
      <input type="checkbox" checked={checked} onChange={e => !disabled && onChange(e.target.checked)} disabled={disabled}
        style={{ accentColor: COLORS.accent, marginTop: 2, width: 16, height: 16 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{label}</div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{hint}</div>
      </div>
    </label>
  );
}
