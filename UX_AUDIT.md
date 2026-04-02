# UX Audit — PbScoutPro
## Based on Smashing Magazine Mobile Design Guide

---

## 🧠 1. Reduce cognitive load

### Problem: Layout detail has too many modes
User sees: Names, Types, Lines, Zones, Calibrate, Print, Zoom — 7 tools at once.
New user doesn't know which to tap first.

**Fix: Progressive disclosure**
- Default view: clean layout preview with bunker labels. No toolbar.
- Single "Edit" button → reveals toolbar with tools.
- Tools grouped: **Setup** (Names, Types, Calibrate) vs **Overlays** (Lines, Zones, Print).
- First-time hint: pulsing dot on "Edit" with tooltip "Tap to set up your layout."

### Problem: Tactic editor shows everything simultaneously  
Players, shots, bumps, visibility, counter, freehand, steps — all visible at once.

**Fix: Mode-based interaction**
- Bottom tab bar with 3 modes: **Place** (players + bumps) | **Analyze** (visibility + counter) | **Draw** (shots + freehand)
- Only relevant tools shown per mode.
- Step navigator stays visible in all modes (thin strip at top or bottom).

---

## 📱 2. Minimize input

### Problem: Adding a bunker requires name + type + position
3 taps + typing for each of 15-20 bunkers per layout.

**Fix: Smart defaults + batch flow**
- Tap on field → bunker appears with auto-name based on position ("D1", "S2", "C50").
- Type auto-guessed from name. Height auto-filled.
- "Quick mode": tap-tap-tap to place all bunkers, name/type afterwards in list view.
- Mirror button places two at once (symmetric field).

### Problem: Creating a tactic from scratch is blank canvas intimidation

**Fix: Templates**
- Offer 3 starter templates: "Standard break", "Snake push", "Dorito push"
- Each pre-fills 5 players in common break positions.
- User adjusts from there instead of starting empty.

---

## 🧭 3. Navigation

### Problem: No persistent navigation — user relies on browser back
Deep screens (match → point → scouting) have no way back except header arrow.
If user accidentally navigates away, progress might be lost.

**Fix: Bottom tab bar on main screens**
```
┌──────────────────────────────────┐
│         [screen content]         │
├──────────────────────────────────┤
│ 🏠 Home │ 🗺️ Layouts │ 🏆 Events│
└──────────────────────────────────┘
```
- 3 main destinations always reachable.
- Sub-screens (layout detail, match, tactic) keep back arrow but no tab bar.
- Current tab highlighted — user always knows "where am I."

### Problem: No breadcrumb — deep screens don't show context
Inside a match, user doesn't see which tournament they're in.

**Fix: Contextual subtitle in header**
```
← Match: Rangers vs Firm
   Tampa Bay Open · Round 2
```
Small subtitle shows parent context. Tappable to go back to tournament.

---

## 🎨 4. Visual weight & hierarchy

### Problem: All buttons/cards have same visual weight
Home page: Teams, Players, Import CSV, Layout Library, Tournaments — all look equal.
But user opens Tournaments 80% of the time.

**Fix: Prioritize by usage**
- Tournaments section: bigger cards, at TOP of home screen, no collapse.
- "Quick scout" floating button → jumps straight to scouting most recent match.
- Players & Teams: collapsed by default (less frequent).
- Import CSV: moved to settings or accessed from Players page only.

### Problem: Heatmap has no legend on screen
User sees colors but doesn't know what green vs orange vs blue means.

**Fix: Persistent mini-legend**
When heatmap is visible, show small legend bar at bottom of canvas:
```
🟢 Safe  🟠 Lob  🔵 Risky
```
3 colored dots + 3 words. Always visible. Takes 20px of height.

---

## ♿ 5. Accessibility

### Problem: Heatmap uses red/green — 8% of men can't distinguish
This is the #1 accessibility issue in the app.

**Fix: Alternative color schemes**
- Default: green→yellow→red (safe), orange (arc), blue (exposed)
- Color-blind mode: white→yellow (safe), orange (arc), purple (exposed)
- Toggle in settings. Or use the OS accessibility signal:
  `window.matchMedia('(prefers-contrast: more)')` or manual toggle.

### Problem: No reduce-motion support
Heatmap rendering, FAB animations — no respect for `prefers-reduced-motion`.

**Fix:** Wrap all CSS transitions and JS animations:
```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
```

---

## 🔙 6. User control

### Problem: No undo
Place a player wrong? Delete a bunker? No undo. Only re-do.

**Fix: Simple undo stack**
- Track last 5 actions: `[{type:'addPlayer', data:{...}}, ...]`
- Undo button in header (↩️) or keyboard shortcut Ctrl+Z
- Only for canvas actions (player placement, shots, bumps).

### Problem: No auto-save indicator
User doesn't know if their tactic/match data is saved.

**Fix: Save status in header**
```
← Tactic: Snake push     Saved ✓
```
States: "Saving..." (with subtle spinner), "Saved ✓" (green checkmark), "Offline" (yellow dot).

### Problem: Destructive actions have no confirmation
Deleting a tournament, layout, or match — immediate, no undo.

**Fix:** Already partially done (useConfirm hook exists). Audit all delete actions.

---

## ⚡ 7. Performance perception

### Problem: Layout detail loads image + bunkers + all layers — user sees blank then flash
First contentful paint is slow because everything loads at once.

**Fix: Skeleton + progressive loading**
1. Show layout card shape immediately (gray rectangle, correct aspect ratio)
2. Load image → fade in
3. Load bunker labels → appear on top
4. Toolbar animates in last

### Problem: Visibility heatmap computation shows nothing during 1-2s calculation

**Fix: Progressive render**
- Worker already sends PROGRESS events.
- Render heatmap row-by-row as data arrives (every 10% of grid).
- User sees heatmap "painting" from top to bottom. Feels responsive.

---

## 🎯 8. Specific PbScoutPro improvements

### Onboarding (new user)
- First login → show 3-step intro:
  1. "Upload a layout" (with example image)
  2. "Mark bunkers" (animated demo)
  3. "Start scouting" (tap to begin)
- Skip button always visible. Don't force it.

### Match scouting flow — reduce taps
Current: select player → tap field → tap shoot → tap target → next player.
That's 5 taps per action.

**Fix: Direct manipulation**
- Drag player TO position (not select then tap).
- Double-tap player → activates shoot mode (not separate button).
- Swipe down on player → eliminate (skull marker).
- Long press = bump (already implemented ✓).

### Export / share
- "Share tactic" button → generates image (canvas.toDataURL) → native share sheet.
- QR code on printed layout → links to digital version in app.
- Team report: PDF with all scouted points, win rate, common breaks.

---

## Priority order

1. **Bottom tab navigation** (biggest UX impact — user always knows where they are)
2. **Heatmap legend + color-blind mode** (accessibility + usability)
3. **Auto-save indicator** (user confidence)
4. **Progressive loading / skeletons** (perceived performance)
5. **Undo stack** (user control)
6. **Mode-based tactic editor** (reduce cognitive load)
7. **Tactic templates** (reduce blank canvas intimidation)
8. **Onboarding** (new user retention)
