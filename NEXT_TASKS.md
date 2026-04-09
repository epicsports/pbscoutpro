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
- Screen redesigns: tournament page, side picker, match summary
- UI: dots menu, ActionSheet, delete confirmations, layout in addTournament
- Premium design system: unified headers, Card bg=surfaceDark, SectionLabel, ResultBadge, Score, CoachingStats components
- All pages redesigned: HomePage, TournamentPage, ScoutedTeamPage, TeamsPage, TeamDetailPage, LayoutDetailPage
- Coaching stats: computeCoachingStats.js with correct dorito/snake/disco/zeeker/center/danger/sajgon definitions
- Point cards redesigned: Option C (accent bar + stats + mini field preview)
- Swap sides fix: nextFieldSideRef as source of truth
- Roster pills: horizontal scroll with full nicknames
- BunkerEditorPage: /layout/:id/bunkers (scouting-style naming and typing)
- BallisticsPage: /layout/:id/ballistics (tap to see visibility overlay)
- Lines and Zones config: modal with disco/zeeker sliders + danger/sajgon clear
- Calibration: tap + sliders + zoom panel aspect ratio fix
- Tactic page redesign: scouting-style editor, freehand drawing, ✏️ button on bottom bar
- Zone drawing UX: tap-on-release (not tap-on-start), quick danger↔sajgon toggle
- Child team picker fix: division filter includes child teams matching parent division

# 🔨 IN PROGRESS
- Layout wizard: CC_BRIEF_LAYOUT_WIZARD.md (not started)
- Ballistics Phase 1: fix visibility accuracy (page exists, engine may have bugs)

# 📋 FUTURE (not started)
- Concurrent scouting: homeData/awayData split, side claim with uid, dual-write, merge view
- OCR bunker detection fix (API key issue — user needs valid Anthropic key)
- Landscape editing mode
- Security Phase 3: server-side admin verification
- WCAG contrast audit
- OffscreenCanvas heatmap optimization
- Ballistics Phase 2-4: risky shots, low obstacle shots, arc shots
- Break planning, prediction engine

# 📦 BACKLOG (see IDEAS_BACKLOG.md — do NOT implement without instruction)
- Tournament tendencies, Paintball IQ, body count analysis
- Dark/light toggle, settings page, colorblind UI
- Export CSV/Excel, print layout
- Practice tournament type
