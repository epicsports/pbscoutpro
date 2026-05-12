# CC Brief — Pre-NXL Refinements (Brief A)

**Date:** 2026-05-12
**Author:** Opus
**Status:** SHIPPED 8/9 on `feat/pre-nxl-refinements` (awaiting Jacek smoke test + GO + deploy)
**Branch:** `feat/pre-nxl-refinements` (branched from `4e0fff3`)
**Spec landed:** `docs/DESIGN_DECISIONS.md` § 60 (60.1 – 60.9)

This is the reasoning archive for the 9 SAFE-tier items from Jacek's 2026-05-12 feedback session, scoped against the NXL Czechy 2026-05-15 hard deadline. **No schema changes, no architecture refactors.** Pure add-code or minor reorders only.

---

## Outcome — 8/9 shipped, 1 deferred

| # | ID | Task | Status | Commit |
|---|---|---|---|---|
| 1 | SCOUT #6 | Precision drawer width 80%/max-340 → 70vw/max-520 | ✅ | `63fdb65` |
| 2 | COACH #8 | Remove ADD MATCH from team summary | ✅ | `b67b26e` |
| 3 | COACH #1 | Heatmap to top of analysis (expanded) | ✅ | `60bb2db` |
| 4 | COACH #7 | Tendencja → Additional sections (collapsed) | ✅ | `2690433` |
| 5 | PLAYER #1 | BottomNav visible in player section | ⏸ DEFERRED | — |
| 6 | COACH #2 | "Played X times" column in Rozbiegi | ✅ | `d4fd3cc` (bundled with #7) |
| 7 | COACH #3 | "Played x/x points" column in Rozbiegi | ✅ | `d4fd3cc` |
| 8 | COACH #4 | Reliability rate banner in Strzelanie | ✅ | `7f51147` |
| 9 | COACH #6 | Match picker + "Ostatni mecz" CTA | ✅ | `43b03d1` |
| 10 | docs | § 60 + HANDOVER + NEXT_TASKS + archive | ✅ | this commit |

### Why PLAYER #1 deferred

Brief itself flagged ESCALATE for this item. Three concerns drove deferral (full rationale in § 60.9):

1. § 31 explicitly excludes `/player/:playerId/stats` from BottomNav.
2. `AppShell.jsx:25-28` carries an architectural comment that PPT (`/player/log`) was deliberately routed outside AppShell because "PPT has its own layout/chrome and nesting it inside AppShell's tournament context bar would be visually confusing."
3. Three candidate routes (`/profile`, `/player/log`, `/player/log/wizard`) — Jacek's feedback didn't specify which.

Wrapping multiple routes in a shared AppShell requires extracting tab state from `MainPage` into a hook. Real refactor, not the "small render fix" SAFE tier this brief was scoped to. Re-brief post-NXL with screenshot confirmation.

---

## Discovery contradictions vs brief assumptions

**SCOUT #6 (Task 1):** Brief title said "40% → 70%" but discovery surfaced `ShotDrawer.jsx:68` was `width: '80%', maxWidth: 340`. The `maxWidth: 340` cap was the bottleneck — on iPhone Pro Max landscape (932 px) that yielded ~36% of viewport, matching Jacek's "40%" perception. Resolved with brief decision-tree case 3 (fixed-pixel-cap branch): `width: '70vw', maxWidth: 520`. Documented in commit `63fdb65`.

**Task 10 numbering:** Brief said "append § 39". § 39 has been live since April 21 (Scout score sheet — role-gated match summary); latest section in DESIGN_DECISIONS at brief-write time was § 59. Renumbered to § 60.

---

## § 27 self-review (post-implementation)

```
§ 27 self-review:
Color discipline: PASS — amber additions all interactive/active state.
  · ShotDrawer width change: no color change.
  · ADD MATCH removal: no new color.
  · Heatmap promotion + Tendencja demotion: no new color.
  · Rozbiegi Played/In-pts columns: text-only, no new amber.
  · Strzelanie reliability banner amber: warning-state semantic
    (alert <80%) — § 27 amber-as-active-indicator exception applies.
  · Match picker pills: amber active state on selected pill,
    consistent with existing Ten turniej / Cały layout.
  · Match picker selected-card border: amber for selected state,
    consistent with pill convention.
Elevation:        PASS — banner uses surfaceDark + accent border-only
                  variant; modal uses ui.Modal canonical surface.
Typography:       PASS — column-header font 9px / value 12px (≥ 8 px
                  minimum). Reliability banner text 11px. Picker
                  cards 14px primary / 11px subtitle.
Touch targets:    PASS — pill min-height 44px; picker card
                  min-height TOUCH.minTarget; Modal scrollable
                  body preserves tap target sizes.
Cards:            PASS — one card = one touch target on the picker.
                  Selected state via background + border (no chevron).
Navigation:       PASS — no change to PageHeader / back chevron.
Anti-patterns:    ZERO — pill row stays calm (all four pills share
                  the same accent treatment, no competing CTA).
                  Selected pill mirrors active state, not a separate
                  CTA.
Verdict:          READY TO COMMIT (and ready for Jacek smoke test).
```

---

## Smoke test plan (Jacek — iPhone, pre-merge)

1. **SCOUT #6.** Open any tournament → match → tap any player → tap "shots" toolbar action. Precision shot drawer slides in. Verify the drawer occupies ~70% viewport width (portrait) and landscape. Tap inside drawer body to drop a shot marker — geometry should still be accurate; no clipping; footer Done/Undo buttons still tappable.
2. **COACH #8.** Open Coach tab → tap any scouted team → drill into ScoutedTeamPage. Confirm no ADD MATCH button anywhere on this page. Then verify match creation still works on the Scout tab (Scout tab top-of-list area or via the More tab matches surface).
3. **COACH #1.** On ScoutedTeamPage with any team that has scouted points: heatmap appears as the first analysis section below the confidence banner, already expanded. Toggle Positions / Shots / Collapse pills still work. Tap an empty area in the heatmap field — point preview interactions unchanged.
4. **COACH #7.** Scroll down on the same page — Tendencja (3 D/C/S cards) is no longer above the fold. Expand "Additional sections" toggle — Tendencja appears after Tactical signals, before the section is closed. All values render same as before.
5. **COACH #2 + #3.** Section "Rozbiegi" (Breakouty) shows 4 right-aligned columns: Rozbieg% / Przeżycie% / Zagrań / W pkt. Verify columns render on iPhone 13-class width without overflow. Confirm `W pkt` shows `{points-with-this-bunker}/{total-scope-points}` and `Zagrań` is ≥ points-with-this-bunker (because of multi-player same-point double-count).
6. **COACH #4.** Section "Strzelanie" — banner at the top of the section. If reliability ≥ 80% you see a neutral grey pill "Strzelanie: dane dla X% graczy". If < 80% you see amber alert pill with ⚠. Try filtering by `Mecz ▾` to a match with low shot data — banner should flip to alert variant when the filter drops reliability below 80%.
7. **COACH #6.** On the pill row at the top of ScoutedTeamPage:
   - Tap "Ostatni mecz" → page filters to most recent closed match for this team. Sample badge updates point/match counts.
   - Tap "Mecz ▾" → bottom-area Modal opens with chronological match cards. Tap one — Modal closes, pill changes to "vs {opponent} ✕". All sections filter to that match.
   - Tap "✕" on the selected pill → returns to "Ten turniej".
   - If team has zero closed matches, "Ostatni mecz" pill is greyed and untappable with tooltip "Brak zakończonych meczów".

If anything fails: **report blocker. Do not GO until resolved.**

---

## Merge protocol (per brief)

After Jacek's iPhone smoke test confirms GO:

1. `git checkout main && git pull origin main`
2. `git merge --no-ff feat/pre-nxl-refinements`
3. `npm run deploy`
4. Append DEPLOY_LOG.md entry (date, merge SHA, summary).
5. Push.

---

## Out of scope (deferred to post-NXL)

- SCOUT #1 (roster filter per tournament)
- SCOUT #2 (self-log FAB gating)
- SCOUT #3 (cache leak point→point)
- SCOUT #4 (partial save / rozbieg without outcome — schema change)
- SCOUT #5 (chess model 4-team rotation — coordinate with auto-swap regression)
- SCOUT #7 (completeness table relocation)
- COACH #5 (Strzelanie percentage formula refactor — banner in § 60.5 is independent)
- NEW ACCOUNT #1 (onboarding hang)
- PLAYER FAB #2 (self-log FAB gating — same family as SCOUT #2)
- Roster filter #1 (per-tournament view)

See `NEXT_TASKS.md` BLOCKED section item 9 for the consolidated post-NXL backlog.

---

**End of archived brief.**
