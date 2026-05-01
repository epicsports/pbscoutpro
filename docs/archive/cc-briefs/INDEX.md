# CC Briefs Archive — Index

Historyczne briefy implementacyjne dla Claude Code. Wszystkie zostały zaimplementowane i zdeployowane na main. Trzymane jako reasoning artifacts — nie używać jako aktywne task specs.

**Source of truth for live decisions:** `docs/DESIGN_DECISIONS.md`, `docs/PROJECT_GUIDELINES.md`.

## By topic

### Auth / Identity
- **CC_BRIEF_AUTH_SCOUT_RANKING.md** — email/password auth + scout leaderboard + missing-data TODOs.

### Design system + UI foundation
- **CC_BRIEF_PREMIUM_REDESIGN.md** — premium dark theme, design tokens rollout.
- **CC_BRIEF_UNIFIED_HEADERS.md** — consistent page header pattern (PageHeader).
- **CC_BRIEF_STYLE_AND_TEAM_PAGE.md** — global styling pass + teams page redesign.
- **CC_BRIEF_NAV_FIXES.md** — nav padding + misc navigation bug fixes.
- **CC_BRIEF_TAB_NAVIGATION.md** — bottom tab navigation (Scout / Coach / More).
- **CC_BRIEF_STATUS_SYSTEM.md** — match/point status pills (LIVE / FINAL / CLOSED / SCHED).
- **CC_BRIEF_I18N.md** — PL/EN translations scaffolding.

### Layout + field
- **CC_BRIEF_LAYOUT_WIZARD.md** — 3-step layout creation wizard (Basic Info → Calibrate → Vision Scan).
- **CC_BRIEF_LAYOUT_REDESIGN.md** — LayoutDetailPage single-scrollable redesign (Part 2).
- **CC_BRIEF_LAYOUT_SCOPE.md** — layout-level analytics scope toggle.
- **CC_BRIEF_TACTIC_REDESIGN.md** — tactic editor scouting-style redesign.

### Match + scouting
- **CC_BRIEF_MATCH_FLOW.md** — match review with split-tap cards, no side picker.
- **CC_BRIEF_MATCH_OPTIONS_AND_DUAL_COACH.md** — match menu + concurrent scouting (chess model).
- **CC_BRIEF_QUICK_LOGGING.md** — fast point logging without canvas.
- **CC_BRIEF_QUICK_SHOTS.md** — zone toggles, obstacle play, small player indicators.
- **CC_BRIEF_QUICKLOG_VISUAL_REDESIGN.md** — KIOSK-style player tiles + tablet 3-col + zone emoji toggles + ⋮ menu actions (§ 58).
- **CC_BRIEF_TRAINING_MODE.md** — training sessions with squads + drag & drop.
- **CC_BRIEF_PRACTICE_AND_SCOUT_RANKING.md** — practice mode simplified + scout ranking integration.

### Analytics / insights
- **CC_BRIEF_COACH_SUMMARY.md** — ScoutedTeamPage coach view (insights engine, stats, player cards).
- **CC_BRIEF_COACH_LANGUAGE.md** — Sławek-style coach brief language adaptation.
- **CC_BRIEF_COUNTER_SUGGESTIONS.md** — tactical counter plan generated from insights.
- **CC_BRIEF_LINEUP_ANALYTICS.md** — pair/trio win-rate analytics.
- **CC_BRIEF_COMBINED_ANALYTICS.md** — cross-tournament layout analytics.
- **CC_BRIEF_TEAM_STATS_CARDS.md** — team-level stats cards.
- **CC_BRIEF_DATA_CONFIDENCE_BANNER.md** — banner showing scouted data completeness.
- **CC_BRIEF_PLAYER_STATS_HERO.md** — PlayerStatsPage + HERO rank amber glow.

### More tab + account
- **CC_BRIEF_MORE_TAB_ACTIONS_AND_ACCOUNT.md** — More tab actions + account settings.

### Observability
- **CC_BRIEF_FEATURE_FLAGS_AND_SENTRY.md** — feature flag system + Sentry error tracking.

## Related

- **CC_BRIEF_BOILERPLATE.md** (in `docs/`, NOT archived) — template for new briefs.

## Process

New CC briefs go through this lifecycle per `docs/DESIGN_DECISIONS.md` § 37.3:

1. Brief drafted → may live in repo root during active implementation (referenced from `NEXT_TASKS.md`).
2. After PR merged + deployed → brief moves to this folder (`docs/archive/cc-briefs/`) in the same commit as the `DEPLOY_LOG.md` entry.
3. `NEXT_TASKS.md` gets a `[DONE]` marker pointing to the archived path.
