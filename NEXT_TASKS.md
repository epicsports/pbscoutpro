# NEXT TASKS — For Claude Code
## Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-04-10 evening by Opus
**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). English UI labels.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`

---

# ✅ COMPLETED (do not re-implement)

**Core architecture & canvas:**
- Canvas foundation: pinch-to-zoom, loupe, pan, handedness prompt
- LayoutDetailPage mode tabs, TacticPage mode tabs
- Architecture cleanup (Parts A-G), scouting spec (Parts 1-18)
- FieldCanvas max-vertical approach, width-first in landscape
- Landscape immersive mode for TacticPage + LayoutDetailPage
- ErrorBoundary in App.jsx

**Design system:**
- Premium design: unified headers, Card bg=surfaceDark, SectionLabel, ResultBadge, Score, CoachingStats
- All pages redesigned: Home, Tournament, ScoutedTeam, Teams, TeamDetail, LayoutDetail
- Point cards Option C (accent bar + stats + mini field preview)
- Roster pills: horizontal scroll with full nicknames
- Design contract (design-contract.js), precommit linter, review suite

**Scouting & match:**
- MatchPage redesign (header, half-field, toolbar, bump drag, roster grid, shot drawer, save flow)
- Swap sides fix: nextFieldSideRef as source of truth + changeFieldSide() helper
- Coaching stats: computeCoachingStats.js (dorito/snake/disco/zeeker/center/danger/sajgon)
- ⋮ menu on point cards for edit/delete
- Score display relative to scouted side

**Concurrent scouting:**
- Side-safe writes, homeData/awayData split, sideData per coach
- Shared point shells — coaches write to same point
- OPEN badge for unfinished points (hidden when outcome exists)
- Host/guest point creation, duplicate shell prevention
- Synced swap sides via Firestore
- Auto-attach to existing shells, toast notifications
- Independent fieldSide per coach, heatmap shows own team only
- Solo save sets status=scouted
- Claim system: Firestore-backed (homeClaimedBy/awayClaimedBy + timestamps)
- Claim heartbeat (5 min refresh), stale detection (30 min TTL), release on unmount
- Side picker shows LIVE badge + blocks actively claimed sides
- Merge view toggle in heatmap: [My Team] / [Both Teams]
- Point status tracking: open → partial → scouted

**Layout system:**
- Layout wizard: 3-step (Basic Info → Calibrate → Vision Scan) at /layout/new
- BunkerEditorPage: /layout/:id/bunkers (naming + typing)
- Calibration: tap-to-place + sliders, zoom panel aspect ratio fix
- Vision scan: Claude Sonnet API, localStorage key, left-half detection + mirror
- BUNKER_RECOGNITION.md knowledge base (one inflatable = one bunker)
- Lines and Zones config: disco/zeeker sliders + danger/sajgon clear
- Zone drawing UX: tap-on-release, quick danger↔sajgon toggle

**Ballistics:**
- BallisticsPage: /layout/:id/ballistics (tap to see visibility overlay)
- Engine rewrite: triangle/cross hitboxes, shape-aware ray casting, bunkerShapes.js
- Bunker shape polygons for ballistic shadows

**Tactic:**
- Tactic page redesign: scouting-style editor, freehand drawing
- Freehand strokes persist, canvas clearing fix, rAF redraw
- Zone drawing + ✏️ button on bottom bar

**Teams & tournaments:**
- Team model: parent + child teams, division enforcement
- Child team picker: division filter includes children matching parent division
- Tournament divisions: Firestore model, pill filter, enforcement
- Import schedule button always visible
- Dots menu, ActionSheet, delete confirmations, layout in addTournament
- Tournament close/reopen: password-protected, CLOSED badge, 🔒 banner on closed tournament
- Observed teams: 👁 toggle on tournament team cards, home page section with W/L/remaining/LIVE

**Home page (April 10 redesign):**
- Active tournament selector (picker modal, stored in localStorage)
- Categorized matches: Live/Finished/Upcoming with expandable sections
- Observed teams section between tournament and matches
- Other tournaments + Practice sessions at bottom
- No chevrons — consistent card style

**Scouting April 10 fixes:**
- Chess model concurrent scouting (full implementation)
- Runner visualization: ▲ triangle vs ● circle
- Team B colors on heatmap: teal heatmap, teal shots, pink bumps
- No Point (🚫) option in save sheet — no score awarded
- Point preview (👁) on heatmap point list — show single point data
- Eliminated markers on heatmap: red ✕ with dark bg + faded team dot
- Heatmap eliminated positions now in density cloud
- Match header: title=match name, subtitle=tournament · score · point
- Drag fixes: pan in all modes (shoot/place), no accidental shots/players on drag
- Desktop mouse pan support
- Android toolbar: onClick + onTouchEnd (no flash-close)

**Layout page April 10 redesign:**
- Draggable disco/zeeker line handles (HTML overlay pills)
- hideLineLabels prop — no canvas label overlap with HTML handles
- Zone drawing: separate Save/Cancel per zone
- Premium toolbar: Aā/½/◇ pill toggles + DANGER/SAJGON pills
- Landscape floating toolbar (right side): Aā, ◇, D, S
- Bunker drag on naming page: tap=edit, drag=move
- Canvas width-first sizing, no overflowY:hidden clipping
- Sticky New Tactic button

**Squad code system (April 10):**
- Squad code per layout: 🔑 pill in tactics section
- Tactics tagged with squadCode on creation
- No code = see untagged only, code = see matching only
- Stored in localStorage per layout

**Auth (April 10):**
- Viewer role: ?code login prefix = read-only access
- Guards: hide ADD POINT, Add match, Import, edit, create tournament
- Header badge: 👁 workspace (viewer)
- Login hint for players

**Design audit (April 10):**
- Font audit: all hardcoded sizes ≥10px (Apple HIG/Material compliance)
- FONT_SIZE.xs: 11→12px
- Badge padding scaled, icon sizes standardized to 16px
- Freehand drawing fix: synchronous redraw (no rAF flash)

**Canvas scaling (April 10 evening):**
- Mobile scouting: maxCanvasHeight = vh-180px (fills screen)
- Desktop scouting: same formula (was width-first causing stretch)
- HeatmapCanvas: vh-90px max, aspect ratio preserved, centered
- FieldCanvas: outer wrapper (100% for ResizeObserver) + inner (canvasSize.w, margin auto)
- Layout page: maxCanvasHeight vh-200 portrait, vh-20 landscape

**Tactic page enhancements (April 10 evening):**
- Second position (bump stop): tap selected player + tap elsewhere = set 2nd point
- Drag player far enough = bump stop (like scouting)
- Runner toggle: ▲/● button in toolbar
- Shot from 2nd position: "Shot 1st" / "Shot 2nd" toolbar buttons
- bumpShots saved separately to Firestore
- Bump stop draggable via onMoveBumpStop
- Curve cycling: ⌒ button cycles through 5 arc shapes (saved as curve value)
- Freehand drawing fix: strokesRef updated before setState, debounced ResizeObserver
- Freehand visible in layout preview (freehandStrokes prop on FieldCanvas)
- Clear 2nd button in toolbar when bump exists

**Layout analytics (April 10 evening):**
- 💀 Deaths heatmap: red heatmap of all eliminations across tournaments
- 🎯 Break positions: amber heatmap of all player positions across tournaments
- Unified LayoutAnalyticsPage (single file, mode param: deaths|breaks)
- fetchLayoutDeaths query: tournaments → matches → points
- Fixed double-counting bug (homeData||teamA fallback, not all 4 keys)
- Spinner preloader, fully immersive (100dvh)

**Landscape UI (April 10 evening):**
- Left edge tabs: LABELS, LINES, ZONES, DANGER, SAJGON, 💀 DEATHS, 🎯 BREAKS
- Right edge tab: TACTICS (pull tab with count badge)
- Tactics drawer: slide-in panel from right, 280px, tactic list + preview toggle
- Active state highlighting on toggles
- All tabs: vertical text, semi-transparent + blur, consistent style

**Miscellaneous fixes (April 10 evening):**
- Shot lines 5px thick (was 3px), disco/zeeker 5px (was 2.5px)
- Zone borders 3px (was 2px)
- Desktop toolbar stays open (mouseLeave no longer closes)
- Scouting bump restored (backdrop removed that blocked drag)
- Sticky New tactic button (position fixed)
- Zones not cleared on draw mode entry
- Shoot mode: tap=place/delete, drag=pan (no accidental shots)

# 🔨 IN PROGRESS / NEEDS WORK
- Ballistics accuracy: engine rewritten but may need tuning/validation against real field data
- OCR/Vision scan: works but requires user's Anthropic API key in localStorage
- Test concurrent scouting with Tymek on two devices
- Test Android toolbar (Assign/Delete) after onClick+onTouchEnd fix

# 📋 FUTURE (not started — needs Opus brief before CC implements)
- BreakAnalyzer module (Phase 1 spec: BREAK_ANALYZER_SPEC.md, BREAK_ANALYZER_DOMAIN_v2.md)
- Security Phase 3: server-side admin verification
- WCAG contrast audit (AA violations, contrast, touch targets < 44px)
- OffscreenCanvas heatmap optimization (Web Worker compositing)
- Ballistics Phase 2-4: risky shots, low obstacle shots, arc shots 5-15°
- Break planning & prediction engine

# 📦 BACKLOG (see IDEAS_BACKLOG.md — do NOT implement without instruction)
- Tournament tendencies, lineup analysis, Paintball IQ, body count
- Practice tournament type (coach picks freely, no player history impact)
- Dark/light toggle, settings page, colorblind UI
- Export CSV/Excel, print layout
