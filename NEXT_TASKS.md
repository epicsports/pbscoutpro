# NEXT TASKS — For Claude Code
## Read DESIGN_DECISIONS.md first for all approved patterns.
## Work top to bottom. Push after each task.

**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). English UI labels.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`

---

# ✅ COMPLETED (do not re-implement)
- Sessions 1-3: Canvas foundation, LayoutDetailPage tabs, TacticPage tabs
- Session 4: MatchPage redesign (scouting header, half-field, toolbar, bump drag, roster grid, shot drawer, save flow)
- Session 5: Tournament divisions (Firestore model, pill filter, enforcement)
- Scouting spec: Parts 1-18 all done
- Architecture cleanup: Parts A-G done
- Team model: child teams, division enforcement
- Screen redesigns: tournament page, side picker, match summary (B3 scoreboard)
- UI: ⋮ dots menu, ActionSheet, delete confirmations, layout in addTournament

# 🔨 IN PROGRESS
- **Tactic page redesign: CC_BRIEF_TACTIC_REDESIGN.md (not started)**
- Layout page redesign: CC_BRIEF_LAYOUT_REDESIGN.md (Parts 1-6 done, 7-8 pending)
- Layout wizard: CC_BRIEF_LAYOUT_WIZARD.md (not started)

# 📋 FUTURE (not started)
- Concurrent scouting: homeData/awayData split, side claim with uid, dual-write, merge view
- Home dashboard redesign
- OCR bunker detection (see FEATURE_OCR_LANDSCAPE.md)
- Landscape editing mode
- Security Phase 3: server-side admin verification (see SECURITY.md)
- WCAG contrast audit
- OffscreenCanvas heatmap optimization

# 📦 BACKLOG (see IDEAS_BACKLOG.md — do NOT implement without instruction)
- Tournament tendencies, Paintball IQ, body count analysis
- Dark/light toggle, settings page, colorblind UI
- Export CSV/Excel, print layout
- Practice tournament type

# ✅ COMPLETED (April 2026 session)
- Premium design system: unified headers, Card bg=#0f172a, radius=12px
- CC redesign: HomePage, TournamentPage, ScoutedTeamPage, TeamsPage, LayoutDetailPage
- Coaching stats: computeCoachingStats.js with correct definitions
- Point summary cards: Option C (accent bar + stats + mini field)
- BunkerEditorPage: /layout/{id}/bunkers
- Lines & Zones config modal
- BallisticsPage: /layout/{id}/ballistics  
- Calibration zoom fix (image aspect ratio)
- Layout canvas full-height (maxCanvasHeight)
- Swap sides fix (nextFieldSideRef)
- RosterGrid horizontal scroll pills
- Heatmap header redesign (LIVE=scouting style, FINAL=colored)

# 🔧 BUGS / POLISH
- OCR scan: "invalid x-api-key" — user needs to re-enter valid Anthropic API key
- Ballistics engine: bunker occlusion may be inaccurate (needs testing with real data)
- Wizard step 3 (OCR): needs proper Anthropic key to test

# 📋 BACKLOG
- Practice tournament type: coach picks players freely
- Concurrent scouting (homeData/awayData real-time)
- Ballistics Phase 2: risky shots (exposure to multiple opponents)
- Ballistics Phase 3: shots over low obstacles
- Ballistics Phase 4: arc/blind spot shots
- Break analyzer module (see BREAK_ANALYZER_SPEC.md)
- Print tactic from ActionSheet
- Danger/sajgon zone polygon drawing UI (currently only clearable)
