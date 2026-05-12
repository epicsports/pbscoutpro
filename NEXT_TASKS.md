# NEXT TASKS — For Claude Code
## Read docs/DESIGN_DECISIONS.md + docs/PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-05-14 evening by CC (schedule auto-match diagnosis open overnight, NXL Czechy 2026-05-15)
**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). English UI labels.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`

---

# 🟢 ACTIVE — Pre-NXL Czechy 2026-05-15

**🟡 OPEN — Schedule CSV workspace auto-match shows 0 hits (diagnosis pending Jacek input).**

Feature shipped `d4653ef` 2026-05-14 but real-data test surfaces all teams as unmatched. Workspace teams visible in dropdowns (so data is reachable) — predicate isn't firing. Three hypotheses (cache, name mismatch, divisions field absent) ranked + diagnostic steps in `docs/ops/HANDOVER.md` § Currently in flight. **Wait for Jacek to compare a CSV vs workspace name character-by-character before coding** — don't ship the normalizer speculatively. If hypothesis 2 confirms: branch `feat/schedule-auto-match-normalize`, single-file change in `ScheduleCSVImport.jsx::findWorkspaceMatches` adding NFC + whitespace-collapse + quote-strip as a fallback pass after the strict match (strict first to avoid false positives).

**Brief A — Pre-NXL Refinements** — shipped 2026-05-12 (merge `36104cb`, § 60 in DESIGN_DECISIONS, brief archived).
**Brief B — Deaths Heatmap v2** — shipped 2026-05-12 (merge `a5bb51e`, § 61 in DESIGN_DECISIONS, brief archived). iPhone smoke test on production still owed; coord-frame check (§ 61.8) most critical. See `DEPLOY_LOG.md` 2026-05-12 Brief B row for 10-step walkthrough.
**Schedule CSV + workspace auto-match** — shipped 2026-05-13 (`5b1e15f`) + 2026-05-14 (`d4653ef`). Auto-match diagnosis open above.

---

# 🔴 POST-NXL — Queued

Items deferred until after NXL Czechy 2026-05-15. Higher-risk or
dependent on architectural decisions (sparing rozkmina).

## User feedback from Jacek 2026-05-12 — moderate/risky tier

- **SCOUT #1:** Roster picker should filter per-tournament roster (currently shows parent + all child teams). Need CC discovery on data flow before fix.
- **SCOUT #2:** Self-log FAB icon visible when it shouldn't be. Need CC discovery — pin down where gating fails. Distinct from earlier Issue #4 (PPT picker training-only).
- **SCOUT #3:** Cache leak between scouted points — viewing point N then scouting new point loads N's data into draft. Likely `useEffect` cleanup bug in MatchPage. Critical for scouting integrity.
- **SCOUT #4:** Partial save — save break without point outcome. Schema change (`point.status='partial'`). Coordinate with sparing architecture rozkmina.
- **SCOUT #5:** Concurrent scouting side flip for "lazy scout" rotating 4 teams (AvB then CvD on alternate points, scout stays one side). Overlaps with existing `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md` — verify status with CC first; may already be addressed.
- **SCOUT #7:** Completeness table moved to bottom of scouting view above END MATCH, collapsed by default.
- **COACH #5:** Strzelanie percentage formula refactor (denominator = N×5 − runners − undeclared = 100%). Independent ticket from COACH #4 (banner shipped in Brief A).
- **NEW ACCOUNT #1:** Onboarding hang — new user gets stuck on player profile match modal. App should work without matched profile. **Critical UX for new user funnel.**

## Pre-existing roadmap (from prior planning sessions)

- **Auto-swap regression** — `outputs/CC_BRIEF_AUTO_SWAP_REGRESSION.md`. **Verify status with CC** — may have shipped post-2026-04-28; if not, brief still valid. Gates SCOUT #5.
- **Security-roles-v2 finish** — branch `feat/security-roles-v2`. Commits 1+2 done (foundation + PBleagues onboarding + Settings UI). Pending: Commit 3 (View Switcher), Commit 4 (Firestore rules + cleanup), smoke tests, merge.
- **Sparing architecture rozkmina** (Issues #3 + #6 from prior session) — 5 product decisions needed: collection affiliation, sticky-state localStorage keying, wizard host resolution, copy/UI context assumptions, events unification. Gates PPT picker fix, sparing implementation, and player claim flow brief.
- **Events architecture decision** — unifying training/tournament/sparing: Model A (status quo, separate collections), Model B (single `events` collection), or Model C (lightweight `events_index`). Sub-decision within sparing rozkmina.
- **Player motivation claim flow brief** — mockup approved 2026-05-02 at `outputs/player_claim_flow_mockup.html`. Brief TBD post-sparing.
- **Self-log Phase 1b** — propagator / matcher / conflict resolver. Deferred post-sparing.
- **`ARCHITECTURE_C4_v2.html` + § 38 in DESIGN_DECISIONS** — needs CC discovery pass against real production code before diagramming. Blocked on desktop session with GitHub connector.
- **Tier D security items** — custom claims, per-pid selfReports ownership, `/users` global read, adminUid create-time validation. Post-MAX explicit defer.

## Features (longer-horizon backlog)

- **BreakAnalyzer module** — Phase 1 spec at `docs/architecture/BREAK_ANALYZER_SPEC.md`. Implementation scaffolded but needs tuning vs real field data. Opus territory.
- **Tournament tendencies** — team / lineup / player level analytics. Blocks on sufficient scouted data volume + SelfLog maturity.
- **F5: Self-scouting + counter analysis** — partially addressed by SelfLog hybrid view; may need own brief.
- **F6: Tournament profiles** — per Jacek may be solved by quick shots dual mode (verify).
- **F7: Training data → break selection** — adjacent to SelfLog flywheel; wait for data to accumulate first.
- **Practice tournament type** — ad-hoc lineups, no player history impact.

---

# 📦 BACKLOG (see `docs/product/IDEAS_BACKLOG.md` — do NOT implement without instruction)

Dark/light toggle, settings page, colorblind UI toggle, undo stack,
tactic templates, direct manipulation drag, export CSV/Excel, print
layout with overlays, OffscreenCanvas heatmap, SharedArrayBuffer ballistics,
remaining ARIA/WCAG, haptic feedback, keyboard shortcuts, Paintball IQ,
body count analysis, agentic counter explanations, onboarding tunnel,
competitive analysis.
