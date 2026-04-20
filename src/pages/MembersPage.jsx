/**
 * MembersPage — § 38.4 + § 38.13 admin-only workspace member management.
 *
 * Route: /settings/members, wrapped by <AdminGuard> in App.jsx. Shows:
 *   1. Pending approvals (if any) — PendingMemberCard rows
 *   2. Active members — MemberCard rows with inline role edit + ⋮ menu
 *   3. Sign-out / back navigation via PageHeader
 *
 * Role transfer is launched from MemberCard menu → RoleTransferModal.
 */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EmptyState } from '../components/ui';
import PendingMemberCard from '../components/settings/PendingMemberCard';
import MemberCard from '../components/settings/MemberCard';
import RoleTransferModal from '../components/settings/RoleTransferModal';
import { useWorkspace } from '../hooks/useWorkspace';
import { usePlayers, useTeams } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { getRolesForUser, hasRole } from '../utils/roleUtils';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

export default function MembersPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { workspace, user } = useWorkspace();
  const { players } = usePlayers();
  const { teams } = useTeams();
  const [transferTarget, setTransferTarget] = useState(null);

  // Build uid → linkedPlayer map for O(1) lookup in both card lists.
  const linkedByUid = useMemo(() => {
    const m = new Map();
    (players || []).forEach(p => {
      if (p.linkedUid) m.set(p.linkedUid, p);
    });
    return m;
  }, [players]);

  const teamById = useMemo(() => {
    const m = new Map();
    (teams || []).forEach(team => m.set(team.id, team));
    return m;
  }, [teams]);

  const members = Array.isArray(workspace?.members) ? workspace.members : [];
  const pendingUids = Array.isArray(workspace?.pendingApprovals) ? workspace.pendingApprovals : [];

  // Active = in members[] AND not in pendingApprovals[] AND has non-empty roles.
  // We intentionally include pending-but-has-roles edge case (post-approval
  // race window) by only excluding actual pending set.
  const pendingSet = new Set(pendingUids);
  const activeUids = members.filter(uid => {
    if (pendingSet.has(uid)) return false;
    const roles = getRolesForUser(workspace, uid);
    return roles.length > 0;
  });

  const handleTransferSuccess = () => {
    setTransferTarget(null);
    navigate('/');
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100dvh', paddingBottom: 80 }}>
      <PageHeader
        back={{ to: '/' }}
        title={t('members_page_title') || 'Członkowie workspace\u2019u'}
        subtitle={workspace?.name}
      />

      <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, display: 'flex', flexDirection: 'column', gap: SPACE.xl }}>

        {/* ─── Pending approvals ─── */}
        {pendingUids.length > 0 && (
          <section>
            <SectionHeader
              label={t('members_pending_header') || 'Oczekują zatwierdzenia'}
              count={pendingUids.length}
              accent
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
              {pendingUids.map(uid => {
                const linkedPlayer = linkedByUid.get(uid) || null;
                const team = linkedPlayer?.teamId ? teamById.get(linkedPlayer.teamId) : null;
                return (
                  <PendingMemberCard
                    key={uid}
                    workspaceSlug={workspace.slug}
                    uid={uid}
                    linkedPlayer={linkedPlayer}
                    team={team}
                    email={null}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Active members ─── */}
        <section>
          <SectionHeader
            label={t('members_active_header') || 'Członkowie'}
            count={activeUids.length}
          />
          {activeUids.length === 0 ? (
            <EmptyState
              icon="👥"
              text={t('members_empty') || 'Brak aktywnych członków.'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
              {activeUids.map(uid => {
                const roles = getRolesForUser(workspace, uid);
                const linkedPlayer = linkedByUid.get(uid) || null;
                const team = linkedPlayer?.teamId ? teamById.get(linkedPlayer.teamId) : null;
                const isMe = user?.uid === uid;
                const isWorkspaceAdmin = hasRole(roles, 'admin') || workspace?.adminUid === uid;
                return (
                  <MemberCard
                    key={uid}
                    workspaceSlug={workspace.slug}
                    uid={uid}
                    roles={roles}
                    isMe={isMe}
                    isWorkspaceAdmin={isWorkspaceAdmin}
                    linkedPlayer={linkedPlayer}
                    team={team}
                    email={null}
                    onTransferAdmin={setTransferTarget}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <RoleTransferModal
        open={!!transferTarget}
        target={transferTarget}
        onClose={() => setTransferTarget(null)}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}

function SectionHeader({ label, count, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        letterSpacing: 0.6, textTransform: 'uppercase',
        color: accent ? COLORS.accent : COLORS.textMuted,
      }}>{label}</div>
      {typeof count === 'number' && (
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
          color: COLORS.textDim,
        }}>({count})</div>
      )}
    </div>
  );
}
