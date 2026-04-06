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
