# CC Brief — Pre-NXL Refinements (Brief A)

**Date:** 2026-05-12
**Author:** Opus
**Scope:** 9 SAFE-tier feedback items from Jacek's 2026-05-12 session
**Hard constraint:** NXL Czechy 2026-05-15. **No schema changes, no architecture refactors.** Pure add-code or minor reorders only.
**Branch:** `feat/pre-nxl-refinements`
**Deploy strategy:** 9 commits, single deploy at end after all green and Jacek smoke-tests on iPhone.

---

## Pre-flight (mandatory — run once before starting)

1. `git pull origin main` and create branch.
2. `npm run precommit` baseline — confirm clean before touching anything.
3. Read `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG) and § 28 (Coach Brief View) in full.
4. Read `docs/REVIEW_CHECKLIST.md` in full.
5. Quote 3 § 27 rules relevant to this brief + 1 anti-pattern you'll avoid (per CLAUDE.md mandatory reads protocol).

**Before each task:** read the file(s) you're about to touch end-to-end. Do not patch blind. If discovery surfaces something contradicting the assumptions in this brief, **STOP** and write a note in your reply — do not improvise architecture.

---

## Task overview

| # | ID | Task | Type | Complexity |
|---|---|---|---|---|
| 1 | SCOUT #6 | Precision drawer width 40% → 70% | CSS | trivial |
| 2 | COACH #8 | Remove ADD MATCH from team summary | delete | trivial |
| 3 | COACH #1 | Heatmap to top of analysis (expanded) | reorder | small |
| 4 | COACH #7 | Tendencja → Additional sections (collapsed) | reorder | small |
| 5 | PLAYER #1 | BottomNav visible in player section | render | small |
| 6 | COACH #2 | "Played X times" column in Rozbiegi | compute + render | small |
| 7 | COACH #3 | "Played x/x points" column in Rozbiegi | compute + render | small |
| 8 | COACH #4 | Reliability rate banner in Strzelanie | compute + render | small |
| 9 | COACH #6 | Match picker + "Ostatni mecz" CTA | scope filter | medium |

Order chosen so the riskiest (#9) goes last, after warmup on simpler changes. If anything blows up, easier to revert isolated commits than to unpick a stacked one.

---

## Task 1 — SCOUT #6: Precision shot drawer width 40% → 70%

**Context (Jacek):** "Podczas ustawiania precision shooting, miejsce do zaznaczania ostrzału jest za małe, powinno zajmować 70% szerokości ekranu."

**Visual scope:** drawer width only. **Flow scope unchanged** — drawer trigger, content, save flow all identical.

### Discovery first
- Locate `ShotDrawer` component (likely `src/components/ShotDrawer.jsx` or inside `MatchPage.jsx`).
- Confirm current width — Jacek perceives ~40%, may be `40vw`, `40%`, or fixed px.
- Note: drawer renders opponent field half. Field aspect must stay correct at 70vw.

### Decision tree
- **IF** drawer width is hardcoded `40vw` / `40%` → change to `70vw`.
- **IF** drawer width is `40%` of parent (not viewport) → change to `70%` of parent, verify it doesn't push past viewport on smallest iPhone (375px width).
- **IF** drawer is a fixed pixel width → switch to `min(70vw, 520px)` for sanity ceiling.
- **IF** going to 70vw breaks field rendering (aspect distortion, off-screen content) → **ESCALATE TO JACEK** with screenshot + proposed alternative width.

### Acceptance criteria
- Precision shot drawer in MatchPage scouting view occupies ~70% of viewport width.
- Field rendering inside drawer is correct aspect, no clipping, no overflow.
- Tap targets inside drawer stay ≥ 44px.
- Landscape view (if applicable) not regressed.

### Commit
```
feat(scout): widen precision shot drawer to 70% viewport (was 40%)

SCOUT #6 from 2026-05-12 feedback. Drawer was too narrow for precise
placement on phone. Width changed to 70vw; field aspect preserved.
```

---

## Task 2 — COACH #8: Remove ADD MATCH from team summary

**Context (Jacek):** "w ekranie team summary widzę przycisk ADD MATCH. Expected: nie powinno go być."

**Visual scope:** remove one button. **Flow scope:** ADD MATCH still accessible from the proper place (Scout tab match list / More tab Matches section, per § 31). Coach drill-down is not the right scope for match creation.

### Discovery first
- Locate `ScoutedTeamPage.jsx` (this is "team summary" / coach view).
- Find the ADD MATCH button — confirm it's there (Jacek's screenshot would help but he reported it as a bug, so we trust the report).
- Verify other entry points to ADD MATCH still work (Scout tab top section, More tab → Matches).

### Decision tree
- **IF** ADD MATCH button found on `ScoutedTeamPage.jsx` → delete the button + any handler it owns.
- **IF** the handler was exported/imported elsewhere → check no orphaned references; delete handler if unused.
- **IF** the button is conditionally rendered (e.g., `isAdmin`, `role==='coach'`) → still remove unconditionally; coach view should never offer match creation.

### Acceptance criteria
- ADD MATCH button absent from `ScoutedTeamPage.jsx`.
- ADD MATCH still works from Scout tab and More tab.
- No console errors, no broken handlers.

### Commit
```
fix(coach): remove ADD MATCH button from team summary

COACH #8 from 2026-05-12 feedback. Coach drill-down is not the right
scope for match creation. ADD MATCH stays on Scout tab and More tab.
```

---

## Task 3 — COACH #1: Heatmap to top of analysis section (expanded)

**Context (Jacek):** "Heatmapa okazała się całkiem przydatna, powinna rozpoczynać sekcję analizy drużyny (być nad statystykami)."

**Visual scope:** reorder sections + expand by default. **Flow scope unchanged** — heatmap interaction, point preview etc. all identical.

### Background (§ 28 — Coach Brief View, 2026-04-18)
Current order on `ScoutedTeamPage`:
1. Sample badge
2. Key insights → Rozbiegi (Breakouty)
3. Strzelanie (Strzały)
4. Tendencja
5. Kluczowi gracze
6. **Additional sections** (collapsed): Counter plan, Insights, Tactical signals, **Heatmap**, Matches

Jacek's change: Heatmap moves out of Additional sections to **top of analysis area**, expanded by default.

### Decision (made by Opus, no escalation needed)
- New order:
  1. Sample badge (confidence banner)
  2. **Heatmap** (expanded, full visible)
  3. Rozbiegi
  4. Strzelanie
  5. Kluczowi gracze
  6. Additional sections (collapsed): Counter plan, Insights, Tactical signals, Matches, **Tendencja** (moved here in Task 4)

### Discovery first
- `ScoutedTeamPage.jsx` — find current section ordering.
- Locate the `Heatmap` component / mini-preview that's currently in additional sections.
- Confirm it can render full-size (not just preview thumbnail) — § 28 says current state shows a "mini preview (110px)" that expands on tap. We want the **full heatmap visible by default** at top.

### Decision tree
- **IF** Heatmap component exists and supports a `defaultExpanded` or similar prop → just pass it.
- **IF** Heatmap exists only as collapsed preview that tap-expands inline → render the expanded form directly in the new top position. Use the existing expanded view, don't build a new one.
- **IF** Heatmap requires `field`/`layout` to render and there's no layout for this team → render empty state (or skip section entirely) — don't crash.

### Acceptance criteria
- Heatmap is the first analysis section below sample badge on `ScoutedTeamPage`.
- Heatmap is expanded (visible) by default — coach does not need to tap to see it.
- All other sections render below in the new order.
- No regression in heatmap interactions (point preview tap still works).

### Commit
```
feat(coach): move heatmap to top of analysis, expand by default

COACH #1 from 2026-05-12 feedback. Heatmap proved valuable in practice;
elevating it above stats. Updates DESIGN_DECISIONS § 28 ordering.
```

---

## Task 4 — COACH #7: Tendencja → Additional sections (collapsed)

**Context (Jacek):** "liczenie zakładki tendencja jest niejasne. Expected: ukrywamy w dodatkowe sekcje do czasu wypracowania poprawnej kalkulacji."

**Visual scope:** move one section into collapsed additional area. **Flow scope:** section still accessible via Additional sections toggle — not deleted, just demoted while calculation gets re-validated post-NXL.

### Decision tree
- **IF** Tendencja is currently rendered as a top-level section (per § 28) → move its render block into the Additional sections accordion, keep all internal code intact.
- **IF** there's no Additional sections toggle (i.e., everything is flat) → check § 28 again; that section is supposed to exist. ESCALATE if missing.

### Acceptance criteria
- Tendencja section no longer appears above the fold on `ScoutedTeamPage`.
- Tendencja accessible inside Additional sections when coach expands.
- Tendencja calculation code untouched (don't delete it — Jacek wants to revisit post-NXL).

### Commit
```
chore(coach): move Tendencja into Additional sections (collapsed)

COACH #7 from 2026-05-12 feedback. Calculation logic flagged unclear by
Jacek; section demoted while formula is revalidated post-NXL.
Logic preserved in place — visual move only.
```

---

## Task 5 — PLAYER #1: BottomNav visible in player section

**Context (Jacek):** "w tej sekcji nie widać na dole menu. Expected: powinno być widoczne normalne menu."

"Sekcja player" = the role-player views (ProfilePage, possibly PlayerStatsPage when accessed by self, "Mój dzień" if it exists).

### Discovery first (CRITICAL — don't assume)
- Identify which route(s) Jacek means by "sekcja player." Likely candidates:
  - `/profile` (ProfilePage — own profile)
  - `/player/:pid/stats?scope=...` (PlayerStatsPage — own stats)
  - Any role-player-only routes (gated by `role === 'player'`)
- Check `App.jsx` / router config — which routes are wrapped in `AppShell` (renders BottomNav) vs which are full-screen (skip BottomNav).
- From § 31: full-screen routes that *intentionally* skip tabs: `/tournament/:tid/match/:mid`, `/tournament/:tid/team/:sid`, `/player/:pid/stats`. The third one is exactly where player would land — and is currently tab-less by design.

### Decision tree
- **IF** Jacek means `/player/:pid/stats` (most likely) → that route is currently full-screen. **ESCALATE TO JACEK** with discovery findings: confirm he wants tabs ON this route specifically, because § 31 explicitly removed them. Likely yes (his feedback supersedes old decision), but flag it.
- **IF** Jacek means `/profile` (ProfilePage) → if BottomNav is missing here, simply wrap the route in `AppShell` so the tab bar renders. ProfilePage should never have been full-screen.
- **IF** there's a dedicated player home / "Mój dzień" route without tabs → same fix: wrap in `AppShell`.

### Acceptance criteria
- BottomNav (Scout / Coach / More) visible at bottom of player views Jacek identified.
- Tab bar functions normally (taps navigate, active tab highlights).
- Content `paddingBottom: 64` so tab bar doesn't overlap content (per PROJECT_GUIDELINES § 2.12).

### Commit
```
fix(player): show BottomNav in player section

PLAYER #1 from 2026-05-12 feedback. Player views now wrapped in AppShell
so tab bar renders. § 31 design updated: routes that affect role-player
default home view should retain navigation chrome.
```

If § 31 needs an explicit exception added, do it in the doc patch commit (Task 10).

---

## Task 6 — COACH #2: "Played X times" column in Rozbiegi

**Context (Jacek):** "tabelka Rozbiegi ma za mało danych. Expected: powinna być kolumna Played X times z liczbą wszystkich rozbiegów w to miejsce — jeśli w jednym punkcie grały tę przeszkodę dwie osoby, powinny być liczone jako 2."

**Computation:** for each breakout bunker B, count `sum across all points of (number of players who broke at B in that point)`. Double-counting per point intended.

### Discovery first
- Locate Rozbiegi rendering in `ScoutedTeamPage.jsx` — likely uses `computeBreakouts(points, field)` or similar from `generateInsights.js` / `coachingStats.js`.
- Inspect the existing data shape — what does each row contain? (bunker name, freq%, survival%? frequency-count?)
- Confirm where bunker-to-player mapping happens — needs `point.players[]` × `bunkers` proximity (probably ≤ 15% distance per § 30 kill attribution heuristic).

### Decision tree
- **IF** existing breakout computation already produces a per-bunker player count → just expose it in a new column.
- **IF** it produces only frequency % → extend the compute function to also return `timesPlayed` (sum of player-bunker associations across all points). Add to returned object.
- **IF** the existing function doesn't loop per-player per-point → write the loop in `generateInsights.js`. Pattern:
  ```js
  // pseudocode
  for (const pt of points) {
    for (const playerPos of pt.players) {
      if (!playerPos) continue;
      const b = nearestBunker(playerPos, field.bunkers, 0.15);
      if (b) tally[b.positionName] = (tally[b.positionName] || 0) + 1;
    }
  }
  ```
- **IF** Task 7 (#3) and this share computation work → do them in the same commit, or sequence them so Task 7 builds on Task 6.

### Acceptance criteria
- New column in Rozbiegi table: "Played" (or PL label per § 33 i18n).
- Value = sum of (players at this bunker) across all scope points.
- Existing columns unchanged.
- Column header touchable / sortable if other columns are.

### Commit
```
feat(coach): add "Played X times" column to Rozbiegi

COACH #2 from 2026-05-12 feedback. Counts every player-bunker assignment
across scoped points; double-counts within a point intentionally
(2 players at D1 in one point = 2 plays).
```

---

## Task 7 — COACH #3: "Played x/x points" column in Rozbiegi

**Context (Jacek):** "powinna być kolumna Played x/x points z info w ilu punktach ze wszystkich punktów była zagrana. Jeśli w ramach punktu było tam dwóch zawodników, liczymy to jako raz."

**Computation:** for each breakout bunker B, count distinct points where ANY player broke at B. Format: `{distinctPoints}/{totalPoints}`.

This is the complement to Task 6 — Task 6 sums plays, Task 7 counts unique points.

### Decision tree
- **IF** computation from Task 6 is in place → extend to also track `Set<pointId>` per bunker. Return `pointsPlayed` (distinct).
- Format display: `5/12` (with `12` = total scope points in this view).
- Tooltip / aria-label optional: "Played in 5 out of 12 points."

### Acceptance criteria
- Column "Played in points" (or PL label) next to "Played X times" column.
- Format: `{distinctPoints}/{totalPoints}`.
- Both columns sortable independently if table is sortable.

### Commit
```
feat(coach): add "Played x/x points" column to Rozbiegi

COACH #3 from 2026-05-12 feedback. Complements Played X times — this is
distinct point count, slash total scope points. Same data pass as #2.
```

---

## Task 8 — COACH #4: Reliability rate banner in Strzelanie

**Context (Jacek):** "na początku sekcji powinien być reliability rate (dla ilu punktów mamy te dane). Będziemy to liczyć w następujący sposób — ilość zaraportowanych punktów vs ilość graczy którzy na brejku nie są runnerami vs ilu z nich ma zaznaczony kierunek strzelania. Jeśli mamy poniżej 80% wyświetlamy alert."

**Note on relationship to COACH #5 (the formula fix):** #5 is MODERATE-risk and not in Brief A. #4 is independent — it adds a header banner showing data confidence; it does **not** change how percentages in the rows below are computed. After #5 ships post-NXL, the row percentages will use the same denominator definition; for now the banner is the only consumer.

### Computation (this brief)
- Denominator: across all points in the current scope, count placed players where `isRunner !== true`. Call this `expectedShooters`.
- Numerator: among those, count how many have at least one shot direction recorded (`quickShots[slot]` non-empty OR `obstacleShots[slot]` non-empty OR precise `shots[slot]` non-empty). Call this `declaredShooters`.
- `reliability = declaredShooters / expectedShooters` (or `1.0` if denominator is 0 — show "—" in that case, not 100%).
- If `reliability < 0.80` → show alert variant of banner.

### Discovery first
- Locate Strzelanie section in `ScoutedTeamPage.jsx`.
- Find existing shot aggregation in `generateInsights.js` / `coachingStats.js`. There may already be a `computeShotTargets` or similar — extend it to return reliability metadata.
- Check existing confidence banner pattern (`<ConfidenceBanner>` or similar from Coach Brief View § 28) — reuse component if it exists, don't build a new one.

### UI
- Banner inline at top of Strzelanie section, before any tables/charts.
- Two states:
  - **Healthy (≥ 80%):** neutral pill with metric: e.g. `Strzelanie: dane dla 87% graczy` — no warning icon, muted style.
  - **Alert (< 80%):** warning style — amber accent + ⚠ icon — e.g. `⚠ Strzelanie: dane dla 67% graczy (mała próbka)`.
- Style follows § 27: amber only as warning accent here (interactive elsewhere — this is acceptable per § 27 because it indicates alert state, which is a recognized exception). If unsure, use `COLORS.warning` if it exists, else fall back to amber.
- PL string by default (per existing i18n on this page).

### Acceptance criteria
- Banner present at top of Strzelanie section on `ScoutedTeamPage`.
- Numeric value matches the formula above.
- Alert style triggers at `< 80%`.
- Banner hides cleanly (or shows "—") when there are zero placed non-runners (avoid divide-by-zero or "NaN%").

### Commit
```
feat(coach): add reliability rate banner to Strzelanie section

COACH #4 from 2026-05-12 feedback. Shows declared/expected shooter ratio
across scoped points. Alert variant when < 80% to flag low-confidence data.
Does NOT change row percentage calculation (separate ticket post-NXL).
```

---

## Task 9 — COACH #6: Match picker + "Ostatni mecz" CTA

**Context (Jacek):** "na górze strony nie tylko podziałka TEN TURNIEJ i TEN LAYOUT, ale też możliwość wyboru konkretnego meczu zagranego na tym turnieju, oraz jeden CTA Ostatni mecz (pokazujący statystyki tylko dla ostatniego zagranego meczu)."

**Visual scope:** add UI for finer scope filter. **Flow scope:** new filter level — match-specific — feeds into all sections that respect scope (Rozbiegi, Strzelanie, Heatmap, etc.). This is the largest task in Brief A — flag if it grows.

### Existing scope (per DEPLOY_LOG 2026-04-15)
ScoutedTeamPage has scope pills: "Ten turniej" / "Cały layout". Some computation already aggregates `heatmapPoints` across the layout's tournaments.

### New scope additions (this task)
- **"Ostatni mecz"** — quick CTA pill. Resolves to the most recent completed match in current tournament where this team played.
- **"Mecz ▾"** — picker pill that opens modal/dropdown with chronological list of all matches this team played in this tournament. Selecting one filters all stats to that match.

### Decisions (Opus, no escalation needed)
- Pills order on header: `[Ostatni mecz] [Ten turniej] [Cały layout] [Mecz ▾]`
  - "Ostatni mecz" first because it's the most useful pre-game context for the next match.
- Default scope on page load: **keep current default ("Ten turniej")** — do NOT change the default. Adding "Ostatni mecz" as opt-in. (Less surprise for existing users; coach can tap if they want it.)
- "Mecz ▾" modal: bottom sheet listing matches as cards. Each card shows: opponent name, date, score, FINAL badge. Sort newest first. Tap = select + close sheet.
- Selected match shows in pill label: pill changes from "Mecz ▾" to opponent name, with a small ✕ to clear back to "Ten turniej".

### Discovery first
- Locate scope pill rendering in `ScoutedTeamPage.jsx`.
- Locate the scope handler (likely a `useScope` hook or local state).
- Find how `heatmapPoints` (or whatever the aggregated point list is) is computed per scope.
- Identify all sections that consume scope — confirm they all flow from one source.

### Decision tree
- **IF** scope is a single state value (e.g., `'tournament' | 'layout'`) and all sections derive from one filtered list → add new values `'lastMatch'` and `'match:{matchId}'`. Update the filter logic to:
  - `'lastMatch'`: filter points to most-recent completed match's matchId.
  - `'match:{matchId}'`: filter points to that specific matchId.
- **IF** sections compute independently and pass scope each → wire new values through each section's compute call.
- **IF** sections deeply assume tournament-scope (e.g. cross-match aggregation logic that breaks per-match) → **ESCALATE TO JACEK** with list of broken sections. Do not improvise.

### "Ostatni mecz" resolution
- Filter all matches in current tournament where `(teamA === scoutedTeam || teamB === scoutedTeam)` AND `status === 'closed'`.
- Sort by `completedAt` or `updatedAt` desc.
- Pick first. If none → "Ostatni mecz" pill is disabled (greyed, untappable) with tooltip "Brak zakończonych meczów".

### Edge cases
- Team has 0 matches in tournament → both new pills disabled.
- Team has 1 match → "Ostatni mecz" = that match. "Mecz ▾" modal still works.
- Match has zero points scouted → all sections show empty states. Banner / sample badge updates count.

### Acceptance criteria
- Two new pills visible: "Ostatni mecz" and "Mecz ▾".
- "Ostatni mecz" filters all stats to last completed match for this team in current tournament.
- "Mecz ▾" opens picker; selecting a match filters all stats to that match.
- Selected match clearable back to "Ten turniej".
- Empty / single-match cases handled gracefully.
- Sample badge ("N scouted points · M matches") updates to reflect filtered scope.

### Commit
```
feat(coach): add match-level scope filter to ScoutedTeamPage

COACH #6 from 2026-05-12 feedback. New pills: "Ostatni mecz" (auto-resolves
to most recent completed match for this team) and "Mecz ▾" (picker modal
for specific match selection). All analysis sections respect the filter.
Default scope unchanged; new filters are opt-in.
```

---

## Task 10 — Documentation patches (final commit)

After all 9 feature commits land and tests pass, write one consolidated docs commit before merging to main.

### Files to patch

#### `docs/DESIGN_DECISIONS.md` → append § 39

```markdown
## 39. Coach view refinements — pre-NXL 2026-05-15 (approved May 2026)

Adjustments to § 28 (Coach Brief View) based on real-use feedback from
Jacek 2026-05-12 after April PXL weekend and run-up to NXL Czechy.

### 39.1 Heatmap promoted to top
Heatmap moved from collapsed "Additional sections" to the first
analysis section on ScoutedTeamPage, expanded by default. Real coach
use showed heatmap is the fastest scan for "where do they play" before
diving into row-level stats.

### 39.2 Tendencja demoted to additional sections
Tendencja (3-card Dorito/Center/Snake breakdown) moved into "Additional
sections" (collapsed). Computation flagged unclear by Jacek; section
preserved but hidden while formula is revalidated post-NXL.

### 39.3 New section order on ScoutedTeamPage
1. Sample badge (confidence)
2. Heatmap (expanded)
3. Rozbiegi
4. Strzelanie
5. Kluczowi gracze
6. Additional sections (collapsed): Counter plan, Insights, Tactical
   signals, Tendencja, Matches

### 39.4 Rozbiegi gets play counts
Two new columns:
- "Played" — total player-bunker associations across scope points
  (double-counted within a point if multiple players broke there).
- "Played in points" — distinct count `{points-with-this-bunker}/{total}`.

### 39.5 Strzelanie reliability banner
Top-of-section banner showing `declaredShooters / expectedShooters`
ratio across scope. Alert variant (amber + ⚠) when ratio < 80%.
Independent from row-level percentage formula (the formula itself is
separately ticketed post-NXL as COACH #5).

### 39.6 Match-level scope filter
Two new scope pills on ScoutedTeamPage:
- "Ostatni mecz" — resolves to most recent completed match for this
  team in current tournament.
- "Mecz ▾" — modal picker for specific match.
Default scope unchanged ("Ten turniej"). All analysis sections respect
the filter.

### 39.7 Coach team summary no longer offers match creation
ADD MATCH button removed from ScoutedTeamPage. Match creation lives on
Scout tab and More tab only. Coach drill-down is not the right scope
for tournament management.
```

#### `docs/DESIGN_DECISIONS.md` → patch § 31 if PLAYER #1 required an exception

If Task 5 surfaced that `/player/:pid/stats` (or another player-default
route) needs tabs after all, add a sub-paragraph to § 31 noting that
role-player default home views retain BottomNav.

#### `docs/ops/HANDOVER.md` → update

Bump "Last updated" to today's date + author.
Add to "Recently shipped":
```
| 2026-05-12 | {merge-sha} | **Pre-NXL refinements (Brief A)** — 9 SAFE-tier
items shipped: heatmap to top of coach view, Tendencja demoted, Rozbiegi
+2 columns (Played / Played in points), Strzelanie reliability banner,
match-level scope filter, precision drawer 70%, ADD MATCH removed,
BottomNav in player section. Brief archived to docs/archive/cc-briefs/. |
```
Update "Main HEAD at last update."

#### `NEXT_TASKS.md` → mark items as done

Add a `[DONE]` row referencing the merged commit + archived brief path
for the 9 items. Keep RISKY items (SCOUT #3/#4/#5, COACH #5, NEW
ACCOUNT #1, PLAYER FAB #2, roster filter #1) listed as post-NXL.

#### Brief lifecycle (per § 37.3)
After deploy, in the **same commit** as the DEPLOY_LOG entry:
- Move this brief from repo root to `docs/archive/cc-briefs/`.
- Add a line to `docs/archive/cc-briefs/INDEX.md` categorizing it under
  "Coach view refinements".

### Commit
```
docs: add § 39 (coach view refinements), update HANDOVER + NEXT_TASKS

Documents the 9 changes from Brief A (CC_BRIEF_PRE_NXL_REFINEMENTS_2026-05-12).
Archives brief to docs/archive/cc-briefs/.
```

---

## Final steps (CC checklist before declaring READY)

1. All 10 commits on `feat/pre-nxl-refinements` push cleanly.
2. `npm run precommit` passes on the branch.
3. `npx vite build 2>&1 | tail -5` clean.
4. § 27 self-review report posted to Jacek in the exact format from `CLAUDE.md` MANDATORY POST-IMPLEMENTATION block. Specifically check:
   - **Color discipline:** amber on Strzelanie alert banner (Task 8) is allowed as warning-state semantic, not decoration. Verify no other new amber additions.
   - **Elevation:** Heatmap container respects existing surface tokens; banner uses surface, not page bg.
   - **Touch targets:** new scope pills (Task 9), match picker modal cards, all ≥ 44px.
   - **Cards:** Mecz picker modal cards single touch target each, no chevron-on-whole-card-tap anti-pattern.
   - **Anti-patterns:** zero. Verify match picker doesn't introduce competing CTAs (the pill row should stay calm).
5. **Smoke test plan posted to Jacek** with exact tap sequence to verify each of the 9 items on iPhone before merge.

## Merge protocol

- **DO NOT MERGE WITHOUT EXPLICIT `GO` FROM JACEK.** Even if all tests pass.
- After Jacek confirms iPhone smoke tests pass → merge `--no-ff` to main → `npm run deploy` → append DEPLOY_LOG entry → push.
- After deploy verified live → archive brief commit (Task 10).

## Out of scope (do NOT touch in this brief)

- SCOUT #1 (roster filter per tournament) — separate brief post-NXL.
- SCOUT #2 (self-log FAB gating) — separate brief post-NXL.
- SCOUT #3 (cache leak point→point) — separate brief post-NXL.
- SCOUT #4 (partial save / rozbieg without outcome) — schema change, post-NXL.
- SCOUT #5 (chess model 4-team rotation) — separate; coordinate with `CC_BRIEF_AUTO_SWAP_REGRESSION.md` status.
- SCOUT #7 (completeness table relocation) — post-NXL.
- COACH #5 (Strzelanie percentage formula refactor) — moderate-risk, post-NXL.
- NEW ACCOUNT #1 (onboarding hang) — separate brief post-NXL.

If during discovery you find that any "out of scope" item is **strictly required** to make a Brief A task work, **STOP and ESCALATE** — do not silently expand scope.

---

**End of brief.**
