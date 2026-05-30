# Team onboarding runbook — standing up a new team's workspace

> **Status:** product fork decided 2026-05-31 (Jacek) — **super-admin manual steps, no build.**
> See `DESIGN_DECISIONS.md` § 95. This runbook is the deliverable: the manual sequence a
> super-admin follows to take a new team from "invited into an empty workspace" to
> "scouting-ready." Friction is accepted (notably layouts are rebuilt per workspace) while
> there is exactly one new team in flight (pbfit). Revisit the build options in § 95 when the
> 2nd–3rd team makes the manual path expensive.

This is a **read-mostly checklist**, not code. Every step uses an EXISTING screen — nothing
new was built for this. Firestore paths are given so you can verify with the admin SDK if a UI
step looks like it didn't land.

---

## 0. What "scouting-ready" means (the bar)

A workspace is scouting-ready when a coach can open a match and start logging points. The
minimum data, all under `/workspaces/{slug}/`:

| # | Needed | Firestore path | Created by |
|---|---|---|---|
| 1 | **≥1 tournament/event** | `/tournaments/{tid}` | New Tournament modal (`dataService.addTournament` :567) |
| 2 | **≥2 scouted teams** | `/tournaments/{tid}/scouted/{sid}` | Scout tab add / schedule import (`addScoutedTeam` :626) |
| 3 | **≥1 match** (pairs 2 scouted) | `/tournaments/{tid}/matches/{mid}` | schedule import / add match (`addMatch` :846) |
| — | Points | `…/matches/{mid}/points/{pid}` | created live by the coach (`addPoint` :901) |
| — | **Field layout** *(optional)* | `/layouts/{lid}` | LayoutWizard / Vision scan (`addLayout` :1098) |

**Key fact — the player/team catalog is GLOBAL, not per-workspace.** Scouted rosters resolve
against `/teams` + `/players` (shared across all workspaces; ~298 teams / ~3242 players already
exist). A new team does **not** import a roster — if their opponents already live in the global
catalog, scouted teams resolve automatically by name + `divisions[league]`. The "empty
workspace" gap is **tournament + schedule + layout**, *not* roster.

Layout is **optional**: `resolveField()` (`helpers.js:104`) falls back to `tournament.fieldImage`,
so a coach can scout with no bunkers/zones — just a degraded canvas. Add a layout for the full
experience (bunker labels, zones, calibration), but it is not a blocker.

---

## 1. Create the workspace  *(super-admin)*

**Where:** More → Super Admin → **Workspaces** (`/admin/workspaces`, `WorkspacesAdminPage.jsx`).
→ **Create workspace** (`CreateWorkspaceModal`).

Provide: **slug** (immutable id, e.g. `pbfit`), **name** (display, e.g. "Paintball FIT"),
**code** (join password — stored as `passwordHash` = SHA-256), optional **logoUrl** (external
URL, not Storage — quota).

Writes `/workspaces/{slug}` with: `name`, `passwordHash`, `logoUrl`, `members[]`, `adminUid`,
`userRoles{uid:[roles]}`, `rolesVersion:2`, `pendingApprovals[]`, `createdAt`, `lastAccess`.
(`config` is **not** created here — it appears lazily the first time a feature flag is toggled.)

> pbfit already exists at this step (created during § 91). For a brand-new team, do this first.

## 2. Assign a workspace admin + send invites  *(invite carrier — § 94, shipped)*

A workspace's `adminUid` defaults to the creator (often you, the super-admin). Hand the team a
**real admin** of their own, then let that admin invite the rest:

- **Super-admin issues any-role invite** (incl. `admin`): More → Super Admin → Workspaces → pick
  the workspace → **Invites** section (`InviteSection`) → generate → copy magic link
  `…/#/invite/{token}`.
- **The new workspace admin** then issues coach/scout/player invites themselves: Settings →
  **Members** → Invites section.
- Recipient opens the link in their account → one-shot redemption admits them with the invited
  role (`useInviteRedemption` → `redeemInvite` writes `members` + `userRoles[uid]`).

Verify: `/workspaces/{slug}.userRoles` has the team's admin uid with `["admin"]`. (pbfit already
shows `lastRedeemedInviteToken` set — the carrier has been exercised in prod.)

## 3. Create the tournament / event  *(coach or admin, inside the workspace)*

**Where:** Scout tab → **New Tournament** (`NewTournamentModal.jsx:98`).

Set: **name**, **league** (NXL/PXL/…), **year**, **division(s)**, optional **layoutId** (leave
null for now; attach in step 6). Status defaults to `open`, `eventType: tournament`.

Writes `/workspaces/{slug}/tournaments/{tid}`. This is the container everything else hangs off —
**without it there is nothing to scout** (the pbfit gap: 0 tournaments).

## 4. Import the schedule → matches + scouted teams  *(the heavy lifter)*

Two importers exist; **CSV is preferred** when the league publishes one.

- **CSV** (`ScheduleCSVImport.jsx`): PBLeagues 8-column export
  (date, time, field, division, round, group, home, away). It auto-matches each team by
  `name + divisions[league]` against the global catalog, prompts you to resolve any unmatched
  team (match existing / create / skip), then writes matches (with `scheduledAt`, field, round,
  group) **and** the scouted-team docs.
- **OCR** (`ScheduleImport.jsx`): vision-scan a printed/screenshot schedule when there's no CSV.
  Same outcome, lower precision (no division inference — set per match).

After import, verify under the tournament:
`/tournaments/{tid}/matches/*` (the games) and `/tournaments/{tid}/scouted/*` (rosters, resolved
to global team/player ids). If a team didn't resolve, it isn't in the global catalog yet — add it
there (it becomes reusable by every workspace).

## 5. Sanity-check scouted rosters

Open a match in the Scout tab → the roster picker should show the opponent's players (resolved
from the global catalog via `buildScoutedPayload`, filtered by `team.divisions[league]`). If a
roster is empty or wrong, the team's catalog entry is missing players or has the wrong division
mapping — fix in the global catalog, not the workspace.

## 6. *(Optional)* Build the field layout

**Where:** LayoutWizard (3-step: Basic Info → Calibrate → Vision Scan) or Vision scan
(`addLayout` → `/workspaces/{slug}/layouts/{lid}`). Then set the tournament's `layoutId` to it.

⚠️ **This is the runbook's biggest friction point.** Layouts are **workspace-local** — they do
**not** cross workspaces. ranger1996's 5 league layouts (NXL Prague 38 bunkers, PXL Preseason 40,
… up to a 48-bunker sample) **cannot** be cloned into a new workspace; each team rebuilds the
same standard fields from scratch. This is the prime candidate for the future "shared/cloneable
layout library" (§ 95). Until then: rebuild, or scout layout-less (step 0 — it's allowed).

## 7. Hand off

Confirm with the team's admin: they can switch into the workspace, see the tournament, open a
match, and log a point. They're scouting-ready.

---

## Friction ledger (what a future build would remove)

| Step | Friction today | Future automation (§ 95) |
|---|---|---|
| 3 Tournament | manual, one at a time | checklist/wizard wrapping the modal |
| 4 Schedule | importers exist — **lowest friction** | already good; surface it in the checklist |
| 5 Rosters | global catalog — **lowest friction** | none needed |
| 6 **Layout** | **rebuilt per workspace, no reuse** | **shared/cloneable layout library** ← top priority |
| all | no orchestration — admin must know the sequence | the checklist itself |

The two real gaps are **layout reuse** and **orchestration**; rosters and schedule are already
well-served by the global catalog and the importers. When the manual path gets expensive
(2nd–3rd team), revisit § 95's "checklist + layout-clone" option.
