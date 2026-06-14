# Discovery — "Mask — permission refresh" FIT-blocker (read-only, 2026-06-14)

**Status:** read-only discovery to PREP a fix brief. No code changed. Awaiting Jacek's
test result to disambiguate (see the Test Matrix at the end) — that result decides which
of the two fix paths below we write.

**What "Mask" means here:** Jacek's shorthand for the **ViewAs / "Podgląd jako"** role-
impersonation feature (admin previews the UI as a lower role). Code symbols: `useViewAs`,
`ViewAsContext`, `ViewAsProvider`, `ViewAsPill`/`ViewAsIndicator`, i18n `view_as_*`.

---

## The crucial finding (a tension to resolve with the test)

Two facts from static analysis sit in tension with "permission refresh is a blocker":

1. **ViewAs/Mask is currently RUNTIME-DISABLED.** `src/contexts/ViewAsContext.jsx`
   (Hotfix 2026-04-24, ~lines 8-27): `viewAs` is **always `null`**, `setViewAs` is a
   **no-op**, any persisted sessionStorage value is cleared on mount. The "Podgląd jako"
   surface is a **toast-only placeholder** per § 50 UX direction. So masking does nothing
   today — there is no live impersonation to refresh.

2. **The real permission-refresh path is ALREADY live-reactive — no reload needed.**
   `src/hooks/useWorkspace.jsx`:
   - live `onSnapshot` on `workspaces/{slug}` (~142-150) → `setWorkspace` on any
     `userRoles` / `adminUid` / `members` / `pendingApprovals` change;
   - live `onSnapshot` on `users/{uid}` (~66-74) → `setUserProfile` on `globalRole` change;
   - `roles` + `isAdmin` + `isPendingApproval` are `useMemo`s keyed on those fields, so they
     **recompute on every snapshot**;
   - the App.jsx auth gate (`~124-139`: onboarding / pending-approval / app) is evaluated at
     **render time** from that live context — so e.g. pending→approved flips the gate
     **without a reload**.
   - Roles are **Firestore-only** (no Firebase custom claims / token refresh involved):
     grep finds no `getIdTokenResult` / `customClaims`. Refresh = re-read the doc, which the
     listeners already do.

**So the code says: role changes propagate live, and Mask is off.** If Jacek's test shows
staleness anyway, it is NOT the obvious gate/memo logic — it's one of the runtime suspects
below, OR the blocker actually means "re-enable Mask".

---

## Two interpretations of the blocker → two fix paths

**Interpretation A — "make Mask work" (re-enable ViewAs + refresh on switch).**
The blocker = the Podgląd-jako placeholder should become real: admin masks as coach/scout/
viewer/player, the whole UI re-gates to that role, and un-masking restores. Fix path:
- Re-enable `ViewAsContext` (drop the always-null hotfix), restore sessionStorage persistence
  (NOT localStorage — § 38.10 anti-pattern; resets on tab close by design).
- `useViewAs` already computes `effectiveRoles`/`effectiveIsAdmin` from the **live**
  `useWorkspace` roles (so masked view auto-refreshes if the underlying role changes). Verify
  every gate reads `effectiveRoles`/`effectiveIsAdmin` (RouteGuard, AdminGuard, TabBar,
  useFeatureFlag) — not the raw `roles`/`isAdmin`.
- Keep the `ViewAsPill` always visible while masked (escape hatch, § 38.10).
- This is a Tier-2 surface (UX) → needs Jacek/Opus sign-off, not autonomous.

**Interpretation B — "real permission refresh has a runtime bug".**
The blocker = an admin grants/changes a role (or approves an external user) and the affected
session does NOT update until manual reload. Code says it should be live; if the test
reproduces staleness, check these **runtime suspects** in order:
1. **Swallowed listener permission-error.** The `users/{uid}` listener has an empty error
   handler (`() => { /* leave null */ }`) and the workspace listener's onError isn't shown —
   if a rules change transiently denies the read, the listener dies silently and the session
   goes stale until reload. → add error logging + re-subscribe/backoff.
2. **Cold-load one-shot `getDoc` paths** (`useWorkspace` restore ~78-138 and auto-enter
   ~324-486) render from a one-time read; the `onSnapshot` is supposed to attach right after.
   Verify the listener actually attaches in BOTH paths (a path that renders from getDoc but
   never subscribes would be stale-until-reload).
3. **Multi-tab / external actor.** Confirm the test isn't two tabs where one holds a stale
   subscription; the live model covers same-doc changes, but verify cross-device.
4. **No `rolesVersion` bump on role writes.** `updateUserRoles` / `transferAdmin` /
   `removeMember` / `setUserGlobalRole` do NOT bump any cache-busting marker (only the
   one-time migration sets `rolesVersion:2`). Harmless for the listener-driven UI, but any
   role-GATED cache (e.g. a future role-scoped catalog) would not invalidate. Note for later;
   unlikely to be the FIT symptom.

Interpretation B fix is Tier-1 (logic/regression) once the exact failure point is confirmed.

---

## Write paths (for reference, when the fix is written)
All in `src/services/dataService.js`; all Firestore-only; none bump `rolesVersion`:
- `updateUserRoles(ws, uid, roles)` → `workspaces/{ws}.userRoles[uid]` (UserDetailPage, MemberCard)
- `setUserGlobalRole(uid, role)` → `users/{uid}.globalRole` (UserDetailPage; super-admin only)
- `transferAdmin(ws, from, to)` → `userRoles[*]` + `adminUid` (RoleTransferModal)
- `removeMember(ws, uid)` / `leaveWorkspaceSelf(uid)` → `userRoles[uid]=[]` + members/pending
- `migrateWorkspaceRoles(ws)` → bulk `userRoles` + `rolesVersion:2` (one-time, admin-triggered)

Read/gate consumers: `src/utils/roleUtils.js` (`getRolesForUser`, `isAdmin` 4-path,
`isSuperAdmin`, `hasRole`, `canAccessRoute`), `useWorkspace` (roles/isAdmin/isPendingApproval
memos), `useViewAs` (effective*), `useIsSuperAdmin`, `RouteGuard`, App.jsx `AdminGuard`/
`SuperAdminGuard`, `TabBar`, `useFeatureFlag`.

---

## Test Matrix for Jacek (disambiguates A vs B; exact repro)
Run each with **two accounts / devices**, no manual reload between the change and the check:
1. **Approve a pending external user.** Admin (device 1) grants the pending user a role in
   `/settings/members`. On the pending user's session (device 2), does it flip from the
   "Pending approval" screen into the app **on its own**? (Tests the gate transition.)
2. **Change a member's role coach→viewer.** Does device 2's tab bar / visible features
   re-gate **without reload**? (Tests the memo→UI path.)
3. **Promote/revoke super_admin** (UserDetailPage). Does the target's admin-only access
   appear/disappear live?
4. **Tap "Podgląd jako".** Does anything happen, or is it a toast/no-op? (Confirms Mask is the
   disabled-placeholder → Interpretation A.)

- If **(1)–(3) already work live** and only **(4)** is the gap → **Interpretation A** (re-enable Mask; Tier-2, needs Opus brief + Jacek GO).
- If **(1), (2), or (3) show staleness** (need a reload) → **Interpretation B**; capture WHICH one + whether a console error fired → points straight at suspect #1/#2 above (Tier-1 fix).

---
_Read-only discovery; pairs with DESIGN_DECISIONS § 38 (Security Role System) + § 38.5/§38.10
(ViewAs spec + anti-patterns) and the 2026-04-24 ViewAs runtime-disable hotfix._
