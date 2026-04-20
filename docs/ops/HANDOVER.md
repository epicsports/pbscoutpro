# Session Handover — PbScoutPro

> **Purpose:** Living state-of-the-project for Opus chats (architect / strategy sessions). Read this before drafting any CC brief or making decisions about direction.
>
> **This replaces the static 2026-04-15 snapshot** (old version history accessible via `git log docs/ops/HANDOVER.md`). New model: updated at the end of every Opus session via a patch committed to this file.

**Last updated:** 2026-04-20 by Claude Code (post `chore/docs-cleanup` merge)
**Live app:** https://epicsports.github.io/pbscoutpro
**Repo:** https://github.com/epicsports/pbscoutpro
**Main HEAD at last update:** `eb0f247`

---

## 🚧 Currently in flight

**Nothing active.** All branches from this session merged to main and deployed. No stacked work-in-progress branches.

Next active work starts when Jacek drops the next brief.

---

## 🚢 Recently shipped (last 7 days — 2026-04-13 → 2026-04-20)

Chronological, newest first:

| Date | Deploy commit | Summary |
|---|---|---|
| 2026-04-20 | `eb0f247` | **Documentation cleanup** — root reduced 14 → 4 `.md`, new `docs/{architecture,ops,product,archive/audits}/`, `CC_BRIEF_*` archived (28 files + INDEX), doc discipline codified (PROJECT_GUIDELINES §10, DESIGN_DECISIONS §37) |
| 2026-04-20 | `e11e845` | **Player Self-Report MVP Tier 1** — FAB + HotSheet bottom sheet in MatchPage, shot schema extension (`source: scout/self`), `breakoutVariants` team pool, email-based player identity (`useSelfLogIdentity`), onboarding modal in MainPage. Firestore collection group indexes deployed |
| 2026-04-19 | (polygon SHA) | **Unified polygon zone editor** — Google-Maps-style drag/midpoint-insert/delete for Danger/Sajgon/BigMove zones, iOS Safari magnifier suppressed via non-passive touch listeners + CSS callout disable |
| 2026-04-19 | (multi-branch merge) | **Notes + Big Moves + Kluczowi gracze refinements** — 3 branches merged together: Coach Notes subsystem (NotatkiSection + UnseenNotesModal), Big Moves user-drawn zone + detection, Kluczowi gracze multi-key sort + weak-data banner, section renames ("1. Breakouty" → "Rozbiegi") + Lucide icons |
| 2026-04-19 | (training fix) | **Training match navigation hotfix** — PlayerStatsPage match-history now respects `isTraining` flag |
| 2026-04-18 | `0f4ef8a` | **Coach Brief View** — ScoutedTeamPage redesigned to Sławek's 4 priorities above fold (Breakouty, Strzały, Tendencja, Kluczowi gracze), confidence banner, `<SideTag>` canonical component |

See `DEPLOY_LOG.md` for fuller entries with known-issues notes.

---

## 🎯 Next on deck (priority order)

### 1. Player Self-Report Tier 2 + Integrations (deferred from MVP session)
- "Mój dzień" section in `PlayerStatsPage` (own points list, completion status, Tier 2 edit modal for killer/notes)
- Shot accuracy section per player (top targets, hit rate, filter by layout/tournament/global)
- `ScoutedTeamPage` hybrid view when scouted team is own team (self-reported shots layer alongside scout data)
- Tactic page shot suggestions (if current tactic schema supports shots — needs confirmation before brief)
- Rationale: Tier 1 lives now but flywheel payoff comes from letting players see their own data

### 2. Validate Tier 1 on iPhone before Tier 2
- Still blind-coded UI — no Playwright test on device yet
- Thresholds (5 / 20) may need tuning
- Breakout collapse animation may need polish
- Could block Tier 2 if fundamentals need rework

### 3. User-reported F-bugs (from April PXL weekend)
- **F3: Quick shots dual mode** — brief exists (`docs/archive/cc-briefs/CC_BRIEF_QUICK_SHOTS.md`), check if fully shipped vs partial
- **F4: Sample size indicator** — tournament team cards (`CC_BRIEF_TEAM_STATS_CARDS.md` — archived, verify shipped)
- **F5: Self-scouting / counter analysis** — partially addressed by SelfLog hybrid view; may need own brief
- **F6: Tournament profiles** — per Jacek may be solved by quick shots dual mode
- **F7: Training data → break selection** — adjacent to SelfLog flywheel; wait for data to accumulate first

### 4. BreakAnalyzer module
- Specs exist: `docs/architecture/BREAK_ANALYZER_SPEC.md` + `docs/architecture/BREAK_ANALYZER_DOMAIN_v2.md`
- Implementation scaffolded but needs tuning against real field data
- Opus territory per NEXT_TASKS.md (`don't touch src/workers/ballisticsEngine.js`)

### 5. Tournament tendencies analytics
- Cross-tournament lineup/player patterns
- Blocks on: sufficient scouted data volume + SelfLog maturity

### 6. Security Phase 3 — server-side admin verification
- Client-side admin check today (`jacek@epicsports.pl` email match in featureFlags)
- Needs Cloud Functions or Firebase Rules refactor — Jacek mentioned this as pre-full-refactor item

---

## ⏸️ Awaiting decision (needs Jacek input)

| Topic | Question | Blocks |
|---|---|---|
| **`PlayerSelfReportV4.jsx` mockup** | Provide mockup or accept extrapolated UI as-is? Brief referenced it across 2 sessions but never landed in repo | Polish pass on Tier 1 + Tier 2 UI |
| **Coach / scout role system** | Today uses existing `workspace.role` (coach/viewer/admin). Do we need explicit scout role + per-match-subject permissions? Flagged in Coach Notes commit | Tier 2 edit permissions (who can edit which self-log / add killer) |
| **Tactic schema shots support** | Current tactic schema does NOT carry shots per-position. Add shot field to tactics, or skip tactic-page suggestions? | Commit 3 SelfLog Integrations (tactic suggestions task) |
| **F5 vs F6 vs F7 priority** | Three user-reported features with overlapping scope. Which is most-important pre-NXL Czechy 2026-05-15? | Which brief gets written next |
| **BreakAnalyzer ship date** | Module scaffolded but needs tuning. Block NXL release on it, or defer post-NXL? | Engineering capacity allocation |
| **Security refactor scope** | Full rewrite or incremental? Cloud Functions cost implications | Sequencing vs NXL deadline |

---

## 🏛️ Architecture decisions reference

Long-form architecture docs live in `docs/architecture/`. Opus should read the relevant one before drafting specs touching that area.

| Doc | Topic | When to read |
|---|---|---|
| [`BALLISTICS_SYSTEM.md`](../architecture/BALLISTICS_SYSTEM.md) | Euler integration, hitboxes, 3-channel visibility | Anything touching `src/workers/ballisticsEngine.js` or BallisticsPage |
| [`BREAK_ANALYZER_SPEC.md`](../architecture/BREAK_ANALYZER_SPEC.md) | BreakAnalyzer Phase 1 spec | Before BreakAnalyzer feature work |
| [`BREAK_ANALYZER_DOMAIN_v2.md`](../architecture/BREAK_ANALYZER_DOMAIN_v2.md) | Domain vocabulary + constants (companion to SPEC) | Same as above |
| [`BUNKER_RECOGNITION.md`](../architecture/BUNKER_RECOGNITION.md) | NXL 2026 bunker taxonomy (15 types), shape classification | Before Vision scan, bunker editor, or shape-aware features |
| [`HALF_FIELD_SPEC.md`](../architecture/HALF_FIELD_SPEC.md) | Mirror system (master + computed mirrors), `computeMirrors()`, calibration transform | Before FieldCanvas changes or bunker storage schema |
| [`PLAYER_SELFLOG.md`](../architecture/PLAYER_SELFLOG.md) | Two-tier model, unified shots collection, synthetic coords, flywheel thresholds | Before Tier 2 / Integrations work |
| [`TACTIC_WORKFLOW.md`](../architecture/TACTIC_WORKFLOW.md) | Tactic editor scouting-style flow, second position (bump), curve cycling | Before tactic page changes |

---

## 📐 Recent design decisions

`docs/DESIGN_DECISIONS.md` holds 37 sections. Most recent (newest first):

| § | Topic | Date | Notes |
|---|---|---|---|
| 37 | Documentation discipline | 2026-04-20 | Where decisions live, CC brief lifecycle, chat-is-not-SoT rule |
| 36 | Adaptive picker thresholds | 2026-04-20 | Breakout < 5, shots < 20, weighted hit=2/miss=1/unknown=0.5 |
| 35 | Player Self-Report UI patterns | 2026-04-20 | Two-tier model, FAB, bootstrap collapse, cycle-tap shots, outcome colors, shared variants |
| 34 | Field Side Representation Standard | 2026-04-18 | `SideTag` canonical component, `COLORS.side.*`, terminology (dorito/snake/center) |
| 33 | User Accounts + Scout Ranking | 2026-04-15 | Email/password auth, scout leaderboard |
| 32 | Training Mode | 2026-04-14 | Squads (R/RG/RB/RH), drag-drop, matchups reuse MatchPage |
| 31 | Bottom Tab Navigation — App Shell Redesign | 2026-04-14 | Scout / Coach / More, tournament picker |
| 30 | Metric Formulas | 2026-04-14 | Coaching stats + performance + kill attribution formulas |
| 27 | **Apple HIG Compliance — MANDATORY** | 2026-04 | Touch 44px, elevation, amber = interactive only, anti-patterns. MUST READ before any UI work |

Sections 1–26 cover foundational decisions (canvas, match page, tournament page, teams page, data model, delete pattern, layout wizard, ballistics, concurrent scouting, coaching stats, point summary cards, obstacle shots, player stats, HERO rank, scout/coach toggle, coach team summary redesign). Full list at `grep '^## [0-9]' docs/DESIGN_DECISIONS.md`.

---

## 🔄 Update protocol

**At the end of every Opus chat** (or Claude Code session that changes direction):

1. Patch **this file** with changes in:
   - "Currently in flight" (new branch? complete?)
   - "Recently shipped" (add row to table if something deployed)
   - "Next on deck" (promotions / demotions / new tasks)
   - "Awaiting decision" (add new blockers / mark resolved)
   - "Recent design decisions" (add row if §N+1 appended to DESIGN_DECISIONS)

2. Bump **Last updated** date + author + **Main HEAD at last update**.

3. Commit: `chore(docs): update HANDOVER.md — <summary of changes>`

4. If Opus chat generated a new patch for `DESIGN_DECISIONS.md` or `PROJECT_GUIDELINES.md`, ship that patch in the same or adjacent commit, before the chat ends (per § 37.2 / § 10.3 chat-is-not-SoT rule).

**Rule of thumb:** this file should be the first thing a fresh Opus chat reads to get situational awareness. If it's stale, fix it before asking Opus anything strategic.
