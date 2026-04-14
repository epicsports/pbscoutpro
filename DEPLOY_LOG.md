# Deploy Log

## 2026-04-15 — Tab Navigation + Training Mode (CC)
**Commits:** cc2324d → 0698653 (20 commits pushed)
**Status:** ✅ Deployed to GitHub Pages
**Auth note:** Remote URL refreshed with a new `contents: write` PAT
(prior token was fetch-only). Old entry below preserved for history.

---

## 2026-04-15 — Tab Navigation + Training Mode (CC, pre-deploy)
**Commits:** cc2324d → 65f0d4e (19 local commits)
**Status:** ❌ Blocked on push auth — PAT in remote URL has fetch-only scope
**What changed:**
- TAB_NAVIGATION (8 parts): AppShell + MainPage + Scout/Coach/More tab
  extraction + TournamentPicker + NewTournamentModal + routes. HomePage
  and TournamentPage deleted; `/tournament/:tid` route removed; all
  back-nav references updated.
- Fallout fixes: ScoutedTeamPage and TacticPage back buttons pointed at
  the deleted /tournament/:tid route.
- TRAINING_MODE (7 parts): new `trainings` collection with cascading CRUD,
  TrainingSetupPage (Who's here roster picker), TrainingSquadsPage (drag
  & drop 2-4 squads), TrainingPage (matchup list with scout entry),
  TrainingResultsPage (leaderboard sorted by played → win% → diff),
  NewTournamentModal Tournament/Training type selector, TournamentPicker
  merged list with cyan Training badge, PlayerStatsPage training scope
  pill, MatchPage training adapter (synthesises tournament/match from
  training+matchup, skips concurrent/claim logic, ds wrappers for
  addPoint/updatePoint/deletePoint/updateMatch/deleteMatch).

**Known issues:**
- ⚠️ Auth blocker: `git push origin main` returns "Invalid username or
  token. Password authentication is not supported for Git operations."
  The fine-grained PAT embedded in the origin URL can fetch but not
  push. Refresh the token (contents: write) or switch to a credential
  helper before re-running `git push origin main` + `npm run deploy`.
- PlayerStatsPage global-scope training aggregation is a no-op — only
  `scope=training&tid=<trainingId>` walks matchups. Adding a global
  training walk needs a trainings list helper in dataService.
- MatchPage claim writes still use `ds.updateMatch` directly (guarded by
  `if (!isTraining)` so they never run in training mode). Harmless, but
  worth revisiting if the claim code is refactored.
- Training delete-matchup button (⋮) in TrainingPage is a direct delete
  with ConfirmModal; no password gate since workspace password only
  protects tournament-level deletions.

## 2026-04-14 23:00 — Bug fixes + feature session (Opus direct)
**Commit:** 003a5fb
**Status:** ✅ Deployed
**What changed:** Score colon visibility, removed ⋮ dots, Done/Save toggle, auto-redirect home, quick shot indicators, scout button fix, bump flow, run lines, player stats W/L/+-, kill attribution, bunker matching, formula corrections, Apple HIG compliance docs
**Known issues:** None critical

---
_CC: append new entries above this line_
