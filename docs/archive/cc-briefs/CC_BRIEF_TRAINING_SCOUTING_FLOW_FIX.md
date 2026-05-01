# CC_BRIEF — Training Scouting Flow Fix (Bug A + B + C)

**Status:** approved 2026-04-30 by Jacek for execution before niedzielny sparing 2026-05-03
**Branch:** `fix/training-scouting-flow`
**Estimated effort:** ~3-4h CC across 3 commits with Jacek checkpoints
**Risk profile:** Medium — modifies existing flow, but in additive way (no schema changes)
**Author:** Opus (chat session 2026-04-30)

---

## Goal

Fix three related bugs in training point scouting flow:

- **Bug A:** `TrainingScoutTab.jsx:214` hard-codes `homeSquad` in `?scout=` URL — clicking scout RUSH (away squad) opens canvas as RAGE (home).
- **Bug B:** "Zaawansowany scouting" link from QuickLog navigates to canvas without prefilling QuickLog's player selection — picker shows squad members, scout has to re-select 5 players already chosen.
- **Bug C:** QuickLog jumps from "wybór graczy" directly to "Kto wygrał?" — no explicit "Przypisz pozycje" step. Zone toggles exist but are squashed into one screen with player selection.

**Final flow target:**

```
QuickLog Step 1: Wybór graczy (5/5) — current screen 3
                 ↓ tap "Przypisz pozycje →"
QuickLog Step 2: Zone toggles per gracz — current screen 1 layout, but as separate step
                 ↓ two CTAs side-by-side:
                   • "Kto wygrał? →" (current path: outcome + save point)
                   • "Zaawansowany scouting →" (NEW: canvas with prefilled assignments + zones)
```

**What we DO NOT change:**
- QuickLog data shape (no new fields beyond what § 57 Phase 1a already added)
- MatchPage existing logic (only the URL handler + assignment loading)
- The "Kto wygrał?" outcome flow (current behavior preserved)

---

## Reference

- § 57 Phase 1a foundation: `docs/DESIGN_DECISIONS.md` § 57 + `docs/architecture/MULTI_SOURCE_OBSERVATIONS_INDEX.md`
- W3 QuickLogView writer pattern: shipped in commit `5c50870` (2026-04-30) — already populates `playersMeta[i].syntheticZone`
- Bug A discovery: CC report 2026-04-30, file:line `TrainingScoutTab.jsx:214`
- Bug B/C discovery: CC report 2026-04-30 + Jacek screenshots 2026-04-30 (3 screenshots showing wrong squad header, missing positions step)

Read § 57.3 (schema extensions) before starting. The new `_meta` write convention from W3 must be preserved when prefilling canvas — see commit 1.2 STEP 4 in `CC_BRIEF_57_PHASE_1A_FOUNDATION.md` (archived in `docs/archive/cc-briefs/`).

---

## Workflow

Three commits, each pushed separately. **Jacek checkpoint between each.** CC stops after pushing each commit, reports back, waits for GO.

```
1. Bug A fix: squad route handoff      → push → Jacek GO
2. Bug C: positions step in QuickLog   → push → Jacek GO
3. Bug B: canvas prefill from QuickLog → push → Jacek GO → merge → deploy
```

Final merge per project convention (memory #14, plain git, no PR, no gh CLI):

```powershell
git checkout main
git pull origin main
git merge --no-ff fix/training-scouting-flow -m "<merge msg>"
git push origin main
# DEPLOY_LOG entry → push
git branch -d fix/training-scouting-flow
git push origin --delete fix/training-scouting-flow
npm run deploy
```

---

## Commit 1: Bug A fix — squad route in TrainingScoutTab (~30min)

### Scope

`TrainingScoutTab.jsx:214` ignores `quickLogSide` when building "Zaawansowany scouting" URL. Fix: respect away-side selection.

### STEP 1 — Locate exact line

```bash
grep -n "homeSquad" src/components/CoachTabContent.jsx src/components/TrainingScoutTab.jsx 2>/dev/null
```

(File may live under different name; CC's previous report used `TrainingScoutTab.jsx:214`. If not found there, check `CoachTabContent.jsx` or any tab file rendering matchup card → QuickLog → "Zaawansowany scouting" link.)

### STEP 2 — Verify current logic

Find the navigate() call that builds the URL with `?scout=`. Should look something like:

```javascript
navigate(`/training/${tid}/matchup/${matchupId}?scout=${qlMatchup.homeSquad}`);
```

Verify by reading 5-10 lines around the match. Confirm `quickLogSide` variable exists in scope (probably `'home' | 'away' | 'both'` or similar).

### STEP 3 — Apply fix

```javascript
// Before:
navigate(`/training/${tid}/matchup/${matchupId}?scout=${qlMatchup.homeSquad}`);

// After:
const targetSquad = quickLogSide === 'away' ? qlMatchup.awaySquad : qlMatchup.homeSquad;
navigate(`/training/${tid}/matchup/${matchupId}?scout=${targetSquad}`);
```

`quickLogSide === 'both'` falls through to `homeSquad` default (current behavior preserved).

### STEP 4 — [ESCALATE TO JACEK] if any of:

- `quickLogSide` doesn't exist as a variable — different state model than expected
- Multiple navigate() calls with `?scout=` — fix needed in all of them, scope grew
- Line count differs significantly from CC's previous report — CC will re-verify discovery

### STEP 5 — Verification

Smoke test on dev:
1. Open training matchup card with 2 squads (Red home, Blue away)
2. Tap RIGHT side of matchup card (away squad → quickLogSide='away')
3. QuickLog opens — confirm shows Blue players (correct already)
4. Without selecting, tap "Zaawansowany scouting" link
5. Canvas opens — verify header shows "Scouting Blue" (or whatever Blue squad is named), NOT Red

```bash
npm run precommit  # must pass
```

### STEP 6 — Commit

```bash
git add src/components/TrainingScoutTab.jsx  # or wherever the file actually is
git commit -m "fix(training): respect quickLogSide when routing to advanced scouting

Bug: tapping AWAY squad in matchup card → QuickLog opens for away squad ✓
but 'Zaawansowany scouting' link always set ?scout=homeSquad, opening canvas
for HOME squad. Now uses awaySquad when quickLogSide === 'away'.

Refs: discovery report 2026-04-30, screenshot evidence (Jacek)"

git push origin fix/training-scouting-flow
```

### STEP 7 — JACEK CHECKPOINT

Report:
- Commit SHA
- Smoke test result (header on canvas matches squad you tapped)
- Wait for GO before commit 2

---

## Commit 2: Bug C — Add "Przypisz pozycje" step to QuickLog (~1.5h)

### Scope

Currently QuickLog has 2 stages:
- Stage 1: "Wybór graczy" (player picker, screen 3)
- Stage 2: "Kto wygrał?" + zone toggles inline (screen 1)

Refactor to 3 stages:
- Stage 1: "Wybór graczy" (player picker) — unchanged content, button changes to "Przypisz pozycje →"
- Stage 2: "Przypisz pozycje" (zone toggles, NEW separate stage) — content from current screen 1 zone-toggle area
- Stage 3: "Kto wygrał?" (outcome + save) — current screen 1 functionality, but reached after stage 2

### STEP 1 — Locate QuickLog state machine

```bash
grep -n "useState\|step\|stage\|phase" src/components/QuickLogView.jsx | head -30
```

Find how stages are currently tracked. Likely a `step` or `phase` state. Could be conditional render based on derived state (e.g. `selectedPlayers.length === 5`).

### STEP 2 — Map current to new stages

Document current state transitions in commit message. Identify:
- What triggers transition from player-picker to zone-toggle screen?
- What triggers transition from zone-toggle to outcome screen?
- Are there back buttons? Where do they go?

If you find this currently a single screen with conditional UI sections (no explicit stage state), introduce explicit `step` state: `'players' | 'positions' | 'outcome'`.

### STEP 3 — Implement 3-stage flow

```javascript
// Add state if not present
const [step, setStep] = useState('players');  // 'players' | 'positions' | 'outcome'

// Stage 1 — players (existing screen 3)
{step === 'players' && (
  <>
    {/* existing player picker UI */}
    <Btn 
      variant="accent" 
      disabled={selectedPlayers.length !== 5}
      onClick={() => setStep('positions')}
    >
      Przypisz pozycje →
    </Btn>
    {/* "Zaawansowany scouting →" link stays here, hidden in step !== 'players' */}
  </>
)}

// Stage 2 — positions (existing zone-toggle UI from screen 1, extracted)
{step === 'positions' && (
  <>
    {/* zone toggles per player — existing implementation */}
    <div style={{ display: 'flex', gap: 8 }}>
      <Btn variant="ghost" onClick={() => setStep('players')}>← Wróć</Btn>
      <Btn variant="accent" onClick={() => setStep('outcome')}>Kto wygrał? →</Btn>
    </div>
    {/* "Zaawansowany scouting →" link visible here too — see Bug B fix in commit 3 */}
  </>
)}

// Stage 3 — outcome (existing outcome buttons)
{step === 'outcome' && (
  <>
    {/* existing Rage / Rush / null winner buttons */}
    <Btn variant="ghost" onClick={() => setStep('positions')}>← Wróć</Btn>
  </>
)}
```

### STEP 4 — UI placement of "Zaawansowany scouting" link

Per Jacek decision: **the "Zaawansowany scouting" link appears in stage 2 (positions)**, NOT stage 1 (players).

Reason: scout commits to 5 players first, then can choose:
- Quick path: zone toggles → "Kto wygrał?" → save QuickLog point
- Detailed path: "Zaawansowany scouting" → canvas with prefilled assignments + zones

Stage 1 has only one CTA: "Przypisz pozycje →". No "Zaawansowany scouting" yet.

In stage 2: two CTAs (or one button + one link, your call) — "Kto wygrał? →" (primary, accent) and "Zaawansowany scouting →" (secondary, ghost or text link).

### STEP 5 — Preserve zone toggles across stages

If user goes back (`'positions' → 'players' → 'positions'`), zone toggle selections must persist. State should be at parent level, not reset on stage change.

If currently zone toggles use local state inside zone-toggle component, lift the state to QuickLogView level so it survives navigation.

### STEP 6 — Verification

Smoke test on dev:
1. Open training matchup, tap "scouting konkretnego składu"
2. Stage 1: select 5 players → "Przypisz pozycje →" button appears, others don't fit
3. Tap "Przypisz pozycje" → Stage 2 opens with zone toggles
4. Set zones (Dorito/Centrum/Snake) for each player
5. Tap "← Wróć" → back to stage 1, selected players preserved
6. Tap "Przypisz pozycje" again → zone toggles preserved (Bug C check)
7. Tap "Kto wygrał? →" → Stage 3 outcome buttons
8. Pick winner → point saves with assignments + synthetic positions + winner

Existing data flow: confirm that `playersMeta[i].syntheticZone` is still set per W3 convention (commit 1.2 of Phase 1a).

```bash
npm run precommit
```

### STEP 7 — Commit

```bash
git add src/components/QuickLogView.jsx
git commit -m "feat(training): split QuickLog into 3 explicit stages with positions step

Bug: QuickLog jumped from player selection to outcome ('Kto wygrał?')
without explicit 'Przypisz pozycje' step. Zone toggles existed but were
visually squashed with outcome buttons.

New flow:
- Stage 1 'Wybór graczy': pick 5 → 'Przypisz pozycje →'
- Stage 2 'Przypisz pozycje': zone toggles → 'Kto wygrał? →' OR 'Zaawansowany scouting →'
- Stage 3 'Kto wygrał?': outcome buttons → save point

Zone selections persist across stage navigation. § 57 W3 _meta writes preserved.
Bug B (canvas prefill) handled in next commit.

Refs: Jacek screenshots 2026-04-30, design decision §32 (training mode)"

git push origin fix/training-scouting-flow
```

### STEP 8 — JACEK CHECKPOINT

Report:
- Commit SHA
- Smoke test results (all 8 steps)
- Screenshot of Stage 1 + Stage 2 (so Jacek confirms button placement)
- Wait for GO before commit 3

---

## Commit 3: Bug B — Canvas prefill from QuickLog state (~1.5h)

### Scope

When user clicks "Zaawansowany scouting" from QuickLog Stage 2, canvas must:
1. Open for the correct squad (Bug A fix from commit 1 ✓)
2. Show 5 players already assigned to slots 0-4 in selection order
3. Show zone synthetic positions on canvas (Dorito/Centrum/Snake → {x, y})
4. Allow scout to refine positions by tapping/dragging on canvas

This requires **passing QuickLog state** to canvas — but URL is the only handoff mechanism. Three options:

**Option A: Save point first, then redirect**
- QuickLog Stage 2 "Zaawansowany scouting" → save point with current assignments + synthetic positions → navigate to `?scout=<squad>&point=<pid>`
- Canvas loads point from Firestore → assignments + positions already there
- Pro: clean, uses existing Firestore as state transport
- Con: creates point even if user backs out from canvas

**Option B: Pass state via location.state**
- React Router `navigate(url, { state: { prefillAssignments, prefillZones } })`
- Canvas reads `location.state` on mount, applies as initial assignments
- Pro: no premature point creation
- Con: state lost on page refresh (acceptable in this flow — scout doesn't refresh mid-action)

**Option C: Pass via sessionStorage**
- QuickLog writes to sessionStorage before navigate; canvas reads on mount, clears
- Pro: survives refresh
- Con: more code, edge cases

**Recommendation: Option A.** Reasons:
- "Zaawansowany scouting" semantically IS continuation of the same point (Jacek confirmed)
- Save-then-edit pattern matches existing tournament Match Review → Edit flow
- § 57 W3 already writes synthetic positions + _meta on save; canvas reads them as standard point
- If user backs out of canvas, point exists with valid QuickLog data — not a problem

If [ESCALATE TO JACEK] before implementing Option B/C without explicit approval.

### STEP 1 — Save point on "Zaawansowany scouting" click

In QuickLog Stage 2, the "Zaawansowany scouting" handler:

```javascript
async function handleAdvancedScouting() {
  // Build payload as if "Kto wygrał?" was clicked but with outcome=null
  const point = await savePointWithoutOutcome({
    assignments: selectedPlayerIds,     // [p1, p2, p3, p4, p5] in selection order
    zones: assignedZones,                // {p1: 'dorito', p2: 'snake', ...}
    fieldSide: 'left',                   // or current matchup default
    outcome: null,                       // unset — scout will set on canvas or in next QuickLog session
  });
  
  // Navigate to canvas
  const targetSquad = quickLogSide === 'away' ? matchup.awaySquad : matchup.homeSquad;
  navigate(`/training/${tid}/matchup/${matchupId}?scout=${targetSquad}&point=${point.id}`);
}
```

Locate the existing `savePoint` function in QuickLogView (used by "Kto wygrał?" handler). Refactor: extract a shared helper that takes outcome as parameter (null allowed).

### STEP 2 — § 57 _meta + slotIds preserved

The new save call must populate:
- `slotIds`: 5 UUIDs (already done in pointFactory.baseSide() per commit 1.1 of Phase 1a)
- `players[i] = {x, y}` synthetic per zone (W3 convention)
- `playersMeta[i] = makeMeta('scout', uid, {syntheticZone: 'dorito'|'centrum'|'snake'})`
- `assignments[i] = playerId`

This is identical to current QuickLog "Kto wygrał?" save flow. Don't reinvent — just extract and reuse.

### STEP 3 — Canvas reads point on mount

When MatchPage loads with `?point=<pid>` query param:

```javascript
// In MatchPage URL effect
const pointId = searchParams.get('point');
if (pointId && !editingId) {
  // Load point from Firestore via ds, set as editingId
  const pt = points.find(p => p.id === pointId);
  if (pt) {
    setEditingId(pointId);
    setMode('place');
    // assignments + positions auto-rendered from point.{home,away}Data
  }
}
```

This may mostly already work — `editingId` triggers existing edit flow. Verify by reading MatchPage URL handler logic. If `editPoint(pt)` is called, it loads assignments + positions automatically.

[ESCALATE TO JACEK] if URL doesn't currently support `?point=<pid>` query param (would need adding).

### STEP 4 — Slot ordering invariant

User selects players in some order: e.g. taps Eryk, then Karmelek, then Koe, then Maniak, then Papaj. These should land at:
- `assignments[0] = Eryk`
- `assignments[1] = Karmelek`
- ...etc.

Verify QuickLog tracks selection order (not just a set). If currently using `Set<playerId>`, change to `Array<playerId>` so ordering is preserved.

If using array already, just confirm the save handler iterates in selection order.

### STEP 5 — Zone → position mapping

Existing W3 convention (per § 57.3):
- `dorito`: `{x: 0.30, y: 0.20}`
- `centrum`: `{x: 0.30, y: 0.50}`
- `snake`: `{x: 0.30, y: 0.80}`

Use these exact values. Do not introduce new positions or change conventions — § 57 Phase 1b propagator may rely on `syntheticZone` flag for confidence weighting.

### STEP 6 — Verification

End-to-end smoke test:
1. Tap matchup card AWAY side → QuickLog opens for Blue squad
2. Stage 1: select 5 players from Blue (in specific order, note names)
3. Stage 2: set zones (e.g. Eryk=dorito, Karmelek=dorito, Koe=centrum, Maniak=snake, Papaj=snake)
4. Tap "Zaawansowany scouting →"
5. Canvas opens
6. Verify header: "Scouting Blue" (Bug A fix ✓)
7. Verify canvas shows 5 player markers in synthetic positions (P1..P5 layout)
8. Verify picker at bottom shows assignments — taps reveal Eryk at slot 0, Karmelek at slot 1, etc. (selection order preserved)
9. Drag P1 to a precise position → save → verify Firestore: `players[0].x` updated, `playersMeta[0].source` may flip to 'scout' (canvas tap overrides synthetic) — current W1 behavior
10. Open Firestore: confirm `slotIds` are 5 UUIDs, `playersMeta[i].syntheticZone` reflects zone selection (or null if scout retapped)

```bash
npm run precommit
```

### STEP 7 — Commit

```bash
git add src/components/QuickLogView.jsx src/pages/MatchPage.jsx
git commit -m "feat(training): canvas prefills assignments + zones from QuickLog

Bug: Clicking 'Zaawansowany scouting' from QuickLog opened canvas with empty
picker — scout had to re-select 5 players already chosen in QuickLog.

Now QuickLog Stage 2 'Zaawansowany scouting' button:
1. Saves point with assignments + synthetic zone positions + _meta (W3 convention)
2. Navigates to canvas with ?point=<pid> query param
3. Canvas loads point as edit, picker shows pre-assigned slots in selection order

Selection order preserved: assignments[0]=first tapped, [4]=fifth tapped.
Zone → {x,y} mapping uses § 57.3 W3 convention.
§ 57 slotIds + _meta + syntheticZone flags maintained for Phase 1b propagator.

Refs: § 57 Phase 1a foundation (commits 0e7df5a, 5c50870, f628fcf),
Jacek design decision 2026-04-30, screenshot evidence."

git push origin fix/training-scouting-flow
```

### STEP 8 — JACEK CHECKPOINT (final)

Report:
- Commit SHA (commit 3)
- All smoke test results (10 steps)
- Wait for GO before merge to main

---

## Final merge (after Jacek GO on commit 3)

```powershell
git checkout main
git pull origin main

git merge --no-ff fix/training-scouting-flow -m "Merge branch 'fix/training-scouting-flow'

fix(training): scouting flow refactor — bug A + B + C

3 commits:
- Bug A: TrainingScoutTab respects quickLogSide → away routes to awaySquad
- Bug C: QuickLog 3 stages (players → positions → outcome), zone selections persist
- Bug B: 'Zaawansowany scouting' saves point + redirects to canvas with prefilled assignments

Pre-niedzielny sparing 2026-05-03. § 57 Phase 1a _meta writes preserved across all changes."

# Capture merge SHA
$merge_sha = git log -1 --format=%h
echo "Merge SHA: $merge_sha"

git push origin main
```

DEPLOY_LOG entry (append at top):

```markdown
## 2026-05-0X — Training scouting flow fix (fix/training-scouting-flow)
**Commit:** {merge_sha} (merge) · branch `fix/training-scouting-flow` · 3 commits
**Status:** ✅ Deployed
**What changed:** Three related bugs fixed in training point scouting flow:
- Bug A: TrainingScoutTab now respects quickLogSide when routing 'Zaawansowany scouting' — away-side scouting opens canvas for awaySquad (was: always homeSquad)
- Bug C: QuickLogView restructured into 3 explicit stages — Wybór graczy → Przypisz pozycje (zone toggles) → Kto wygrał? Zone selections persist across back/forward navigation
- Bug B: 'Zaawansowany scouting' from QuickLog Stage 2 now saves point with assignments + synthetic zone positions + § 57 W3 _meta, then navigates to canvas with ?point=<pid> for live edit. Canvas picker shows pre-assigned slots in selection order. § 57 slotIds + _meta + syntheticZone preserved for Phase 1b propagator.
**Known issues:**
- Bug 0 (separate, MatchPage.jsx:1063 observe-mode editPoint hard-clamp to 'A') NOT fixed — separate brief post-sparing.
- 'Historia punktów' showing wrong squad name (screenshot 3 evidence) — investigate post-deploy if persists.
```

```powershell
git add DEPLOY_LOG.md
git commit -m "docs(deploy-log): record training scouting flow fix"
git push origin main

# Cleanup
git branch -d fix/training-scouting-flow
git push origin --delete fix/training-scouting-flow

# Deploy
npm run deploy
```

---

## Post-deploy verification (production)

After `npm run deploy`:

1. Smoke test full flow on production:
   - Tap AWAY squad in matchup card → QuickLog opens for correct squad ✓
   - Stage 1: pick 5 players, "Przypisz pozycje →" enables at 5/5 ✓
   - Stage 2: set zones, "← Wróć" preserves selections ✓
   - Stage 2 → "Kto wygrał? →" → outcome → save → returns to matchup ✓
   - Stage 2 → "Zaawansowany scouting →" → canvas opens with header for correct squad ✓
   - Canvas: 5 players at synthetic zone positions, picker shows them in order ✓
2. Open one of the freshly-saved points in Firestore — verify slotIds + playersMeta + syntheticZone all populated.
3. Sentry quiet — no new errors related to QuickLog state machine or URL parsing.

If any breakage: rollback per emergency procedure. Schema unchanged — rollback to pre-merge main is safe.

---

## Phase backlog (DO NOT IMPLEMENT in this brief)

- **Bug 0** (`MatchPage.jsx:1063` observe-mode editPoint hard-clamp to 'A') — separate brief post-sparing
- **Historia punktów wrong squad** — investigate post-deploy if symptom persists (may be related to bug A and self-resolve)
- § 57 Phase 1b propagator — post-niedziela based on real sparing data

---

## Escalation triggers

CC stops and asks Jacek if any of:

1. `quickLogSide` doesn't exist as state in TrainingScoutTab (commit 1)
2. QuickLog state machine differs from expected (no `step` state, conditional renders only)
3. URL handler in MatchPage doesn't support `?point=<pid>` query param
4. Existing `savePoint` in QuickLogView doesn't accept `outcome: null` (would need refactor)
5. Selection order is currently a Set, not Array — would change Stage 1 internals
6. Smoke test reveals different bug not covered by A/B/C — STOP, regroup

Otherwise: STEP-by-STEP, push at each commit boundary, wait for Jacek GO.

---

**End of brief.**
