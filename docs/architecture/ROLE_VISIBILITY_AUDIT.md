# Role Visibility Audit — what each role can READ / SEE

> **Read-only discovery.** Verified against `main @f6ee05c` (`firestore.rules`,
> `src/hooks/useWorkspace.jsx`, `src/components/TabBar.jsx`, tab content).
> No behavior changed. Trigger: a scout login saw layouts + the teams/players base
> but could not pick any tournament/training to scout. Companion to the deferred
> Phase 2.2.d/2.3.d isolation cutover + the FIT gate.

-----

## 1. The model has TWO independent axes — this is the crux

- **Role** = `workspace.userRoles[uid]` (array, cascading): `admin ⊃ coach ⊃ scout`,
  `player` separate, `super_admin` = `users/{uid}.globalRole` (cross-workspace).
  *(rules `isAdmin/isCoach/isScout/isPlayer`, lines 51–77; §63.3 calls userRoles the membership SoT.)*
- **Membership** = `workspace.members[]` (a SEPARATE array). `isMember(slug)` =
  `uid in data.members` *(rules 79–83)*. The workspace doc itself reads on
  `uid in members || isSuperAdmin()` *(255)*.

**At the rules READ layer, ROLE barely matters — MEMBERSHIP does.** Every
workspace-scoped read gates on `isMember` (members[]), not on the role. A scout
member and a coach member read the **same** workspace data. Role differentiates
**writes** + **UI surfaces**, not workspace reads.

-----

## 2. Read-access matrix (rules layer)

|Surface                                                                                |Read gate                           |Who that is                          |
|---------------------------------------------------------------------------------------|------------------------------------|-------------------------------------|
|`players/*`, `teams/*`, `layouts/*`, `layoutAggregates/*`, `leagues/*`                 |`auth != null` (613/673/698/716/533)|**ANY signed-in user — cross-tenant**|
|`users/{uid}`, `invites/*`, `meta/*`, `leaderboards/*`                                 |`auth != null` (164/545/584/734)    |any signed-in                        |
|`users/{uid}/appState/*`                                                               |`auth.uid == uid` (201)             |owner only                           |
|`workspaces/{slug}` (the doc)                                                          |`uid in members || super` (255)     |members + super                      |
|`…/tournaments/*`, `…/trainings/*`, their points/shots                                 |`isMember` (487/509/494/514/501/520)|**members only**                     |
|`…/config`, `…/selfReports`, `…/breakoutVariants`, `…/layoutOverlays`, `…/events_index`|`isMember` (378/406/444/466/479)    |members only                         |
|collectionGroup `selfReports`, `shots`                                                 |`isMember(workspaceSlug)` (217/227) |members only                         |

**Net:** global catalog = read-by-anyone; all workspace data (events, scouted
points, config) = members-only. **Non-members see only the global catalog.**

-----

## 3. UI-surface matrix (what the nav exposes)

|Role (from `userRoles`)|Content tab (TabBar `requiredAny`)|Notes                                                                                                                        |
|-----------------------|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
|scout                  |🎯 Scout (`['scout']`, TabBar:21)  |tab visible by ROLE; its content (`ScoutTabContent`) needs an accessible tournamentId — empty if no workspace events readable|
|coach                  |📊 Coach (`['coach']`, :22)        |+ scout (cascade)                                                                                                            |
|player                 |🏃 Gracz (`['player']`, :23)       |self-log surfaces                                                                                                            |
|admin / super          |settings / Members / admin pages  |role-gated elsewhere                                                                                                         |

- TabBar gates on `effectiveRoles` (userRoles + view-as) — **independent of members[]**.
  → a userRoles-scout SEES the Scout tab even when not a member.
- Event switcher = `TournamentPicker` (lists tournaments AND trainings) — populated
  only from workspaces the user can read (members-only) → empty for non-members.
- Global-catalog surfaces (teams/players via the scout add-team picker; layouts
  library) render because the data is globally readable AND the surface is exposed.

-----

## 4. Diagnosis of the reported symptom

Scout saw **layouts + teams/players base** ✔ but **could not pick any
tournament/training** ✖ — this is the EXACT shape of a **membership gap**:

- Global catalog is `auth != null` → the scout reads teams/players/layouts. **By design.**
- Workspace events gate on `members[]`. Auto-enter discovers workspaces via
  `where('members','array-contains', uid)` (`useWorkspace.jsx:399`); **0 hits →
  NoWorkspaceScreen / no workspace context** (`:396`). The members[] self-heal
  (`arrayUnion(uid)`, :128/:463/:490) only fires **after** entry — it cannot
  bootstrap a uid that is not already a member.

→ **Most likely cause:** the scout has `userRoles[uid]=['scout']` but is **not in
`members[]`** of any workspace with events (role assigned without co-adding to
members, OR a genuinely unassigned/test account). Result: catalog-visible,
events-invisible. **This is not a rules “hole” — it’s a `members[]` ⟷ `userRoles`
consistency gap**, and the events gate keys on `members[]` while §63.3 names
`userRoles` the SoT.

⚠ **Cannot confirm from the repo** — needs a live read of the scout’s account +
workspace doc (`members[]` vs `userRoles[uid]`). Jacek/CC check.

-----

## 5. Findings (ranked)

- **G1 — membership/role split (the symptom).** Workspace reads gate on `members[]`;
  role lives in `userRoles`; the two can drift, and a role-only assignment locks the
  user out of all workspace data. **Decision owed:** should assigning a workspace role
  guarantee `members[]` membership (co-write), or is members[] the intended access gate
  with role layered on top? Reconcile with §63.3.
- **G2 — global catalog is cross-tenant (FIT-critical).** `players/teams/layouts/ leagues/aggregates` are readable by **any** authenticated user. An external team’s
  scout would see the ENTIRE base across all tenants. This is the documented Path-A
  interim (§90.12); the real fix is the deferred **Phase 2.2.d/2.3.d isolation cutover**
  — this audit gives that work teeth before FIT.
- **G3 — role-surface exposure (UX, not rules).** Should a scout see the layouts
  library + full teams/players base at all? Currently yes (global read + exposed
  surfaces). Per-role surface intent is a product decision, separate from the rules.

-----

## 6. Next steps (decisions, not fixes)

1. Live check the affected scout: `members[]` vs `userRoles[uid]` on the workspace doc.
1. Rule on G1: co-write `members[]` on role assignment, or keep members[] as the gate.
1. G2 = the existing deferred isolation cutover — sequence before FIT.
1. G3 = define the per-role surface set (what a scout/coach/player nav should expose).

*Read-only audit. Lands in `docs/architecture/` via CC; no behavior change.*

-----

## 7. Live check results — CC admin-SDK read (2026-06-17)

> Appended by CC. Read-only scan across all `workspaces/*` via the admin SDK,
> comparing each workspace's `userRoles{}` keys against its `members[]` array to
> quantify the G1 drift live (step 6.1). No data written.
> Script: `scripts/migration/role_membership_drift_audit.cjs` (re-runnable).

**Headline: the G1 symptom population is currently EMPTY.** Across both live
workspaces, **0 live accounts** have a role in `userRoles{}` without being in
`members[]`. So the reported scout lockout (catalog visible, no tournament/training
pickable) is **not reproducible from current data** — it has most likely already
self-resolved (the scout was added to `members[]`) or was a transient/test account
since cleaned. (Note: `ranger1996.userRoles` has dropped from the B15-era ~569
stragglers to **22**, so the `cleanup_dead_userroles` sweep has run in the interim.)

| Workspace | Events? | userRoles | members | healthy (role+member) | role-only LIVE (the symptom) | role-only purged | empty-role keys | member-no-role |
|---|---|---|---|---|---|---|---|---|
| `pbfit` | no | 2 | 2 | 2 | **0** | 0 | 0 | 0 |
| `ranger1996` | yes | 22 | 16 | 15 | **0** | 0 | 7 | 1 |

**Two minor shapes remain (feed the G1 decision in §6.2), neither is the reported symptom:**
- **7 empty-role `userRoles` keys** in `ranger1996` — present in the map with `roles=[]`
  (pending-approval / §49 shape, or residual). Decide: prune, or treat as the canonical
  "invited, awaiting role" state.
- **1 member with no role** — reads workspace events (member-gated) but sees no role-gated
  content tab (no Scout/Coach/Gracz surface). This is the *inverse* drift; decide whether
  `members[]` membership should always carry at least one `userRoles` entry.

**Bottom line for the decisions in §6:** the rules model is internally consistent for
live accounts *right now* — there is no active lockout to fix. G1 is therefore a
**preventive policy decision** (should role-assignment co-write `members[]`, §6.2), not
an active-incident cleanup. If the symptom recurs, capture the uid/email at report time
and re-run the script for a targeted read. G2 (cross-tenant catalog) and G3 (per-role
surface) stand unchanged — both are product/architecture decisions, not data drift.
