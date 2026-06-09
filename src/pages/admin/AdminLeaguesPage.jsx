import React, { useMemo, useState } from 'react';
import { useViewAs } from '../../hooks/useViewAs';
import { useAllLeagues, refreshLeagues } from '../../hooks/useLeagues';
import PageHeader from '../../components/PageHeader';
import { Btn, Card, ConfirmModal, EmptyState, MoreBtn, ActionSheet } from '../../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../../utils/theme';
import { deactivateLeague, reactivateLeague } from '../../services/dataService';
import LeagueFormModal from './LeagueFormModal';

// Phase 2.1c — Super admin CRUD for /leagues/ collection.
// Per DESIGN_DECISIONS § 63.15.1 + MULTI_TENANT_MIGRATION_PLAN.md Phase 2 Step 1c.
//
// Defense in depth admin gate:
//   1. <AdminGuard> wraps the route in App.jsx (effectiveIsAdmin from useViewAs)
//   2. Component-level early return (this file) — paranoid safety net
//   3. Firestore rules block writes to /leagues/{leagueId} unless email matches
export default function AdminLeaguesPage() {
  const { effectiveIsAdmin } = useViewAs();
  const leagues = useAllLeagues();
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState(null);   // null = closed; 'new' = create; {id, ...} = edit
  const [actionFor, setActionFor] = useState(null); // league for ActionSheet
  const [confirmDeact, setConfirmDeact] = useState(null);
  const [pending, setPending] = useState(false);

  // Layer 2 admin gate — AdminGuard should have caught non-admins already,
  // but render-time check guards against future routing regressions.
  if (!effectiveIsAdmin) return null;

  const filtered = useMemo(
    () => leagues.filter(L => showInactive ? true : L.active !== false),
    [leagues, showInactive],
  );

  const handleDeactivate = async (id) => {
    setPending(true);
    try { await deactivateLeague(id); await refreshLeagues(); } finally { setPending(false); setConfirmDeact(null); setActionFor(null); }
  };
  const handleReactivate = async (id) => {
    setPending(true);
    try { await reactivateLeague(id); await refreshLeagues(); } finally { setPending(false); setActionFor(null); }
  };

  return (
    <>
      <PageHeader back={{ to: '/' }} title="Leagues admin" />
      <div style={{ padding: SPACE.lg, paddingBottom: 80 }}>

        <div style={{ display: 'flex', gap: SPACE.xs, marginBottom: SPACE.md, alignItems: 'center' }}>
          <Btn variant={!showInactive ? 'accent' : 'default'} size="sm" onClick={() => setShowInactive(false)}>Active</Btn>
          <Btn variant={showInactive ? 'accent' : 'default'} size="sm" onClick={() => setShowInactive(true)}>All</Btn>
          <div style={{ flex: 1 }} />
          <Btn variant="accent" onClick={() => setEditing('new')}>+ New league</Btn>
        </div>

        {filtered.length === 0 && (
          <EmptyState icon="🏷" text={showInactive ? 'No leagues' : 'No active leagues'} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
          {filtered.map(L => {
            const inactive = L.active === false;
            return (
              <Card
                key={L.id}
                title={L.shortName}
                subtitle={`${L.name}${L.region ? ` · ${L.region}` : ''} · ${(L.divisions || []).length} divisions${inactive ? ' · INACTIVE' : ''}`}
                onClick={() => setEditing(L)}
                actions={<MoreBtn onClick={() => setActionFor(L)} />}
              />
            );
          })}
        </div>

        <div style={{ marginTop: SPACE.lg, padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceDark, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, lineHeight: 1.5 }}>
          <div style={{ color: COLORS.textDim, fontWeight: 600, marginBottom: 4 }}>About leagues</div>
          Global resource shared across workspaces. Workspace UI consumes via <code style={{ color: COLORS.text }}>useLeagues</code> hook with constants fallback. Changes visible to all users on next page load.
          <br />Deactivated leagues stay in stored data — historical tournaments tagged with them still resolve. Use "All" filter to see + reactivate.
          <br />Renaming a division regenerates its id; existing stored tournament/team division values are name strings (preserved).
        </div>
      </div>

      <ActionSheet
        open={!!actionFor}
        onClose={() => setActionFor(null)}
        title={actionFor?.shortName}
        actions={actionFor ? [
          { label: 'Edit', onPress: () => { setEditing(actionFor); setActionFor(null); } },
          actionFor.active === false
            ? { label: 'Reactivate', onPress: () => handleReactivate(actionFor.id) }
            : { label: 'Deactivate', danger: true, onPress: () => setConfirmDeact(actionFor) },
        ] : []}
      />

      <ConfirmModal
        open={!!confirmDeact}
        onClose={() => setConfirmDeact(null)}
        title="Deactivate league?"
        message={confirmDeact ? `${confirmDeact.shortName} will be hidden from new tournament/team creation. Existing data preserved. You can reactivate from the All filter.` : ''}
        confirmLabel={pending ? 'Saving...' : 'Deactivate'}
        danger
        onConfirm={() => handleDeactivate(confirmDeact.id)}
      />

      <LeagueFormModal
        open={!!editing}
        onClose={() => setEditing(null)}
        league={editing === 'new' ? null : editing}
      />
    </>
  );
}
