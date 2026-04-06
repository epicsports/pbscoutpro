# DOCUMENTATION CLEANUP — Stale References

## Features that NO LONGER EXIST in code:

| Feature | Was in | Status |
|---------|--------|--------|
| FAB / Focus mode | FieldEditor | REMOVED — no FAB, no focus mode |
| toggleZoom / intZoom | FieldEditor | REMOVED — pinch-to-zoom replaced it |
| ActionBar component | src/components/ | NEVER CREATED — referenced in specs but file doesn't exist |
| HeatmapToggle | ui.jsx | NEVER ADDED — 0 references in ui.jsx |
| Positions/Shots toggle | MatchPage heatmap | REMOVED — heatmap shows both simultaneously |
| heatmapType state | MatchPage | DEAD CODE — state declared but unused (line 77) |
| isAdmin guards | TournamentPage | REMOVED — all users can delete |
| Layout canvas on TournamentPage | TournamentPage | REMOVED — layout not shown on tournament page |
| Tactics on TournamentPage | TournamentPage | REMOVED — tactics belong to layout |
| Swipe-to-delete | Various | REMOVED — replaced by ⋮ dots menu |
| Visibility/counter analysis on MatchPage | MatchPage | NOT PRESENT — 0 refs |
| Freehand drawing on MatchPage | MatchPage | NOT PRESENT — 0 refs |
| fillHeight prop usage | FieldCanvas | PROP EXISTS but unused — maxCanvasHeight is used instead |
| Polish UI labels | Various | CONVERTED — all English now |

## Features that DO EXIST:

| Feature | File | Status |
|---------|------|--------|
| Loupe | FieldCanvas.jsx | EXISTS (4 refs) |
| FieldEditor | FieldEditor.jsx | EXISTS — toolbar + zoom wrapper (no FAB) |
| BottomSheet | BottomSheet.jsx | EXISTS |
| ModeTabBar | ModeTabBar.jsx | EXISTS |
| PageHeader | PageHeader.jsx | EXISTS |
| ShotDrawer | ShotDrawer.jsx | EXISTS |
| RosterGrid | RosterGrid.jsx | EXISTS |
| ⋮ ActionSheet | ui.jsx | EXISTS — dots menu pattern |

## Files with stale content (by severity):

### CRITICAL — CC reads these, will cause wrong work:

**CLAUDE.md** (3 stale refs):
- Line 41: "FieldEditor wraps FieldCanvas with toolbar + zoom. Focus mode = floating FAB." → Fix: "FieldEditor wraps FieldCanvas with toggle toolbar (labels/lines/zones)."
- Line 53: "src/components/FieldEditor.jsx — toolbar + zoom wrapper with FAB focus mode" → Fix: "src/components/FieldEditor.jsx — toggle toolbar wrapper"
- Line 62: "English UI labels (Visibility, Names, Zones, Positions, Shots, etc.)" → Fix: "English UI labels (Labels, Lines, Zones, etc.)"

**NEXT_TASKS.md** (4 stale refs):
- Session 4.0: "Remove dead zoom code" — already done, mark ✅
- Session 4.2: "FAB (🔧)" section — feature doesn't exist, remove
- Session 4.2: "Action bar" section — ActionBar component was never created, remove
- Session 4.1: "Translate Polish → English" — already done, mark ✅

### HIGH — Old briefs CC might re-read:

**CC_MASTER_BRIEF.md** (70 stale refs!):
- Entire "FIX 0: Loupe behavior" — loupe exists but spec may be outdated
- "COMPONENT 3: ActionBar" — component doesn't exist
- "COMPONENT 5: HeatmapToggle" — never added to ui.jsx
- "COMPONENT 6: FieldEditor canvas toolbar — UNIFY" — zoom/FAB refs stale
- "LOUPE QUICK FIX" — may be outdated
- "BUMP REDESIGN" — check if current bump behavior matches
- Translation section — done

**CC_SPEC_SCOUTING_REDESIGN.md** (27 stale refs):
- Multiple parts reference ActionBar, FAB, heatmapType, fillHeight
- Part 6: ShotDrawer — EXISTS, may be up to date
- Part 10: Loupe Fix — may be outdated

**CC_SESSION_LAYOUT_MATCH.md** (13 stale refs)
**CC_BRIEF_COMPONENTS.md** (16 stale refs)
**CC_BRIEF_ARCHITECTURE.md** (6 stale refs)

### LOW — Already completed briefs:

**CC_BRIEF_REMAINING_FIXES.md** — references heatmapType, already fixed
**CC_BRIEF_SCREEN_REDESIGNS.md** — completed
**CC_BRIEF_CGROUP_FIXES.md** — completed
