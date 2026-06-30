## Opus session protocol

On open:
1. Read `docs/ops/HANDOVER.md` + `NEXT_TASKS.md`.
2. `git log -10` (verify main HEAD). If the GitHub connector is unavailable this session
   (e.g. non-desktop), authoritative HEAD = **CC's git-log report** — do NOT assert HEAD
   from memory, do NOT skip the check.
3. `recent_chats n=5` for session continuity; `conversation_search <keywords>` when a
   specific past topic is referenced.

On close: patch `docs/DESIGN_DECISIONS.md` / `docs/PROJECT_GUIDELINES.md` /
`docs/ops/HANDOVER.md` before chat ends (§37).

---

## 📚 Documentation map (updated kwiecień 2026)

When referencing docs, use these paths:

| Topic | Path |
|---|---|
| UI patterns + product decisions | `docs/DESIGN_DECISIONS.md` |
| Build conventions + anti-patterns | `docs/PROJECT_GUIDELINES.md` |
| CC autonomy / merge gate (canonical) | `CC_AUTOPILOT_ENVELOPE.md` (root) |
| **Backlog (THE only work list)** | `BACKLOG.md` (root) — others archived in `/_archive/` |
| **Code reality (routes/ui/data/tokens/flags)** | `APP_MAP.md` (root) — read BEFORE designing/building |
| **How we work (workflow, render-proof, comms)** | `OPERATING_AGREEMENT.md` (root) |
| § 27 executable review checklist | `docs/REVIEW_CHECKLIST.md` |
| System architecture (long-form) | `docs/architecture/{NAME}.md` |
| Ops / setup | `docs/ops/{NAME}.md` |
| Product vision + feedback | `docs/product/{NAME}.md` |
| Active task queue + canonical board | `NEXT_TASKS.md` (root) — **single source of truth for actionable open work**, kept current on every doc-closeout. Open bugs from DEPLOY_LOG/HANDOVER must be promoted here; never let an actionable item live only in those two files. |
| Deploy log | `DEPLOY_LOG.md` (root) |
| Archived CC briefs | `docs/archive/cc-briefs/` |
| Archived audit snapshots | `docs/archive/audits/` |

**When making a decision during chat** — do not leave it only in chat. Append to `docs/DESIGN_DECISIONS.md` § N+1 (UI/product) or `docs/PROJECT_GUIDELINES.md` § 10 (doc discipline) before the chat ends. New architecture docs go to `docs/architecture/`. See `docs/DESIGN_DECISIONS.md` § 37 for full rules.

**When implementing a CC brief** — after PR merged + deployed, move the brief to `docs/archive/cc-briefs/` in the same commit as the `DEPLOY_LOG.md` entry. Update `NEXT_TASKS.md` with `[DONE]` marker + archived path.

---

## 🧵 Active workstream — "Point as Timeline" (Punkt jako Oś czasu)

Charter: `docs/POINT_AS_TIMELINE.md`. **D1–D3 LOCKED:** workspace-private; **augment, event-sourced** (keyframe #0 = existing atomic point + additive delta `timeline[]` keyed by `slotIds`) — **never replace** `homeData/awayData`; self-log/kiosk = Stage 7, **not** a prerequisite. **Scout = priority source.** events A/B/C + PPT picker + claim flow live in **Stage 7, NOT a blocker** for scout-side Stages 2–6. **Current = Stage 2** (phase-spine + end-state, scout-side, additive). Read the charter first; don't re-invent.

---

## 🔴 MANDATORY READS — before ANY code change

Every session, before writing a single line of code, you MUST:

1. Read `docs/archive/audits/CURRENT_STATE_MAP.md` (historical audit snapshot; may be stale — cross-check recent commits)
2. Read `docs/product/VISION.md` (strategic context)
3. Read `docs/product/FEEDBACK_EXTRACT.md` (user voice)
4. Read `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG Compliance) IN FULL
5. Read `docs/PROJECT_GUIDELINES.md` sections relevant to your task
6. Read the active CC brief listed in `NEXT_TASKS.md` (archived briefs live in `docs/archive/cc-briefs/`)
7. Read `docs/REVIEW_CHECKLIST.md` IN FULL

Before writing code, you MUST confirm by quoting to the user:
- 3 specific § 27 rules relevant to this task
- 1 anti-pattern from § 27 you will avoid

If you skip this confirmation and start coding, the user will reject the work.

## 🔴 MANDATORY POST-IMPLEMENTATION

After implementing, BEFORE every commit:

1. Run `npm run precommit` — must pass
2. Self-review against `docs/REVIEW_CHECKLIST.md` section by section
3. Report to user in this exact format:

```
§ 27 self-review:
Color discipline: [PASS / violations: ...]
Elevation:        [PASS / violations: ...]
Typography:       [PASS / violations: ...]
Cards:            [PASS / violations: ...]
Navigation:       [PASS / violations: ...]
Anti-patterns:    [ZERO / found: ...]
Verdict:          [READY TO COMMIT / NEEDS FIXES]
```

Only commit if verdict is READY TO COMMIT.

---

# PbScoutPro — Project Context for Claude Code

## 🧮 MODEL ROUTING (repo-committed — cheap routine / Opus for heavy)

Cost discipline by model, configured in the repo (not chosen by hand). Authoritative
Claude Code mechanism: `model` in `.claude/settings.json` (main session) + `model`
frontmatter in `.claude/agents/*.md` (subagents). There is **no built-in
complexity auto-router** — routing = these rules + delegation.

- **Main session = Opus 4.8** (`.claude/settings.json` → `"model": "opus"`). The main loop
  is the architect/intake: reality-pass, briefs, task-breakdown, `owner=ARCH`, `🔴`,
  non-trivial debugging — all run here on Opus. Keep them in-session (or via Opus agents).
- **Routine → cheap subagents** (committed in `.claude/agents/`):
  - **`routine-runner`** (`haiku`) — run build / lint / precommit / tests / e2e / app-map /
    screenshots and report pass-fail; simple grep/read sweeps. Pure "execute & report".
  - **`refactor-hand`** (`sonnet`) — scoped, pre-decided code edits: mechanical refactor,
    wiring an existing component, i18n string moves, small clear bugfixes, dead-code removal.
- **Routing rule:** when work is "run a known command / find X" → delegate to `routine-runner`;
  when it's "execute this precise change spec" → delegate to `refactor-hand`; when it needs
  judgement/design/architecture/root-cause → keep it on Opus (this session) or an Opus agent.
  Tie between cheap and Opus → **Opus** (a wrong cheap build costs more than the Opus tokens).
- Subagents omitting `model` inherit the parent (Opus). Explore/general reality-pass agents
  therefore already run Opus by inheritance — good; only *routine* is pinned down.
- **Optional (not enabled):** a Haiku "triage-on-input" that classifies each task simple/hard
  and escalates only hard ones to Opus is possible but adds a hop + latency and isn't a native
  feature; we default to these explicit rules. Revisit if routine volume justifies it.

## 🤝 MULTI-AGENT WORKFLOW

**Three roles, repo + Jacek as the comms layer.**
- **CC (Claude Code) = implementer.** Executes briefs. Never writes briefs. Never decides
  architecture. Never resolves architectural ambiguity autonomously → ESCALATE TO JACEK.
- **Opus = architect + brief author + decision synthesizer.**
- **Jacek = product owner + final GO.**

**Merge / deploy authorization is governed by `CC_AUTOPILOT_ENVELOPE.md` (repo root) —
the canonical, blast-radius gate:** GREEN = hands-free to merge · AMBER = one pre-merge
gate · RED = full Jacek GO at every checkpoint. Tier can only ratchet UP; uncertain →
treat as the higher tier. (Firebase-side ops are governed separately by the
Firebase-autonomy policy below.)

**Autonomy that IS yours (CC), scoped:** within a single GO'd brief, implement its steps
without pausing for per-step approval; fix your own build breaks; choose reasonable
implementation details and note them in the commit. The boundary: autonomy WITHIN a GO'd
brief's scope — never ACROSS tasks, architecture, the merge gate, or the app-deploy gate.

### CC — on every session
1. `git pull origin main`
2. Read the MANDATORY READS for your task
3. Read the ACTIVE brief named in `NEXT_TASKS.md` (archived briefs in
   `docs/archive/cc-briefs/` are reasoning artifacts, not active specs)
4. Do NOT pick your own task. Do NOT start work without a brief + GO.

### CC — on every task (within a GO'd brief)
1. Read the brief FULLY before coding
2. Implement one part at a time
3. `npx vite build 2>&1 | tail -5` (must pass)
4. `npm run precommit` (must pass)
5. Commit on the feature branch → push the branch
6. Then act on the task's tier per `CC_AUTOPILOT_ENVELOPE.md`: **GREEN** → merge;
   **AMBER** → report READY + one pre-merge gate; **RED** → report READY, wait for Jacek GO.
   Never run `npm run deploy` by hand (main-push auto-deploys, e2e-gated).

### CC — on a mergeable tier (GREEN, or AMBER/RED after GO)
1. `git checkout main` → `git merge --no-ff <branch>` → `git push origin main`
2. `npm run deploy`
3. Append to `DEPLOY_LOG.md`
4. Move the brief to `docs/archive/cc-briefs/` + mark `[DONE]` in `NEXT_TASKS.md` in the
   same commit

### If a brief is ambiguous or requires breaking a `PROJECT_GUIDELINES.md` rule
STOP and escalate to Jacek. Do NOT make the call yourself.

---

## 🔥 FIREBASE AUTONOMY — POLICY

**Technical boundary = none; this is convention.** The admin-SDK service-account key
(`C:\Users\JacekPARCZEWSKI\Desktop\dk\pbscoutpro-firebase-adminsdk-fbsvc-f745a08b88.json`,
parent dir of the repo) + firebase CLI 15.18 authe CC as *owner* of prod project
`pbscoutpro`. There is no technical gate — CC can read, run --live migrations, and deploy
rules + indexes. The boundary below is discipline, not enforcement.

- **Autonomous, no GO:** admin-SDK reads; `--dry` migration runs;
  `firebase deploy --only firestore:indexes` (additive). NOTE: the Firebase daily quota
  is a *time-gate, not a permission-gate* — if throttled, back off and report; do not
  retry-storm.
- **Authorized by task-level GO:** `--live` migrations and
  `firebase deploy --only firestore:rules` — but ONLY the specific ops the GO'd brief
  enumerates. The brief's GO is the authorization; no separate per-command confirmation.
- **Hard ESCALATE (never autonomous, even mid-GO'd-task):**
  (a) any `--live` DELETE or rules change NOT enumerated in the current GO'd brief —
  STOP and escalate, do not improvise;
  (b) any change to a **tenant-isolation rules predicate** gets an explicit in-brief
  CONFIRM checkpoint before deploy — blast radius is tenant-to-tenant.

Canonical Firebase-autonomy policy. The §90.7.2 checkpoint in `HANDOVER.md` is the dated
historical record; do not restate the policy elsewhere (§37.4).

---

## 📋 TASK QUEUE
**Work through these in order. Skip tasks marked ✅.**

1. ✅ **`CC_BRIEF_AUTH_SCOUT_RANKING.md`** — DONE: email/password auth + scout ranking + issues TODO
2. ✅ **`CC_BRIEF_QUICK_LOGGING.md`** — DONE: fast point logging, no canvas
3. ✅ **`CC_BRIEF_COUNTER_SUGGESTIONS.md`** — DONE: tactical counter plan from insights
3. ✅ **`CC_BRIEF_TAB_NAVIGATION.md`** — DONE: bottom tab nav (Scout/Coach/More)
4. ✅ **`CC_BRIEF_TRAINING_MODE.md`** — DONE: training sessions with squads + drag & drop
5. ✅ **`CC_BRIEF_MATCH_FLOW.md`** — DONE: split-tap cards, review view, no side picker
6. ✅ **`CC_BRIEF_QUICK_SHOTS.md`** — DONE: zone toggles, obstacle play, player indicators
7. ✅ **`CC_BRIEF_COACH_SUMMARY.md`** — DONE: insights engine, stats, player cards
8. ✅ **`CC_BRIEF_PLAYER_STATS_HERO.md`** — DONE: PlayerStatsPage, HERO toggle, amber glow

**All CC_BRIEF_*.md files now live in `docs/archive/cc-briefs/` (per DESIGN_DECISIONS §37.1). Archived briefs are reasoning artifacts — do not use as active task specs.**

---

## 📦 ALREADY SHIPPED (do not reimplement)
- Premium design system + dark theme + Apple HIG compliance
- Bottom tab navigation (Scout/Coach/More) with tournament picker
- Training mode (who's here, squad builder drag&drop, matchups, results)
- Quick Logging mode (roster → tap winner → next, no canvas)
- Counter Suggestions (tactical counters from opponent insights)
- Formation consistency insight (predictable/unpredictable detection)
- Quick Shots (zone toggles + obstacle play + small player indicators)
- Coach team summary (insights engine + stats + player cards)
- Player Stats Page + HERO rank system + full profile (bunkers, shots, kills)
- Kill attribution engine + bunker matching
- Fifty bunker detection (Snake 50 / Dorito 50 instead of generic)
- Player metrics: W/L/+- per player, matchesPlayed, bunker, position
- Point summary bar (removed — was redundant)
- Bump flow (toolbar ⏱ — saves position, clears player, re-place)
- Run lines from base to players
- Runner+eliminated = triangle with skull
- Tournament settings + Close tournament in More tab
- Practice mode simplified (no league/division/year)
- Match review with split-tap point cards
- Concurrent scouting (shared shells, side-safe writes)
- Layout wizard (3-step: Basic Info → Calibrate → Vision Scan)
- Ballistics engine (shape-aware ray casting, Web Worker)
- Bunker editor + Vision scan
- Landscape immersive mode

---

## What this is
Paintball xball scouting app. React 18 + Vite + Firebase Firestore. Deployed to GitHub Pages.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run deploy` — build + deploy to GitHub Pages
- `npm run precommit` — run ALL checks before committing
- `npx vite build 2>&1 | tail -5` — quick build check

## ⚠️ PRE-COMMIT RULE
**Run `npm run precommit` before EVERY commit.** It catches:
- Build failures
- Polish strings in UI (must be English)
- Raw HTML controls (must use shared components from ui.jsx)
- Touch targets below 44px
- Debug artifacts (console.log, debugger)
Fix all errors before committing.

**e2e SCOPING (cost discipline):** run ONLY the specs that exercise what you changed + the
relevant golden/parity spec — NOT the full ~116 suite per iteration (that's the CI deploy
gate's job on main-push). e.g. a `MatchPage`/scout chrome/canvas change = `matchpage-modes` +
`capture-parity` golden via `npm run test:e2e -- --grep "matchpage-modes|capture-parity"`.
And never report "render-verified" if the render harness only reached the login screen — see
`CC_AUTOPILOT_ENVELOPE.md` Verification. Full rule = the envelope (canonical).

## Architecture
- **One FieldCanvas component** renders field everywhere
- **Inline JSX styles** — no CSS modules, no Tailwind. Use COLORS/FONT/TOUCH from `src/utils/theme.js`
- **Layout is source of truth** — bunker data, calibration, zones on layout doc
- **Web Worker** for ballistics (DO NOT modify physics logic)
- **Component reusability mandatory** — all behavior in shared components/hooks

## Key files
- `src/utils/theme.js` — design tokens
- `src/services/dataService.js` — all Firestore CRUD
- `src/components/FieldCanvas.jsx` — main canvas
- `src/components/ui.jsx` — shared UI components
- `src/components/AppShell.jsx` — bottom tab bar wrapper
- `src/components/TournamentPicker.jsx` — tournament/training selector
- `src/components/QuickLogView.jsx` — fast point logging (no canvas)
- `src/pages/MainPage.jsx` — app root with tabs + EditTournamentModal
- `src/pages/PlayerStatsPage.jsx` — full player profile
- `src/pages/ScoutedTeamPage.jsx` — coach team summary + counter plan
- `src/pages/Training*.jsx` — Setup, Squads, Training, Results pages
- `src/utils/generateInsights.js` — insight engine + player summaries + counters
- `src/utils/playerStats.js` — per-player stat computation
- `src/utils/coachingStats.js` — coaching statistics
- `src/components/field/drawPlayers.js` — player rendering
- `src/components/field/drawQuickShots.js` — shot indicators (two rings)
- `src/components/field/touchHandler.js` — canvas touch/mouse handling

## Conventions
- English UI labels everywhere
- Mobile-first: min 44px touch targets
- All coordinates normalized 0-1
- Commit messages: imperative mood, prefix feat/fix/refactor
- Branch → push → Jacek GO → checkout main → merge --no-ff → push → DEPLOY_LOG → npm run deploy. No gh CLI, no PR workflow.

## Git
```bash
git config user.name "Claude Code"
git config user.email "code@pbscoutpro.dev"
```

## Domain
Paintball xball: 5v5, sprint from bases to bunkers at buzzer.
See docs/architecture/BREAK_ANALYZER_DOMAIN_v2.md for full context.
See docs/architecture/BUNKER_RECOGNITION.md for bunker identification.
