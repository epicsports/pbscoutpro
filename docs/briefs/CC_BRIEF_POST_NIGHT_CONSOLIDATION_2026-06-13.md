# CC BRIEF — POST-NIGHT-RUN CONSOLIDATION (2026-06-13)

Mixed tiers, labeled per item. One block.

## STEP 0 — Codify the night-run tier in §7.6 (doc, autonomous, FIRST)
Jacek ratified "blanket GO" for overnight runs as DELIBERATE. Add **Tier 1.5** to PROJECT_GUIDELINES §7.6: *mockup-approved Tier-2 work MAY merge+deploy after green e2e during an explicitly-authorized autonomous/overnight block, WITHOUT a pre-merge gate — validation moves to Jacek's prod smoke after, revert path in DEPLOY_LOG.* Distinct from Tier 2 (novel pattern, no prior mockup → still hard pre-merge gate) and Tier 1 (logic/proven-identical). Overwrite memory note. Record that phase-view + nav-drawer shipped under Tier 1.5.

## STEP 1 — Commit the 6 orphaned artifacts (doc, autonomous)
Jacek is re-delivering these (were chat-only, the root cause of the "not in repo" DECISION-QUEUE block). Commit to repo:
- docs/briefs/: CC_BRIEF_FULL_DAY.md · CC_BRIEF_FULL_DAY_ADDENDUM.md · CC_BRIEF_READS_SPLASH.md · CC_BRIEF_CC76F9AD_CATALOG_REFETCH.md
- docs/mockups/: mockup-5-screen-primitive.html
- docs/product/: lp-reads-draft-v1.html (STATUS: DRAFT — awaiting Jacek review)
After commit, STEP 3/4/6/10–14 from those briefs are executable from clean context again. Confirm in the report which referenced steps are now unblocked.

## STEP 2 — Hitability coach-preview phase view: REUSE the component [Tier 1 — propagation of the just-ratified pattern]
Jacek smoke: the coach team-preview on a scouted match shows the same review components → it must use the SAME phase-view component just shipped on MatchPage review (B1–B6), not a parallel implementation. Discovery first: confirm the coach-preview renders the same review composite; if yes, lift the phase row + per-phase layer defaults + direction arrows into the shared component and consume it in both. Fail-first e2e on the coach-preview path. Tier 1 (ratified pattern, propagation) → merge+deploy.

## STEP 3 — Quick-log in rail-compact scoreboard [Tier 1 — regression fix]
The landscape rail-compact scoreboard dropped the "Quick ›" link in TRAINING context. Quick log is valid in training (we only removed it in tournaments). Restore it conditionally in the compact variant: training → Quick › present; tournament → absent. e2e asserts both contexts. Merge+deploy.

## STEP 4 — i18n COVERAGE AUDIT + completion [Tier 1 — extraction is pixel-identical; translation = EXPECTED_DIFF rows]
Jacek smoke #3: mixed PL/EN across screens — meaning some screens were never touched by batches 1–6 (still-hardcoded EN lives there).
1. **Audit (read-only, report):** scan all JSX for hardcoded user-facing strings NOT routed through i18n. Output: per-screen coverage table (screen → # hardcoded strings remaining), sorted worst-first. This tells us how far from done we actually are — no more guessing.
2. **Complete in batches** per the established discipline (extraction commit = pixel-identical; any copy that changes PL rendering = separate commit + EXPECTED_DIFF_REGISTER row; ~5–8 files/batch; build/lint/e2e/pixel-diff per batch; Sonnet-split fine). Skip canvas-draw literals + fixtures as before.
3. Goal: coverage table reaches ~100% of user-facing surfaces (the audit defines the finish line). Report final coverage %.
4. The i18n precommit guard (warn on NEW hardcoded PL/EN JSX strings) — confirm it's active so coverage can't regress.

## STEP 5 — Registrations / housekeeping (autonomous)
- NEXT_TASKS: PPT double-bar (slim ball-bar above PageHeader) → arc-B item "fold reads-ball into PageHeader app-wide" (not a hotfix; touches every headered screen).
- Confirm "top bar renders with no event selected" = intended (ball/drawer always reachable) — close as by-design, no action.
- 28 duplicate i18n keys → own dedupe ticket, Jacek's note: values may differ, verify before deleting (do NOT auto-dedupe).
- defaultWorkspace multi-ws rules fix + smoke #4 → leave row open pending Jacek's other-account test.

## Evening hand-off
One report: STEP 2/3 shipped + revert pointers · STEP 1 commit confirmation + which referenced steps unblocked · STEP 4 coverage table (the headline number) + batches completed · DECISION QUEUE. Note: splash (STEP 3 of FULL_DAY), <Screen> pilot (STEP 4), cc76f9ad, motion-dark etc. are now committed and re-enter the queue — Jacek will sequence them next.
