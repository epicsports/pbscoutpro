import React, { useMemo, useState } from 'react';
import { Btn, Input, Modal } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';

// Phase 2.3.c — Search-and-select overlay for the sister team picker.
// Used by TeamFormModal "Change ▾" / "Add child team" actions.
//
// Excludes:
//   - self (no self-parent)
//   - descendants (cycle prevention via parentTeamId chain walk)
//   - retired teams
//
// Props:
//   open
//   onClose
//   allTeams      — full /teams/ array
//   excludeId     — the team being edited (own ID) — must be excluded from results
//   mode          — 'parent' (showing parent candidates) | 'child' (showing potential children)
//   onSelect      — (teamId: string) => void
export default function TeamPickerModal({ open, onClose, allTeams, excludeId, mode = 'parent', onSelect }) {
  const [search, setSearch] = useState('');

  // Compute descendant set (transitively, via parentTeamId chain) to exclude
  const descendantSet = useMemo(() => {
    const set = new Set();
    if (!excludeId) return set;
    let frontier = new Set([excludeId]);
    for (let depth = 0; depth < 10; depth++) {
      const next = new Set();
      for (const t of allTeams) {
        if (t.parentTeamId && frontier.has(t.parentTeamId) && !set.has(t.id)) {
          set.add(t.id);
          next.add(t.id);
        }
      }
      if (next.size === 0) break;
      frontier = next;
    }
    return set;
  }, [allTeams, excludeId]);

  const candidates = useMemo(() => {
    let result = allTeams.filter(t =>
      t.id !== excludeId &&
      !descendantSet.has(t.id) &&
      !t.retiredAt,
    );
    if (mode === 'parent') {
      // Parent candidates: prefer teams that are not themselves children (top of hierarchy)
      // Per § 63.15.2.X.1 2-level hierarchy convention. Still show all to allow flexibility.
    } else if (mode === 'child') {
      // Child candidates: exclude teams that already have a parent (would make 3-level)
      result = result.filter(t => !t.parentTeamId);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => (t.name || '').toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allTeams, excludeId, descendantSet, mode, search]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'parent' ? 'Pick parent team' : 'Pick child team'}
      footer={<Btn variant="default" onClick={onClose}>Cancel</Btn>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
        <Input value={search} onChange={setSearch} placeholder="Search team name…" autoFocus />
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
        }}>
          {candidates.length === 0
            ? 'No matching candidates'
            : `${candidates.length} candidate${candidates.length === 1 ? '' : 's'}`}
          {mode === 'parent' && (
            <span> · descendants + self + retired excluded</span>
          )}
          {mode === 'child' && (
            <span> · teams already having a parent excluded</span>
          )}
        </div>
        <div style={{
          maxHeight: 400, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: SPACE.xs, borderRadius: RADIUS.md,
          background: COLORS.surfaceDark,
        }}>
          {candidates.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); onClose(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE.sm,
                padding: '10px 12px', borderRadius: RADIUS.sm,
                background: 'transparent', border: `1px solid ${COLORS.border}`,
                color: COLORS.text, fontFamily: FONT, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', textAlign: 'left', minHeight: 44,
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${COLORS.accent}10`; e.currentTarget.style.borderColor = COLORS.accent + '60'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = COLORS.border; }}
            >
              <span style={{ flex: 1 }}>
                {t.name || '—'}
                {t.leagues?.length ? (
                  <span style={{ color: COLORS.textMuted, fontWeight: 500, fontSize: 11, marginLeft: 6 }}>
                    {t.leagues.join('/')}
                  </span>
                ) : null}
              </span>
              {t.externalId && (
                <code style={{ color: COLORS.textMuted, fontSize: 10 }}>
                  extId {String(t.externalId).slice(0, 8)}…
                </code>
              )}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
