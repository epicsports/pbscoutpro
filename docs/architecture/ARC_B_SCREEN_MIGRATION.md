# Arc B — `<Screen>` migration worklist + scope finding (2026-06-13)

> Pilot SHIPPED (`9918bf00`, pixel-diff=0). This is the worklist for the remaining migration + the scope finding that gates it. CC discovery (read-only inventory) + the pilot proof.

## The primitive (shipped)
`<Screen archetype="detail|list|form" header={<PageHeader/>} padBottom>` — `src/components/Screen.jsx`. Emits a centered column at `LAYOUT_TIERS[archetype]` (detail 640 / list 760 / form 560), document-scroll + sticky header, `calc(80px + env(safe-area-inset-bottom,0px))` bottom pad. Does NOT restyle.

## H0 gate (shipped)
`tests/e2e/screen-pilot-diff.spec.js` — `toHaveScreenshot` at phone width, `maxDiffPixels:0`. Baseline captured pre-migration, compared post. **Isolated/clean-seed only** (page content drifts under the shared serial suite) → `npm run test:e2e:diff`; excluded from `test:e2e`.

## 🔴 SCOPE FINDING — the migration is NOT a blanket diff=0 sweep
Only **3** pages hardcode `maxWidth: 640` (ScoutDetailPage, ScoutIssuesPage, ScoutRankingPage) → true diff=0 at all widths. The other **~18** migratable pages use `maxWidth: R.layout.maxWidth || 640`, which resolves to **`'100%'` on mobile, `768` tablet, `1200` desktop** (the `|| 640` is dead). Migrating those to a tier:
- **Phone:** diff=0 (content already ≤ viewport ≤ 640).
- **Tablet/desktop:** VISIBLE change — detail pages 1200→640 (narrower), forms 1200→560 (narrower), lists 1200→760 (narrower). This is the mockup-5 INTENT (constrain reading width), but it's a real desktop delta on every non-trivial page, not just the list tier.
**Consequence:** batches 2+ each need a Jacek desktop eyeball (the treatment the brief reserved for list-760 alone). Do NOT auto-merge them as "diff=0 detail/form". → DECISION QUEUE.

## Batch plan (detail → form → list)
**DETAIL b1 — hardcoded-640 trivials (diff=0 all widths):** ScoutDetailPage ✅, ScoutIssuesPage ✅ (pilot, shipped). Remaining: **ScoutRankingPage** (`/scouts`) — also hardcoded 640, true diff=0, safe to migrate next under the same proof.
**DETAIL b2 (desktop delta):** TeamDetailPage, LayoutAnalyticsPage, TrainingResultsPage.
**DETAIL b3 (currently no maxWidth):** ProfilePage, UserDetailPage.
**FORM b1:** LayoutWizardPage, TrainingSetupPage, TrainingSquadsPage, DebugFlagsPage (bare fragment → add wrapper).
**LIST b1:** TeamsPage, PlayersPage, LayoutsPage, MembersPage.
**LIST b2 (admin, bare fragments):** AdminLeaguesPage, AdminPlayersPage, AdminTeamsPage, WorkspacesAdminPage, AdminLayoutsPage.

## Excluded (canvas / AppShell / fixed-overlay)
MainPage (AppShell), LayoutDetailPage, TacticPage, HitabilityPage, BunkerEditorPage, BallisticsPage — own their sizing (CanvasRailLayout / immersive / fixed). Pre-route: LoginPage, PbleaguesOnboardingPage, PendingApprovalPage. Redirect: TrainingPageRedirect.

## Needs individual judgment (entangled)
MatchPage (3 shell modes), ScoutedTeamPage + PlayerStatsPage (portrait doc-scroll / landscape CanvasRailLayout dual-branch — only the portrait branch is migratable, outer wrapper must stay conditional), PlayerPerformanceTrackerPage (4+ render branches, no single shell), WorkspacesAdminPage (nested detail panel with its own shell).

## Counts
3 trivial diff=0 · 18 migratable-with-desktop-delta · 6 excluded (canvas/shell) · 5 needs-judgment · 4 pre-route/redirect.
