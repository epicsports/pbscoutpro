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
import { useUserProfiles } from '../hooks/useUserNames';
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

  // Display name + email + createdAt lookup for all rendered uids (bug B1
  // — previously card fell back to `uid.slice(0,6)` when no linked
  // player, showing raw UID fragments). Firestore /users/{uid} is the
  // canonical source. createdAt used for sort + "recently joined" badge.
  const allUids = useMemo(
    () => [...new Set([...activeUids, ...pendingUids])],
    [activeUids, pendingUids],
  );
  const profiles = useUserProfiles(allUids);

  // Sort active members by createdAt desc (newest first) so admin can
  // audit recent joins at the top of the list (2026-04-24 retire-team-
  // code brief, Variant 3 reactive moderation). Nulls sort last —
  // legacy users predating the § 49 `createdAt` bootstrap field.
  const sortedActiveUids = useMemo(() => {
    const toMillis = (uid) => {
      const c = profiles[uid]?.createdAt;
      if (!c) return 0;
      if (typeof c.toMillis === 'function') return c.toMillis();
      if (typeof c.seconds === 'number') return c.seconds * 1000;
      if (c instanceof Date) return c.getTime();
      return 0;
    };
    return [...activeUids].sort((a, b) => toMillis(b) - toMillis(a));
  }, [activeUids, profiles]);

  // "Recently joined" window — fixed 7d per brief (adjust constant if
  // Jacek wants longer/shorter). createdAt may still be loading for some
  // uids when this runs — those get 0 and fail the predicate, which is
  // the right call (don't flash a false NEW badge before data arrives).
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const recentJoinCutoff = Date.now() - SEVEN_DAYS_MS;
  const isRecentJoiner = (uid) => {
    const c = profiles[uid]?.createdAt;
    if (!c) return false;
    const ms = typeof c.toMillis === 'function' ? c.toMillis()
      : typeof c.seconds === 'number' ? c.seconds * 1000
      : c instanceof Date ? c.getTime()
      : 0;
    return ms > 0 && ms >= recentJoinCutoff;
  };
  const newThisWeekCount = sortedActiveUids.filter(isRecentJoiner).length;

  // Caller-side admin context for inline role chip editing (bug B2).
  // `adminCount` passed to each card so the 'admin' chip on the last
  // admin can be disabled with a clear reason — no way to accidentally
  // leave the workspace without any admin.
  const currentUserRoles = user ? getRolesForUser(workspace, user.uid) : [];
  const isCurrentUserAdmin = hasRole(currentUserRoles, 'admin')
    || workspace?.adminUid === user?.uid;
  const adminCount = useMemo(() => (
    activeUids.filter(uid => {
      const roles = getRolesForUser(workspace, uid);
      return hasRole(roles, 'admin') || workspace?.adminUid === uid;
    }).length
  ), [activeUids, workspace]);

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
                const profile = profiles[uid] || null;
                return (
                  <PendingMemberCard
                    key={uid}
                    workspaceSlug={workspace.slug}
                    uid={uid}
                    linkedPlayer={linkedPlayer}
                    team={team}
                    displayName={profile?.displayName || null}
                    email={profile?.email || null}
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
            subCount={newThisWeekCount > 0
              ? (t('members_new_this_week', newThisWeekCount) || `${newThisWeekCount} nowych w tym tygodniu`)
              : null}
          />
          {activeUids.length === 0 ? (
            <EmptyState
              icon="👥"
              text={t('members_empty') || 'Brak aktywnych członków.'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
              {sortedActiveUids.map(uid => {
                const roles = getRolesForUser(workspace, uid);
                const linkedPlayer = linkedByUid.get(uid) || null;
                const team = linkedPlayer?.teamId ? teamById.get(linkedPlayer.teamId) : null;
                const isMe = user?.uid === uid;
                const isWorkspaceAdmin = hasRole(roles, 'admin') || workspace?.adminUid === uid;
                const profile = profiles[uid] || null;
                return (
                  <MemberCard
                    key={uid}
                    workspaceSlug={workspace.slug}
                    uid={uid}
                    roles={roles}
                    isMe={isMe}
                    isWorkspaceAdmin={isWorkspaceAdmin}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    adminCount={adminCount}
                    linkedPlayer={linkedPlayer}
                    team={team}
                    displayName={profile?.displayName || null}
                    email={profile?.email || null}
                    isRecentJoiner={isRecentJoiner(uid)}
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

function SectionHeader({ label, count, subCount, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm, flexWrap: 'wrap' }}>
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
      {subCount && (
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
          color: COLORS.success,
          letterSpacing: 0.3,
        }}>{subCount}</div>
      )}
    </div>
  );
}
