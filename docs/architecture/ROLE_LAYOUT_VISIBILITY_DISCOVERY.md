# Role-based layout-library visibility — DISCOVERY (read-only, 2026-06-16)

> Feeds Opus's build brief for "admin→config / coach→tactics on the SAME layout library."
> NO code changed. Anchors at HEAD `85086f32`.

## LEAD ANSWER
**Can a coach reach tactics via the existing layout library by changing only nav + visibility, with TacticPage untouched? — YES, and most of it already works today.**
- A coach can **already** reach layout-tactics: drawer **ZARZĄDZAJ → "Layouty"** (`MoreTabContent.jsx:80`, gated `!isPurePlayer` → admits coach+scout+admin) → `/layout/:id` → tactics list → `/layout/:id/tactic/:id`. The route exists, is `RouteGuard`-wrapped, and `canAccessRoute` admits coach at the coach branch (`roleUtils.js:135`) before the `/layout/` block; `canEditTactics = admin|coach` (`roleUtils.js:117`).
- **TacticPage is route-param-self-contained** (`useParams()` → layoutId/tacticId; data from `useLayouts`/`useLayoutTactics`; reads NO role, no admin-only context — `TacticPage.jsx:55-87`). It can be reached/branded differently with **zero internal changes.**
- **The admin↔coach split is already ~built inside LayoutDetailPage**: config mode bar (Names/Zones/Lines) is `!immersive && isAdmin` (`:892-925`); coach instead gets the "New tactic" bar `!immersive && !isAdmin` (`:871-889`); the tactics list itself shows to everyone (`:780-867`). `saveLayoutData` re-gates writes (overlay `if(isAdmin)` `:235`, base/calibration `if(isSuper)` `:254`).

**So the real product gap is NOT access — it's discoverability/branding.** Coaches reach tactics through an admin-flavored "Layouty" entry and an admin-flavored detail page. Jacek's "Playbooks for coach" is a *presentation/IA* refinement on top of working access, not new role-visibility plumbing.

**Authoritative role store: reused everywhere, no split.** Every nav gate + LayoutDetail branch reads `workspace.userRoles[uid]` via `useWorkspace` (`roles`/`isAdmin`, `useWorkspace.jsx:603-617`) or the effective wrapper `useViewAs` (`effectiveRoles`/`effectiveIsAdmin`). No stale/parallel path detected. New visibility logic can reuse these directly.

---

## STEP 1 — How the library decides what to show
- **LayoutsPage (list)** — `useLayouts()` grid + "Browse library" (global bases not yet added). Row tap → `navigate('/layout/'+id)` (`LayoutsPage.jsx:69`). **Only role branch = `useIsSuperAdmin()`** gating the "New base layout" button (`:101`). **No workspace-role (isAdmin/coach) awareness** — rows are uniform for all roles.
- **LayoutDetailPage** — single scroll page (no tab router), ALREADY role-branched: reads `useWorkspace().isAdmin` (`:44`) + `useIsSuperAdmin()` (`:45`). Admin-only config mode bar (names/zones/lines) + action-sheet (Edit info/Recalibrate/Delete); coach gets tactics list + "New tactic". Calibration = modal here; **bunker geometry edited on a separate `isSuper`-gated route** (`/layout/:id/bunkers` → BunkerEditorPage).
- **Config vs tactic routing** — config (zones/lines/names/calibration) edited *inside* LayoutDetailPage; bunkers on `/layout/:id/bunkers`; tactics on `/layout/:id/tactic/:id` (`App.jsx:166-173`). Entry to TacticPage only from LayoutDetailPage (`navigate('/layout/'+id+'/tactic/'+tid)`, `:845,:348`).

## STEP 2 — Coach navigation
- Two surfaces: **bottom TabBar** (Scout/Coach/Gracz, role-gated; bar hidden at <2 visible tabs — a coach-only user has no bar) + **NavDrawer** (body = `MoreTabContent`).
- **Layout library is a drawer item, NOT admin-only**: `MoreTabContent.jsx:80` under ZARZĄDZAJ (`!isPurePlayer`, `:78`) — coach & scout both pass. `/layouts` route admits admin/coach/scout/viewer (`roleUtils.js:124-153`); scout is then blocked from drilling into `/layout/:id` (analytics only).
- **Cleanest coach "Playbooks" slot** (least disruption first): a sibling `MoreItem` beside "Layouty" in ZARZĄDZAJ (mirror in `TrainingMoreTab.jsx:117`); OR a dedicated "TAKTYKA" drawer section gated `canEditTactics(effectiveRoles)` (admin|coach, hides from scout). A **bottom tab is NOT recommended** (breaks the ≥2-tab render contract).

## STEP 3 — Visibility model options
- **Option A (role-branch rendered sections)** — *already largely implemented* in LayoutDetailPage. To finish Jacek's vision: branch LayoutsPage row affordances + add a coach Playbooks entry. **Fewest touch-points, lowest regression risk** — it extends an existing pattern. Touch-points: LayoutsPage (add `useWorkspace().isAdmin`/coach branch), drawer (1 nav item), optional LayoutDetail tactics-first emphasis for coach.
- **Option B (role-aware default landing)** — LayoutDetailPage is a single scroll page with no tabs, so there is no "landing tab" to default; coach already sees the tactics list inline. Achieving "coach lands on tactics" = reorder/emphasis (tactics-first for non-admin), a small visual change in one file. Reasonable as a polish on top of A, not an independent path.
- **Recommended: A + a light B emphasis.** Both are nav/visibility-layer only.

**Leak / sensitivity:** coach does NOT get the config mode bar (`isAdmin`-gated) and overlay/base writes are re-gated in `saveLayoutData` — so even surfaced config UI can't write. Config = field geometry, **not tenant-sensitive** (just "not the coach's job"). Reverse (admin seeing tactics) is fine. Low leak risk; the existing gates already hold the line server-path-side.

## STEP 4 — Risk read
- **TacticPage internals need NOT be touched.** It is route-param-self-contained and role-agnostic; the change is purely *how it's reached + how the surrounding library/nav frames it*. Confirms the low-risk path Jacek wants — the fragile, rarely-touched tactics editor stays exactly as-is.
- **Two small gaps if the brief wants a clean split:** (1) LayoutsPage currently reads no workspace role (only `isSuper`) — add `useWorkspace().isAdmin`/coach to brand rows; (2) TacticPage self-gates nothing — but coach is *allowed* to edit tactics by design (`canEditTactics`), so no new protection is needed for the admin→config/coach→tactics model. A view-only-coach variant (if ever wanted) would live in the guard layer, not TacticPage.

## Tier verdict
**Tier-1** — purely nav + visibility + LayoutsPage role-branch; TacticPage untouched; reuses the authoritative role store. Separate from the Field View shell work. Opus writes the build brief → Jacek GO.
