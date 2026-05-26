# Firestore rules coverage audit — 2026-05-23

> **Snapshot.** Source-of-truth = `firestore.rules` at main HEAD on the date below. Re-run if rules change.
> **Main HEAD at snapshot:** `c2fb9ba` (the rules tightening of gap #2 had already been released live via `firebase deploy --only firestore:rules` ahead of the merge — see § 49.10 in `DESIGN_DECISIONS.md`).

---

## Verdict

**No real-exploitable holes. Workspace isolation enforced server-side. No UI-only sensitive ops. No dev-open clauses.**

The rule set is well-structured: every workspace-scoped match uses a slug-bound helper, every UI guard is backed by an equivalent (or stricter) rule, and every acknowledged-deferred item is either contained by the invited-only workspace model or scheduled for an explicit later phase.

---

## 1. Access matrix

### Global (root) collections

| Path | READ | CREATE | UPDATE | DELETE |
|---|---|---|---|---|
| `/users/{uid}` | `auth != null` | self (`uid == auth.uid`) | **self** + allow-list `['displayName','email','linkSkippedAt']` ‖ **super_admin** + allow-list `['disabled','disabledAt','disabledBy','reEnabledAt']` | *implicit-deny* |
| `/leagues/{id}` | `auth != null` | super_admin | super_admin | super_admin |
| `/players/{id}` | `auth != null` | `isSuperAdmin OR isWorkspaceAdminOf(ownerWorkspaceId)` | same + `ownerWorkspaceId` immutable | super_admin |
| `/teams/{id}` | `auth != null` | `isSuperAdmin OR isWorkspaceAdminOf(ownerWorkspaceId)` | same + `ownerWorkspaceId` immutable | super_admin |
| `{path=**}/selfReports/{sid}` *(collection-group rule)* | `auth != null` | — *(per-doc workspace rule applies)* | — | — |

### Workspace-scoped (`/workspaces/{slug}/…`)

| Path | READ | CREATE | UPDATE | DELETE |
|---|---|---|---|---|
| `/workspaces/{slug}` | `auth != null` *(login/join probe)* | self in `members[]` | `isAdmin(slug)` ‖ self-join envelope ‖ self-leave envelope (both narrow allow-list `members/userRoles/pendingApprovals` ± `lastAccess`) | `isAdmin(slug)` |
| `/config/{doc}` | `isMember` | `isAdmin` | `isAdmin` | `isAdmin` |
| `/players/{pid}` | `isMember` | `isCoach` | `isCoach` ‖ self-link (`linkedUid == auth.uid`, narrow keys) ‖ self-edit (`linkedUid == auth.uid`, narrow profile keys) ‖ self-unlink | `isCoach` |
| `/players/{pid}/selfReports/{sid}` | `isMember` | `isLinkedSelfPlayer(slug,pid)` *(§ 49.10)* | `isCoach(slug) OR isLinkedSelfPlayer(slug,pid)` | same |
| `/pendingSelfReports/{sid}` | `isMember && data.uid == auth.uid` | `isMember && req.data.uid == auth.uid` | same | same |
| `/teams/{tid}` (+ subcoll `{document=**}`) | `isMember` | `isCoach` | `isCoach` | `isCoach` |
| `/layouts/{lid}` (+ subcoll) | `isMember` | `isCoach` | `isCoach` | `isCoach` |
| `/events_index/{eid}` | `isMember` | `isScout` | `isScout` | `isScout` |
| `/tournaments/{tid}` (+ subcoll) | `isMember` | `isScout` | `isScout` | `isScout` |
| `/tournaments/.../shots/{sid}` *(carve-out)* | `isMember` | `isScout` ‖ `isSelfLogShotCreate` (`isPlayer + source=='self' + scoutedBy==uid`) | `isScout` ‖ `isSelfLogShotOwned` | same |
| `/trainings/{trid}` (+ subcoll) | `isMember` | `isScout` | `isScout` | `isScout` |
| `/trainings/.../shots/{sid}` *(carve-out)* | `isMember` | `isScout` ‖ `isSelfLogShotCreate` | `isScout` ‖ `isSelfLogShotOwned` | same |

### Helpers (predicates)

- `isSuperAdmin` = bootstrap-email (`jacek@epicsports.pl`) ‖ `users/{uid}.globalRole == 'super_admin'`
- `isAdmin(slug)` = `isSuperAdmin ‖ rolesOf(slug,uid) ⊃ 'admin' ‖ wsData(slug).adminUid == uid`
- `isWorkspaceAdminOf(slug)` = `adminUid == uid` *(no super_admin / no role-array — the Phase 3.c.2 ownership-gate predicate)*
- `isCoach > isScout > isPlayer` via `userRoles[uid]` *(coach implies admin etc.)*
- `isMember = uid in members[]`
- `isLinkedSelfPlayer(slug, pid)` = `isPlayer(slug) && exists(/.../players/{pid}) && get(/.../players/{pid}).data.get('linkedUid', null) == request.auth.uid` *(§ 49.10, 2026-05-23)*

---

## 2. Workspace isolation — ✅ enforced server-side

Every workspace-scoped match uses `isMember(slug)` / `isCoach(slug)` / `isScout(slug)` / `isAdmin(slug)`, each evaluating `request.auth.uid in wsData(slug).members` (or the role map). The `slug` is bound by the URL path — a user from workspace A **cannot read/write** anything under `/workspaces/B/…` unless they're in B's `members[]`. Confirmed across every workspace match block — no path bypasses the slug-scoped helper.

The only cross-workspace exposure is the **global** collections (`/users/`, `/leagues/`, `/players/`, `/teams/`, collection-group `selfReports`) — by design (see gap #3).

---

## 3. Role model → rules enforcement

| Role | Rule helper | Server-enforced? |
|---|---|---|
| `super_admin` | `isSuperAdmin` (globalRole ‖ bootstrap email) | ✅ |
| `workspace_admin` | `isAdmin(slug)` (4 paths) · `isWorkspaceAdminOf(slug)` (adminUid only, for global `/teams/`+`/players/`) | ✅ |
| `coach` | `isCoach(slug)` (admin ‖ role-array `'coach'`) | ✅ |
| `scout` | `isScout(slug)` (coach+ ‖ role-array `'scout'`) | ✅ |
| `player` | `isPlayer(slug)` (role-array `'player'` only) | ✅ |
| `viewer` | **no helper** — covered by `isMember`; no write privileges to enforce | UI-label only — no gap |

---

## 4. UI-only gates — none unbacked

Cross-referenced every sensitive UI guard against the rules:

| UI gate | Surface | Rule that backs it |
|---|---|---|
| `SuperAdminGuard` `/admin/leagues` | `/leagues/{id}` writes | `write: isSuperAdmin()` ✓ |
| `SuperAdminGuard` `/admin/players` | global `/players/` writes | `create/update: isSuperAdmin ‖ isWorkspaceAdminOf` (intentionally **looser** than UI per § 65.2 multi-tenant design) |
| `SuperAdminGuard` `/admin/teams` | global `/teams/` writes | same |
| `AdminGuard` `/debug/flags` | `workspaces/{slug}/config/flags` | `write: isAdmin(slug)` ✓ |
| `AdminGuard` `/settings/members` | workspace doc `members`/`userRoles` | workspace `update: isAdmin(slug)` ✓ |
| `transferAdmin` flow | workspace doc `adminUid` + roles | `update: isAdmin(slug)` ✓ |
| `leaveWorkspaceSelf` | workspace doc self-removal | self-leave envelope (third update branch) ✓ |
| `softDisableUser` | `/users/{uid}.disabled` | super_admin + narrow allow-list ✓ |

No sensitive op is gated UI-only.

---

## 5. Gap list

| # | Path / op | Severity | Status | Fix surface |
|---|---|---|---|---|
| **1** | `workspaces/ranger1996.adminUid` → deleted Auth uid `JDDCmHSQ…` | **theoretical** (Auth account deleted; UIDs aren't recycled; no realistic auth path) | ✅ **CLOSED 2026-05-27** — repointed to Jacek's live uid (`OPAHJZa6fROpL7DPVCN3lQiQRr52`); dead-uid tombstone cleared (585 → 584 `userRoles` keys); `adminTransferredAt` stamped | one-shot `scripts/migration/repoint_adminuid.cjs` (+ `repoint_adminuid.cmd` wrapper, `65cd563f`); executed by Jacek with admin-SDK creds |
| **2** | `/workspaces/{slug}/players/{pid}/selfReports/{sid}` write didn't cross-check `pid` against `linkedUid` | theoretical (invited-only) | ✅ **SHIPPED 2026-05-23** (`c2fb9ba`, § 49.10) | CREATE = `isLinkedSelfPlayer(slug,pid)`; UPDATE/DELETE = `isCoach OR isLinkedSelfPlayer` (carve-out required for § 70 matcher + Stage 4 override) |
| **3** | `/users/`, `/players/`, `/leagues/`, collection-group `selfReports` all have `READ: auth != null` | **by-design** (intentional cross-workspace shared resources); PII surface on `/users/` + `/players/` (`email`, `displayName`, `pbliId`, `nationality`, `age`) | **DEFERRED** → Phase 3.c.3 / § 65.3 Q4 | scoped read (same-workspace ‖ public-fields allow-list) — significant design work, deferred until multi-tenant onboarding |
| **4** | `isWorkspaceAdminOf` branch on `/teams/` + `/players/` is inert in prod (one workspace, one super_admin) | **by-design** | **SMOKE owed at workspace #2 onboarding** (not a fix; § 65.7.5 noted) | re-verify the rule fires correctly when a non-super workspace_admin exists in production |

### Related but separate (out of scope of this audit's gap list)

- ~~**`isSelfLogShotCreate` `playerId` field claim**~~ — ✅ **CLOSED 2026-05-27** (gap α fix; `fix/gap-alpha-shot-playerid`). Both `isSelfLogShotCreate` and `isSelfLogShotOwned` now perform `get(/players/{playerId})` and require `data.get('linkedUid', null) == request.auth.uid`. PRE-FLIGHT (2026-05-27 discovery) confirmed only MatchPage's PLAYER self-log flow hits these helpers and writes `playerId = own linked-player.id` (namespace GLOBAL); KIOSK + post-hoc propagator + PPT all ride `isScout` / different collection and are unaffected. Data-quality follow-up (NOT security): KIOSK `scoutedBy = activePlayer.linkedUid` misattribution at `KioskLobbyOverlay.jsx:193` — tagged for the data-trust workstream.
- **gap β — self-join `userRoles[self]` value validation** — surfaced by the 2026-05-27 3.c.2 write-discovery (post-audit). The self-join + self-leave envelopes (`firestore.rules:192-206`) included `userRoles` in their `affectedKeys` allow-list with no VALUE constraint, allowing a direct-SDK writer to set `userRoles[self]=['admin']` (and/or `userRoles[OTHER-UID]=['admin']`). **✅ CLOSED 2026-05-27** via `fix/gap-beta-selfrole-validation` (rules-only): new helper `isSelfJoinRoleValue` enforces `userRoles[auth.uid] ∈ {[], ['player']}`, plus an own-key gate restricting the diff on the userRoles map to only `[auth.uid]`. Both checks short-circuited by `!('userRoles' in affectedKeys)` so returning-member re-entry (writes that omit userRoles) is unaffected. PRE-FLIGHT confirmed SELF-KEY-ONLY client write semantics. **Deferred defense-in-depth sibling closed 2026-05-27** (`295c6bcb`, merge of `fix/users-create-value-check`): `/users/{uid}` `allow create` now constrains `roles` ∈ {`[]`, `['player']`} and `globalRole` ∈ {null, absent}. Rules-only deploy via `firebase deploy --only firestore:rules`. All known 2026-05-27 3.c.2-discovery hardening follow-ups (gap α, gap β, gap β sibling) are now CLOSED.

---

## How to re-run this audit

1. Read `firestore.rules` end to end.
2. Grep for every `match /…/` block + the helper it uses; produce the matrix above.
3. Grep code for every UI guard (`SuperAdminGuard`, `AdminGuard`, `RouteGuard`) and trace the write surface — verify a matching rule exists.
4. Walk every collection-group rule and check the per-doc rule below it.
5. List `if true` / blanket `allow read, write` clauses → expect **zero**.
6. Refresh gap list with new findings + statuses.
