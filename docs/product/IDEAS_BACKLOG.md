# IDEAS BACKLOG — Future Features & Improvements
## ⚠️ This is NOT a task queue. CC: ignore this file. Work from NEXT_TASKS.md only.
## This file tracks ideas discussed but not yet scheduled.

Last updated: 2026-05-29 by Opus (recovery cleanup: struck SHIPPED-SINCE + SUPERSEDED items per the lost-work audit H inventory)

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

### ~~Settings page~~ → SUPERSEDED by More-tab IA (§ 46)
Centralized settings was reframed as the More-tab information architecture (§ 46);
not a separate "settings page." (handedness/theme/language live there.)

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

---

## 🔬 Research & Validation

### Competitive analysis
Check PbNation, PaintballAccess, other scouting tools.
Ballistics engine is unique differentiator — lean into it.

---

## 🏗 New features from user feedback (April 2026 PXL weekend)

> **Cleanup 2026-05-29:** F1+F2 (side confusion), F3 (Quick logging), F4 (sample-size
> indicator), and FIX (PlayerStatsPage kills) are all **SHIPPED** — removed (see ✅ COMPLETED).
> Remaining open items below.

### F5: Self-scouting mode
"Scout ourselves, then think what opponent can do to counter."
May be as simple as scouting own team + counter analysis view.

### ~~F6: Tournament mode profiles~~ → SUPERSEDED by F3 / § 19
NXL pro (deep scouting) vs PXL (quick logging) does NOT need separate "modes" —
Quick Logging (F3) + Quick Shots dual-mode (§ 19) cover the PXL workflow.

### F7: Training data → break selection
If training data captured, suggest optimal breaks based on practice tendencies.

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
