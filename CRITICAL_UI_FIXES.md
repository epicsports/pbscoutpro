# Critical UI Fixes — Layout Detail Page Rebuild
## From user testing session — PRIORITY: IMMEDIATE

---

## Problem summary

Layout detail page is chaotic. Two canvases, too many sections visible at once,
features that don't belong here (visibility, counter analysis), broken tactic creation.

## Fix 1: ONE canvas, not two

**Current:** Small preview image in Basic Info + full FieldEditor canvas below.
**Fix:** Remove the small preview from Basic Info. Only ONE canvas exists on the page:
the FieldEditor+FieldCanvas. It shows the layout with any active overlay toggles.

In Basic Info section: show only name, league, year, image upload button.
The actual layout image is shown in the canvas below — NOT duplicated.

## Fix 2: Remove visibility + counter from Layout Detail

**Current:** FieldEditor has `hasVisibility` → shows 🔥 and 🎯 on layout config page.
**Fix:** Layout detail = CONFIGURATION ONLY. No analysis features.

```jsx
// LayoutDetailPage.jsx — change:
<FieldEditor
  hasBunkers hasZones hasLines
  hasVisibility={false}    // ← was true
  hasCounter={false}       // ← was true
  ...
```

Visibility and counter belong in: TacticPage, MatchPage. NOT here.

## Fix 3: Collapsible sections (accordion pattern)

**Current:** All sections visible at once — Basic Info, Disco/Zeeker, Calibration, 
Bunker tools, Toolbar, Canvas, Tactics. User scrolls through a wall of content.

**Fix:** Three collapsible sections. Only ONE open at a time.

```
┌─ 📋 Info (name, league, year, image)        [▼ expanded by default]
│  Name: [2026Midatlantic        ]
│  Liga: [NXL] DPL PXL    Rok: [2026]
│  [🖼️ Zmień zdjęcie]
└──────────────────────────────────────

┌─ ⚙️ Konfiguracja                            [▶ collapsed]
│  (tap to expand: disco/zeeker sliders, 
│   calibration, bunker names/types, zones)
└──────────────────────────────────────

┌─ 🗺️ Podgląd                                 [▶ collapsed]  
│  (tap to expand: FieldCanvas with toggles 
│   for bunker labels, lines, zones)
└──────────────────────────────────────

┌─ ⚔️ Taktyki (1)                             [▶ collapsed]
│  (tap to expand: tactic list + add button)
└──────────────────────────────────────
```

When user taps "⚙️ Konfiguracja" → it expands, others collapse.
This eliminates the "wall of everything" problem.

## Fix 4: Disco/Zeeker sliders → inside Konfiguracja section

**Current:** Sliders are in Basic Info, above the image. They're visual noise during
normal layout viewing.

**Fix:** Move disco/zeeker into the ⚙️ Konfiguracja accordion section,
alongside bunker names, types, calibration, zones. These are all "technical setup"
that you do once and then leave alone.

## Fix 5: FAB focus mode — cleaner design

**Current:** FAB pills are large emoji buttons stacked vertically. Slider control 
for something (zoom?) is bulky and unclear. × button is small and far from the FAB.

**Fix:**
- FAB collapsed state: single 40px circle, dark bg, current tool icon
- FAB expanded: column of 36px circles, each with THIN LINE SVG icon (not emoji)
- Active tool: amber border, slightly larger (40px)
- Inactive: dark bg (#1a2234), no border, 36px
- × to close zoom: at bottom, same size, red tint
- NO slider. Zoom is binary: on (2x) or off. No variable zoom.
- Gap between pills: 6px (tight column)
- Whole column: max 200px tall, right-aligned, 12px from edge

## Fix 6: Remove toolbar ABOVE canvas in Technical section

**Current:** There's a row of icon buttons (〰️ 🏷️ ⚠️ 🔥 🔍) ABOVE the canvas, 
separate from the FAB pills. Two toolbars for the same canvas = confusing.

**Fix:** In the Podgląd section, canvas has ONLY toggle checkboxes for layers:
```
☑ Nazwy bunkrów  ☑ Linie  ☐ Strefy  [🔍 Zoom]
```
Simple checkboxes, one row. When Zoom is on → these become FAB pills.
No separate toolbar row.

## Fix 7: Tactic creation broken

**Current:** User clicks "+ Taktyka", fills name, clicks "Utwórz" — nothing happens.

**Likely cause:** New Firestore rules blocking write. The `addLayoutTactic` writes
to `workspaces/{slug}/layouts/{layoutId}/tactics/{newId}`. Rules require 
`request.auth.uid in members`. If the user's uid wasn't added to members 
(migration issue), writes fail silently.

**Debug steps for Claude Code:**
1. Open browser DevTools → Console
2. Try creating a tactic → look for Firestore permission error
3. Check: `firebase.auth().currentUser.uid` — is it in the workspace members array?
4. If not: the `enterWorkspace` function needs to add uid to members on login

## Fix 8: Heatmap doesn't show bunker shadows

**Current:** Visibility heatmap renders but bunkers don't cast "shadows" (dead zones
behind them). Single bunkers should block LOS and create gaps in heatmap.

**This is a worker issue, not UI.** The ballistics engine handles this via 
ray-casting in `shotClear()`. If shadows aren't showing, possible causes:
- Bunker dimensions too small (widthM/depthM not set or defaulting to 0)
- `baType` not assigned → default size is tiny
- Need to verify: are bunker types being passed to worker in INIT_FIELD?

**Debug:** In TacticPage (where visibility belongs), check that bunkers passed to
`initField()` include `type`, `widthM`, `heightM` from the layout data.

---

## Implementation order for Claude Code

1. Fix 7 first (tactic creation) — this is a blocking bug
2. Fix 1+2+4 together (remove duplicate canvas, remove visibility, move sliders)
3. Fix 3 (accordion sections)
4. Fix 6 (simplify toolbar to checkboxes)
5. Fix 5 (FAB redesign)
6. Fix 8 (debug heatmap shadows — may need Opus for worker fix)
