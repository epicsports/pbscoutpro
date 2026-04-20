# IDEAS BACKLOG — Future Features & Improvements
## ⚠️ This is NOT a task queue. CC: ignore this file. Work from NEXT_TASKS.md only.
## This file tracks ideas discussed but not yet scheduled.

Last updated: 2026-04-13 by Opus

---

## 🧠 Analytics & Intelligence

### Tournament tendencies — team, lineup & player level
Aggregated analysis from all scouted points for a team in a tournament.

**Level 1: Team tendencies**
Across ALL points, where do they place players on the break?
Density heatmap of breakout positions → "RANGER runs snake 60%, dorito 30%".

**Level 2: Lineup tendencies (which 5 players → which play)**
Group scouted points by the 5-player lineup that played them.
Detect patterns: "When #33 + #05 + #86 play together, they ALWAYS push snake (8/9 points)".

**Level 3: Individual player tendencies**
When player X is on the field (any lineup), what do they personally do?
Preferred position, kill rate on break, survival rate, most common shot target.
Conditional: P(pattern | player on field) vs P(pattern | player NOT on field).

### Paintball IQ prediction engine
From the Paintball Bible (Marcello Margott's framework). Quantifiable
indicators per position: reaction time, lane accuracy, movement timing.
Body count scenarios (1v1 through 5v3) with win probability predictions.
Long-term feature, needs domain validation + sufficient data.

### Body count scenario analysis
When team has e.g. 3v2 advantage, what's the optimal strategy?
Extends counter analysis engine + Gain/Control/Anchor coaching framework.

### Agentic counter explanations
When counter analysis recommends a position, show WHY with channel
(safe/arc/exposed), timing, one-sentence reasoning per recommendation.

---

## 🎨 UI/UX Improvements

### Dark/light theme toggle
theme.js 3-layer color system ready. Adding light mode = new Layer 2 mapping.
Toggle in settings. OLED benefit (dark) vs outdoor readability (light).

### Settings page
Centralized settings: handedness (left/right), colorblind mode toggle,
theme (dark/light/auto), language (PL/EN), default division, notifications.
Currently handedness is localStorage only.

### Colorblind mode UI toggle
HEATMAP.colorblind scheme already exists in theme.js. Need UI toggle
(settings or heatmap legend). Uses setHeatmapScheme('colorblind').

### Undo stack
Last 5 canvas actions undoable. Stack of state snapshots.
Pattern: Cmd+Z / shake-to-undo on mobile.

### Tactic templates
Pre-built starting points: "Standard break", "Snake push", "Dorito push",
"Mirror break". User picks template → pre-places 5 players → user adjusts.
Templates stored as JSON, not in Firestore.

### Direct manipulation: drag player TO position
Long press player chip → drag directly onto canvas position.
More intuitive for touchscreen. (Bump drag already works.)

### Onboarding tunnel
First-time user flow beyond Layout Wizard: workspace name → handedness →
import layout → place first bunker → save. Guided wizard.

---

## 🏗 Architecture & Performance

### OffscreenCanvas for heatmap rendering
Move heatmap grid drawing to OffscreenCanvas on worker thread.
Main thread only composites the result. Smoother interactions.

### SharedArrayBuffer for parallel grid computation
Split ballistics grid across multiple workers.
Requires COOP/COEP headers on GitHub Pages — investigate feasibility.

### Lazy loading images
Add loading="lazy" to layout thumbnails in lists. Trivial, 1 minute.

---

## ♿ Accessibility

### ARIA basics
- FAB: aria-label, aria-expanded
- Toolbar: role="toolbar" + aria-pressed
- Canvas: aria-label="Paintball field" + hidden description
- Heatmap legend: aria-live="polite"

### WCAG contrast audit (remaining)
Font audit done (all ≥10px). Still need automated contrast check on
all text/background combos. Some textMuted on surface may fail AA.

---

## 📱 Mobile-specific

### Haptic feedback
navigator.vibrate(10) on player/shot placement. Subtle tactile confirmation.
Check iOS API support (limited).

### Keyboard shortcuts (desktop)
1-5 = select player, P = place, S = shot, H = hit, Z = undo, Space = save.

---

## 📊 Data & Export

### Export match data as CSV/Excel
All scouted points from a match as structured data.
Columns: point#, player, position_x, position_y, shots, outcome.

### Print layout with overlays
Print-friendly CSS for layout with selected overlays.
A4 landscape format. @media print already partially works for tactics.

---

## 🔬 Research & Validation

### Competitive analysis
Check PbNation, PaintballAccess, other scouting tools.
Ballistics engine is unique differentiator — lean into it.

---

## 🏗 New features from user feedback (April 2026 PXL weekend)

### F1+F2: Side confusion on scouting canvas
Scouts don't know which side is which. No base indicators on canvas.
Bug found: useEffect with editingId in deps overwrites swap sides.
Concurrent onSnapshot can flip fieldSide without UI feedback.
Fix: base indicators + swap toast + fix useEffect race condition.

### F3: Quick logging mode
Don tracked "kto zagrał + wynik" on paper because app was too slow.
Need simplified mode: pick lineup from roster grid → tap outcome → next.
No canvas, no positions. Just lineup + score. Speed > detail.

### F4: Sample size indicator
Coach used scouting data to set break, low sample → wrong prediction.
Heatmap/coaching stats should show "n=X points" prominently.
Low n = "⚠ Small sample (2 points)".

### F5: Self-scouting mode
"Scout ourselves, then think what opponent can do to counter."
May be as simple as scouting own team + counter analysis view.

### F6: Tournament mode profiles
NXL pro (stream, 2/day) = deep scouting. PXL (live, many) = quick logging.
May not need separate "modes" — F3 (Quick Logging) covers PXL workflow.

### F7: Training data → break selection
If training data captured, suggest optimal breaks based on practice tendencies.

### FIX: PlayerStatsPage kills always 0 (data pipeline gap)
**Priority:** HIGH — data is there, just not piped through
**Problem:** `computePlayerStats` calls `computeKillCredit` but playerPoints
from `buildPlayerPointsFromMatch` don't include `opponentEliminations` or
`opponentPlayers`. Kill credit always returns 0.
**Working correctly:** Coach summary (ScoutedTeamPage) → `computePlayerSummaries`
has mirrored opponent data → kills display correctly there.
**Fix:** In `buildPlayerPointsFromMatch` (playerStats.js), include opponent data:
```javascript
out.push({
  ...existing,
  opponentEliminations: awayData?.eliminations || [],
  opponentPlayers: awayData?.players || [],
  quickShots: ds.quickShotsFromFirestore(homeData?.quickShots),
  obstacleShots: ds.quickShotsFromFirestore(homeData?.obstacleShots),
});
```
Then `computeKillCredit` will find matching shot zones → opponent eliminations.

---
## ✅ COMPLETED (April 15, 2026 session)

- ✅ F3: Quick logging mode — QuickLogView component, Don's paper replacement
- ✅ Counter suggestions — generateCounters() + CounterCard on ScoutedTeamPage
- ✅ Formation consistency — predictability score in insights engine
- ✅ Fifty bunker detection — Snake 50 / Dorito 50 / Center 50
- ✅ PlayerStatsPage kills — opponent data piped through buildPlayerPointsFromMatch
- ✅ Full player profile — bunkers, break/obstacle shots, kills, K/pt
- ✅ Training mode — who's here, squads (drag & drop), matchups, results
- ✅ Tab navigation — Scout/Coach/More bottom tabs
- ✅ Tournament settings + Close tournament
- ✅ Apple HIG audit — touch targets, fonts, elevation, colors
