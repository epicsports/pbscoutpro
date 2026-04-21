# CC_BRIEF_BUGFIX_PRE_SATURDAY_2

> **Archived 2026-04-21** after delivery (merge `2485653`, commits `f68a70c` + `8d5686f`).
> Brief was delivered in chat (not transit through `docs/ops/cc-tasks/`); preserved here as reasoning artifact per § 37.1.

**Context:** Companion brief to `CC_BRIEF_BUGFIX_PRE_SATURDAY_1` (F3 + G2 + G1). This brief covers two scout-workflow polish issues: G3+G4 (scout-gated match summary) and F1 (auto-save after elimination reason). Both improve Jacek's Saturday scouting efficiency when he plays + scouts simultaneously.

**Branch:** `fix/scout-workflow-polish` off `main` (independent of Brief 1; do not stack)

**Deploy urgency:** Pre-Saturday 2026-04-25 — preferable but not blocking like F3. If Brief 1 + iPhone validation eats Wed/Thu, this can ship Friday.

**Pre-req:** Brief 1 merged to main first to avoid conflicts in `MatchPage.jsx`.

---

## Part 1 — G3 + G4: Role-gated match summary (scout view vs coach view)

### Symptom (user report, verbatim)

> G3: Podsumowanie meczu dla scouta — nie powinien widzieć podziału dorito/snake/center/danger/sajgon/disco/zeeker. To są coaching stats z `coachingStats.js`. Gate: pokaż tylko gdy `hasAnyRole(roles, 'admin', 'coach')` — scout widzi inne stats (patrz G4)
>
> G4: Scout powinien widzieć swoje TO DO — obecnie widzi breaks + shots. Dodaj: players, result. Czyli jego score sheet to: players placed ✓/total, breaks ✓/total, shots recorded, result (kto zdobył)

### Concept

Match summary on heatmap view currently shows the same coaching analytics block to everyone. This is wrong for a pure-scout role: coaching stats (dorito/snake/disco/zeeker/center/danger/sajgon percentages) require *interpretation* and serve the coach's pre-game planning. A scout's job is *data collection completeness* — "did I capture everything for this match?". Different role, different summary.

### Where it renders

`src/pages/MatchPage.jsx` — heatmap view, the inline coaching stats row that uses `computeCoachingStats(points, field)` from `src/utils/coachingStats.js`. Per DESIGN_DECISIONS § 17: *"Used on: MatchPage heatmap (CoachingStats inline row)"*. Find that block, gate it.

### Role gating

Use existing `hasAnyRole(roles, ...)` helper from `src/utils/roleUtils.js` (per security-roles-v2 merge `71da0e2`).

```
if (hasAnyRole(roles, 'admin', 'coach')) {
  // render coaching analytics (current behavior — DO NOT change)
} else if (hasAnyRole(roles, 'scout')) {
  // render scout score sheet (NEW — see § 1.3 below)
} else {
  // viewer / no recognized role — render nothing or minimal score-only summary
}
```

**Edge case — Jacek:** has `['player','admin','coach','scout']`. Falls into the `admin/coach` branch → sees coaching analytics by default. **No toggle in this brief.** If he needs to verify scout view, he can use a separate test user (out of scope here; covered by future role-switcher work in `feat/security-roles-v2` Commit 3 ViewSwitcher).

### Scout score sheet — new component

New file: `src/components/match/ScoutScoreSheet.jsx`

**Props:**
```
{
  points,            // array of point docs from match
  match,             // match doc (for outcome / score / status)
  scoutedTeamSide,   // 'home' | 'away' — which side this scout was scouting
}
```

**Aggregate metrics across all points in the match:**

| Metric | Formula | Display |
|---|---|---|
| Players placed | sum(non-null player slots in `{side}Data.players` per point) / (5 × pointCount) | `12/15` (80%) |
| Breaks | sum(players with both position AND assigned bunker per point) / (5 × pointCount) | `10/15` (67%) — see note below |
| Shots recorded | sum(players with at least one entry in `quickShots` OR `obstacleShots` per point, on this scout's side) | `8/15` players have ≥1 shot |
| Result | match outcome — winning team + final score | `Ranger Ring won 5–3` or `In progress: 2–1` |

**"Breaks" definition note:** A "break" is recorded when a player has a starting position placed AND a bunker can be inferred (within 15% distance of a bunker — see DESIGN_DECISIONS § 30 kill attribution formula uses same distance threshold). If your existing breaks metric in the current scout summary uses a different definition, **keep that definition** and add players + result alongside. Do not redefine breaks in this brief — that's a separate ticket.

**Layout (Apple HIG § 27 compliant):**

- Card style: bg `#0f172a`, border `#1a2234`, radius 12px, padding 14px
- Section title: "Twój score sheet" (or English "Your score sheet" per i18n hook) — 11px/600, `#64748b`, uppercase, letter-spacing .4px
- Four rows, each row: `[label flex:1] [value 13px/700 right-aligned]`
  - Label: 13px/500, `#8b95a5`
  - Value: 13px/700, color depends on completeness:
    - 100% → `#22c55e` (green)
    - 60-99% → `#f59e0b` (amber — partial)
    - <60% → `#ef4444` (red — incomplete)
    - Result row: always `#e2e8f0` (neutral)
- Optional 4px progress bar under each row showing fill (3 metric rows only, not result)
- No emojis in metric labels — keep it clean
- Card replaces the `<CoachingStats>` row in scout view; same vertical position in MatchPage layout

**Empty state:** If `pointCount === 0` (match shell exists but no points scouted yet) → show single line "No points scouted yet — start by tapping ADD POINT below" — 13px/500, `#64748b`, italic, centered.

### Acceptance criteria

- [x] Pure-scout user (role `['scout']` only) → sees ScoutScoreSheet, does NOT see coaching analytics
- [x] Coach user (role contains `coach` or `admin`) → sees coaching analytics, does NOT see ScoutScoreSheet
- [x] Viewer user (role `['viewer']` only) → sees neither (or minimal score-only) — non-blocking, just don't crash
- [x] Jacek (multi-role admin+coach+scout+player) → sees coaching analytics (admin/coach branch wins)
- [x] All metrics aggregate correctly across all match points
- [x] Player count denominators handle edge cases: shell points (no data) count as 0/5, partial points count correctly
- [x] Result row reflects current `match.status` ('open'/'live'/'closed') and uses correct score source
- [x] No regression in coaching analytics row for coach users

### Do NOT

- Do NOT change `coachingStats.js` formulas — gating only
- Do NOT add a toggle for "view as scout" — out of scope, see Edge case note above
- Do NOT re-arrange the heatmap view layout — replace coaching block in-place with scout block, same vertical slot
- Do NOT add ScoutScoreSheet to ScoutedTeamPage or PlayerStatsPage — match summary only

---

## Part 2 — F1: Auto-save and auto-close after elimination reason

### Symptom (user report, verbatim)

> Po kliknięciu "trafienie gracza" + wyborze powodu — menu NIE zwija się automatycznie; user musi klikać Zapisz + Close. FIX: auto-save + auto-close po wyborze powodu (jeden tap vs trzy)

### Current flow (3 taps)

1. Tap player on canvas → floating toolbar appears
2. Tap "Hit" (💀) → elimination reason picker appears (sub-menu / dropdown / sheet — depends on current implementation)
3. Tap reason (e.g. "shot", "penalty", "ramp") → reason highlighted as selected
4. Tap "Save" → reason saved
5. Tap outside / "Close" → menu closes

### Target flow (1 tap)

1. Tap player → toolbar
2. Tap "Hit" → reason picker
3. Tap reason → reason saved + picker auto-closes + toolbar auto-closes (player deselected)

### Where it renders

Likely in `src/components/field/touchHandler.js` or in the elimination reason sub-menu rendered from the floating toolbar in `MatchPage.jsx`. The floating toolbar itself lives in `FieldCanvas.jsx` (per DESIGN_DECISIONS § 1.4).

CC: locate the elimination reason picker component first, then make these changes:

1. On reason tap → call existing save handler (whatever currently fires on "Save" button)
2. Immediately after save handler resolves → close picker + clear selected player (deselect to also dismiss toolbar)
3. Remove the now-redundant "Save" button from the picker (or keep as no-op fallback if it serves any other purpose — verify before removing)

### Edge cases

- **Toggle behavior:** If user changes their mind and taps a *different* reason in the picker (e.g. picked "shot", then realized it was a "ramp"), the second tap should overwrite the first reason's save. Implement as: each tap = save with that reason, picker re-opens for the same player on subsequent player tap. Acceptable trade-off (extra Firestore write) for the 1-tap UX gain.
  - **Alternative if write cost matters:** debounce auto-save by 250ms — if user taps another reason within 250ms, only the last one fires.
- **Existing reason on player:** If player already has an elimination reason and user opens picker again → picker shows current reason highlighted; tapping same reason = no-op + close (don't re-write); tapping different reason = overwrite + close.
- **Cancel path:** If user opened picker but wants to back out without picking → tap outside picker (existing backdrop dismiss per § 1.4) closes picker WITHOUT changing data. Player remains "Hit" with no reason if that was already its state, or remains alive if not yet hit.

### Acceptance criteria

- [x] Tap player → "Hit" → reason → all menus close, reason is saved (verify in Firestore)
- [x] Tap player → "Hit" → reason → tap player again → toolbar opens, "Hit" already showing as active, picker doesn't auto-open
- [x] Tap player → "Hit" → wrong reason → tap correct reason → final state has correct reason, no orphan write
- [x] Tap outside reason picker after opening → picker closes, no data change (cancel path works)
- [x] No regression in non-elimination toolbar actions (Assign, Shot, Del still work as before)
- [x] Tactic page floating toolbar (which has fewer actions) NOT affected — Hit doesn't exist there

### Do NOT

- Do NOT change which reasons are available or their order
- Do NOT change the Hit/Alive toggle for players without reasons (separate concern)
- Do NOT add haptic feedback or animations — out of scope
- Do NOT touch `drawPlayers.js` skull rendering (Brief 1 territory)

---

## Delivery notes (added at archive time)

### Where F1 actually lived

The brief's location guess ("likely in `touchHandler.js` or elimination reason sub-menu rendered from the floating toolbar in `MatchPage.jsx`") was incorrect. MatchPage's `action === 'hit'` (L1059) is a plain binary alive/dead toggle via `toggleElim` — **no reason picker exists on the MatchPage canvas**. The reason picker lives in `src/components/training/LivePointTracker.jsx` (training live-tracking path, lines ~95-105 and ~298-329 in pre-fix state).

This also changes the "auto-save" semantics: reasons are kept in **component state** (`state[pid].cause`), not written to Firestore per-tap. The Firestore write bundles `eliminationCauses` into the point doc only when W/L outcome is tapped (`handleSave` in LivePointTracker). So "auto-save" here translates to "commit in-memory + close picker in one setState call" — and the brief's fallback concern about debouncing per-reason writes is moot for this architecture.

### Why existing inline Breaks+Shots strip stays

The `Points` section in MatchPage (~L1405-1423) already has a 2-row completeness strip labeled "Breaks + Shots". Its "Breaks" formula is `placed / totalSlots` (across both sides) — arguably a mis-label for "Players placed". The brief's G4 asks for a proper 4-row score sheet including a correctly-defined Breaks (placed AND bunker-inferred). We built that as the new `ScoutScoreSheet` component in the `CoachingStats` slot and intentionally left the old inline strip alone — redefining it would be out of brief scope. `ScoutScoreSheet` is the new canonical surface; the old strip remains as supplementary context for all users.

### § 27 self-review (post-delivery)

```
§ 27 self-review:
Color discipline: PASS — amber only on 60-99% partial-completion state
                  (semantic), not decoration. Labels in textDim.
Elevation:        PASS — surfaceDark card + border token, tokens-only.
Typography:       PASS — 11px/600 title, 13px/500 labels, 13px/700 values
                  (tabular-nums). Nothing below 11px.
Cards:            PASS — ScoutScoreSheet = one card one goal; picker
                  reason cells bumped from ~36px to minHeight 44.
Navigation:       PASS — no layout rearrangement.
Anti-patterns:    ZERO — no amber on non-interactive; progress bar fill
                  is functional state indicator, not decoration.
Verdict:          READY TO COMMIT (delivered)
```

## Commits

- `f68a70c` — `feat(match-summary): role-gated scout score sheet replaces coaching stats`
- `8d5686f` — `fix(scouting): auto-close elimination reason picker on tap`
- `2485653` — `merge: scout workflow polish (G3 + G4 scout score sheet + F1 auto-close reason picker)`

## Cross-cutting: § 27 self-review

After both parts, run REVIEW_CHECKLIST.md. Specific watchpoints:

- **Color discipline (Part 1):** Green/amber/red on completeness percentages = legitimate semantic use (success/partial/danger), NOT decorative amber. Check.
- **Typography (Part 1):** Labels 13px/500, values 13px/700, section title 11px/600. Don't drift below 11px on labels.
- **Touch targets (Part 2):** Reason picker buttons must remain ≥44px after the Save button is removed. Don't shrink the picker just because it's now smaller.
- **Anti-patterns:** Zero amber on non-interactive completeness labels. Amber only on the value text when it represents the partial-completion state.

Standard report format expected.

---

## Commit discipline

Two suggested commits:

```
feat(match-summary): role-gated scout score sheet replaces coaching stats

Pure-scout users now see a data-completeness dashboard (players placed,
breaks, shots recorded, result) instead of coaching analytics that they
can't action. Coach/admin users see coaching analytics unchanged.

Implements DESIGN_DECISIONS §27 + bug report G3+G4.
```

```
fix(scouting): auto-save elimination reason on tap

Picker now saves + closes on reason tap. Removes the redundant Save +
Close steps that were costing 3 taps for what should be 1.

Bug report F1.
```

---

## Post-merge

1. `npm run deploy`
2. Append to `DEPLOY_LOG.md` — flag known limitation: **auto-save on every reason tap may produce extra Firestore writes if user changes mind quickly**. Mention debounce alternative if Jacek hits this in practice.
3. Move this brief to `docs/archive/cc-briefs/`
4. Update `NEXT_TASKS.md`: mark G3, G4, F1 as `[DONE]` with commit ref
5. Update `docs/DESIGN_DECISIONS.md` — append `§ 38 Scout score sheet` documenting:
   - Role-gating logic (`hasAnyRole(roles, 'admin', 'coach')` → coach view, else scout view)
   - Four metrics + their formulas
   - Card layout spec
   - Why we don't show coaching stats to pure scouts (interpretation requires coaching context)
6. Notify Jacek for iPhone validation

---

## Explicit GO checkpoint

Same rule as Brief 1: **no merge to main without Jacek's GO.** Validation flow:

1. CC pushes branch + opens PR
2. Jacek logs in as himself (sees coaching view → unchanged) and as a test scout user (sees ScoutScoreSheet → new)
3. Jacek scouts a point: tap player → Hit → pick reason → confirms 1-tap close works
4. Jacek says "GO" → CC merges + deploys
