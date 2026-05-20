import React, { useState } from 'react';
import { Btn, Select } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';

// Phase 2.3.c — Retire confirmation content, branches on children count.
// Per § 63.15.2.X.1 children-orphan safety pattern (mirror of Phase 2.2.c
// aliasIds[] safety for players, adapted for parent-child structure).
//
// Props:
//   team        — the team being retired
//   children    — array of child team objects (parentTeamId === team.id, active only)
//   allTeams    — full teams array for the "re-point to" picker
//   pending     — true while retire in-flight
//   error       — string|null
//   onCancel    — () => void
//   onConfirm   — (childAction: 'orphan'|'rePoint'|'cascade', newParentForChildren: id|null) => Promise
export default function ChildrenOrphanWarning({ team, children, allTeams, pending, error, onCancel, onConfirm }) {
  const hasChildren = children.length > 0;
  const [childAction, setChildAction] = useState(hasChildren ? 'rePoint' : 'orphan');
  const [newParentId, setNewParentId] = useState('');

  // Eligible re-point candidates: active parents (no parentTeamId), not the team itself
  const candidates = allTeams.filter(t =>
    !t.retiredAt && !t.parentTeamId && t.id !== team.id,
  );

  const submit = () => {
    if (childAction === 'rePoint' && !newParentId) return;
    onConfirm(childAction, childAction === 'rePoint' ? newParentId : null);
  };

  const canSubmit = !pending && (
    !hasChildren ||
    childAction === 'orphan' ||
    childAction === 'cascade' ||
    (childAction === 'rePoint' && newParentId)
  );

  return (
    <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
      {hasChildren ? (
        <>
          <p style={{ margin: '0 0 8px' }}>
            <strong style={{ color: COLORS.text }}>{team.name}</strong> currently has {children.length} active {children.length === 1 ? 'child team' : 'child teams'}:
          </p>
          <div style={{ padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceDark, maxHeight: 100, overflowY: 'auto', marginBottom: SPACE.sm }}>
            {children.map(c => (
              <div key={c.id} style={{ fontFamily: FONT, fontSize: 12, color: COLORS.text, padding: '2px 0' }}>
                · {c.name || '—'}
                {c.leagues?.length ? <span style={{ color: COLORS.textMuted }}>{` (${c.leagues.join('/')})`}</span> : null}
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 600, color: COLORS.text, marginBottom: SPACE.xs }}>How to handle the children?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs, marginBottom: SPACE.sm }}>
            <RadioOption
              label="Re-point to another parent"
              hint="Children's parentTeamId set to selected canonical team. Recommended for duplicate cleanup."
              value="rePoint" current={childAction} onChange={setChildAction}
            />
            {childAction === 'rePoint' && (
              <div style={{ paddingLeft: 24, marginTop: -4, marginBottom: 4 }}>
                <Select value={newParentId} onChange={setNewParentId} style={{ width: '100%' }}>
                  <option value="">— pick new parent —</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.externalId ? ` (extId ${c.externalId.slice(0, 8)}…)` : ''}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <RadioOption
              label="Cascade retire (retire children too)"
              hint="Each child gets retiredAt set. Reversible per-child via Restore action."
              value="cascade" current={childAction} onChange={setChildAction}
            />
            <RadioOption
              label="Orphan (do nothing)"
              hint="Children keep parentTeamId pointing to retired team. Acceptable per § 63.15.2.X.1 — references continue resolving."
              value="orphan" current={childAction} onChange={setChildAction}
            />
          </div>
        </>
      ) : (
        <p style={{ margin: '0 0 8px' }}>
          This sets <code style={{ color: COLORS.text }}>retiredAt</code> on the team doc. Team will be hidden from active lists but data preserved for audit. Restorable via the 🗄 Retired filter.
        </p>
      )}

      {error && (
        <div style={{ marginTop: SPACE.sm, padding: SPACE.sm, borderRadius: RADIUS.sm, backgroundColor: `${COLORS.danger}18`, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: SPACE.xs, justifyContent: 'flex-end', marginTop: SPACE.md }}>
        <Btn variant="default" onClick={onCancel} disabled={pending}>Cancel</Btn>
        <Btn variant="danger" onClick={submit} disabled={!canSubmit}>
          {pending ? 'Retiring…' : 'Retire team'}
        </Btn>
      </div>
    </div>
  );
}

function RadioOption({ label, hint, value, current, onChange }) {
  const selected = current === value;
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', gap: SPACE.xs,
      padding: SPACE.xs, borderRadius: RADIUS.sm,
      background: selected ? `${COLORS.accent}10` : 'transparent',
      border: `1px solid ${selected ? COLORS.accent + '60' : COLORS.border}`,
      cursor: 'pointer', minHeight: 44,
    }}>
      <input type="radio" checked={selected} onChange={() => onChange(value)}
        style={{ accentColor: COLORS.accent, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>{label}</div>
        <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{hint}</div>
      </div>
    </label>
  );
}
