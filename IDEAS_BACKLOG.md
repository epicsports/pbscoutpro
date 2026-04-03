# IDEAS BACKLOG — Future Features & Improvements
## ⚠️ This is NOT a task queue. CC: ignore this file. Work from NEXT_TASKS.md only.
## This file tracks ideas discussed but not yet scheduled.

Last updated: 2026-04-03 by Opus

---

## 🧠 Analytics & Intelligence

### Tournament tendencies
Aggregated heatmaps per team across all matches in a tournament.
System collects all breakout positions from scouted points, overlays them
on a density heatmap. Output: "RANGER runs snake push 60%, dorito 30%".
- Rendering: new FieldCanvas layer "tendency heatmap"
- Data: iterate all match points for a team, collect player[0-4] positions
- UI: section in TournamentPage per team, or separate "Tendencje" tab

### Paintball IQ prediction engine
From the Paintball Bible (Marcello Margott's framework). Quantifiable
indicators per position: reaction time, lane accuracy, movement timing,
communication calls. Track these across matches to build player profiles.
Body count scenarios (1v1 through 5v3) with win probability predictions.
- Depends on: enough scouted data per player
- Long-term feature, needs domain validation

### Body count scenario analysis
When team has e.g. 3 players alive vs opponent's 2, what's the optimal
strategy? System could recommend positions based on body count advantage.
- Extends counter analysis engine
- Needs: Gain/Control/Anchor coaching framework integration

### Agentic counter explanations
When counter analysis recommends a position, show WHY:
```
#1 🟢 HAMMER 68% — safe shot
   ⏱ 2.1s biegu · 0.4s okno
   "Bezpośredni strzał zza osłony, przeciwnik widoczny 0.4s po wyjściu z bazy"
```
Each recommendation: channel (safe/arc/exposed), timing, one-sentence reason.
Pattern from Smashing Magazine agentic AI article.

---

## 🎨 UI/UX Improvements

### Dark/light theme toggle
theme.js already has 3-layer color system (primitives → semantic → component).
Adding light mode = new semantic mapping for Layer 2. Toggle in settings.
OLED benefit on dark mode (battery), readability benefit on light mode (outdoors).

### Settings page
Centralized settings: handedness (left/right), colorblind mode toggle,
theme (dark/light/auto), language (PL/EN), default division, notification
preferences. Currently handedness is localStorage only.

### Colorblind mode UI toggle
HEATMAP.colorblind scheme already exists in theme.js. Need UI toggle
somewhere (settings or on heatmap legend). Uses setHeatmapScheme('colorblind').

### Undo stack
Last 5 canvas actions undoable. Stack of state snapshots.
Useful for: accidental player placement, wrong shot, zone point mistake.
useUndo hook already created by CC but not integrated.
- Pattern: Cmd+Z / shake-to-undo on mobile

### Empty states with illustrations
When a page has no data (no tournaments, no players, no tactics), show
friendly illustration + call to action instead of blank screen.
- "Dodaj swój pierwszy turniej" with paintball-themed SVG illustration

### Tactic templates
Pre-built starting points: "Standard break", "Snake push", "Dorito push",
"Mirror break". User picks template → system pre-places 5 players in
typical positions → user adjusts.
- Templates stored as JSON, not in Firestore
- Reduces barrier to creating first tactic

### Direct manipulation: drag player TO position
Instead of: select player → tap canvas, allow: long press player chip →
drag directly onto canvas position. More intuitive for touchscreen.

### Onboarding tunnel
First-time user flow: workspace name → handedness → import layout image →
place first bunker → save. Guided 4-step wizard.

### Sticky toolbar (hide on scroll)
FieldEditor toolbar: sticky at top, hides on scroll down, reveals on
scroll up. 10 lines of JS with IntersectionObserver or lastScrollY check.
Only in normal mode — zoom/focus mode has FAB pills.

---

## 🏗 Architecture & Performance

### Container queries replacing useDevice
Current: useDevice hook with media queries (mobile/tablet/desktop).
Future: CSS container queries for truly component-scoped responsive design.
Lower priority — useDevice works fine, container queries are future CSS.

### SharedArrayBuffer for parallel grid computation
Ballistics engine currently runs on single Web Worker thread.
SharedArrayBuffer would allow splitting the grid across multiple workers.
Performance gain: 2-4× on multi-core phones.
- Requires COOP/COEP headers on GitHub Pages
- Investigate feasibility before committing

### OffscreenCanvas for heatmap rendering
Move heatmap grid drawing to OffscreenCanvas on worker thread.
Main thread only composites the result. Smoother interactions during
heavy visibility computation.

### Lazy loading images
Add `loading="lazy"` to all layout thumbnails in lists (LayoutsPage,
TournamentPage). Trivial change, 1 minute.

---

## 🤝 Collaboration & Multi-user

### Cross-division match viewing
When scouting in Div.1, quick-peek at matches from Div.2 without
switching tabs. Maybe a "peek" button or overlay showing other division's
recent results.

### Team hub concept (parentTeamId)
Teams can be "parent" teams with sub-teams. E.g. Ranger Warsaw is parent,
Ring Warsaw is their second roster. Firestore: teams/{id}.parentTeamId.
- Display: indent child teams in list, "↳ 2nd roster of Ranger" subtitle
- Roster sharing: parent team's players available to child teams
- Already partially specced in architecture editor sessions

---

## ♿ Accessibility

### ARIA basics
- FAB: `<button aria-label="Otwórz narzędzia" aria-expanded>`
- Toolbar: `role="toolbar"` + `aria-pressed` on toggles
- Canvas: `aria-label="Pole paintballowe"` + hidden description
- Heatmap legend: `aria-live="polite"` for stance/barrel changes
- Lighthouse score improvement with minimal effort

### WCAG contrast audit
Run automated contrast check on all text/background combinations.
Fix any AA violations. Most of our dark theme should pass but
some dim text (textMuted on surface) might fail.

---

## 📱 Mobile-specific

### Haptic feedback
`navigator.vibrate(10)` on player placement, shot placement, bump trigger.
Subtle tactile confirmation. Check API support on iOS (limited).

### Keyboard shortcuts (desktop)
When on desktop: 1-5 = select player, P = place mode, S = shot mode,
H = hit mode, Z = undo, Space = save point. Power user feature.

---

## 📊 Data & Export

### Export match data as CSV/Excel
Export all scouted points from a match as structured data.
Columns: point#, player, position_x, position_y, shots, outcome.
For coaches who want to do their own analysis in spreadsheets.

### Print layout with overlays
Print-friendly CSS for layout with selected overlays (labels, lines,
zones). A4 landscape format. Currently "print" doesn't work properly.

---

## 🔬 Research & Validation

### Lean user research
Test with 3-5 real paintball coaches. Watch them scout a live match.
Find UX friction points we can't see ourselves. Do this when app is
feature-complete enough for real use.

### Competitive analysis
Check what PbNation, PaintballAccess, and other scouting tools offer.
Identify gaps and opportunities. We have the ballistics engine as unique
differentiator — lean into it.
