# CC BRIEF — Hotfix Bundle 2026-05-02

**Date:** 2026-05-02
**Branch:** `fix/hotfix-bundle-2026-05-02`
**Approved by:** Jacek (chat 2026-05-02 post-PlayerStatsPage redesign smoke test)
**Format:** decision-tree, single Jacek checkpoint after STEP 4

---

## What this is

Three small fixes from Jacek's smoke test of PlayerStatsPage redesign + QuickLog v3.

1. **Issue #1:** Remove "kto wygrał" buttons from Live tracking stage (legacy artifact from when QuickLog and live-track were two separate screens)
2. **Issue #2:** Replace manual initial-circles in PlayerStatsPage chemistry cards with canonical `<PlayerAvatar>` component which already supports `photoURL` fallback chain
3. **Issue #4:** ~~Unlock self-log for sparing/tournament~~ — **CANCELLED** per CC discovery: self-log is already not gated to training. Already works in tournament/sparing. Issue was based on incorrect Opus assumption.

Issues #3 and #5 deferred (architecture rozkmina + font polish — separate briefs post-sparing).

---

## STEP 0 — Pre-flight (DONE in chat 2026-05-02)

CC discovery confirmed:
- `<PlayerAvatar>` exists at `src/components/PlayerAvatar.jsx` with full fallback chain (`player.photoURL` → initial letter → color). Used in PlayerStatsPage.jsx:110 (top profile header), kiosk PlayerTile.jsx:137, and FieldCanvas pre-loaded photo cache at FieldCanvas.jsx:237-252 + field/drawPlayers.js:68-69.
- Self-log gating in MatchPage.jsx:462: only `selfPlayerId && field?.layout`. NOT training-gated. `isTraining` is just write-routing concern (different Firestore paths).
- "Kto wygrał" duplicate location: requires grep in STEP 1.

No additional STEP 0 work — proceed directly to STEP 1.

---

## STEP 1 — Issue #1: Remove "kto wygrał" from Live tracking stage

### 1.1 Locate the duplicate

Live tracking stage was added in QuickLog v3 hotfix (commit `b6cbb38` / `b8aa7cf`). Most likely culprit: `src/components/training/LivePointTracker.jsx` (per memory of session).

```bash
grep -rn "kto wygrał\|winner\|win_a\|win_b\|outcome.*pick" src/components/training/LivePointTracker.jsx src/components/QuickLogView.jsx
git log --oneline -5 src/components/training/LivePointTracker.jsx
```

Expected finding: LivePointTracker.jsx renders winner-pick buttons that should ONLY appear in QuickLogView Stage 4 (`step === 'win'`).

**IF confirmed** → proceed to 1.2.
**IF different file / different cause** → ESCALATE TO JACEK with finding.

### 1.2 Remove winner-pick UI from LivePointTracker

The component should ONLY:
- Show timer / current point status
- Allow capture of live observations (eliminations, what's being tracked live)
- Call `onSave({outcome: undefined, eliminations, ...})` when tracking complete (no outcome assertion)
- Call `onCancel()` to return to Stage 2 (zone) preserving zones

The component should NOT:
- Show "kto wygrał: TeamA / TeamB" buttons
- Set `outcome` field on save (Stage 4 user-pick handles that)

In QuickLogView's onSave handler, the existing capture-then-advance semantics from v3 hotfix are preserved: LivePointTracker reports tracking data, then user advances to Stage 4 'win' for outcome pick.

### 1.3 Verify Stage 4 'win' still owns winner pick

Open `src/components/QuickLogView.jsx`. Confirm Stage 4 (`step === 'win'`) renders winner-pick UI as it did before. No changes needed there.

### 1.4 Smoke test scenario

In QuickLog flow:
1. Stage 1 'pick': pick 1+ players ✓
2. Stage 2 'zone': set zones ✓
3. Stage 3 'live' (LivePointTracker): track live → "Save tracking" or "Skip live" → **NO winner-pick visible here**
4. Stage 4 'win': winner-pick visible here ✓

---

## STEP 2 — Issue #2: Replace initial-circles with `<PlayerAvatar>` in chemistry cards

### 2.1 Locate the regression

Most likely PlayerStatsPage.jsx chemistry sections OR new DuoChemistry/TrioChemistry component (depending on STEP 5g.1 decision in PlayerStatsPage redesign brief).

```bash
grep -n "Najlepiej gra w duecie\|Najlepiej gra w trójce" src/pages/PlayerStatsPage.jsx
grep -rn "DuoChemistry\|TrioChemistry\|<LineupStats" src/
grep -n "fontWeight.*700.*color.*#fff\|borderRadius.*50%" src/pages/PlayerStatsPage.jsx | head -20
```

Find where the avatar stack is rendered with manual `<div>` + initial letter pattern.

### 2.2 Replace with `<PlayerAvatar>` import

```jsx
import PlayerAvatar from '../components/PlayerAvatar';

// BEFORE (manual initial-circle):
<div style={{
  width: 40, height: 40, borderRadius: '50%',
  background: '#15803d',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14, fontWeight: 700, color: '#fff',
  border: '2px solid #0f172a',
}}>F</div>

// AFTER (canonical component with photoURL support):
<PlayerAvatar
  player={felixPlayer}
  size={40}
  borderColor={COLORS.surface}
  borderWidth={2}
/>
```

### 2.3 Verify PlayerAvatar prop signature

Open `src/components/PlayerAvatar.jsx`. Confirm exact props:
- `player` (player object with `photoURL`, `nickname`/`firstName`, `color`)
- `size` (number, px)
- `borderColor` (optional, hex)
- `borderWidth` (optional, number px)
- Possibly `fontSize` (for fallback initial)

**IF prop names differ** → match them exactly. Don't invent props.
**IF some required visuals (border cutout effect, overlap z-index) aren't supported by PlayerAvatar** → wrap PlayerAvatar in container div that handles overlap/z-index, and pass `borderColor={COLORS.surface}` to handle cutout.

### 2.4 Apply in all 3 chemistry rendering spots

The chemistry sections render avatars in:
- Duo card row (2 avatars overlapping, margin-left -10/-12px)
- Trio card row (3 avatars overlapping, z-index 3-2-1)

Both mobile and tablet variants. Apply `<PlayerAvatar>` in all 4 locations (2 sections × 2 viewports if mobile/tablet have separate JSX trees — most likely they share via CSS).

### 2.5 Verify other player tiles in app already use PlayerAvatar

Discovery already confirmed:
- ✅ `PlayerStatsPage.jsx:110` — profile header (works correctly)
- ✅ `kiosk/PlayerTile.jsx:137` — KIOSK tiles (CSS bg pattern, OK)
- ❌ Chemistry cards (this fix)

If discovery finds OTHER places in app rendering player avatars manually (initial-only fallback without photoURL), flag them but **do not fix in this brief**. Add to NEXT_TASKS.md note.

```bash
# Suggested audit query (output as note, not fix scope):
grep -rn "borderRadius.*50%\|borderRadius.*999" src/pages/ src/components/ | grep -i "fontSize\|fontWeight" | head -20
```

### 2.6 Smoke test

Open PlayerStatsPage for player Felix (or whoever has rich data + `photoURL` set):
- Profile header avatar shows photo ✓ (already works, baseline)
- Duo card avatars show photos for both players ✓ (NEW)
- Trio card avatars show photos for all 3 players ✓ (NEW)
- Player without photoURL: avatar falls back to initial+color ✓
- Photo URL 404: avatar falls back to initial+color ✓ (PlayerAvatar onError logic)

---

## STEP 3 — Issue #4: NO-OP

Per CC discovery, self-log already works in MatchPage for sparing AND tournament. The only gating is `selfPlayerId && field?.layout`, neither of which depends on event type. Training/tournament/sparing differ only in Firestore write paths, not in self-log visibility.

**IF Jacek's report ("self-log only on training") was based on actual missing FAB on tournament/sparing page** → escalate, because either:
- (a) `field.layout` is missing on that event type (data issue, not code)
- (b) `linkedPlayer.id` not set for the user (PBLI onboarding issue)
- (c) discovery missed a gating point (re-grep wider)

Otherwise **no code change needed**. Verify in smoke test STEP 4 that FAB is visible in tournament/sparing context for linkedPlayer user.

---

## STEP 4 — Self-review + smoke test

### 4.1 Functional smoke test

**Issue #1 verification:**
1. Open QuickLogView from training squad
2. Stage 1: pick 2 players
3. Stage 2: assign zones
4. Stage 3: enter Live tracking → confirm UI shows ONLY tracking controls (timer, eliminations, save/skip), NO winner-pick buttons
5. Stage 4: winner-pick visible here, works correctly

**Issue #2 verification:**
1. Ensure player Felix (or any player you can test) has `photoURL` set in Firestore
2. Open PlayerStatsPage for Felix
3. Profile header: photo visible ✓
4. Chemistry duo card: both avatars show photos ✓
5. Chemistry trio card: all 3 avatars show photos ✓
6. Test with player WITHOUT photoURL: fallback to initial+color works ✓

**Issue #4 verification:**
1. Open MatchPage in TOURNAMENT context (not training) as a user with `linkedPlayer.id` set
2. Confirm self-log FAB visible bottom-right ✓
3. Tap FAB → HotSheet opens ✓
4. Same in SPARING context ✓

### 4.2 § 27 self-review

Walk relevant sections of `docs/REVIEW_CHECKLIST.md`:
- Color discipline: PlayerAvatar usage doesn't introduce new colors (uses player.color or fallback)
- Touch targets: chemistry card row already meets 52-60px ✓
- No anti-patterns introduced

### 4.3 Automated checks

```bash
npm run precommit          # MUST pass
npx vite build 2>&1 | tail -10   # MUST pass
```

### 4.4 Output report

```
Hotfix Bundle 2026-05-02 — STEP 4 complete

Issue #1 (kto wygrał removal):
- File modified: {LivePointTracker.jsx | other}
- Lines removed: {N}
- Stage 3 verified clean: PASS / ...

Issue #2 (PlayerAvatar in chemistry):
- File modified: {PlayerStatsPage.jsx | DuoChemistry.jsx | ...}
- Imports added: PlayerAvatar from '../components/PlayerAvatar'
- Replacements: {N} avatar renders converted
- Photo render verified: PASS / ...
- Fallback chain verified: PASS / ...

Issue #4 (self-log):
- NO-OP per discovery
- FAB visibility verified in tournament: PASS / ...
- FAB visibility verified in sparing: PASS / ...
- IF Jacek's original report turns out to be data issue (missing photoURL or linkedPlayer.id) → flagged here

§ 27 self-review:
Color discipline: PASS / ...
Anti-patterns: ZERO

Automated:
- npm run precommit: PASS
- vite build: PASS

Notes (other player tiles using manual initial-circles, NOT fixed in this brief):
{list from grep audit, or "none found"}

Branch: fix/hotfix-bundle-2026-05-02
Diff: {N} files, +{X}/-{Y} lines

Verdict: READY FOR JACEK CHECKPOINT
```

---

## CHECKPOINT — Jacek verifies

After STEP 4 verdict READY:
1. Commit on branch `fix/hotfix-bundle-2026-05-02`
2. Push to GitHub
3. Send report to Jacek (the STEP 4.4 output)
4. **DO NOT MERGE** until Jacek says GO

**JACEK GO** → merge + deploy:
```bash
git checkout main
git merge --no-ff fix/hotfix-bundle-2026-05-02
git push origin main
npm run deploy
```

Then:
1. Move brief to archive: `git mv CC_BRIEF_HOTFIX_BUNDLE_2026-05-02.md docs/archive/cc-briefs/`
2. Add `DEPLOY_LOG.md` entry
3. Commit + push the archive move

---

## DO NOT

- ❌ Don't refactor `<PlayerAvatar>` itself — it's canonical, leave as-is
- ❌ Don't fix other player tiles using initial-circles unless they're in the chemistry section scope (audit only, flag in notes)
- ❌ Don't touch self-log code unless STEP 4 verification reveals an actual gating bug (then ESCALATE)
- ❌ Don't merge to main without explicit Jacek GO
- ❌ Don't address Issues #3 (sparing architecture rozkmina) or #5 (font polish) — separate briefs post-sparing

---

## Reference

- PlayerStatsPage redesign brief: `docs/archive/cc-briefs/CC_BRIEF_PLAYER_STATS_REDESIGN_2026-05-01.md` (just deployed)
- DESIGN_DECISIONS § 59 (PlayerStatsPage spec)
- PlayerAvatar component: `src/components/PlayerAvatar.jsx`
- QuickLog flow: § 58 + v3 hotfix archive
- Self-log architecture: `docs/architecture/PLAYER_SELFLOG.md`
