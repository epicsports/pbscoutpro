# CC BRIEF — FULL DAY ADDENDUM: autonomous work from further arcs (paste with CC_BRIEF_FULL_DAY.md)

Same rules (§7.6 two-tier). These slot into the day AFTER the base brief's chain; revised global priority at the bottom.

## STEP 8 — B4 build [TIER 1 — design gated via mockup-4 "bardzo fajne", arc E stage 1]
Execute CC_BRIEF_DAY2_PART3 in full (role-aware home: coach/admin checklist derived-from-data, scout join state, player claim state; A1–A4 assumptions binding, esp. A3 no-expensive-queries). Mockup-4 file is in docs/mockups (or Jacek re-pastes). Merge per Tier 1; evening prod-smoke item: fresh-workspace path (CC: state in the report HOW Jacek can see the cold state — test workspace vs pbfit pre-data).

## STEP 9 — defaultWorkspace fallback fix [TIER 1 — logic + existing screen]
The escalated member-without-defaultWorkspace → NoWorkspaceScreen dead-end (E4: 3 prod members rely on auto-enter fallback today): membership-resolve fallback = if user is member of EXACTLY ONE workspace → enter it (and stamp defaultWorkspace); if >1 → existing workspace picker; only 0 memberships → NoWorkspaceScreen. Un-fixme the 5f69dc04 regression test (now meaningful). Closes the FIT fresh-invitee wall.

## STEP 10 — arc C: motion infrastructure DARK [TIER 1 — flag-off, zero visual]
Behind a single feature flag (default OFF):
1. View Transitions wrapper on the router (`document.startViewTransition` when supported AND flag on; no-op otherwise).
2. `<Skeleton>` primitive implementing the doctrine (show only after 200 ms wait, min-display 300 ms once shown), styled from tokens — NOT mounted anywhere yet.
3. `prefers-reduced-motion` utility hook consumed by both.
Build + unit tests; merge (no visual surface while flag off). Enabling = future Tier 2 gate with Opus pilot.

## STEP 11 — arc F2 prep: EN table skeleton [conditional on H1 ≥ ~60% coverage]
Generate the EN i18n table skeleton mirroring all extracted keys (values = `TODO:<PL source>` markers) + a coverage report. NO machine translations — first pass is Opus's. Infra-only, autonomous.

## STEP 12 — arc D prep: design-pass contact sheets [autonomous, tooling]
Script: compose the audit screenshots into per-archetype contact-sheet pages (HTML, one per archetype, all routes × phone-portrait+desktop) → `audit/design-workbook/`. Zero app code. This becomes the working material for the arc-D design pass and the Opus/Jacek review sessions.

## STEP 13 — arc G spike: TWA readiness [stretch, research-only]
Local Bubblewrap/TWA spike against the prod URL: generate the wrapper project, document what works, what needs assets (maskable icons? asset links file?), and the exact remaining Jacek actions (Play account $25, signing). Output = `docs/product/TWA_READINESS.md`. No commits to app code; no store anything.

## STEP 14 — doc commits [autonomous]
1. `docs/product/ONBOARDING_NARRATIVES.md` — commit the Opus draft with a `STATUS: DRAFT — awaiting Jacek+Sławek review` header (content is review-pending; presence in repo isn't).
2. NEXT_TASKS rows for the deliberately-skipped: arc F email-link (blocked: Firebase console config = Jacek), cc76f9ad (blocked: Opus brief owed), read-volume audit (note: baseline nearly clean — schedule after sweeps), Spark #2–4 / PaT / GDPR / Tier D unchanged.

## Revised global priority (whole day, both files)
STEP 0 (codify) → 1 (rollout 4.1–4.3) → 2 (marker popup) → **8 (B4)** → 4 (<Screen> by proof) → **9 (defaultWorkspace)** → 5 (H0+H1 sweeps; H2 after) → 3 (splash branch) → **10 (motion dark)** → 6 (wave-3) → 7 (registrations) → **11 → 12 → 13 → 14**. If limits end mid-day: everything above the cut is shippable independently; nothing half-done crosses a batch boundary.
