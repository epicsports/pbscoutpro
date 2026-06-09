# Archetype-model validation + shared conventions — DISCOVERY (read-only, 2026-06-09)

Validates the 5-archetype model against the real ~42 screens + surfaces the conventions every archetype inherits, so the
redesign is a SYSTEM. **No build.** Report on branch `discovery/archetype-model` (NOT for main). Method: 4 parallel
readers over all screens (root render + PageHeader + `responsive()`/`FONT_SIZE` + `useLandscapeMode` + canvas stack);
Canvas archetype already characterized in `HITABILITY_REDESIGN_DISCOVERY.md`. **Note:** `PBSCOUTPRO_INTERACTION_MODEL.md`
does NOT exist on main (archetypes taken from the instruction); `STYLE_AUDIT.md` lives on branch `audit/style-audit`.

---

## 1. Archetype → screen map (with misfits)

| Archetype | Screens | n |
|---|---|---|
| **List/Feed** | TeamsPage, PlayersPage, ScoutRankingPage, ScoutIssuesPage, AdminTeamsPage, AdminPlayersPage, AdminLeaguesPage, LayoutsPage*, AdminLayoutsPage* (*grid-of-field-cards — list, not canvas), TeamPickerModal (modal) | ~10 |
| **Detail/Report** | TeamDetailPage, ScoutDetailPage, UserDetailPage, TrainingCoachTab, TeamDuplicateResolutionView (modal) | ~5 |
| **Canvas/Tool** | MatchPage, **HitabilityPage**, TacticPage, BunkerEditorPage, BallisticsPage | ~5 |
| **Form/Config/Wizard** | LoginPage, ProfilePage, TrainingSetupPage, TrainingSquadsPage, LayoutWizardPage, MainPage (picker), MoreTabContent, TrainingMoreTab, MoreShell, TeamFormModal, PlayerFormModal, LeagueFormModal, ChildrenOrphanWarning, DebugFlagsPage | ~14 |
| **Kiosk/Handoff** | PbleaguesOnboardingPage, PendingApprovalPage, KioskLobbyOverlay, KioskPostSaveSummary | ~4 |

### Misfits / dual-fits — **the model gaps to see**
The 5 archetypes hold, but there are **three recurring dual-fit patterns** that the redesign must name explicitly:

- **A) Detail/Report WITH an embedded interactive Canvas** (the most important gap):
  - `PlayerStatsPage` (Detail + heatmap canvas), `ScoutedTeamPage` (Detail dashboard + heatmap, §60/§81 — heatmap goes
    fullscreen via explicit Maximize, **rotation does NOT auto-promote**), `LayoutAnalyticsPage` (Detail + AnalyticsCanvas).
  - These are **NOT** pure Canvas (they scroll a report; the canvas is a SECTION) and **NOT** pure Detail (the section is
    interactive + can promote to fullscreen). → Treat as **"Report with a promotable Canvas section,"** not as the Canvas
    archetype. They use `responsive()` + `PageHeader`, portrait-native, **no `useLandscapeMode`**.
- **B) Canvas/Tool WITH heavy Form/Config** — `LayoutDetailPage` (InteractiveCanvas + zone/line/bunker editing + tactics
  list; uses `useLandscapeMode`+immersive). Cleanly Canvas-primary; the config is overlay chrome. Not a real gap, but it's
  the one Canvas screen that also hosts forms.
- **C) List/Feed WITH inline Config or inline Canvas-entry** — `MembersPage`/`WorkspacesAdmin`/`DebugFlags` (list + inline
  role/flag editing); `ScoutTabContent`/`CoachTabContent` (match list + inline split-tap scout entry + filter pills).
  Minor — the inline editing/entry is content within a list, not a second shell.
- **D) Form/Wizard ⟷ Kiosk/Handoff** — `PlayerPerformanceTrackerPage` (5-step wizard delivered as a player hand-off;
  tri-state list/picker/wizard). Genuinely both: **wizard is the surface, kiosk is the delivery mode.** Flag for the model.

**Verdict:** the 5 archetypes are sufficient IF we add one explicit sub-pattern — **"Report + promotable Canvas section"**
(A) — and treat Kiosk as a *delivery mode* that can wrap a Wizard (D), not a peer of it. Everything else slots cleanly.

---

## 2. Per-archetype outer-shell inventory (raw material for `<Screen>`)

**The dominant canonical shell** (List/Feed + Detail/Report + most Canvas + Wizard pages — ~20 screens):
```
<div style={{ minHeight: '100vh'|'100dvh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto',
              display: 'flex', flexDirection: 'column' }}>
  <PageHeader back={{to}} title subtitle />
  <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding|SPACE.lg, paddingBottom: 64|80 }}> … </div>
</div>
```
Examples: TeamsPage `:132`, PlayersPage `:136`, LayoutsPage `:42`, TeamDetailPage `:187`, PlayerStatsPage `:875`,
LayoutAnalyticsPage `:440`, ScoutDetailPage `:109`, ScoutIssuesPage `:85`, BunkerEditorPage `:201`, BallisticsPage `:81`,
LayoutWizardPage `:205`, TrainingResultsPage `:294`.

**Where they DRIFT (the case for `<Screen>`):**
- **`maxWidth`:** `R.layout.maxWidth||640` (the responsive core) vs static `640` (ScoutDetail, ScoutRanking, ScoutIssues)
  vs `720` (UserDetail `:213`, MoreShell `:23`) vs **none/no-center** (MembersPage `:137`, AdminTeams `:189`, AdminPlayers
  `:178`, AdminLeagues `:47` — fragment root, padding-only).
- **`background`:** root `COLORS.bg` on some (MembersPage, UserDetail, TrainingResults, TrainingSquads, Profile,
  WorkspacesAdmin); inherited on most.
- **`paddingBottom`:** `80` vs `64` vs `24` vs `32` — inconsistent; **none use `env(safe-area-inset-bottom)` on the root
  scroll** (only some sticky footers do: TrainingSetup `:62`, Profile `:656/686`).
- **scroll owner:** inner `flex:1; overflowY:auto` (canonical) vs root-level `paddingBottom` only (admin lists).
- **`minHeight`:** `100vh` vs `100dvh` mixed.

→ **Strong case for a `<Screen>`** that owns: `bg` + centered `maxWidth` (responsive) + scroll body + `paddingBottom`
(safe-area-aware) + renders `PageHeader` from props. ~20 screens converge on it with only cosmetic drift.

**Exceptions that should NOT use the base `<Screen>`:**
- **Immersive Canvas** (MatchPage `:419`, TacticPage `:419`, LayoutDetailPage `:386`): `height:100dvh; maxWidth: immersive
  ? '100%' : R...; overflow:hidden`, PageHeader hidden in immersive, floating Back/Menu buttons → **Canvas archetype shell**
  (the one Hitability needs), separate from `<Screen>`.
- **Kiosk overlays** (KioskLobbyOverlay `:367`, KioskPostSaveSummary `:333`): `position:fixed; inset:0; zIndex:200`,
  inline `#0d1117` header → **Kiosk shell**, own chrome + own orientation (`useKioskMode`/`useKioskCompatible`).
- **Auth/gate** (LoginPage, PbleaguesOnboarding `:144`, PendingApproval `:25`): fixed/centered card, no nav → **thin gate
  shell**.
- **Modals** (TeamFormModal `:148`, PlayerFormModal `:151`, LeagueFormModal `:116`): already use shared `<Modal>` (ui.jsx),
  which IS responsive internally (`device.isMobile` bottom-sheet, `R.modal.*`, safe-area `:440`). Leave on `<Modal>`.
- **Tab-contents** (ScoutTab/CoachTab/More*): no header (AppShell + TabBar provide chrome); padded flex body.

---

## 3. Cross-cutting conventions — report + RECOMMENDATIONS

### 3a. The responsive scale — **RECOMMEND: standardize on tier-based `responsive()`, surfaced through `<Screen>`; defer fluid**
- **Who uses what:** `responsive(device.type)` (mostly `R.layout.maxWidth/padding`) is used by the **core + canvas
  pages** — Teams, Players, Layouts, AdminLayouts, TeamDetail, PlayerStats, ScoutedTeam, LayoutAnalytics, LayoutDetail,
  MatchPage, BunkerEditor, Ballistics, Tactic, LayoutWizard. The shared **`<Modal>` uses it internally**. **Static
  `FONT_SIZE`/`SPACE`** (no `responsive()`) = the rest: admin lists, settings/More*, ScoutDetail/Ranking/Issues,
  UserDetail, TrainingResults/Squads/Setup, Profile, kiosk, PPT, tab-contents. So **`responsive()` is already the de-facto
  for layout on the core pages; static elsewhere → two scales coexist** (plus `FONT_SIZE` static vs `responsive().font`).
- **Recommendation: pick ONE — tier-based `responsive(device.type)` — and put it in the `<Screen>` shell** (Screen calls
  `responsive()` and supplies `maxWidth`/`padding`/`gap`), so screens stop hand-rolling either scale.
- **Costs:**
  - **(a) tier-based `responsive()` as the standard [RECOMMENDED] — LOW.** It's already dominant for layout; the `<Screen>`
    absorbs `maxWidth/padding/gap` in one place; the device tiers (phone/tablet/desktop) map to the real form factors.
    Font migration (`FONT_SIZE` → `responsive().font`) is MEDIUM but **optional/gradual** (do it per screen during the hex
    migration; not a blocker).
  - **(b) go FLUID (viewport `clamp()`/interpolation) — HIGH.** Every size becomes a clamp/calc; new tooling + a full
    type/space rewrite. Not justified — the app's content is tier-shaped, not continuously fluid.
  - **(c) enshrine the hybrid (responsive layout + static `FONT_SIZE`) — this is the CURRENT drift.** Don't lock it in;
    it's exactly the two-scales problem.
- **Net:** standard = `responsive(device.type)`, lived in `<Screen>`; `FONT_SIZE` stays as the static fallback and is
  migrated to `responsive().font` opportunistically. (Also reconcile the doc drift `#080c14`→`#0a0e17` from STYLE_AUDIT
  in the same pass.)

### 3b. Orientation-awareness — **RECOMMEND: rail-vs-stack reflow ONLY for Canvas/Tool (+ Kiosk has its own)**
- **YES (`useLandscapeMode` + immersive):** Canvas/Tool — MatchPage `:89`, TacticPage `:410`, LayoutDetailPage `:380`,
  BunkerEditor (`canvasMaxHeight`), Hitability (landscape). **Kiosk** uses its OWN orientation logic
  (`useKioskMode`/`useKioskCompatible` + `KioskRotatePrompt`).
- **NO (portrait-native):** all List/Feed, Detail/Report, Form/Config/Wizard — **none** call `useLandscapeMode`. The
  Report+Canvas screens (PlayerStats/ScoutedTeam/LayoutAnalytics) have heatmaps but **explicitly do NOT auto-promote on
  rotate** (ScoutedTeam §81: "rotation does NOT auto-promote"; fullscreen is a manual `Maximize`).
- **Recommendation:** the base `<Screen>` is **portrait-native** (centered column). Orientation reflow (field-100%-height
  + edge rail) is the **Canvas archetype shell** only. Don't bake orientation into `<Screen>`; the Report+Canvas screens
  keep a portrait report with a *promotable* canvas section (manual fullscreen), not an auto-rotating shell.

### 3c. Navigation / header / back — **RECOMMEND: `<PageHeader>` is the standard; fold it INTO `<Screen>`**
- **`<PageHeader back={{to}} title subtitle />` is already near-universal** for routed pages (Teams, Players, Layouts,
  TeamDetail, PlayerStats, ScoutedTeam, ScoutDetail, UserDetail, TrainingResults, LayoutAnalytics, LayoutDetail[non-
  immersive], ScoutIssues, MatchPage[non-immersive], BunkerEditor, Ballistics, Tactic[non-immersive], LayoutWizard,
  TrainingSetup, Profile, TrainingSquads, DebugFlags, all admin/*). Modals use shared `<Modal title>`.
- **Legitimate exceptions** (keep): immersive canvas (floating Back/Menu), kiosk (`#0d1117` inline header), auth/gate
  (logo/title, no nav), tab-contents (AppShell context bar + TabBar).
- **Recommendation:** the nav pattern is **already consistent** — the redesign just **renders `PageHeader` from `<Screen>`
  props** so it stops being hand-mounted per page. (STYLE_AUDIT §6 "drift" is really just the immersive/kiosk/auth
  exceptions, which are correct.)

### 3d. Persistent chrome — **RECOMMEND: two levels; mode-switchers are archetype-specific**
- **App-level:** `AppShell` + `TabBar` (Scout/Coach/More) — already shared, owns the tournament/training context bar.
- **Screen-level:** `PageHeader` (fold into `<Screen>`).
- **Archetype-specific (stays in the screen, NOT the base shell):** Canvas mode-switchers (Hitability Config/Tracking/
  Summary; MatchPage stage switcher), and **content** filter pills (ScoutTab/CoachTab division pills, ScoutedTeam/
  LayoutAnalytics scope pills) — these are content, not nav, and belong to the screen.

---

## 4. Recommended pilot screen for `<Screen>` — **`ScoutDetailPage` (Detail/Report)**
Best **simple, typical, low-risk** proof:
- **Canonical shell, minimal moving parts:** `minHeight:100vh; maxWidth:640; margin:0 auto; paddingBottom:80` + `PageHeader`
  + a single-column scroll body (`ScoutDetailPage.jsx:109-115`). No canvas, no landscape, no modal, no editing.
- **Proves the migration in both directions:** it currently uses **static** `maxWidth:640` (not `responsive()`), so
  converting it to `<Screen>` (which standardizes on `responsive()`) validates **both** the shell AND the responsive-scale
  decision (3a) in one low-traffic, read-only screen — easy to verify behaviour-identical.
- **Parallel List proof (do second):** `ScoutIssuesPage` (`:85`, same static-640 + PageHeader + single column) — converting
  both proves `<Screen>` across the two commonest archetypes before it touches anything hard (admin lists with no maxWidth,
  or the responsive core pages).
- Avoid as pilots: TeamDetail/PlayerStats (heavier + embedded canvas), admin lists (no-maxWidth outlier), anything Canvas/
  Kiosk/immersive.

---

## Net verdict for Opus + Jacek
- **5 archetypes hold**, with ONE addition to name: **"Report + promotable Canvas section"** (PlayerStats/ScoutedTeam/
  LayoutAnalytics) — portrait report, manual-fullscreen canvas, NOT the Canvas archetype. And **Kiosk is a delivery mode**
  that can wrap a Wizard (PPT), not a peer.
- **`<Screen>` is well-justified:** ~20 screens converge on one shell with cosmetic drift; build it to own bg + centered
  responsive maxWidth + safe-area scroll body + `PageHeader`. Exceptions (immersive canvas, kiosk, auth, modals,
  tab-contents) stay off it by design.
- **Conventions locked recommendations:** (3a) **tier-based `responsive()` as the one scale, lived in `<Screen>`** (fluid
  deferred, font migration gradual); (3b) **orientation reflow only for Canvas/Tool** (base `<Screen>` portrait-native);
  (3c) **`<PageHeader>` folded into `<Screen>`**; (3d) mode-switchers/filter-pills stay archetype-specific.
- **Pilot:** **`ScoutDetailPage`** (Detail), then **`ScoutIssuesPage`** (List).

**No build performed. Awaiting Opus + Jacek to lock the model + conventions + pilot.**
