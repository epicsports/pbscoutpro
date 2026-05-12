# CC Brief — Deaths Heatmap v2 (Brief B)

**Date:** 2026-05-12
**Author:** Opus
**Supersedes:** earlier draft `CC_BRIEF_KILL_ATTRIBUTION_V2_2026-05-12.md` (which proposed global refactor — rejected by Jacek; this brief scopes the change to LayoutAnalyticsPage only).
**Scope:** Refactor LayoutAnalyticsPage `mode='deaths'` to use new attribution formula (per-bunker, precision + zone, 1/N split). Add scope filter (Layout / Tournament / Match / Point). Add shooter markers with cross-filter UX. **Does not touch global kill counts elsewhere.**
**Branch:** `feat/deaths-heatmap-v2`
**NXL gate:** removed. Safe to merge pre-NXL because no other screen consumes the new attribution helper. Recommend shipping **after** Brief A is merged and verified, to keep deploys atomic and reviewable.
**Stages:** 7 (Discovery → Helper → Scope filter → Wire-up → Table column → Shooter markers → Cross-filter → Docs).

---

## Pre-flight (mandatory)

1. `git pull origin main` and create branch.
2. `npm run precommit` baseline clean.
3. Read `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG), § 30 (current attribution formula — for reference, not for modification), § 34 (Field Side Standard), § 37 (doc discipline).
4. Read `docs/REVIEW_CHECKLIST.md` in full.
5. Quote 3 § 27 rules relevant + 1 anti-pattern you'll avoid.

---

## Mental model (anchor for all stages)

Per Jacek 2026-05-12:

> Per-point, two sides: defenders (rozbiegający) and shooters (strzelający).
>
> - **Defender side:** scout records each player's position; attribution code finds nearest bunker via `bunker.positionName`. Eliminations recorded as `eliminations[slot] = true`.
> - **Shooter side:** scout records each shooter's standing position AND either zone direction (`quickShots[slot]`, `obstacleShots[slot]`) OR precise shot coords (`shots[slot]`). **A single shooter has either zone OR precise, never both.**
> - **Attribution** runs per-eliminated-defender, sweeping all placed shooters on the opposite side. Each shooter checked via precision (10% distance) if they have precise entries, else via zone match. Credit splits 1/N across matched attributors. N=0 leaves the elimination unattributed.
>
> Zone classification (dorito/snake/center) follows § 34 — derived from `field.discoLine`, `field.zeekerLine`, `field.doritoSide`.

**This formula lives in a new helper used ONLY by LayoutAnalyticsPage.** Existing § 30 formula stays in place for all other consumers.

---

## Stage 0 — Discovery (no code changes)

CC reads code end-to-end and reports findings to Jacek before any modification.

### Files to read

- `src/pages/LayoutAnalyticsPage.jsx` (deaths mode rendering, table, current heatmap logic)
- `src/services/dataService.js` — especially `fetchLayoutDeaths()` (current data shape returned)
- `src/utils/playerStats.js` — for reference only (current § 30 attribution)
- `src/utils/coachingStats.js` — for reference only (zone classification utility — does it exist? signature?)
- `src/utils/generateInsights.js` — for reference only
- Wherever `findNearestBunker` lives (search for it)

### Report these to Jacek

1. **Current `fetchLayoutDeaths()` return shape** — what does each point object contain? Confirm `homeData/awayData` accessible, `players[]`, `eliminations[]`, `shots`, `quickShots`, `obstacleShots`, `outcome`, `_ctx` (tournament/match name/point idx).
2. **`point.shots` exact format** — Firestore object: keys = slot index (`'0'..'4'`)? Values = array of `[x,y]` tuples, or `{x,y,...}` objects, or array of those?
3. **Is there an `eliminationPositions` field** distinct from `players[slot]`? If yes, that's the "where they died" coord; if no, use `players[slot]` (where they broke out).
4. **`P#` column in deaths table** — current source? Slot index, jersey number, or resolved player? Confirm.
5. **Zone classifier utility** — does a function like `classifyZone(pos, layout) → 'dorito'|'snake'|'center'` exist? Path + signature. § 34 references the concept but I don't know if it's a util. If missing, Stage 1 writes it.
6. **`findNearestBunker` utility** — confirm path + signature. Used for both defender bunker resolution and shooter bunker resolution.
7. **Current LayoutAnalyticsPage scope** — currently aggregates all tournaments using this layout (per § 2.10). Confirm. List any existing filter state.

### Stage 0 output

Post discovery report to Jacek. **STOP.** Wait for confirmation that assumptions hold. If anything contradicts the mental model, ESCALATE — do not improvise.

No code commit for Stage 0.

---

## Stage 1 — Attribution helper (isolated, new file)

New file `src/utils/deathAttribution.js` containing the formula. Used ONLY by LayoutAnalyticsPage. § 30 formula in `playerStats.js` etc. stays untouched.

### Pseudocode (canonical)

```js
// src/utils/deathAttribution.js

export function classifyDefenderZone(defenderPos, field) {
  // Returns 'dorito' | 'center' | 'snake'.
  // Use field.discoLine, field.zeekerLine, field.doritoSide.
  // If Stage 0 found existing zone util — reuse it; otherwise implement here per § 34.
}

export function computeDeathAttribution(point, field) {
  // Returns:
  // {
  //   eliminations: [
  //     {
  //       defenderSlot,
  //       defenderPos: {x, y},
  //       defenderBunker: { positionName, x, y } | null,
  //       defenderZone: 'dorito'|'center'|'snake',
  //       attributors: [
  //         { shooterSlot, shooterPos, shooterBunker, mode: 'precise'|'zone' }
  //       ],
  //       shareEach: 1 / attributors.length OR 0 if unattributed
  //     }
  //   ],
  //   killCreditsByShooter: Map<shooterSlot, number>  // accumulated
  // }

  const defSide = resolveDefenderSide(point);  // see Stage 0 — depends on data shape
  const shotSide = resolveShooterSide(point);

  const results = { eliminations: [], killCreditsByShooter: new Map() };

  for (let D = 0; D < 5; D++) {
    if (!defSide.eliminations?.[D]) continue;
    const defenderPos = defSide.players?.[D];
    if (!defenderPos) continue;  // no scouted position → can't attribute

    const defenderZone = classifyDefenderZone(defenderPos, field);
    const defenderBunker = findNearestBunker(defenderPos, field.bunkers, 0.15);

    const attributors = [];
    for (let S = 0; S < 5; S++) {
      const shooterPos = shotSide.players?.[S];
      if (!shooterPos) continue;

      const hasPrecise = isNonEmpty(shotSide.shots?.[String(S)]);

      if (hasPrecise) {
        // (a) Precise proximity check
        const shots = shotSide.shots[String(S)];
        for (const shot of shots) {
          if (euclideanDistance(shot, defenderPos) < 0.10) {
            const shooterBunker = findNearestBunker(shooterPos, field.bunkers, 0.15);
            attributors.push({ shooterSlot: S, shooterPos, shooterBunker, mode: 'precise' });
            break;
          }
        }
      } else {
        // (b) Zone match check
        const shotZones = unique([
          ...(shotSide.quickShots?.[String(S)] || []),
          ...(shotSide.obstacleShots?.[String(S)] || []),
        ]);
        if (shotZones.includes(defenderZone)) {
          const shooterBunker = findNearestBunker(shooterPos, field.bunkers, 0.15);
          attributors.push({ shooterSlot: S, shooterPos, shooterBunker, mode: 'zone' });
        }
      }
    }

    const share = attributors.length > 0 ? 1 / attributors.length : 0;
    for (const att of attributors) {
      results.killCreditsByShooter.set(
        att.shooterSlot,
        (results.killCreditsByShooter.get(att.shooterSlot) || 0) + share
      );
    }

    results.eliminations.push({
      defenderSlot: D,
      defenderPos,
      defenderBunker,
      defenderZone,
      attributors,
      shareEach: share,
    });
  }

  return results;
}

export function formatKills(n) {
  if (n === 0) return '0';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(/\.0$/, '');
}
```

### Helpers needed

- `resolveDefenderSide(point)` / `resolveShooterSide(point)` — Stage 0 confirms which keys (`homeData`/`awayData`/`teamA`/`teamB`) to read and which is the rozbiegający/strzelający for a given point. The "who is defender" determination likely already exists in current heatmap rendering — reuse.
- `findNearestBunker(pos, bunkers, threshold)` — discovered in Stage 0.
- `euclideanDistance(a, b)` — trivial; place in `src/utils/geometry.js` if not present.

### Edge cases

- Shooter with both precise and zone entries (per Jacek shouldn't happen): treat as precise-only. `console.warn` in `import.meta.env.DEV`.
- Zone classification ambiguous (defender exactly on a line): existing util's tiebreaker, or default to `center`.
- Both teams have eliminations in one point: call `computeDeathAttribution(point, field)` once per side — caller flips defender/shooter side via a param. **Stage 1 builds the helper to accept an explicit `side: 'home'|'away'` param specifying which side is the defender**, so caller controls the perspective.

### Tests (manual sanity)

Pick 3-5 historical points from `fetchLayoutDeaths()` output. Hand-compute expected attribution. Compare to helper output. Send before/after to Jacek as checkpoint.

### Acceptance criteria

- New file `src/utils/deathAttribution.js` exports `computeDeathAttribution`, `classifyDefenderZone`, `formatKills`.
- Pure function — no side effects, no Firestore reads. Takes `(point, field, sideAsDefender)` and returns the structure described.
- No imports from `playerStats.js` — fully isolated.
- Unit-test-ready (CC writes minimal smoke test if there's a test setup; otherwise documents expected outputs in code comments).

### Commit
```
feat(deaths): new attribution helper (isolated, used by LayoutAnalyticsPage)

New file src/utils/deathAttribution.js. Implements precision+zone matching
with 1/N split per Jacek 2026-05-12. Includes formatKills helper for
fractional credit display (1 decimal, trailing zero trimmed).

Scope: this helper is consumed only by LayoutAnalyticsPage. Existing
§ 30 zone-only formula in playerStats.js etc. remains untouched.
```

### Checkpoint with Jacek

Send before/after kill counts for 3-5 historical points. **Wait for GO before Stage 2.**

---

## Stage 2 — Scope filter UI (state + pills, no wire-up yet)

Add scope-filter state and progressive-disclosure pills above the heatmap. Selection state lives in component but does not yet affect rendering (Stage 3 wires it).

### Filter levels

- **Layout** (default, current behavior) — all tournaments using this layout.
- **Tournament** — narrow to specific tournament from those using the layout.
- **Match** — narrow further to specific match in that tournament.
- **Point** — narrow further to specific point in that match.

Global scope explicitly **excluded** per Jacek.

### Progressive disclosure

| State | Pills visible |
|---|---|
| Initial / default | `[Cały layout]` `[Turniej ▾]` |
| Tournament selected | `[Cały layout]` `[NXL Czechy ✕]` `[Mecz ▾]` |
| Match selected | `[Cały layout]` `[NXL Czechy]` `[Ranger vs Ring ✕]` `[Punkt ▾]` |
| Point selected | `[Cały layout]` `[NXL Czechy]` `[Ranger vs Ring]` `[Pt 7 ✕]` |

- Tap `[Cały layout]` → reset all selections, return to default state.
- Tap `[... ✕]` on any pill → clear that level **and all deeper levels**.
- Tap `[... ▾]` → open picker (modal/bottom sheet) for that level.

### Picker UI

- Use existing modal/bottom-sheet component (`ActionSheet` from `ui.jsx`).
- Tournament picker: list of tournaments using this layout. Sort by date desc.
- Match picker: list of matches in selected tournament where this layout was used. Sort by date desc. Each item: `{TeamA} vs {TeamB} · {date} · {FINAL|LIVE}`.
- Point picker: list of points in selected match. Sort by point number. Each item: `Pt {N} · {winner} · {OT|—} · {elimCount} elims`.

### State shape

```js
const [scope, setScope] = useState({
  level: 'layout',       // 'layout' | 'tournament' | 'match' | 'point'
  tournamentId: null,
  matchId: null,
  pointId: null,
});
```

### Acceptance criteria

- Pills render in correct progressive-disclosure state.
- Selection updates `scope` state correctly.
- Pill labels reflect chosen entity name (truncate with `…` if > 20 chars).
- `✕` on a pill clears that level + all deeper (correct cascade).
- Tap targets ≥ 44px on all pills and ✕ buttons.
- No rendering effect on heatmap or table yet — those wire up in Stage 3.

### Commit
```
feat(deaths): scope filter UI — Layout / Tournament / Match / Point

Progressive-disclosure pills above heatmap. Tap deeper level to drill in,
✕ to clear and roll back. "Cały layout" resets all. State held in
component; wire-up to heatmap/table in next commit.
```

---

## Stage 3 — Wire scope filter to heatmap + table

Filter the point list per `scope`, then run `computeDeathAttribution` on the filtered set. Re-aggregate skulls (existing) and feed shooter-marker data into a state shape that Stages 5-6 will consume.

### Logic

```js
const filteredPoints = useMemo(() => {
  if (scope.level === 'layout') return allPoints;
  if (scope.level === 'tournament') return allPoints.filter(p => p._ctx.tournamentId === scope.tournamentId);
  if (scope.level === 'match') return allPoints.filter(p => p._ctx.matchId === scope.matchId);
  if (scope.level === 'point') return allPoints.filter(p => p.id === scope.pointId);
  return allPoints;
}, [allPoints, scope]);

const attributionData = useMemo(() => {
  // For each point in filteredPoints, compute attribution for both sides.
  // Aggregate skulls and shooter markers per normalized coordinate (use existing forceLeft).
  ...
}, [filteredPoints, field]);
```

### Heatmap density edge case

When `filteredPoints.length < 5`, density layer rendering is mathematically meaningless (too few samples). Decision:
- `filteredPoints.length >= 5` → render density + markers as before.
- `filteredPoints.length < 5` → hide density layer, render only markers (skulls + shooter markers). Visually cleaner for single-point and single-match views.
- `filteredPoints.length === 0` → empty state: "Brak punktów w wybranym zakresie."

### Acceptance criteria

- Selecting a tournament/match/point in pills filters the rendered heatmap correctly.
- Skulls re-cluster on filter change.
- New attribution-derived counts ready for Stage 4 (table) and Stage 5 (markers).
- Density layer hides when < 5 points.
- Empty state when 0 points.
- No console errors during filter changes.

### Commit
```
feat(deaths): wire scope filter to heatmap + new attribution pipeline

filteredPoints feeds computeDeathAttribution; result drives skull
re-aggregation and prepares shooter-marker data for next commits.
Density layer hides for filteredPoints.length < 5 (too few samples).
Empty state for zero-point scope.
```

### Checkpoint with Jacek

Show iPhone screenshots: layout scope (default) + one tournament filtered + one match filtered + one single-point scope. **Wait for GO before Stage 4.**

---

## Stage 4 — Table: new "Pozycja strzelca" column

Add 7th column to deaths table showing attributor bunker(s) per row.

### Format (confirmed by Jacek)

- Single attributor: `Snake1`
- Multi-attributor: `Snake1 · D2` (format Y)
- Unattributed: `—` in textDim color

### Acceptance criteria

- Column header: `Pozycja strzelca` (PL, consistent with existing labels).
- Column data follows scope filter (rows reflect filteredPoints).
- Cells use new helper's `attributors[].shooterBunker.positionName`.
- Cell text wraps softly on narrow viewports; if multi-attributor row > viewport width, truncate with `…` and accept it (tap-to-expand would be nice-to-have, not required).
- `—` for empty attribution set, styled dim italic.

### Commit
```
feat(deaths): add "Pozycja strzelca" column to deaths table

7th column shows attributor bunker(s) per kill: "Snake1 · D2" for
multi-attributor (1/N split per shooter), "—" for unattributed.
Driven by scope-filtered point set.
```

---

## Stage 5 — Shooter markers on heatmap

Render shooter standing positions as markers with kill-credit badges.

### Visual

- Marker glyph: small filled circle (●) in shooter-team color (use `TEAM_COLORS.A` or `.B` depending on which side is shooter for each point — markers may be mixed teams in layout-wide aggregation).
- Badge: same style as existing skull count badge (red circle, white text), but smaller (e.g., 14px diameter vs skulls' 16px) so it's visually subordinate to skulls. Text inside = `formatKills(sumOfCreditsAtThisPos)`.
- Marker without attributed kills (e.g., shooter placed but no defender match): render marker faded (50% opacity), no badge. **ESCALATE if you're unsure whether to render zero-kill markers at all.**

### Aggregation

- Same `forceLeft()` normalization as skulls.
- Cluster shooter positions at same coordinate (or within tiny radius). Sum credits across the cluster.

### Z-order

1. Field image
2. Density layer (if rendered)
3. Skull markers
4. Shooter markers (top, last drawn — most important for new feature)

### Acceptance criteria

- Shooter markers render at correct positions for filtered point set.
- Badges show `formatKills(credit)`.
- Markers visible alongside skulls without total visual chaos. Overlap acceptable for now (Stage 6 cross-filter resolves disambiguation).
- Marker tap registers (wire to noop logger this stage; Stage 6 handles real behavior).

### Commit
```
feat(deaths): render shooter markers with kill-credit badges

Each unique shooter standing position gets a marker; badge shows
formatKills(sumOfAttributedCredits). Mirrors skull aggregation +
fieldside normalization. Tap wiring is a stub — cross-filter in
next commit.
```

---

## Stage 6 — Cross-filter UX (linked highlighting)

Wire skull ↔ shooter cross-filter per UX spec.

### States

- **Default:** all markers + skulls at 100% opacity.
- **Filter by skull:** tap a skull → that skull stays 100%, attributing shooters stay 100%, everything else fades to 30% (200ms ease).
- **Filter by shooter:** tap a shooter → that shooter stays 100%, attributed skulls stay 100%, everything else fades to 30%.
- **Reset:** tap `✕` on status pill OR tap an empty area of the heatmap → all back to 100% (200ms).

### Status pill (top of heatmap area)

- Layout: `[icon] {label} ({count}) [✕]`
- Filter by skull: `📍 Eliminacja na D1 — 3 strzelców · ✕`
- Filter by shooter: `📍 Strzały z Snake1 — 4 trafienia · ✕`
- Style: `COLORS.surface` bg, `RADIUS.lg` corners, slide-in 200ms.
- ✕ button ≥ 44px touch target.

### Edge cases

- Tap unattributed skull → all shooters fade, skull stays 100%, pill shows `📍 Eliminacja na D1 — brak strzelca · ✕`, toast: `Nie udało się ustalić strzelca dla tej eliminacji.`
- Tap zero-kill shooter marker (if Stage 5 renders them) → all skulls fade, marker stays 100%, pill shows `📍 Strzały z Snake1 — 0 trafień · ✕`, toast: `Brak przypisanych trafień dla tej pozycji.`

### Implementation notes

- State: `filter: { mode: null | 'skull' | 'shooter', id: string | null }` in LayoutAnalyticsPage.
- Each marker has a stable id (e.g., `skull-{x}-{y}` or `shooter-{x}-{y}`) computed at aggregation time.
- For each marker, attributors-link set is precomputed once during aggregation, not on every render.
- Empty-area tap = tap on heatmap container that isn't a marker. Use `onPointerDown` on container with `event.target` check, OR a transparent overlay catching taps below markers.

### Acceptance criteria

- All four interaction paths work (tap skull, tap shooter, tap ✕, tap empty).
- 200ms animation feels smooth on iPhone; no flicker, no jank.
- Edge cases (unattributed, zero-kill) show correct toasts.
- Pill close button ≥ 44px.
- Works identically on iPhone Safari and desktop Chrome.

### Commit
```
feat(deaths): linked highlighting — skulls ↔ shooters

Tap skull → highlight attributing shooters; tap shooter → highlight
attributed skulls; rest fade to 30% over 200ms. Status pill at top
of heatmap shows active filter; ✕ or tap-outside clears. Toasts for
unattributed-skull and zero-kill-shooter edge cases.
```

### Checkpoint with Jacek

Final iPhone walkthrough across all 4 scope levels + all 4 interaction states. **Wait for GO before Stage 7.**

---

## Stage 7 — Documentation

### `docs/DESIGN_DECISIONS.md` — append next available section number after the latest shipped § (likely § 61, but verify before commit).

```markdown
## 40. Deaths heatmap v2 (approved May 2026)

LayoutAnalyticsPage `mode='deaths'` overhauled per Jacek 2026-05-12 feedback.

### 40.1 Isolated attribution helper
`src/utils/deathAttribution.js` implements the new attribution formula
used **only on this screen**. § 30 formula in playerStats.js and
elsewhere remains unchanged — no global regression in kill displays.

### 40.2 Attribution formula
Per-point, two sides: defenders (rozbiegający) and shooters
(strzelający). For each eliminated defender:
- Find nearest bunker via positionName (15% threshold).
- Sweep all placed shooters on the opposite side.
- A shooter has EITHER precise shots (point.shots[slot]) OR zone
  shots (quickShots + obstacleShots) — never both.
- (a) Precision: any shot in shots[slot] within 10% distance of
  defender position → attributor.
- (b) Zone: shooter's union of zone arrays contains defender's zone
  (dorito/center/snake per § 34) → attributor.
- Credit splits 1/N across matched attributors.
- N=0 leaves elimination unattributed (zero credit).
- Fractional credits rendered with 1 decimal, trailing zero trimmed
  (formatKills helper).

### 40.3 Scope filter
Pills above heatmap: Layout (default) / Tournament / Match / Point.
Progressive disclosure — deeper pill appears only after upper level
is selected. ✕ on a pill clears that level + deeper. "Cały layout"
resets all. No global scope.

### 40.4 Density layer threshold
Heatmap density layer hides when filteredPoints.length < 5
(insufficient samples for meaningful density). Markers always render.

### 40.5 Shooter markers
Each unique shooter standing position renders as a small marker with
kill-credit badge (formatKills). Marker color = shooter team color.
Visually subordinate to skulls (smaller badge, lower visual weight).

### 40.6 Linked highlighting
Tap skull → attributing shooters stay 100%, rest fade to 30% (200ms).
Tap shooter → attributed skulls stay 100%, rest fade. Tap ✕ on status
pill or empty area → reset. Status pill at top of heatmap shows
active filter with target name + count.

### 40.7 New table column
"Pozycja strzelca" between P# and end-of-row. Multi-attributor
formatted as "Snake1 · D2". Unattributed shows "—".

### 40.8 Out of scope
§ 30 attribution formula and all other consumers (PlayerStatsPage,
ScoutedTeamPage, generateInsights) NOT modified. Survivability stats
on team breakouts not affected.
```

### `docs/ops/HANDOVER.md`

Bump date + author + HEAD. Append to "Recently shipped":
```
| 2026-05-1X | {sha} | **Deaths heatmap v2 (Brief B)** — isolated attribution helper, scope filter (Layout/Tournament/Match/Point, no global), shooter markers + linked highlighting, "Pozycja strzelca" table column. next available section number after the latest shipped § (likely § 61, but verify before commit). added. Other kill displays untouched. |
```

### `NEXT_TASKS.md`

`[DONE]` row referencing merged commit + archived brief path.

### Brief archival

Move this brief to `docs/archive/cc-briefs/CC_BRIEF_DEATHS_HEATMAP_V2_2026-05-12.md` in the same docs commit. Add row to `docs/archive/cc-briefs/INDEX.md` under "Analytics & attribution".

### Commit
```
docs: add next available section number after the latest shipped § (likely § 61, but verify before commit). (deaths heatmap v2), update HANDOVER + NEXT_TASKS

Documents the 7-stage refactor of LayoutAnalyticsPage mode='deaths'.
Archives brief. § 30 explicitly preserved for global consumers.
```

---

## Final checklist before READY-for-merge

1. All 8 commits push cleanly on `feat/deaths-heatmap-v2` (7 feature stages + 1 docs).
2. `npm run precommit` passes.
3. `npx vite build 2>&1 | tail -5` clean.
4. § 27 self-review report in CLAUDE.md format.
5. Smoke test plan posted to Jacek: tap sequence covering each scope level + each interaction state on iPhone.
6. Before/after kill credit comparison for 3-5 historical points (shows new formula behavior, no global impact since helper is isolated).

## Merge protocol

- **DO NOT MERGE without Jacek's explicit `GO`.**
- Recommend merging **after Brief A is merged + verified**, not in parallel — keep deploys atomic.
- After GO → merge `--no-ff` to main → `npm run deploy` → DEPLOY_LOG entry → push → archive brief.

## Out of scope (do NOT touch)

- § 30 formula in `playerStats.js`.
- `generateInsights.js` kill thresholds.
- `ScoutedTeamPage` kill counts.
- `PlayerStatsPage` kill display.
- Survivability per breakout bunker (separate metric, not affected by attribution refactor).
- Backward-compat flag — explicitly rejected.

If during any stage you find that an out-of-scope item is strictly required for the brief to work, **STOP and ESCALATE.**

---

**End of brief.**
