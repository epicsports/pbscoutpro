# Design Brief — Team Management Consolidation (PbScoutPro)

> **For:** Claude Design (visual redesign → then exact code).
> **From:** Opus (architect) on behalf of Jacek (product owner).
> **App:** PbScoutPro — paintball (xball) scouting. React 18 + Vite + Firestore. Dark-mode, mobile-first, Apple-HIG premium aesthetic.
> **Baseline branch:** `feat/team-edit-unification` (team edit already partially unified into `TeamDetailPage`; the admin modal is already create-only). Build on this — do not regress it.

---

## 0. Objective (one paragraph)

There are **5 overlapping team surfaces** and **3 different team forms**. Consolidate them into:
1. **ONE comprehensive team screen** (`/team/:teamId`) that contains **everything** about a team, with **editing gated to super-admin only**; non-super-admins see the same screen **read-only**. This single screen also handles **create** (new team).
2. **ONE super-admin team list** (`/admin/teams`) with the search / filter / sort / create entry on top.
3. **Delete** the redundant admin edit/create modal.

**Out of scope this pass:** the user-facing list `/teams` (`TeamsPage`) and its own add-team modal stay AS-IS for now (Jacek's call). Note: because the team screen becomes read-only for non-super-admins, a regular user tapping a team from `/teams` will land on the read-only profile — that is intended.

---

## 1. Current state — the replication problem

| # | Surface | Route / file | Access today | What it does | Overlap |
|---|---|---|---|---|---|
| 1 | User team list | `/teams` · `src/pages/TeamsPage.jsx` | any authed user (no guard) | browse + **inline Add-team modal** (name, extId, leagues, parentTeamId, divisions) | list #2; form #4 |
| 2 | Super-admin team list | `/admin/teams` · `src/pages/admin/AdminTeamsPage.jsx` | **super_admin** (`SuperAdminGuard`) | CRUD, search, Liga/Dywizja filters, status pills, sort, pagination, duplicate-resolve, retire/restore | list #1 |
| 3 | Team detail / edit (page) | `/team/:teamId` · `src/pages/TeamDetailPage.jsx` | **no guard** (any user reaches it) | inline edit of name/extId/logo/color/country/leagues/divisions + **roster** mgmt; sister + audit gated by `effectiveIsAdmin` | edit #4 |
| 4 | "Additional edit" (modal) | `src/pages/admin/TeamFormModal.jsx` | super_admin (now create-only on baseline) | name, extId, leagues+divisions, logo, country, **sister teams**, **audit**, retire | edit #3; form #1 |
| 5 | Sister picker | `src/pages/admin/TeamPickerModal.jsx` | super_admin | cycle-safe parent/child selection | (keep) |

**Three different "team forms":** TeamsPage add-modal (#1), TeamFormModal (#4), inline on TeamDetailPage (#3).
**Two lists:** #1, #2. **Edit reachable with no role gate** on #3 (server blocks the write → silent failure UX + a UI/permission mismatch).

---

## 2. Roles & permissions (authoritative)

- **Workspace roles** (`src/utils/roleUtils.js`): `admin`, `coach`, `scout`, `viewer`, `player`.
- **Platform role:** `super_admin` = `users/{uid}.globalRole === 'super_admin'` **OR** email in `ADMIN_EMAILS` (`['jacek@epicsports.pl']`). Hook: `src/hooks/useIsSuperAdmin.js`; util `isSuperAdmin()`.
- `effectiveIsAdmin` (`src/hooks/useViewAs.js`) = **workspace-admin** (with view-as override). **NOT** the same as super-admin — do not use it for the new gate.
- **Firestore rules** (`firestore.rules` ~688): `/teams/{id}` readable by any authed user; **write** only by `isSuperAdmin()` OR workspace-admin of `ownerWorkspaceId`; **delete** super_admin only.

### Target gate
- **Edit / create / delete on the team screen and the management list = `isSuperAdmin` only** (use `useIsSuperAdmin`, mirror `SuperAdminGuard`). This is Jacek's decision: *team editing only at super-admin level, including the roster.*
- **Everyone else → read-only** team profile (no edit affordances, no add, no roster mutation, no audit).

---

## 3. Data model (teams are GLOBAL)

Single global collection `/teams/{teamId}` (DESIGN_DECISIONS §63.15.2). Fields:

```
name            string
externalId      string|null   // PBLeagues / "PBLI" id, canonical for tracked leagues (NXL)
leagues         string[]      // e.g. ["NXL"]
divisions       { [league]: divisionName|null }
parentTeamId    string|null   // sister-team hierarchy (2 levels max)
color           string|null   // hex brand color
logoUrl         string|null   // external URL, NEVER base64 / upload
country         string|null   // ISO-ish code → flag (src/utils/flags.js, 27 EU + US/RU/TH/BR)
originWorkspace string        // slug that created it
ownerWorkspaceId string       // single owner workspace
retiredAt       Timestamp|null // soft-delete
createdAt, updatedAt, createdBy, retiredBy, retirementReason, canonicalReplacementId
```
Roster = `players` whose `teams[]` includes this team (separate collection). Writes: `dataService.js` → `addTeam`, `updateTeam`, `retireTeam`, `unretireTeam`, `setParentTeam`, `setPlayerHero`, `addPlayer`, `updatePlayer`.

---

## 4. Device & responsive targets (design ALL three)

App targets **3 device classes** (`src/hooks/useDevice.js`):
- **mobile** `< 640px` — single column, primary.
- **tablet** `640–1023px` — content cap ~768px.
- **desktop** `≥ 1024px` — content columns cap (detail 640 / list 960 / form 560 via `<Screen>`).

Secondary internal breakpoints used today: **720px** (phone bottom-tab shell ↔ wide sidebar shell `AppShellPremiumWide`) and **820px** (single ↔ two-column on detail pages). Overlays/modals on the wide shell must mount at page top-level (the wide shell renders its own body, not `{children}`).

Tokens via `src/utils/theme.js`: `responsive(device.type)` → `layout.padding` (12/20/24), `layout.gap` (8/12/16), `modal.maxWidth` (100%/560/480), `touch.minTarget` 44 everywhere.

---

## 5. Target architecture

### 5A. The ONE team screen — `/team/:teamId` (role-adaptive)

Single screen, three modes:
- **VIEW (non-super-admin):** read-only profile — crest/identity, country, leagues/divisions, roster (read-only). Hide: all edit controls, externalId edit, sister-team editing, audit, delete. (Sister/parent may show as informational chips — designer's call.)
- **EDIT (super-admin):** everything inline-editable (see field inventory §6).
- **CREATE (super-admin, "new"):** same screen, empty state, **only the creatable identity+classification fields** (a team doc must exist before roster/sister/audit make sense). On Save → create doc → transition to full EDIT. Replaces `TeamFormModal`. Entry: "+ New team" on the list (§5B).

**This screen absorbs and replaces:** `TeamFormModal` (#4) entirely; the inline-edit role gaps in `TeamDetailPage` (#3) become a clean super-admin gate. Keep using `TeamPickerModal` (#5) for the sister picker.

### 5B. The super-admin team list — `/admin/teams`

Keep & polish (this is the "listing + search/filter at the top" Jacek mentioned). Super-admin only. Drives create + navigation into the team screen. Full spec in §7.

### 5C. Explicitly unchanged this pass
`/teams` (`TeamsPage`) user list + its add-team modal — leave as-is. (Future pass may merge it into a role-adaptive single list; not now.)

---

## 6. Field inventory — the ONE team screen (merged from all surfaces)

Group sensibly; current pages just stack fields (the core complaint). The crest/identity should lead like a premium profile, not a form.

**A. Identity**
- **Name** (text; required; inline-editable on blur)
- **Crest / badge** — 3-tier fallback: uploaded **logo** → **country flag** → colored **initials** monogram. Hero of the screen. (`TeamBadge`, `CrestBand`, `src/utils/flags.js`.)
- **Country** (dropdown with flag; optional) — drives the flag tier
- **Logo URL** (paste a link; never upload/base64)
- **Brand color** (HSV `ColorPicker` + "reset to auto" → id-hash color)

**B. Classification**
- **Leagues** (multi-select chips, e.g. NXL)
- **Division** per selected league (chips, league-scoped)
- **External / PBLI ID** (text)

**C. Relationships (sister teams)**
- **Parent team** + **child teams** as relationship cards; actions: Designate parent / Add child / Change / Remove (via `TeamPickerModal`, cycle-safe, max 2 levels)

**D. Roster** (main content; super-admin editable per decision)
- Grouped: **Coaching · Players · Staff**, each with icon + count header
- Player card: avatar (colored ring: HERO→amber, coach→info, staff→neutral, plain→hairline), jersey number, name, nickname, meta (favorite bunker · PBLI id), **HERO** star toggle (players only), role chip (coach/staff), **edit** + **remove** actions
- Header actions: **+ New** player, **Find** (add existing, `EntityPickerModal`)

**E. Audit** (collapsible; super-admin only): ID, originWorkspace, created, updated, migrated, and retire info (retiredAt/by/reason/canonicalReplacementId) when retired.

**F. Danger** (super-admin): **Retire** (soft-delete, password-confirmed) / **Restore** (if retired).

---

## 7. Super-admin list spec — `/admin/teams`

- **Header:** title, back; result count line; pagination (50 / page).
- **Search:** name + externalId. (`SearchFilterPanel`.)
- **Filters:**
  - **Liga** dropdown (league shortNames) → **Dywizja** dropdown (league-scoped, appears when Liga set).
  - **Status pills:** All · Active · Parents · Children · With extId · No extId · ⚠ Duplicates (n) · 🗄 Retired.
- **Sort:** Name · Recently updated.
- **Create:** "+ New team" → team screen CREATE mode.
- **Row / card:** `TeamBadge` + name + subtitle (parent/child relation · leagues · `extId …` · 🗄 retired), `⚠` prefix for duplicates, hierarchical parent/child indent. Whole card → team screen. **⋮ menu = OPERATIONS only:** Resolve duplicate (when dup) · Retire / Restore. (Edit is the body-tap now — no separate "Edit" item.)
- **States:** loading skeleton, empty (with filter-aware copy), duplicate banner.
- Keep `TeamDuplicateResolutionView` and the retire confirmation (`ChildrenOrphanWarning`).

Design this list for **mobile / tablet / desktop** (filters collapse gracefully on mobile; desktop can show a denser table-like list within the 960px cap).

---

## 8. Goals of the redesign

1. Turn the team screen from a "wall of form fields" into a **premium, editable team profile** — crest/identity leads; everyday attributes primary; sister/audit recede (progressive disclosure).
2. **One coherent IA** across the team screen and the list; same components, same behavior (Apple-HIG consistency).
3. Make the **super-admin vs read-only** distinction obvious and clean (no disabled-looking inputs for viewers — show a true read-only profile).
4. Roster is scannable and feels like the heart of the screen.
5. First-class **mobile / tablet / desktop**; tablet/desktop use width meaningfully (two-column ≥820 / sidebar shell ≥720), not just stretched.

---

## 9. Design-system constraints (Apple-HIG §27 — non-negotiable)

Tokens live in `src/utils/theme.js` (`COLORS`, `ELEV`, `FONT`, `FONT_SIZE`, `TOUCH`, `RADIUS`, `TRACKING`). Use them, not raw hex.

- **Elevation (never one shade across layers):** page `#0a0e17` · cards `#0f172a` · headers/panels `#111827` · inset/recessed `#0b1120`. Use `ELEV.surface / raised / sunken / hairline`.
- **Color semantics:** amber `#f59e0b` = interactive/active/CTA **only** (never decorative) · green `#22c55e` positive · red `#ef4444` destructive · cyan `#22d3ee` snake · orange `#fb923c` dorito. **Team brand color = identity, not amber.** HERO indicator may glow amber.
- **Typography:** Inter. Titles 15–18/600–700 · body 13–15/500 · labels 11/600 (positive tracking) · hero numbers 28–32/800–900 · never < 8px.
- **Touch targets** ≥ 44px (48 for primary). Radius 12 cards / 10 inner / 8 pills.
- **One primary CTA per context.** No chevrons on non-split-tap cards (whole card navigates). No gradient/shadow/glow as decoration (only functional: CTAs, HERO).

---

## 10. Deliverables (from Claude Design)

1. **Team screen** — mobile, tablet, desktop, in **VIEW (read-only)**, **EDIT (super-admin)**, and **CREATE (new)** modes. Annotated.
2. **Super-admin list** — mobile, tablet, desktop (incl. filters/search/sort placement, ⋮ ops, duplicate banner, pagination).
3. **IA / section order** for the team screen, with which sections collapse or sit behind a tap.
4. **Crest/identity hero** treatment incl. fallback states (logo / flag / initials).
5. **Roster card** spec (3 groups, HERO/role states, edit/remove).
6. **Empty / edge states:** no logo, no country, no leagues, empty roster, retired team, sister-team present.
7. Mapping notes for code: which existing component each piece maps to (so the follow-up code change is exact).

---

## 11. Technical anchors (for the follow-up code change)

- **Keep / expand:** `src/pages/TeamDetailPage.jsx` → the one team screen (add `useIsSuperAdmin` gate + CREATE mode).
- **Delete:** `src/pages/admin/TeamFormModal.jsx` (folded into the screen).
- **Keep:** `src/pages/admin/TeamPickerModal.jsx`, `TeamDuplicateResolutionView.jsx`, `ChildrenOrphanWarning.jsx`.
- **Polish:** `src/pages/admin/AdminTeamsPage.jsx` (list).
- **Untouched this pass:** `src/pages/TeamsPage.jsx` + its add-modal.
- **Routing:** `src/App.jsx` — `/team/:teamId`, `/team/new` (or `?new=1`) for CREATE; `/admin/teams` under `SuperAdminGuard`.
- **Shared UI:** `src/components/ui.jsx` (Btn, Input, Select, Modal, Field, SectionLabel, SectionTitle, EmptyState, ConfirmModal), `TeamBadge`, `CrestBand`, `ColorPicker`, `PlayerAvatar`, `RdIcon`, `EntityPickerModal`, `SearchFilterPanel`, `Screen`, `PageHeader`.
- **Hooks/services:** `useIsSuperAdmin`, `useViewAs`, `useDevice`, `useTeams` / `useActiveTeams`, `usePlayers`, `useLeagues`; `dataService` (`addTeam/updateTeam/retireTeam/unretireTeam/setParentTeam/setPlayerHero/addPlayer/updatePlayer`).
- **i18n:** all UI strings via `t()` (English UI). Reuse existing `team_form_*` / `team_detail_*` keys; add new keys as needed.

---

## 12. Screenshots to capture (Jacek → Claude Design)

Map to the 5 current surfaces so Design sees the full current state:
1. `/teams` user list (mobile + tablet/desktop) — context only (out of scope but informs).
2. `/admin/teams` super-admin list (mobile + tablet + desktop) — incl. filters open, ⋮ menu, duplicate banner if any.
3. `/team/:id` team detail/edit (mobile + tablet/desktop) — scroll through identity → branding → leagues → sister → roster → delete.
4. The ⋮ "Edit" admin modal (`TeamFormModal`) if still reachable on the deployed build — its sister-teams + audit sections.
5. Edge states if available: team **without logo** (flag/initials visible), team **with sister teams**, **retired** team, **expanded audit**.
