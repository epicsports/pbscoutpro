/**
 * Role helpers — pure functions, unit-testable, no Firestore deps.
 *
 * See docs/DESIGN_DECISIONS.md § 38 (v2.1) for the full contract:
 * - Multi-role per user (`workspace.userRoles[uid] = ['admin', 'coach', 'player']`)
 * - Five roles: admin, coach, scout, viewer, player
 * - Admin determination: roles array OR adminUid OR ADMIN_EMAILS (emergency)
 * - pbliId / pbliIdFull are the canonical field names (not pbleaguesId)
 */

export const ROLES = ['admin', 'coach', 'scout', 'viewer', 'player'];

// Roles admin can ASSIGN via the Members page. Viewer is retired from the
// active role matrix (§ 49, 2026-04-23) — existing viewer users keep
// their role for read-only legacy semantics, but new assignments don't
// offer it. `ROLES` remains intact so legacy data still parses correctly
// via getRolesForUser / parseRoles.
export const ASSIGNABLE_ROLES = ['admin', 'coach', 'scout', 'player'];

// Emergency restore allowlist. A user from this list becomes admin of any
// workspace where they are a member, independent of userRoles / adminUid.
// NOT a global admin list — only works for workspaces the user joined.
export const ADMIN_EMAILS = ['jacek@epicsports.pl'];

// ─── Role lookups ──────────────────────────────────────────────────────

/**
 * Defensive shim — accepts the canonical array shape OR legacy string
 * shapes (comma-separated, pipe-separated, single role, undefined) and
 * always returns a deduped array of role strings.
 *
 * Rationale (2026-04-22 audit): pre-Brief-G migration left some user
 * records with `role: 'scout,coach,admin'` (string). No app code reads
 * users/{uid}.role today — all role gating flows through
 * workspaces/{slug}.userRoles[uid] which is already array-shaped post
 * migration (rolesVersion=2). But if a legacy write path lands a string
 * there, getRolesForUser would have returned [] and silently dropped
 * permissions. This shim survives either shape. Remove once Brief G's
 * full data-migration lands and both writers + all docs are array-only.
 */
export function parseRoles(r) {
  if (Array.isArray(r)) return r.filter(Boolean);
  if (typeof r === 'string') {
    return r.split(/[,|]/).map(s => s.trim()).filter(Boolean);
  }
  return [];
}

export function getRolesForUser(workspace, uid) {
  if (!workspace || !uid) return [];
  return parseRoles(workspace.userRoles?.[uid]);
}

export function hasRole(roles, target) {
  return Array.isArray(roles) && roles.includes(target);
}

export function hasAnyRole(roles, ...targets) {
  return targets.some(t => hasRole(roles, t));
}

// ─── Admin determination — three independent paths, any grants admin ──

export function isAdmin(workspace, user) {
  if (!workspace || !user) return false;
  const roles = getRolesForUser(workspace, user.uid);
  if (hasRole(roles, 'admin')) return true;
  if (workspace.adminUid === user.uid) return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

// User is a workspace member but has an empty roles array — awaiting admin
// approval. Distinct from "not a member at all" (which routes to onboarding).
export function isPendingApproval(workspace, uid) {
  if (!workspace || !uid) return false;
  const roles = getRolesForUser(workspace, uid);
  const isMember = Array.isArray(workspace.members) && workspace.members.includes(uid);
  return roles.length === 0 && isMember;
}

// ─── Capability helpers — "any of" semantics ───────────────────────────

export const canWriteScouting = (roles) => hasAnyRole(roles, 'admin', 'coach', 'scout');
export const canEditTactics   = (roles) => hasAnyRole(roles, 'admin', 'coach');
export const canManageMembers = (roles) => hasRole(roles, 'admin');
export const canWriteSelfLog  = (roles) => hasRole(roles, 'player');
export const canReadOnly      = (roles) => hasRole(roles, 'viewer') && roles.length === 1;

// ─── Route gate — per § 38.6 protected routes matrix ──────────────────

export function canAccessRoute(roles, routePath) {
  // Empty roles (pending approval) — only the two gate screens are allowed.
  if (!Array.isArray(roles) || roles.length === 0) {
    return routePath === '/onboarding/pbleagues' || routePath === '/pending-approval';
  }
  // Admin: unrestricted.
  if (hasRole(roles, 'admin')) return true;
  // Admin-only routes (below are blocked for everyone else).
  if (routePath.startsWith('/settings/members')) return false;
  if (routePath.startsWith('/debug/flags')) return false;
  // Coach: edit teams/tactics/notes + full scouting. Allowed everywhere else.
  if (hasRole(roles, 'coach')) return true;
  // Scout: scouting data writes but not layout editing.
  if (hasRole(roles, 'scout')) {
    if (routePath.startsWith('/layout/') && !routePath.includes('/analytics/')) return false;
    return true;
  }
  // Viewer: read-only everywhere.
  if (hasRole(roles, 'viewer')) return true;
  // Player: MainPage + own stats + own scouted-team read; no match scouting, no layout.
  if (hasRole(roles, 'player')) {
    if (routePath === '/') return true;
    if (routePath.startsWith('/player/')) return true;
    if (routePath.startsWith('/tournament/') && routePath.includes('/team/')) return true;
    if (routePath.includes('/match/')) return false;
    if (routePath.startsWith('/layout/')) return false;
    return false;
  }
  return false;
}

// ─── PBLI (Paint Ball Leagues) ID parsing ──────────────────────────────

// Strip leading `#` + trim. Used to match user input against stored
// first-segment field (players/{X}.pbliId).
export function normalizePbliId(raw) {
  return String(raw || '').replace(/^#/, '').trim();
}
