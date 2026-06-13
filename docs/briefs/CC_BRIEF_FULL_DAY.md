# CC BRIEF — FULL DAY AUTONOMOUS RUN (2026-06-12): maximum progress, zero Jacek dependencies

**Role:** CC. §7.6 TWO-TIER is now LAW (Jacek GO, 2026-06-12 morning) — STEP 0 codifies it. Everything below is classified per tier. Evening hand-off = one consolidated report + one prod-smoke checklist + the "needs-Jacek" list. Do not ping Jacek during the day; collect.

## STEP 0 — Codify two-tier §7.6 (doc, autonomous, FIRST)
PROJECT_GUIDELINES §7.6 v2: **Tier 1** (approved-pattern batches, propagation of gated designs, pixel-identical refactors with machine proof, logic-only) → merge+deploy after green build/lint/e2e; Jacek smokes on prod immediately after; revert path documented in DEPLOY_LOG entry. **Tier 2** (NEW visual patterns/elements, first instance of any design) → branch + explicit pre-merge GO, no exceptions. Overwrite the old §7.6 and your memory note.

## STEP 1 — §113 rollout completes: 4.1 + 4.2 + 4.3 [TIER 1 — pattern approved via mockup-2 + live on Hitability]
- Merge `feat/rail-rollout` (4.1 PlayerStats — already READY/green).
- Build 4.2 ScoutedTeamPage + 4.3 MatchPage(review) per CC_BRIEF_DAY2_PART2 Stage 4: same pattern, by-reference, fail-first e2e each, A4 entanglement escalation still binding (scout mode untouched; if inseparable → STOP, park 4.3, continue the day).
- Stage 5 validation: audit re-run → match-review P0 cleared, no new flags. Merge+deploy per Tier 1. DEPLOY_LOG.
- AFTER 4.3 merge: **extraction for Opus** — faithful snapshot of MatchPage-review on the new rail (portrait+landscape, populated stress data) → docs/mockups/. Gates the phase-view mockup.
- ALSO extract: **main-home per role** (coach + player, portrait, current bottom-nav + header) → docs/mockups/. Gates the nav-drawer mockup (arc B).

## STEP 2 — Hitability marker popup [TIER 1 — propagation of the existing scouting tap-popup pattern + Jacek-specified]
Tap a position or target in Config (and Tracking for targets, consistent with current tap-to-hit? NO — popup only in CONFIG mode; Tracking tap stays = +1 hit, do not break the capture gesture):
- Popup (reuse/extract the scouting player-popup component for visual consistency — one popup language app-wide): **Nazwa** (alias, inline edit) · **Kolor** · **Usuń**.
- Alias: stored on the hitability config doc (position/target entries gain optional `name`); rendered everywhere the id/letter shows (rail rows, breakdown, badges fall back to letter when no alias). This closes parked #3.
- Color semantics (Opus decision on record, §115-consistent): the color control edits the PAIR color = the owner position's palette color; position dot + connection lines + target ring update together. On a multi-owner or owner-less target: control disabled with a hint. Position popup edits its own color the same way.
- Delete: reuses the §C cascade + ConfirmModal w/ hit-count.
- Fail-first e2e: alias set → appears in rail + breakdown; color change → dot+line+ring all flip; popup delete = same behavior as §C path.
- Tier 1: merge+deploy; on tonight's checklist.

## STEP 3 — READS splash, variant (a) [TIER 2 — build on branch, evening gate]
Execute CC_BRIEF_READS_SPLASH with scope (a) (splash only; login lockup (b) awaits Jacek's letter). Branch + READY; NOT merged. Evening gate = Jacek's iPhone cold-start.

## STEP 4 — <Screen> pilot with machine proof [TIER 1 *by proof*]
Per mockup-5 (conditional GO given): build `<Screen>` (API: archetype + header slot; document-scroll + sticky header; LAYOUT_TIERS token detail640/list760/form560; SPACE paddings; safe-area paddingBottom) → migrate ScoutDetailPage (pilot) + ScoutIssuesPage (proof).
- H0 pixel-diff prod-vs-pilot at phone widths: **merge allowed ONLY if diff = 0 AND full e2e green**; ANY nonzero pixel → hold on branch with the diff report for the evening review. The desktop list-760 tier is NOT exercised by these two pages (both detail) — no visual delta expected at all.

## STEP 5 — The sweeps marathon (overnight leftovers) [TIER 1 by proof]
H0 harness (if not built yet) → H1 i18n extraction batches → H2 hex→token batches — per CC_BRIEF_OVERNIGHT_ADDENDUM verbatim (batch discipline, pixel-diff=0 per batch, STOP-lists, precommit guards H4.3 + post-sweep hex guard). Merge clean batches per Tier 1 (machine-proven identity). H3 no-eternal-loading rollout + H4 fillers as time allows.

## STEP 6 — Wave-3 seed + audit run (audit branch; schedule around emulator use)
Build per CC_TRIAGE_V2_FINAL §4 (real layout geometry incl. bunkers; points linked to visited players; tournament+sparing contexts + register context column; coverage manifest). Run when the emulator is free; FINDINGS_FULL v3 + 10 screenshots for the evening eyeball.

## STEP 7 — Registrations + small follow-ups (doc/discovery, autonomous)
1. NEXT_TASKS: **events-list redesign** [arc D] (Jacek: "przebudować ten ekran docelowo" — dual badges fine for now).
2. **B26 re-parked**: Jacek reports the box still loops post-fix. One 10-min check ONLY: could his session be pre-deploy SW cache (the fix needs a double cold launch)? Note the verdict; super-admin-only surface, parked either way — no further work.
3. **Logo on phone**: still fallback for Jacek post-E3 — same SW-cache caveat; add row "verify after SW update cycle; revisit within rebrand/nav arc". No further work today.
4. E5 row stays open (Jacek owes the UI re-check).
5. F2 §116 manual-collapse paragraph + toggle e2e if still missing.
6. Commit any briefs/mockups not yet in docs/briefs|mockups (incl. mockup-5, READS files).

## Evening hand-off (ONE report)
- Shipped-to-prod list (Tier 1) + revert pointers · branches awaiting gates (Tier 2: splash; <Screen> if diff≠0).
- ONE prod smoke checklist: 4.1/4.2/4.3 per device (incl. tablet strip on all three) · marker popup (alias/color/delete) · anything from sweeps visible (should be: nothing).
- Needs-Jacek list: splash gate (+ letter a/b) · <Screen> diff review (if held) · popup color-semantics ratification · E5 UI check · v3 audit eyeball · Sławek narratives review (still open).
- Sweeps progress % + STOP-lists. Escalations collected, not pinged.

Priority if the day runs short: STEP 0 → 1 → 2 → 4 → 5(H0+H1) → 3 → 6 → rest. Protect scout.*/package.json as always.
