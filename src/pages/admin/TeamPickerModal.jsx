import React, { useMemo } from 'react';
import EntityPickerModal from '../../components/EntityPickerModal';
import { COLORS, FONT } from '../../utils/theme';

// Phase 2.3.c — Search-and-select overlay for the sister team picker.
// Used by TeamFormModal "Change ▾" / "Add child team" actions.
//
// Migrated onto the shared EntityPickerModal (§ search/filter Stage D): search
// via matchEntity (name + externalId), exclusions via excludeIds + predicate.
//
// Excludes:
//   - self (no self-parent)
//   - descendants (cycle prevention via parentTeamId chain walk)
//   - retired teams
//   - (child mode) teams that already have a parent (would make 3-level)
//
// Props:
//   open, onClose
//   allTeams      — full /teams/ array
//   excludeId     — the team being edited (own ID) — excluded from results
//   mode          — 'parent' (parent candidates) | 'child' (potential children)
//   onSelect      — (teamId: string) => void
export default function TeamPickerModal({ open, onClose, allTeams, excludeId, mode = 'parent', onSelect }) {
  // Descendant set (transitive, via parentTeamId chain) — cycle prevention.
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

  const excludeIds = useMemo(
    () => [excludeId, ...descendantSet].filter(Boolean),
    [excludeId, descendantSet],
  );

  // Retired always excluded; child mode also excludes teams that already have a
  // parent (keeps the 2-level hierarchy per § 63.15.2.X.1).
  const predicate = (t) => !t.retiredAt && (mode !== 'child' || !t.parentTeamId);

  const renderItem = (t) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
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
    </span>
  );

  return (
    <EntityPickerModal
      open={open}
      onClose={onClose}
      title={mode === 'parent' ? 'Pick parent team' : 'Pick child team'}
      items={allTeams}
      fields={['name', 'externalId']}
      excludeIds={excludeIds}
      predicate={predicate}
      onPick={(id) => onSelect(id)}
      renderItem={renderItem}
      note={mode === 'parent'
        ? 'Descendants, self + retired excluded'
        : 'Retired + teams that already have a parent excluded'}
      emptyText="No matching candidates"
    />
  );
}
