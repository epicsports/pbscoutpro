/**
 * App-wide constants that aren't design tokens or i18n strings.
 * Theme tokens live in theme.js; translated copy lives in i18n.js.
 */

/**
 * Default workspace slug for new user signups (§ 49 unified auth model).
 * New /users/{uid} docs get defaultWorkspace: 'ranger1996' on first
 * sign-in. The user still enters a workspace code manually at
 * enterWorkspace — "auto-join, nie auto-login" per 2026-04-23 decision.
 * When the code resolves to this slug, enterWorkspace skips the pending-
 * approval gate and mirrors user.roles → workspace.userRoles[uid].
 * Non-default workspaces continue to gate new joiners through
 * pendingApprovals.
 */
export const DEFAULT_WORKSPACE_SLUG = 'ranger1996';

/**
 * Default role array assigned to new /users/{uid} documents. Used as
 * bootstrap only — authoritative role is workspace.userRoles[uid] once
 * admin has touched a user via Members page. Reader logic in
 * useWorkspace: workspace.userRoles takes precedence when non-empty;
 * falls back to user.roles otherwise.
 */
export const DEFAULT_USER_ROLES = ['player'];
