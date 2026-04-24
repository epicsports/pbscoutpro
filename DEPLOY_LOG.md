# Deploy Log

## 2026-04-24 — Step 5 sticky + Coach live-score + PPT unlinked-mode (feat/coach-parity-step5-sticky-ppt-unlinked-2026-04-24)
**Commit:** `fa2f15c` (merge of `feat/coach-parity-step5-sticky-ppt-unlinked-2026-04-24`, 3 commits)
**Status:** ✅ Deployed (GitHub Pages + Firestore rules redeploy via `firebase deploy --only firestore:rules`)

Three follow-ups bundled into one ship — two cheap symmetry fixes from prior briefs, plus the deferred PPT unlinked-mode (option (a) from the relax-player-linking Checkpoint 1 audit, option B → option A upgrade).

**Fix 1 — `ed1d524` Step 5 "Zapisz punkt" CTA pinned to viewport bottom.** § 48.3 spec called for "Sticky footer: amber Zapisz punkt CTA (64px, checkmark icon)" but implementation rendered the button inline at the end of the summary card — on dense summaries the CTA scrolled off viewport. Same pattern as the Step 3 fix from `34755ce`: `position: fixed` + safe-area inset + gradient fade + 120px spacer to keep the last summary row scrollable into view.

**Fix 2 — `f0bfbe8` Coach live-score parity via shared `useLiveMatchScores`.** P0 Fix 1 (commit `629edc8`) explicitly noted CoachTabContent as a symmetry follow-up — Coach tab cards showed `0:0` for in-flight LIVE matches between Brief 9 Bug 2's write-side change and end-of-match merge. Extracted `useLiveMatchScores` from `ScoutTabContent.jsx` into `src/hooks/useLiveMatchScores.js` (single source of truth) and wired CoachTabContent to use it. Hook call placed BEFORE the `if (!tournament) return` early return — Rules of Hooks compliant by construction (the React #310 crash that bit ScoutTabContent in `950ab79` doesn't recur).

**Fix 3 — `e94aafa` PPT unlinked-mode (option A from Checkpoint 1).** Players who haven't yet linked a workspace player profile can now open PPT and log points; reports go to a new uid-keyed pending collection and migrate to the canonical player path on link.

- **New collection** `/workspaces/{slug}/pendingSelfReports/{auto-id}` with `uid` field for ownership. **Firestore rule** (deployed via `firebase deploy --only firestore:rules`): create gates on `request.resource.data.uid == request.auth.uid`; read/update/delete gate on `resource.data.uid == request.auth.uid`. No coach visibility (drafts by definition); no collection-group entry for `getLayoutShotFrequencies` (crowdsource includes only canonical selfReports). Once migrated, docs become regular selfReports under `/players/{pid}/selfReports/`.

- **Service** (`playerPerformanceTrackerService.js`):
  - `createPendingSelfReport(uid, payload)` — write to pending path
  - `getTodaysPendingSelfReports(uid)` — today's drafts
  - `migratePendingToPlayer(uid, playerId)` — batch move (200/batch with per-doc fallback if a slice fails); strips `uid` field on write since canonical schema doesn't carry it (path's pid IS the owner)
  - `onPlayerLinked(uid, playerId)` — terminal post-link helper: flushes local offline queue (uid namespace) directly to canonical path, then runs `migratePendingToPlayer`, then clears uid queue
  - Existing `createSelfReport(playerId)` signature unchanged

- **Offline queue + sync hook** (`pptPendingQueue.js`, `usePPTSyncPending.js`): functions gain `mode` param (`'player'` | `'uid'`) so player and uid queues live under separate localStorage namespaces (`ppt_pending_saves_<id>` vs `ppt_pending_saves_uid_<id>`). Default `'player'` preserves existing behavior — no localStorage migration needed.

- **`usePPTIdentity`**: returns `uid` alongside `playerId`; `teamTrainings` returns ALL workspace trainings when unlinked (no team affiliation yet, but user should be able to log against any LIVE training and have it migrate later). Linked behavior unchanged.

- **UI**: hard guard `if (!playerId) return <empty/>` removed from `PlayerPerformanceTrackerPage`; new guard bails only when neither `playerId` nor `uid` exists (auth missing, AuthGate catches upstream). `WizardShell` accepts `uid` prop, `handleSave` branches between `createSelfReport` and `createPendingSelfReport`. `TodaysLogsList` reads from `getTodaysPendingSelfReports` when unlinked. New "unlinked banner" (translucent-amber surface matching the offline-pending banner pattern) renders on both wizard + list view; tap → `/profile`.

- **Step 1 / Step 3 pickers UNCHANGED** — they already short-circuit to bootstrap mode when `playerId` is null. Unlinked users always see all bunkers; mature mode kicks in only post-link + accumulating ≥5 player-history logs OR ≥20 layout crowdsource shots.

- **Migrate-on-link** wired into both link paths: `ProfilePage.handleClaim` (after `ds.selfLinkPlayer` succeeds) and `PbleaguesOnboardingPage.handleSubmit` (after `ds.linkPbliPlayer` succeeds). Best-effort: failures don't roll back the link itself (link is the user-visible win); on partial failure, unmigrated docs stay in pending and can be manually retried by re-linking.

- **i18n**: 2 new keys (PL+EN) — `ppt_unlinked_banner` / `ppt_unlinked_banner_cta`.

**Spec deviations:**
- Coach hook extraction was implied by "symmetry fix" but not strictly required — done because two near-identical hooks would have drifted. Single hook now serves both tabs.
- PPT unlinked banner uses translucent-amber background (matches the existing offline-pending banner) rather than a separate elevation; § 27 anti-pattern avoidance for "decorative" elevation. Banner IS interactive (tap → /profile) so amber is justified.
- `teamTrainings` for unlinked users returns ALL workspace trainings (not filtered by team). Alternative would have been to disable PPT for unlinked users (defeats the purpose) or to require team-pre-pick (extra step). Showing all is the simplest path; once linked, the existing team filter restores.

**Acceptance scenarios:**
- Unlinked user opens PPT → picker shows all workspace trainings → pick → wizard → save → `pendingSelfReport` written ✓
- Unlinked banner visible on wizard + list, tap navigates to /profile ✓
- User links via ProfilePage → `onPlayerLinked` migrates pending docs to `/players/{pid}/selfReports/` + clears local queue ✓
- Coach analytics + crowdsource pickers see migrated reports (path is now canonical) ✓
- Existing linked users: zero behavior change (default mode='player') ✓
- React #310 crash fix from `950ab79` survives — `useLiveMatchScores` placement in CoachTabContent verified above all early returns ✓

**Known issues:**
- Migration is per-link, not per-doc retry. If `onPlayerLinked` fails partway, docs remain in pending until next link attempt (which would re-trigger). Adequate for the invited-workspace model; production-grade would be a Cloud Function trigger on `players/{pid}.linkedUid` change.
- Unlinked users see ALL workspace trainings in the picker — could be noisy in workspaces with many concurrent teams. Acceptable trade-off for v1; if Jacek wants it filtered, a "for me / any" toggle on the picker is cheap.
- `pendingSelfReports` documents are NOT included in `getLayoutShotFrequencies` collection-group queries — the crowdsource picker won't see unlinked users' shots until they link. Trade-off vs. attack surface (anonymous unauthenticated docs polluting the layout heatmap). Documented.

## 2026-04-24 — Relax player linking (feat/relax-player-linking-2026-04-24)
**Commit:** `83c929b` (merge of `feat/relax-player-linking-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes, no data migration)

P0 URGENT — real users reported they could not self-link to a player profile from ProfilePage → "Połącz z profilem gracza". Blocker for PPT adoption because PPT requires `linkedPlayer` to function.

**What changed:** Replaced the legacy substring matcher in `LinkProfileModal.jsx` (two bugs: `#` not stripped from input; `(p.pbliId || p.pbliIdFull)` short-circuit hid pbliIdFull when pbliId was set) with a 4-priority cascade matcher + confirmation gate + skip-link fallback + write-side normalization + PPT empty-state polish.

**New util — `src/utils/pbliMatching.js`:**
- `normalizePbliInput(raw)` — strips `#`, removes all whitespace, lowercases. Stricter than the existing `normalizePbliId` in roleUtils which only strips leading `#` + trims. Both sides (DB + input) go through it.
- `extractPbliFirstSegment(normalized)` — returns first segment of dash form (`61114-8236` → `61114`).
- `matchPlayersByPbli(normalized, players)` — 4-priority cascade: P1 exact pbliId / P2 exact pbliIdFull / P3 first-segment for dash input / P4 substring ≥6 chars. Capped at 5.
- `matchPlayers(query, players)` — single entry point: empty query → alphabetical unlinked roster; PBLI-ish input → cascade; alpha-only input → nickname/name substring (legacy browse behavior preserved).

**LinkProfileModal rewritten** as a 3-state in-place swap (no nested modals): **list** (search + cascade output) / **confirm** ("Czy to ty?" card with avatar + name #number + team + PBLI + `[Nie, szukaj dalej]` / `[Tak, to ja]`) / **no match** ("Nie znaleźliśmy Cię w bazie" + `[Spróbuj ponownie]` / `[Pomiń na razie]`). **Confirmation is ALWAYS required before write**, even on exact PBLI match — prevents the wrong-profile-click failure mode that the matcher alone can't solve. Skip-link CTA closes the modal unlinked; user can retry later from ProfilePage.

**Defensive write-side normalize:** `PlayerEditModal.handleSave` + `CSVImport.parseRows` now pipe `pbliId` through `normalizePbliInput` before writing. Keeps future data clean so the cascade's exact-equality priorities stay pinpoint.

**PPT empty-state polish:** The "no player linked" screen at `PlayerPerformanceTrackerPage.jsx:163` previously showed a single muted text line. Now surfaces a proper card (emoji + title + body) above a prominent amber `Połącz teraz` CTA routing to `/profile`. One-tap path for users blocked here.

**Admin Členkowie panel (§ 50.4):** picks up the same cascade + confirmation via the shared `LinkProfileModal`. Admin also gets the confirm gate — correct default (same risk of wrong-profile click).

**i18n:** 10 new keys across `link_profile_confirm_*`, `link_profile_nomatch_*`, `ppt_no_player_linked_*` namespaces (PL + EN).

**Spec deviations from brief (option B chosen, confirmed by Jacek):**
- PPT unlinked MODE (logging without a player link) intentionally DEFERRED. Data-model + rules scope per Checkpoint 1 audit (~2-3h on top): new `/users/{uid}/selfReports/{sid}` rule + dual-write service path + dual-read hook merge + migration-on-link logic. Shipping matching/confirm/skip-link first matches Saturday priority; unlinked-mode is a follow-up brief if real users complain about "can't log pre-link".
- Priority 5 name-similarity (Levenshtein/fuzzy) skipped — existing nickname/name substring (Priority 4 equivalent for alpha input) covers the realistic use case; Levenshtein is overkill for v1.

**Acceptance scenarios verified via code read + test prep:**
- `61114` → P1 hit → confirm → linked ✓
- `61114-8236` → P2 (if pbliIdFull) or P3 (first-segment) hit ✓
- `#61114` / `#61114-8236` → normalized → matches ✓
- ` 61114 ` → whitespace stripped → P1 ✓
- `999999` (nonexistent) → zero hits → skip-link fallback UI ✓
- `Jacek` (alpha) → nickname substring → candidates ✓
- `ds.selfLinkPlayer` transaction still throws `ALREADY_LINKED` on race — preserved.

**Known issues:**
- PPT still requires a linked player to function — empty-state now gives a clear path but doesn't enable logging without link. Deferred per option B scope.
- Write-side normalize changes PlayerEditModal input semantics slightly: a value like `#61114` typed by admin is persisted as `61114`. Existing DB values untouched (no migration). Matcher handles both shapes, so admin edits still land correctly regardless.
- Confirmation gate adds one extra tap for admin bulk-linking in Členkowie. Acceptable trade-off vs wrong-profile-click risk. If admin-bulk becomes a real workflow, a `quickMode` prop on `LinkProfileModal` is cheap to add.

## 2026-04-24 — Critical scouting crash fix (hotfix/scouting-react-310-crash-2026-04-24)
**Commit:** `bbad249` (merge of `hotfix/scouting-react-310-crash-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

P0 BLOCKER for Saturday tournament usage. Tournament Scout view crashed with React #310 ("Rendered more hooks than during the previous render") immediately on open. Crash report screen + Reload App button only — entire scouting flow unreachable.

**Root cause:** P0 Fix 1 (commit `629edc8`, `fix(scout): compute live score from points subcollection`) added two new hook calls (`useMemo(liveCandidateIds)` + `useLiveMatchScores(...)` — itself a wrapper containing `useState` + `useMemo` + `useEffect`) to `ScoutTabContent.jsx` at lines 223 / 227, *below* the existing `if (!tournament) return <EmptyState …/>` early return at line 141. On first render with `tournament` still undefined (subscription bootstrap), only the ~17 hooks above the guard ran. Once `tournaments.find(t => t.id === tournamentId)` resolved on the next snapshot, the component blew past the guard and ran the two extra hooks → React's hook-count assertion fired. Classic Rules-of-Hooks violation, undetected because the original P0 Fix 1 likely never opened the page on a cold-start render where tournament wasn't already cached.

**Fix:** hoist `filtered` (plain const) + the two live-score hooks above the `if (!tournament) return` guard. Safe even when tournament is undefined — `resolvedDivision` falls back to 'all', `matches` is the empty subscription bootstrap, and `useLiveMatchScores` no-ops on empty matchIds (it has its own `if (matchIds.length === 0) return` guard). Removed the now-duplicate computation that lived below the guard. **Functional behavior unchanged**: classify() still reads liveScores + falls back to cached scoreA/B; live/scheduled/completed buckets still render correctly; P0 Fix 1's actual feature (live score from points subcollection + LIVE/Scheduled classification) preserved end-to-end. **No revert needed**.

**Audit:** Other recently-touched scouting files inspected for the same pattern. CoachTabContent's early return (line 86) is correctly placed AFTER all hook calls. CompletenessCard's single `useMemo` is unconditional. No other violations found.

**Reproduction before fix:** tournament → tap Scout tab → React error boundary screen with "Reload App" CTA (URL `/`).
**Reproduction attempt after fix:** same path → renders Live / Scheduled / Completed buckets normally.

**Known issues:** None. Single-line-shift fix; build clean; precommit clean.

## 2026-04-24 — PPT hotfix follow-up (Step 1 dedup + Step 3 sticky CTA)
**Commit:** `34755ce` (direct to main, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

Two follow-ups landed by Jacek's same-day iPhone validation of the PPT hotfix batch (`31c1f7d`).

**Fix A — Step 1 (breakout) bunker dedup.** Mirror of the Step 3 fix from `61aa528` into `Step1Breakout.jsx`'s local `bunkerListFromLayout`. Same root cause class noted as a known follow-up in the prior deploy log entry: layout.bunkers can carry duplicate entries per positionName (legacy docs without `role` field, BunkerEditorPage master+mirror persistence with shared name). Step 1's mature path was already safe via the byName Map in `top6`, but bootstrap (cells = sortedBunkers) showed the same twin-cell bug Step 3 did. First-write-wins dedupe by positionName, after the existing role==='mirror' + missing-name filters.

**Fix B — Step 3 "Dalej →" CTA pinned to viewport bottom.** § 48.3 spec calls for a "Sticky footer: amber Dalej CTA (64px, full-width)" but the implementation rendered the button inline at the end of the scrollable grid. On layouts with many bunkers the CTA scrolled off-screen mid-selection. Mirrors the TodaysLogsList "+ Nowy punkt" pattern: `position: fixed` + safe-area inset (`env(safe-area-inset-bottom)`) + gradient fade-in (functional separation, not decorative — § 27 PASS). 120px spacer reserves room under the footer so the last grid row remains scrollable into view; `zIndex: 20` keeps the footer above the slide-animation layer. Skip link ("Nic nie strzelałem →") stays inline above the spacer.

**Known issues:** None. Both fixes are scoped, pure UI/data, no rules or schema changes.

## 2026-04-24 — PPT hotfix batch (hotfix/ppt-training-sticky-shots-dedup-2026-04-24)
**Commit:** `31c1f7d` (merge of `hotfix/ppt-training-sticky-shots-dedup-2026-04-24`, 2 commits)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

Two PPT regressions discovered by Jacek's iPhone validation pre-Saturday training. P0 — both blocked real game-time use of the Player Performance Tracker. Batched into a single deploy per CC_BRIEF_PPT_HOTFIX_BATCH_2.

**Fix 1 — `fcb9e4e` PPT training selection now sticky per day via localStorage.** Pre-fix: `PlayerPerformanceTrackerPage` auto-routed to the wizard only when exactly one LIVE training existed; otherwise every "+ Nowy punkt" tap routed through the picker (`?pick=1`). With multiple LIVE trainings (or zero), the user re-selected the same training before every single point — unusable in a 15-second between-points window. New `src/utils/pptActiveTraining.js` (get/set/clear with `YYYY-MM-DD` date stamp) persists today's pick; entry logic adds `stickyTraining` as the highest-priority redirect target (beats `showList`, beats single-LIVE inference). `handlePickTraining` writes the sticky on user pick before navigating to the wizard. **Wizard save flow rewritten**: `handleSave` no longer navigates — it resets state to Step 1 in-place, bumps a local pill counter, and shows an inline toast. The next point is one tap away with zero round-trips. **Training pill becomes the "Zmień trening" affordance** (§ 27 discreet text hint, not a competing amber CTA): tap clears sticky + forces picker (`?pick=1`). Step 1 back arrow + exit chevron use a `?leave=1` flag so the user can actually exit the wizard without immediately bouncing back via the sticky-redirect; the flag suppresses auto-redirect for that visit while preserving sticky for the next "+ Nowy punkt" tap. Day boundary clears stale entries automatically (`getActiveTraining` checks `data.date !== todayISO()` and self-cleans). Closed/deleted training: `useMemo` resolves the saved `trainingId` against current `teamTrainings` and drops it if missing or `status==='closed'`. Added 4 i18n keys (PL+EN): `ppt_pill_change`, `ppt_pill_change_aria`.

**Fix 2 — `61aa528` shots picker (Step 3) bunker deduplication.** Pre-fix: every bunker rendered exactly twice in Step 3; tapping one (e.g. "Dog") lit up both order badges simultaneously (twin-badge symptom). Root cause: `bunkerListFromLayout` only filtered `b.role === 'mirror'`, but `layout.bunkers` can carry duplicate entries per `positionName` — legacy docs without a `role` field, or `BunkerEditorPage`'s persistence pattern that writes both master + mirror with shared `positionName`. `BunkerPickerGrid` keys order-badges by `positionName`, so two cells with the same name both selected on a single tap. Fix: defensive first-write-wins dedupe in Step 3's local `bunkerListFromLayout` — `Map` keyed by `positionName`, after the existing `role==='mirror'` + missing-name filters. Bootstrap path (cells = sortedBunkers) now never returns dupes; mature path was already deduped via the `byName` Map in `top6`. **Step 1 (breakout) intentionally untouched per brief acceptance criterion** — its mature path already dedupes; bootstrap path likely has the same latent bug but Jacek hits the mature branch in his testing (≥5 player breakouts logged), and tightly-scoped P0 fix matches the hotfix character. If Step 1 bootstrap shows dupes on Saturday, mirror this fix into `Step1Breakout.jsx`'s local helper.

**Spec deviations from brief:**
- Brief specified saving wizard state to `localStorage` separately from the day-stamp; we reused the existing `ppt_wizard_state_*` localStorage (cleared by `handleSave`) and only added `ppt_active_training` for sticky tracking. Cleaner separation: wizard state = in-progress draft (10min TTL); active training = day-bounded selection.
- Brief suggested adding "Zmień trening" as a separate small link in wizard header. Implemented as an extension of the existing training pill (added "ZMIEŃ" suffix label + 1px divider) — § 27 anti-pattern avoidance: a second link would have introduced a competing tappable surface adjacent to the pill. The pill itself is already the natural "this is the active training" indicator and was already tappable.
- Brief acceptance: "After saving a point, user returns to logging wizard (Step 1), NOT to 'Wybierz trening' picker". Achieved via in-place state reset rather than navigate-to-wizard-URL — avoids the `/player/log` flash + Firestore round-trip + URL-change race that would have happened with the navigate path.

**Known issues:**
- TodaysLogsList view is now reachable only via Step 1 back arrow (lands on `/player/log?leave=1`) since the page auto-redirects to wizard on every other entry path while sticky is active. Acceptable — pill counter shows `#N pkt dziś` inline so the user has running visibility on count.
- Step 1 bootstrap dedup latent bug remains (see above). Watch for at Saturday session.
- Inline wizard toast is local component state; hard refresh mid-toast loses it (vs the previous list-based toast which survived the navigation via `location.state`). 2.5s auto-dismiss reduces exposure.
- `getActiveTraining` is invoked inside a `useMemo` deps:`[teamTrainings]` — reads localStorage on every teamTrainings change. Cheap (single localStorage read + JSON.parse + Date string compare), no observable cost.

## 2026-04-24 — ProfilePage hotfix batch (hotfix/profile-page-regressions-2026-04-24)
**Commit:** `04ff7fc` (merge of `hotfix/profile-page-regressions-2026-04-24`, 3 commits)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

Three regressions on Mój profil surfaced by iPhone validation this morning, batched into a single deploy per brief CC_BRIEF_PROFILEPAGE_HOTFIX (Tier 1, 3 separate commits for clean history).

**Fix 1 — `a0af773` restore linked-player self-claim section (§ 49.8 Path A).** § 33.3 ProfilePage shipped 2026-04-23 with the self-edit form conditionally rendered only when `linkedPlayer` existed — users not yet linked had no UI path to claim themselves. Fix adds the missing unlinked-state surface: empty-state copy + "Połącz z profilem gracza" CTA that opens the admin `LinkProfileModal` (reused — the rules distinction is on the Firestore write side). Linked state unchanged except for a new "Rozłącz" row placed on a separate surface below the edit card so the Save CTA doesn't compete with a destructive action (§ 27 anti-pattern avoidance, follows § 50.3 Wyjdź pattern). Two new dataService functions: `selfLinkPlayer(playerId, uid)` (transactional, surfaces `ALREADY_LINKED` on races) and `selfUnlinkPlayer(playerId)` — both map exactly to self-link + self-unlink Firestore rule carve-outs shipped in § 33.3 + § 50.3, so **no rules change needed**. Inline i18n cleanup for admin-context labels (team / PBLI / role / class) so the section stops hardcoding Polish.

**Fix 2 — `04efb14` missing profile_roles_label + profile_player_* translations.** Root cause: `t('key') || 'fallback'` short-circuits to the raw key because a non-empty string is truthy, so the fallback pattern never fired for missing keys. Raw `profile_roles_label` was leaking to UI above the role chips. Adds the full dictionary set in PL + EN: `profile_roles_*`, `profile_player_*` family (including team/PBLI/role/class labels for the admin-managed context box), and `profile_claim_*` + `profile_unlink_*` for the self-claim flow added in Fix 1. Keys placed in the canonical "Profile / Account" block (second pl / en blocks); earlier-file-drift duplicates left untouched to avoid scope creep.

**Fix 3 — `1f989df` remove misplaced "Podgląd: Admin" floating pill (§ 50 direction).** ViewAsIndicator (§ 38.5) was rendering a floating bottom-right pill on every screen whenever an admin had impersonation state in sessionStorage. On iPhone it read as an active role-preview toggle that users couldn't figure out how to dismiss. Three surgical changes: (a) `<ViewAsIndicator />` removed from App.jsx + its import — no more floating pill anywhere. (b) `ViewAsContext` neutralised at runtime — `viewAs` always `null`, `setViewAs` no-op, previously-persisted sessionStorage cleared on mount so anyone stuck from before this deploy is unwedged on first load. Restore-path comment left for when feature is revived. (c) `ViewAsPill` in ADMIN section of `MoreTabContent` + `TrainingMoreTab` replaced with new `ViewAsPlaceholder` — MoreItem that opens a brief "Funkcja wkrótce" toast, matching § 50.1 row layout without a functional dropdown. Old `ViewAsIndicator.jsx` / `ViewAsPill.jsx` / `ViewAsDropdown.jsx` / `ViewAsPlayerPicker.jsx` left on disk untouched for easy revival — reviving = re-wire `ViewAsContext` useState/useEffect and restore the two mount points.

**Audit (brief's optional 15-min sweep for sibling regressions):** scanned `MoreTabContent`, `TrainingMoreTab`, `UserDetailPage`, `MembersPage`, `MatchPage`. No other sections deleted by the 2026-04-23 settings-reorg. § 33.3 ProfilePage code was intact; the regression was a *conditional render gap*, not a deleted component.

**Root cause note:** Fix 1's regression was present from § 33.3's original 2026-04-23 ship (`0da83b4`), not from the subsequent settings-reorg — the unlinked-state UI was simply never built. Fix 3's regression is latent sessionStorage impersonation state surfacing now; the feature itself has shipped since 2026-04-17 v1 / 2026-04-20 v2. Fix 2 was always broken — the translation keys existed nowhere in dict. Brief's suspicion that `feat/settings-reorg-nav-cleanup` deleted something is **not confirmed** — the underlying issues pre-date that refactor.

**Known issues:**
- Users already stuck with impersonation state from before this deploy get unwedged on first page load (effect clears `sessionStorage`), but cached bundles could delay this by a few seconds. Acceptable.
- ViewAs feature is dormant, not deleted. Admin temporarily loses the role-impersonation preview surface. Explicit spec deviation vs § 50.1 (which kept ViewAsPill functional in ADMIN); the hotfix brief updated § 50 direction toward a placeholder. DESIGN_DECISIONS § 50.1 table entry is now stale — follow-up edit to codify the placeholder-only state (or revive the feature).
- `navigate` import in ProfilePage.jsx remains unused (pre-existing, untouched).

## 2026-04-24 — Scout completeness section rebuild (feat/scout-completeness-rebuild)
**Commit:** `02752ae` (merge of `feat/scout-completeness-rebuild`, fast-forward — 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

**What changed:** Match view's two prior completeness surfaces (the inline 2-bar Breaks/Shots mini-summary inside the Points list block + the scout-only `ScoutScoreSheet` card) replaced with one canonical `CompletenessCard` (`src/components/scout/CompletenessCard.jsx`) visible to scout/coach/admin. Card shows all 5 ranking metrics + composite, exactly mirroring `ScoutDetailPage`'s drill-down — a 75% on this card equals a 75% on the ranking page.

**Metrics displayed (single source of truth via existing scoutStats):**
- Breaks (placed / totalSlots, 35% in composite)
- Shots (withShots / nonRunners, 20%)
- Przypisania / Assignments (assigned / placedForAssign, 20%)
- Biegacze / Runners (runnerFlagged / placedForRunner, 10%)
- Eliminacje / Eliminations (elimMarked / placedForElim, 15%)
- Ogólny wskaźnik / Overall (weighted composite using ranking weights)

Section title `Kompletność scoutingu` (PL) / `Scouting completeness` (EN). Eight new i18n keys added under `completeness_*` namespace.

**Color scale (4 tiers per brief):**
- ≥90% → `COLORS.accent` (amber/gold) + Star badge — celebrate
- 70-89% → `COLORS.success` (green)
- 50-69% → `COLORS.accent` (amber) — needs attention (no badge)
- <50% → `COLORS.danger` (red) + AlertTriangle badge — incomplete

**Data layer:** new `computeMatchBreakdown(points)` exported from `src/utils/scoutStats.js` — returns the full per-section row + composite for a single match (aggregates both `homeData` and `awayData` scouts' work). Existing `computeMatchCompleteness` refactored to a one-line wrapper around `computeMatchBreakdown` for `ScoutDetailPage` back-compat (composite pluck only).

**Files retired:**
- `src/components/match/ScoutScoreSheet.jsx` (256 lines) — deleted; was the scout-only 3-row variant with a different threshold scale on the same data. `scout_sheet_*` i18n keys kept (cheap, may be useful for future scout-only surfaces).
- Inline 2-bar mini-summary inside MatchPage's Points list block (~50 lines of inline computation) — deleted; data now part of the new card with consistent thresholds.

**Role gating:** previous state had two surfaces with split visibility (inline 2-bar = ungated, ScoutScoreSheet = scout-only). New card uses `hasAnyRole(roles, 'scout', 'coach') || isAdmin` — scout + coach + admin see card; pure-player + legacy-viewer see nothing.

**§ 27 exception flagged:** amber appears in two non-interactive roles (top celebration + middle warning). Differentiated by Star badge (top) vs no badge (middle) plus the percentage value itself. Precedent already set by `compositeColor()` in scoutStats.js using amber for the 60-79% tier on the ranking page. If strict-§27 alternative is wanted, swap mid-tier (50-69%) to `'#fb923c'` orange — single-line change in `tierFor()` inside CompletenessCard.

**Known issues / iteration flags:**
- ScoutScoreSheet's "Result" line (match outcome + score in human-readable form like "RANGER won 3:1") was deliberately dropped — score is already in the scoreboard card directly above. If anyone wants it back, fold it into the card footer.
- ScoutScoreSheet had a "breaks" row using bunker-distance threshold (different from ranking's `breakPct = placed/totalSlots`). The new card uses ranking semantics for cross-page consistency. The bunker-distance metric is no longer surfaced anywhere; if it's still useful, file a follow-up.

## 2026-04-24 — Shot cone visualization (feat/shot-cone-visualization)
**Commit:** `5db6a95` (merge of `feat/shot-cone-visualization`, fast-forward — 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

**What changed:** Shot rendering on scouting canvas (`drawQuickShots`) and match heatmap (`HeatmapCanvas`) switched from thin lines / ticks to angled cones (obstacle shots) or three radiating dashed radii (break shots). Geometry helpers extracted to `src/utils/shotGeometry.js` — `TEAM_DIRECTIONS` lookup (A: dorito -30°, center 0°, snake +30° / B mirrored: dorito 210°, center 180°, snake 150°), `shotDirectionDeg(zone, fieldSide, doritoSide)` resolver with viewport-mirror + top/bottom dorito flip, `tracePathCone(ctx, ...)` Canvas2D path builder, `getBreakShotDashEndpoints(...)`, and `vectorDirectionDeg(...)` for heatmap.

**Scouting canvas:** new `team` prop ('A' | 'B') controls cone color via TEAM_COLORS; radius `0.20 × min(canvas w, h)`; obstacle = 18% fill + 80% stroke (2px); break = 3 radial dashes from EXACT player center to 75% of cone radius (inside obstacle boundary, no edge collision); render order obstacle below + break dashes on top. `team` prop plumbed through FieldCanvas; MatchPage passes `activeTeam`.

**Heatmap:** per-shot direction = actual vector (sx-px, sy-py) — no zone quantization; data has no break/obstacle phase distinction (that lives only in scouting-side `quickShots`/`obstacleShots`), so all shots render as obstacle cones. Reduced parameters for aggregation context: radius `0.10 × min dim`, 7% fill / 55% stroke (1.5px). Existing heatmap density grid (warmth) preserved as functional aggregation signal — only the per-shot directional gradient line was replaced. Team B color migrated from teal `rgba(6,182,212,...)` to `TEAM_COLORS.B` (#3b82f6 blue) — aligns with § 49 unified team palette and the heatmap-toggle redesign that just shipped. Kill 💀 cluster layer untouched.

**Implementation deviation from brief:** SVG sweep-flag distinction (team A clockwise vs team B counter-clockwise) translated to Canvas2D as a no-op — `ctx.arc(cx, cy, r, a1, a2, false)` with `a1 < a2` naturally draws the SHORT arc bulging outward in the direction axis for both teams. Verified geometrically (commit message includes the proof). `tracePathCone` therefore takes no `team` param — simpler API, same visual output.

**Data layer:** zero changes. Shot data shapes (`quickShots` zone enum arrays + points-doc `shots` vector arrays) untouched. Scouting workflow, player rendering, bunker rendering, field lines all untouched.

**Known issues / iteration flags:**
- Cone radius `0.20` on scouting canvas may overcrowd in dense breakouts (Snake 50 + Snake 1 close together). Brief explicitly OK'd this tradeoff; tunable via single constant if iPhone testing finds it too dense.
- Heatmap radius `0.10` is much smaller than scouting; tunable independently if the aggregation visualization needs more presence.
- TacticPage / LayoutDetailPage / PlayerStatsPage also use FieldCanvas. They don't pass shot data through `quickShots`/`obstacleShots` so they're unaffected. If a future surface starts passing those, it'll get the new cone vocabulary automatically (default `team='A'` will pick red color — fine for those contexts since they're typically about a single team's shots).

## 2026-04-24 — Heatmap team A/B toggle redesign (feat/heatmap-toggle-redesign)
**Commit:** `acb28c7` (merge of `feat/heatmap-toggle-redesign`, fast-forward — 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

**What changed:** Team A / Team B positions+shots toggles on the match heatmap view restructured from a two-row stacked layout (with team-name capsules + amber-active chips) to a single row that mirrors the scoreboard card flexbox above the heatmap exactly: `[ Team A capsule (flex:1) ][ spacer (minWidth:110) ][ Team B capsule (flex:1) ]` — matching MatchPage.jsx:1184 scoreboard's `[ Left team flex:1 ][ Score zone minWidth:110 ][ Right team flex:1 ]`. Each capsule is a 44px tall segmented control (background `surfaceDark`, border + 10px radius) holding two chips ("Positions" / "Shots") with `flex:1` so they split the capsule width evenly. Chip active = full team color fill (red `#ef4444` for A, blue `#3b82f6` for B) + white text. Chip inactive = transparent + dim text + transparent border, "embedded" in the capsule. Team-name labels removed from the toggle row — the scoreboard card above already names the teams. 36px chip touch target (acceptable for analysis context per brief; capsule provides surrounding 44px hit area). Toggle on/off logic, `hmVisibility` state, and `onChange` callback all unchanged. i18n reuses existing `conf_pill_positions` ('Pozycje' / 'Positions') and `conf_pill_shots` ('Strzały' / 'Shots') — no new keys.

**Implementation deviation from brief:** Used flex (not the brief's `display: grid; grid-template-columns: 1fr auto 1fr`) because the scoreboard header card is itself flex with `flex:1 | minWidth:110 | flex:1`. Mirroring its actual layout achieves perfect alignment — this is what the brief's risk note explicitly anticipated ("If current header uses flex not grid, we need to match that pattern instead of forcing grid").

**Known issues:** None. Toggle component is presentation-only; logic + state contract preserved. No other components touched (header, FieldCanvas, page header, points list).

## 2026-04-24 — P0 micro-hotfixes batch (hotfix/p0-batch-2026-04-23)
**Commit:** `629edc8` (merge of `hotfix/p0-batch-2026-04-23`, fast-forward — 3 commits)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes in this batch)

**What changed (3 independent fixes batched into one deploy):**

- **fix(scout): match card shows correct score instead of `—:—` placeholder + LIVE/Scheduled classification fixed (commit `629edc8`).** Root cause was architectural, not a field-name bug as the brief hypothesized: Brief 9 Bug 2 / Option A (commit `da36f49`) deliberately stops `savePoint` from writing `match.scoreA/B` during LIVE play to avoid the coachUid-filtered subset race. Authoritative score only lands at end-of-match merge. Cards reading `m.scoreA/B` saw 0 until then.
  - Fix mirrors what MatchPage detail header does: extract local `matchScore({a,b})` to `src/utils/helpers.js` (replaces dead `{w,l,t,total}` export), add `useLiveMatchScores(tournamentId, matchIds)` hook in ScoutTabContent that subscribes to `subscribePoints` per non-closed match and reduces points via canonical helper. Listener lifecycle: unsubscribe on unmount AND on matchId-set change (sorted-join key prevents spurious resubs). Closed matches skip the listener — `match.scoreA/B` is already authoritative there. MatchCard accepts optional `liveScore` prop, prefers it over cached fields when present.
  - **Side effect: LIVE/Scheduled classification bug fixed (same root cause).** ScoutTabContent classifier (line 175) also depended on `m.scoreA/B > 0`, putting in-flight unmerged matches into the Scheduled bucket. Now uses `liveScores[id].count > 0` as primary signal with the cached fields as first-paint fallback.
  - **Listener cost:** ~1 listener per non-closed match in active tournament view. Typical tournament: 3-15 matches at any time. Acceptable.
  - **CoachTabContent untouched** — same bug applies but outside this hotfix's scope (brief targeted Scout tab). Follow-up if needed.

- **fix(match): removed side percentages (Dorito/Snake/Center) from heatmap view for all roles (commit `5bba54f`).** The `<CoachingStats>` block (admin/coach branch in MatchPage role-gated heatmap section) deleted entirely. Coaching tendencies belong on ScoutedTeamPage drill-down where aggregate sample size is meaningful, not on every match view (§ 27 content hierarchy). Scout-only `ScoutScoreSheet` (data completeness, different surface) preserved. Underlying `computeCoachingStats` function + `CoachingStats` UI component still alive — ScoutedTeamPage uses the function directly. Unused imports stripped from MatchPage.

- **fix(match): removed orphan `releaseClaim` call blocking back navigation (commit `69c2e2d`).** Two call sites in MatchPage.jsx (portrait header back handler line 1631 + landscape floating back button line 1687) referenced `releaseClaim()` after Brief F (2026-04-22 concurrent-scouting cleanup) had removed the function definition. Result: ReferenceError on tap-back, observed in Sentry 2026-04-22 21:19 UTC at `/tournament/.../match/...?scout=...&mode=new`. Both sites were pure cleanup orphans — Brief F retired the claim system (no longer needed under per-coach point streams from Brief 8 v2). The back-handler logic around them remains intact. Acceptance check: `grep -rn "releaseClaim" src/` returns zero.

**Known issues / iteration flags:**
- **CoachTabContent has the same `--:--` score bug** — same root cause, same fix would apply. Not in this hotfix's scope. Cheap follow-up if Jacek wants symmetry.
- **Listener density on large tournaments** — useLiveMatchScores subscribes one listener per non-closed match. A tournament with 50 active matches creates 50 listeners. Acceptable for typical tournament size; revisit if larger tournaments emerge.
- **Brief 9 Bug 2 architectural decision left intact** — `savePoint` still doesn't write `match.scoreA/B` per-write (race avoidance). The hotfix sidesteps the problem at read time rather than reverting the write-side decision.

## 2026-04-24 — Settings menu reorg + nav cleanup + Członkowie full UX (§ 50)
**Commit:** `0fe8739` (merge of `feat/settings-reorg-nav-cleanup`, fast-forward — 4 commits across 3 checkpoints)
**Status:** ✅ Deployed (Firestore rules via `firebase deploy --only firestore:rules` BEFORE client merge — 4 new carve-outs: workspace self-leave + player self-unlink + user admin-disable + the prior § 33.3 self-edit; app via `npm run deploy` GitHub Pages published)

**What changed:**
- **Settings menu restructured** to Jacek's exact six-section spec — SESJA / ZARZĄDZAJ / SCOUTING / WORKSPACE / KONTO / ADMIN. Strict per-section + per-item role gating per § 49 matrix. Tab label "More" → "Ustawienia" via new `tab_settings` i18n key; `TAB_DEFS` gains `labelKey` field.
- **WORKSPACE section** added Wyjdź flow (§ 50.3) — `ds.leaveWorkspaceSelf(uid)` wraps `removeMember` for self-call, `ConfirmModal` warns, last-admin guard disables button with tooltip. On success → useWorkspace.leaveWorkspace() clears local session → LoginGate takes over.
- **KONTO sign-out ungated** — was admin-only in old More tab, locking pure players out of explicit logout. Now visible to every role.
- **ADMIN section** consolidates ViewAsPill (relocated from KONTO) + Feature flags. Skipped brief's separate "Podgląd jako (placeholder)" item — `ViewAsPill` already IS that entry; would have created two identically-labeled rows.
- **ZARZĄDZAJ** stripped to Layouty/Drużyny/Zawodnicy. Scout ranking + my TODO moved to SCOUTING (matches Jacek's grouping).
- **TrainingMoreTab** mirrors the same restructure (helpers prefixed `Training*` to keep imports flat — § 50.7 marks DRY as a follow-up).
- **Legacy BottomNav.jsx deleted** (62 lines: Home/Layouts/Teams/Players object-based tabs) + mount removed from App.jsx. AppShell role-tab bar (Scout/Coach/Gracz/Ustawienia per § 49) is now the only bottom nav. **No legacy-route redirects added** — brief's redirect-to-Home premise was based on the assumption these would become dead routes; reality is all five remain reachable via Settings → ZARZĄDZAJ / SCOUTING. Bookmarked URLs continue to work.
- **Członkowie full UX** (§ 50.4) — new route `/settings/members/:uid` (`UserDetailPage.jsx`, AdminGuard wrapped) gives admin a deliberate-edit surface separate from MembersPage's inline chip toggles. Sections: Identity (avatar + name + email + UID + joined), Linked profile (with link/change/unlink), Roles (deliberate edit), Danger zone (soft-delete).
- **Admin link override** (§ 50.4) — new `LinkProfileModal.jsx` searches by nickname/name/PBLI, surfaces conflicts (already-linked players show conflicting user's email as subtext), atomic transaction `ds.adminLinkPlayer` clears stale uid links and sets new linkedUid + linkedAt. Existing `isCoach(slug)` rule branch covers writes — no rules change for linking.
- **Soft-delete** (§ 50.5) — `ds.softDisableUser(uid, byEmail)` writes `users/{uid}.disabled = true` + audit fields. AppRoutes bootstrap watches `userProfile?.disabled` (live onSnapshot already in useWorkspace) and renders `DisabledAccountScreen` — full-page "Konto wyłączone" + Wyloguj CTA. User can re-authenticate but bounces back. Re-enable button on UserDetailPage when target's disabled flag is true.
- **MemberCard** identity area now navigates to detail page on tap (admin viewers only; chips and ⋮ menu stay independent). Green dot next to name = "linked profile" indicator (replaces the brief's separate row idea, more compact).
- **Firestore rules** — 3 new carve-outs deployed:
  - `/workspaces/{slug}` self-leave envelope (was-in-members + now-not-in-members invariant)
  - `/players/{pid}` self-unlink (linkedUid was-self + now-null invariant)
  - `/users/{uid}` admin update via ADMIN_EMAILS allowlist (jacek@epicsports.pl), scoped to disabled/disabledAt/disabledBy/reEnabledAt fields
- **DESIGN_DECISIONS § 50** — 7 sub-sections documenting the full model (menu structure, nav cleanup, Wyjdź flow, detail page + linking, soft-delete, coach/staff N/A, follow-ups). Last-updated header bumped.

**Known issues / iteration flags:**
- **Soft-delete tied to ADMIN_EMAILS allowlist** — only Jacek can disable today; transferring admin to a different user wouldn't grant them this capability without code change. Per-workspace admin check requires custom claims (deferred).
- **Soft-delete is client-enforced only** — user can still authenticate against Firebase Auth (admin SDK not available client-side). Sufficient for invited-workspace model; not robust against hostile actors. True delete needs server work (§ 50.7).
- **No coach/staff profile entities** — brief speculated about linking users to coach/staff profiles. Not built; role IS the identity. Modal supports player linking only.
- **TrainingMoreTab DRY** — Scouting/Workspace/Account helpers duplicated with `Training*` prefix in MoreTabContent and TrainingMoreTab. Extract to a shared `<SettingsCommonSections />` if a third surface needs them.
- **Stale "above BottomNav" comments** in design-contract.js + ViewAsIndicator.jsx — describe spatial intent for any future bottom-anchored UI, not BottomNav specifically. Cosmetic cleanup deferred.

**Brief deviations from spec (Jacek's call to revise if needed):**
1. WORKSPACE row 2 has no row-body onClick — only the [Wyjdź] button does anything (avoids multi-CTA-on-card § 27 anti-pattern).
2. Skipped separate "Podgląd jako" placeholder — existing ViewAsPill IS that entry.
3. Skipped legacy URL redirects — pages stay reachable via Settings.
4. Sign-out ungated for pure-player (was admin-only — clear UX bug).

## 2026-04-23 — ProfilePage roles + linked-player self-edit (§ 33.3)
**Commit:** `0da83b4` (merge of `feat/profile-player-section`, fast-forward)
**Status:** ✅ Deployed — Firestore rules via `firebase deploy --only firestore:rules` (self-edit carve-out live before client merge); app via `npm run deploy` (GitHub Pages published).

**What changed:**
- **ProfilePage Roles section** — read-only `<RoleChips roles={roles} editable={false} />` rendered from `useWorkspace().roles` (canonical resolver). Empty-state copy when no workspace is active or roles array is empty. Pure players finally see *which* role(s) admin granted them.
- **ProfilePage Player data section** (NEW, conditional on `linkedPlayer`) — surfaces only when the active workspace has a player doc with `linkedUid === auth.uid`. Six editable fields: nickname, name, number, age, nationality (Select dropdown reusing `NATIONALITIES` exported from PlayerEditModal), favoriteBunker. Read-only context box below: team name (resolved via `useTeams`), `pbliIdFull`, `paintballRole`, `playerClass`. Save button disabled until dirty + valid (name + number both required).
- **Firestore rules self-edit carve-out** at `/workspaces/{slug}/players/{pid}` allow update — third `||` branch permits the linked user to mutate the 6-field whitelist (+ `updatedAt`) only. `linkedUid` invariant on both `resource` and `request.resource` blocks identity hijacking.
- **PhotoURL editor REMOVED** from avatar card per Jacek's interrupt: "drop the user link to photo — i have more players with their photos". A single user-doc photo doesn't fit the multi-player reality. Avatar still renders `auth.user.photoURL` if Firebase Auth provider supplied one (Google etc.); otherwise initial-letter fallback.
- **PlayerEditModal export** — `NATIONALITIES` changed from `const` to `export const` so ProfilePage's Select can reuse the same dropdown source.
- **Propagation** — rides existing `onSnapshot` subscriptions on the players collection. Edits land in MembersPage, PPT Gracz tab, scout ranking display names, training squad rosters within ~200ms — no new wiring.
- **DESIGN_DECISIONS § 33.3** — full design + rules carve-out + propagation + photoURL removal rationale documented.

**Known issues / iteration flags:**
- **Team / PBLI ID / role / class stay admin-only** by design — these are roster math, league identifier, and coach-curated tactical attributes. Players who need them changed still go through coach.
- **No avatar upload UX** — providers that don't supply `photoURL` (email/password) get the initial-letter fallback permanently. Per-player photos already work via PlayerEditModal; user-doc avatar is intentionally bare.

## 2026-04-23 — Unified auth + roles + tab visibility (§ 49) + PPT rules hotfix
**Commit:** (merge of `feat/auth-roles-unified`) — 3 commits across 4 checkpoints: `548a3bb` (user-doc schema + rules hotfix) + `470f227` (strict tab matrix + Gracz tab) + `8aa6cac` (§ 49 docs + NEXT_TASKS)
**Status:** ✅ Deployed — Firestore rules via `firebase deploy --only firestore:rules` at Checkpoint 2 (PPT selfReports unblocked); app via `npm run deploy` (GitHub Pages published).

**What changed:**
- **User-doc schema** — new signups land with `users/{uid} = { email, displayName, workspaces: [], roles: ['player'], defaultWorkspace: 'ranger1996', createdAt }`. Existing docs untouched (no migration per 2026-04-23 policy). Plural `roles` array is a fresh field — no overlap with the deprecated singular `role` string dropped in Brief G Option B § 33.1.
- **Constants:** `DEFAULT_WORKSPACE_SLUG = 'ranger1996'`, `DEFAULT_USER_ROLES = ['player']` in new `src/utils/constants.js`.
- **Canonical role resolver** (`useWorkspace.roles`): `workspace.userRoles[uid]` if non-empty → else `userProfile.roles` if non-empty → else `[]`. Workspace-scoped wins once admin touches the user.
- **Default-workspace auto-join:** `enterWorkspace(code)` mirrors `user.roles` into `workspace.userRoles[uid]` AND skips `pendingApprovals` when `slug === userProfile.defaultWorkspace` AND user has bootstrap roles. Non-default workspaces keep existing approval gate. "Auto-join, nie auto-login" — user still enters the code manually.
- **Strict tab matrix** (replaces § 47 permissive): Scout requires `['scout']`, Coach requires `['coach']`, Gracz (NEW, icon 🏃) requires `['player']`, More always visible (admin-only items inside still gated). Coach no longer auto-grants Scout tab; admin assigns 2 roles if needed. Multi-role users see union.
- **Gracz tab** — key `'ppt'`, positioned between Coach and More. Tap routes `navigate('/player/log')`; not persisted to localStorage. Satisfies Brief E Option 2 (PPT reachability) — wchłonięte here.
- **Viewer role retired** from active matrix. `ASSIGNABLE_ROLES = ['admin', 'coach', 'scout', 'player']` new export drives RoleChips rendering. `ROLES` (5-role constant) kept for legacy data parsing. Existing viewer users keep their role until admin reassigns via Members page — no automatic migration.
- **`isPurePlayer` predicate simplified** in MoreTabContent + TrainingMoreTab: `!effectiveIsAdmin && !hasAnyRole(roles, 'coach', 'scout')`. One-liner captures player, legacy-viewer, and empty-roles bootstrap users.
- **Admin panel (Path A verified)** — MembersPage already works end-to-end. RoleChips renders 4 roles. `updateUserRoles` writes `workspace.userRoles[uid]` (canonical). Live propagation via existing useWorkspace onSnapshot.
- **PPT Firestore rules hotfix** (§ 48 was shipped without them — default-deny was blocking all PPT writes in prod):
  - `/workspaces/{slug}/players/{pid}/selfReports/{sid}` — read=isMember, create|update|delete=isPlayer
  - Root-level collection-group `/{path=**}/selfReports/{sid}` — authenticated read (for getLayoutShotFrequencies)
- **DESIGN_DECISIONS § 49** — 11 sub-sections documenting the full model (schema, auto-join, resolver, matrix, Gracz tab, More gating, viewer retirement, admin panel, rules hotfix, migration policy, follow-ups).

**Known issues / iteration flags:**
- **selfReports ownership validation loose** — current rule gates on `isPlayer(slug)`, not on `pid` matching the caller's linked player. Tighter validation deferred per § 49.11; workspace-invited model contains attack surface.
- **workspace.userRoles self-write diff gap** (pre-existing, flagged in § 49.11) — existing self-join envelope rule allows a user to write arbitrary values to their own `userRoles[uid]`. Latent privilege-escalation risk; fix = field-value validation in rules. Not introduced by this brief.
- **Dual-path reader (workspace vs user-doc roles)** adds cognitive load. Full schema unification (Brief G proper) deferred to a dedicated off-hours migration window.
- **Existing viewer users** — admin reassignment needed to move them to one of the 4 assignable roles. Until then they see More-only (similar to pure-player).

**Brief E Option 2 DONE** via this brief's Gracz tab. NEXT_TASKS updated.

## 2026-04-23 — Player Performance Tracker (PPT) — full product (§ 48)
**Commit:** (merge of `feat/player-performance-tracker`) — 7 commits across 5 checkpoints: `5ba04c2` (docs) + `0eb553f` (data layer) + `19cfcc7` (mockup spec) + `874b59b` (picker) + `8a47c50` (shell+Step1+Step2) + `0211a8e` (Step3+4+4b) + `6483331` (Step5+save+list+offline)
**Status:** ✅ Deployed — Firestore indexes via `firebase deploy --only firestore:indexes` (selfReports collection-group composite: layoutId + breakout.bunker + createdAt desc); app via `npm run deploy` (GitHub Pages published).

**What shipped:**
- **New product PPT** — full-screen 5-step wizard for pure-player performance logging during training. Separate route `/player/log` (today's list + `+ Nowy punkt` CTA) and `/player/log/wizard?trainingId=X` (5-step flow). Writes to `/workspaces/{slug}/players/{playerId}/selfReports/{auto}` per § 48.5 schema.
- **Training picker** — auto-picks when exactly 1 LIVE training for player's teams, shows list (LIVE / Upcoming / Ended max 10) otherwise. Refresh icon in PageHeader action slot (no pull-to-refresh — explicit tap-ack per 2026-04-23 clarification #7).
- **5-step wizard** — Step 1 Breakout (bootstrap vs mature via `getPlayerBreakoutFrequencies`), Step 2 Variant (4 cards with Lucide icons + SKIP SHOTS cyan badge), Step 3 Shots (multi-select order badges + `getLayoutShotFrequencies` crowdsource), Step 4 Outcome (3 default-semantic cards per § 35.5), Step 4b Detail (6 cards grouped konkretne/nieprecyzyjne + `inne` inline textarea expand + `nie-wiem` auto-advance), Step 5 Summary (tappable jump-back rows + amber Zapisz punkt 64px CTA).
- **Offline queue** — `pptPendingQueue.js` + `usePPTSyncPending` hook. Failed writes queue to localStorage; flushed on `window.online` + route changes. List UI merges server rows + pending rows with subtle cloud indicator.
- **State machine** — picker | wizard | list resolved by `PlayerPerformanceTrackerPage`. `?pick=1` escape hatch from list when multiple LIVE or zero LIVE trainings.
- **i18n** — ~90 pl + en keys added. Dynamic strings use function values per repo `points_n(5)` convention.
- **Docs** — `DESIGN_DECISIONS.md § 48` (10 sub-sections) + § 35.5 rewritten to 3-state outcome enum + § 35.7 scope clarifier (HotSheet vs PPT). `docs/product/PPT_MOCKUP.md` implementation spec (tokens + JSX pseudocode + Lucide icon map + i18n keys).

**Tier-2 compliance:**
- 5 Jacek-approved checkpoints (not merged between).
- § 27 self-review per checkpoint. All PASS.
- Precommit green, build green every checkpoint.
- Touch targets 88/76/72/64/44 (2× Apple HIG min) for glove-friendly use.

**Known issues / iteration flags:**
- **Role gating (Brief E Option 2) not shipped** — `/player/log` is reachable only by direct URL. Pure-player's tab bar (Brief E Option 1, § 47) shows only "More". Follow-up brief needed to add a "Gracz" tab or deep link. Until then PPT is an admin-preview / test-account feature.
- **Matchup-matching product not built** — orphan `selfReports` accumulate correctly per § 48.5 schema (`matchupId: null`, `pointNumber: null`), but coach-side assignment workflow is a separate product. Players can already see their own history via `/player/log`; coach analytics blocked until matching ships.
- **Post-save list edit/delete not implemented** — rows are read-only on initial ship per § 48.10. Tap = no-op. Add in follow-up if user feedback demands.
- **Offline queue deduplication best-effort** — TodaysLogsList dedupes by `(trainingId, bunker, variant, outcome)` signature. Two saves with identical semantics within the same queued-before-sync window could collide on display (cosmetic, both rows render as one). Real fix = persist a client-side UUID on each queued payload. Accepted risk on initial ship per § 48.10 note.
- **Mockup reference** `docs/product/PPT_MOCKUP.md` (v7-derived spec, not the original interactive HTML preview which lives at `/mnt/user-data/outputs/…`) is canonical visual spec.

**iPhone validation pending.** Brief pasted inline (no archive file to move). `NEXT_TASKS.md` marked [DONE] in this commit.

## 2026-04-22 — Brief G (Option B slice): role + membership code-side shims
**Commit:** (merge of `fix/role-and-membership-shims`) — 4 commits: `4e84337` + `a73aa36` + `10baa1b` + `257d641`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Option B (narrow) from the Brief G audit — code-side shims only, **no Firestore writes, no rules changes, no data migration**. Full schema migration deferred to Brief G proper (requires Firebase Admin SDK + multi-checkpoint human review during off-hours).

**What changed:**
- `dataService.js:getOrCreateUserProfile` — dropped the junk `role: 'scout,coach,admin'` (singular comma-string) write that shipped on every first-sign-in. No app path reads `users/{uid}.role`; all role gating flows through `workspaces/{slug}.userRoles[uid]` (§ 38, v2 security). New profiles now land in the canonical shape: `{ email, displayName, workspaces: [], createdAt }`. Legacy docs keep their junk string — harmless since unread.
- `roleUtils.js` — new `parseRoles(r)` defensive helper accepts array ∨ comma-string ∨ pipe-string ∨ undefined and returns a deduped array. Applied inside `getRolesForUser`. Survives any legacy read path where a string-shaped role landed in `userRoles[uid]` instead of silently collapsing to `[]` and dropping permissions.
- `useWorkspace.jsx` session restore — slugs loaded from `localStorage` / `sessionStorage` now run through `slugify()` on load; normalized shape persisted back. Fixes the `biuro@epicsports.pl`-type failure mode (uppercase `"Ranger1996"` stored, lowercase `ranger1996` Firestore doc → case-sensitive 404 → user dropped into silent re-enrollment).
- `DESIGN_DECISIONS.md § 33.1 + § 33.2` — codified the deprecation of `users/{uid}.role` and the canonical lowercase workspace-slug shape. Explicit pointer to Brief G for full data migration.

**Explicitly NOT done in this slice (deferred to Brief G proper):**
- Firestore data migration (legacy junk role strings on existing user docs remain; `biuro@epicsports.pl` still has broken on-disk data)
- `firestore.rules` changes (still checks `workspace.members`)
- `users.workspaces` schema activation (workspace selection still localStorage-driven)
- `workspace.members` → `users.workspaces` source-of-truth consolidation
- Enrollment flow rewrite
- `adminUid` / `passwordHash` field retirement

**Known issues:** None. Existing bad data stays as-is (unread by any code path). The `parseRoles` shim also works on post-migration array-only data — no rework needed when Brief G proper runs.

**Follow-up:** Brief G Phase 1-2 (audit script + migration script + rules consolidation) remains queued for a dedicated session with Firebase Admin SDK access and a proper off-hours deploy window.

## 2026-04-22 — Brief F: concurrent-scouting cleanup (diagnostics + claim retirement)
**Commit:** (merge of `chore/concurrent-scouting-cleanup`) — 1 commit: `3caf9c3`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Post-Saturday-validation cleanup items from HANDOVER.md. Net −232 lines across 4 files.

**What changed:**
- **Diagnostic removal:** ~40 `[BUG-B]` / `[BUG-C]` console.log/warn/error/group statements in `MatchPage.jsx` removed. Inner try/catch blocks that existed only to log-and-rethrow collapsed to plain `await`; the outer `savePoint` catch still logs `'Save failed'` and raises the user-facing alert. `[BUG-B DIAG]` / `[BUG-C DIAG]` comments deleted. Historical reference comment at `MatchPage.jsx:607` retained (explains why Brief 8 removed the fallback openPoint search).
- **Claim system retired:** `MatchPage.jsx` — URL-entry claim write, `releaseClaim` function + unmount / beforeunload / visibilitychange effects, 5-min heartbeat interval, auto-clear stale-claim effect, and the now-dead `claimSide` / `isClaimStale` / `CLAIM_TTL_MS` block all removed. `MatchCard.jsx` — `STALE_MS` + `isClaimActive` helpers, all `home/awayClaimActive` / `*Blocked` derivations, the `TeamZone` `blocked` prop + its visual treatment (opacity 0.35 / not-allowed cursor / "Scout" overlay), and the Firebase `auth` import that only served claim state — gone. Per-coach streams (§ 42) made claim state redundant; `coachUid` per doc identifies ownership at the stream level.
- **Docs:** `DESIGN_DECISIONS.md § 18` marked **DEPRECATED** with pointer to § 42-44; retired sub-sections struck through (side picker, claim system, old save behavior); data-model + status-tracking sub-sections preserved as they still describe legacy doc shape. `PROJECT_GUIDELINES.md § 2.5` rewritten to describe per-coach streams + explicitly list retired pieces.

**Data left in Firestore:** Existing match docs may still carry `homeClaimedBy`/`awayClaimedBy`/`homeClaimedAt`/`awayClaimedAt` fields. No code path reads them; left in place (option (a) per brief — harmless clutter, no migration).

**Known issues:** None. Precommit is now quiet — the BUG-B/BUG-C warnings that shipped through Brief 9 deploy no longer fire.

**Follow-up:** one-time batch delete of stale `*ClaimedBy`/`*ClaimedAt` fields from existing match docs — purely cosmetic Firestore hygiene, can run from Console if desired. Not code-visible.

**Console is now quiet during normal scouting flows — any console output is intentional.**

## 2026-04-22 — Brief E: SessionContextBar removal + role-gated tabs (Option 1 scope)
**Commit:** (merge of `fix/remove-session-bar-and-harden-player-tabs`) — 2 commits: `8bbf85f` + `23e4bd6`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Option 1 — minimum safe fix after 2026-04-22 audit surfaced that Self Log is a FAB in MatchPage, not a tab, and that pure-player is already blocked from MatchPage by `canAccessRoute`. Self-Log-as-tab deferred to future brief.

**What changed:**
- **J1 — SessionContextBar removed:** inline `SessionContextBar` function + its call-site in `App.jsx` fully deleted (74 lines). `useTournaments` / `useTrainings` imports dropped (only consumer was the bar). No replacement indicator — user explicitly doesn't want one.
- **E1 — tab visibility role-gated:** `AppShell.TAB_DEFS` now carries `requiredAny` per tab. Scout ← scout / coach / viewer; Coach ← coach / viewer; More ← always. Effective-admin bypasses gates (multi-role users unchanged). A `useEffect` in AppShell resets `activeTab` to the first visible tab when the persisted tab is hidden (admin impersonating a lower role, or a user whose roles changed).
- **E1 — pure-player More trim:** `isPurePlayer` predicate (`hasRole(roles, 'player')` AND no admin/coach/scout/viewer AND not effective-admin) in both `MoreTabContent` and `TrainingMoreTab`. When true, Session + Manage + Scouting + Actions sections hide. Account + Language remain. Feature flags is already admin-gated — unchanged.

**Deliberately NOT done (noted for future briefs):**
- Route-level URL-typing guards on `/teams`, `/players`, `/my-issues`, etc. — `canAccessRoute` in `roleUtils.js:88-95` default-denies player on unlisted routes including `/profile`, so wrapping those routes with `<RouteGuard>` without first extending the allowlist would regress pure-player access to their own profile. Needs a dedicated audit brief.
- No SelfLog-as-tab + new `PlayerSelfLogPage` (Brief E Option 2 scope).

**Design decisions appended:** DESIGN_DECISIONS § 47 (role-gated tab visibility matrix + pure-player More rule + deferred route-guard sweep note).

**Dropped from backlog:** F2 ("Quick scouting only in training") per user decision 2026-04-22 — keep quick scouting available in all current contexts. Noted in E1 commit message.

**Known issues:** None. Validation on iPhone pending (Brief E GO checkpoint).

## 2026-04-22 — Brief C: Scouting section + Feature flags inline edit (Option 1)
**Commit:** (merge of `feat/settings-restructure-and-feature-flags`) — 1 commit: `524fe48`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Option 1 as agreed after 2026-04-22 audit surfaced mismatches between brief's assumptions (per-user flag overrides, separate Settings page) and reality (workspace-global + audience-rule flags, MoreTab-as-Settings).

**What changed:**
- A3: New `ScoutingSection` export in `MoreShell.jsx`, consumed by both `MoreTabContent` and `TrainingMoreTab`. Holds a single handedness toggle (RIGHT/LEFT, persisted to `pbscoutpro-handedness` localStorage — consumed by `drawLoupe.js`; the key previously had no UI). Amber active-state pill matches the LanguageSection pattern. IA slot created for future per-device scouting preferences.
- D1 (Option 1): Feature Flags promoted from the former "Debug" sub-section to its own admin-only top-level `MoreSection` in both More tabs. `DebugFlagsPage` renamed "Debug: Feature Flags" → "Feature flags" and given inline edit:
  - Per-flag **enable toggle** — green iOS-switch, 48×44 hit area.
  - Per-flag **audience cycle pill** — `all → beta → admin`, colors scaled broadest → most-restrictive (green / amber / red) so the reach of a change is visible.
  - Writes target `/workspaces/{slug}/config/featureFlags` via `updateDoc`; `useAllFlags` snapshot drives the re-render. Row dims while the round-trip completes.
- **Per-user flag overrides NOT shipped** — current architecture routes eligibility through audience rules (`isInAudience`), and per-user overrides would require either `/users/{uid}.featureFlagOverrides` that layers over workspace defaults, or an explicit `userIds` allow/block list on the audience system. Noted in DESIGN_DECISIONS § 46 as deferred architecture.

**Design decisions appended:** DESIGN_DECISIONS § 46 (Settings IA: Scouting section + Feature flags single-home rule + deferred per-user override architecture note).

**Known issues:** None. Validation on iPhone pending (per Brief C Option 1 GO checkpoint).

## 2026-04-22 — Brief D: members + profile targeted cleanup (B1/B2/B3/C1/C2)
**Commit:** (merge of `fix/members-and-profile-cleanup`) — 2 commits: `326cdc2` + `a515657`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:**
- B1: New `useUserProfiles(uids)` hook (alongside `useUserNames`) fetches `{displayName, email, photoURL}` from `/users/{uid}` into a process-wide cache. MembersPage batch-resolves all rendered uids and passes `displayName` + `email` through to `MemberCard` and `PendingMemberCard`. Fallback order unified: `linkedPlayer.nickname → linkedPlayer.name → displayName → email → localized 'Member'`. The old `uid.slice(0, 6)` fragment is no longer surfaced anywhere.
- B2: `MemberCard` Edit/Save/Cancel state machine removed — role chips are always live for the current-user admin, read-only for non-admins. Optimistic UI via nullable `pendingRoles` buffer: canonical `roles` prop drives display by default, buffer overrides only while the Firestore write is in flight, reverts automatically on error. `updateUserRoles` is called directly on each chip toggle. Self-admin self-protect retained (§ 38.3 hard block — transfer-before-demote — not relaxed despite brief's softer suggestion; explicit decision to keep existing security invariant).
- B3: `adminCount` computed in MembersPage, passed down. The 'admin' chip is disabled with reason ("Cannot remove last admin") when role is present and `adminCount <= 1`. "Remove from workspace" is filtered out entirely from the kebab menu for the last admin. ConfirmModal title now includes target name, body expanded to spell out exactly what is lost and that the op is hard to undo. Self-remove ("Leave workspace") deferred — brief's targeted-fix clamp excludes the post-leave redirect flow.
- C1 + C2: ProfilePage avatar card was rendering `user.displayName` read-only inside the header, duplicating the editable Input below. Removed the duplicate render. Avatar card now shows avatar + email (account-identity anchor) + photo URL editor; the Display-name editor card below is the single surface where name appears. C3 "karta od zera" folded in — page reads cleaner after dedup, no full redesign per scope discipline.

**Design decisions appended:** DESIGN_DECISIONS § 45 (Members page inline role editing + last-admin guard + profile identity single-render rule).

**Known issues:** None. Validation checklist pending on iPhone (per Brief D GO checkpoint).

## 2026-04-22 — Brief A: tournament setup polish (I1 + I2 + H1)
**Commit:** (merge of `fix/tournament-setup-polish`) — 2 commits: `ce766a9` + `e9bf2df`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:**
- I1: Scout tab was rendering both the "No matches" empty-state `+ Add team` CTA AND the primary-action card `+ Add team` simultaneously when the tournament had zero scouted teams. Gated XOR: empty-state CTA owns the `scouted.length === 0` moment; primary action row takes over from `scouted.length >= 1`.
- I2: Add-team modal converted from single-tap-and-close to checkbox multi-select. Row = 52px touch target toggling its checkbox; sticky footer shows `{N} selected` + primary `Add {N} teams`. Batch add via `Promise.allSettled` — partial failures keep only the failed rows checked and surface an inline error count. Division filter + auto-division derivation preserved (extracted into `buildScoutedPayload`). Modal retitled "Add teams".
- H1: `NewTournamentModal` + `EditTournamentModal` converted from single-select `division: string` to multi-select `divisions: string[]`. Toggle adds/removes. League switch clears. Inline "Select at least one division" error (11px/600 red) on submit when `DIVISIONS[league]` exists and selection is empty. EditTournamentModal has a defensive initializer for legacy singular `tournament.division` field. Write path persists authoritative `divisions: [...]` AND mirrors first entry to singular `division` for legacy readers (`ScheduleImport.jsx:240`).

**Design decision appended:** DESIGN_DECISIONS § 5.7 (multi-division + multi-select Add teams patterns).

**Known issues:** None. Validation checklist pending on iPhone:
- Fresh tournament → one Add team affordance per state (no duplicate)
- Multi-select 3+ teams → batch add in one modal open
- Create tournament with PRO + SEMI → both pills visible in DivisionPillFilter; Add Match / Add Team modals filter correctly by active pill
- Edit single-division tournament → loads existing div; add second; save preserves both
- Submit with zero divisions → inline error, submit blocked

## 2026-04-22 — Brief B: copy cleanup + language flag single-source-of-truth
**Commit:** (merge of `fix/copy-and-language-flag-cleanup`) — 2 commits: `4636d6b` + `5f73f3e`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:**
- A2: More-tab section title `browse_section` renamed Przeglądaj → Zarządzaj (PL) / Browse → Manage (EN). i18n value + hardcoded fallback in MoreTabContent + TrainingMoreTab updated together so the new copy holds even before the locale dictionary loads.
- B4 / C4 / J2: `LangToggle` removed from `PageHeader.jsx` — single-edit change that eliminates the language-flag pill from every page that uses PageHeader (22 pages: ProfilePage → C4, all tab-inner routes → B4/J2). Dead `LangToggle.jsx` deleted (PageHeader was its sole importer). `LanguageSection` in `MoreShell.jsx` kept as the app's Settings-canonical switch. PlayerEditModal country flags (player nationality — not locale) untouched. i18n infrastructure untouched.

**Known issues:** None. Validation checklist pending on iPhone:
- More tab section title reads "ZARZĄDZAJ" (uppercase render via MoreSection CSS) on both PL and EN
- No flag anywhere outside More → Language section
- Language switch in More still works and persists across reloads

## 2026-04-22 — Revert Brief 9 Bug 3a mode=new guard (auto-flip regression)
**Commit:** (merge of `fix/revert-bug-3a-mode-guard` @ `29c2be1`)
**Status:** ✅ Deployed
**What changed:** Brief 9 Bug 3a added `modeParam !== 'new'` to the savePoint post-write flip block, which killed the paintball § 2.5 auto-swap after a scored point. 2-device test confirmed `match.currentHomeSide` never flipped on mode=new saves. Manual flip-pill worked, auto did not.
**Fix:** remove the `&& modeParam !== 'new'` predicate. Brief 7 `!editingId` guard retained (edit saves still never flip). Bug 3b toast suppression retained — the flip is real, just no longer announced with a startle notification.
**Rationale:** per-coach streams don't actually conflict with a shared `match.currentHomeSide` — both teams physically swap sides when a point is scored, so the shared signal IS the correct source for next-point orientation on both devices.

## 2026-04-21 — Brief 9: post-Brief-8 polish (canonical order + flip toast + score Option A)
**Commit:** (merge of `fix/brief-8-polish` @ `65082aa`) — 2 commits: `a872782` + `65082aa`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Three bugs surfaced by 2-device test 2026-04-21 22:54-23:08 on match `rzj1EYtDWjD0i54WtWnp`. Architecture (per-coach streams + merge) worked; polish layer had issues.

**Bug 1 — canonical docs invisible post-End-match**
- Root cause: `subscribePoints` queries with `orderBy('order', 'asc')` and Firestore excludes documents missing the orderBy field. `endMatchAndMerge`'s `batch.set(canonicalRef, ...)` for merged docs omitted `order`, so the canonical filter matched zero rows server-side.
- Fix: write `order: Date.now() + i` on canonical doc creation. Sorts after source docs, preserves canonical index order via `+i`.

**Bug 3a — match.currentHomeSide still mutating on mode=new saves**
- Brief 7 added `!editingId` guard but `mode=new` saves still flipped. Per-coach streams (§ 42) store fieldSide per doc, so a shared currentHomeSide is meaningless and triggered sync-effect noise on the other device.
- Fix: extend guard with `modeParam !== 'new'` — Firestore updateMatch + lastSyncedHomeSideRef update only run for legacy non-mode=new path. Local changeFieldSide still fires for next-point orientation.

**Bug 3b — false-positive "sides swapped by other coach" toast**
- Sync effect toast fired on every currentHomeSide change. Under per-coach streams, flips should never happen (Bug 3a stops writes). Residual legacy flips still trigger the sync but the toast was noise designed for a chess-model lock that no longer exists.
- Fix: remove `setToast + setTimeout` from sync effect. Local fieldSide still syncs for correctness on rare legacy paths.

**Bug 2 — score desync across devices (Option A resolution)**
- Root cause: regular save paths wrote `match.scoreA/B` from coachUid-filtered points — each coach's write was only their own stream's subset, last-write-wins race. Jacek's 2-device test showed A=2:0, B=0:1, list=1:1.
- Fix (Option A strict per Jacek): remove all regular-save score writes. `endMatchAndMerge` and `endMatchupAndMerge` now compute authoritative scoreA/scoreB from canonical outcomes during the batch build and write once on the match/matchup doc. Empty-match branch writes 0:0.
- **Intentional trade-off:** match lists (MatchCard, ScoutedTeamPage, Scout/CoachTab, teamStats) show 0:0 for active matches until End match — live score only on in-match scoreboard (own stream, per-device). Snap to canonical post-merge.

**Known issues / follow-up:**
- 🟡 Re-running End match after edits/deletes on already-merged matches is a no-op (idempotency guard on `match.merged=true`). A recompute trigger for post-merge corrections is a follow-up.
- 🟡 Match list 0:0 during active matches — acceptable per Option A; if field use demands live aggregate, Option Y (raw subscribe + unfiltered score write) is a future alternative.
- 🟡 Diagnostic `[BUG-B]` + `[BUG-C]` logs still live in prod. Cleanup PR after Saturday validation.
- iPhone 2-device retest pending per Brief 9 validation scenario.

## 2026-04-21 — Brief 8: URL-param entry semantics + per-coach streams + end-match merge
**Commit:** (merge of `feat/entry-semantics-and-per-coach-streams` @ `3f0f5e9`) — 3 commits: `335b058` + `072861d` + `3f0f5e9`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Architectural overhaul of tournament scouting entry + per-point persistence. Replaces "smart-guess" auto-attach with explicit URL-driven intent (Problem A), and the shared-point concurrent chess model with per-coach streams merged at end-match (Problem B).

**Commit 1 — Problem A URL-param entry semantics:**
- All Scout-intent CTAs now navigate with `&mode=new` (MatchPage `goScout` helper, `MatchCard.handleScout`, `TrainingScoutTab.onSwitchToScout`). List-card taps unchanged — `goScoutPoint` already used `&point=<id>`.
- MatchPage auto-attach effect rewritten (L588-608): URL-param dispatch only; fallback `openPoint` search DELETED (was root cause of Bug C symptom where user's own partial points silently reloaded on next Scout › click).
- `savePoint` mode=new bypass: when `editingId=null && URL has mode=new`, skip joinable search, route to new-point save path. Legacy URLs (no params) still fall through to Brief 6 narrowed joinable fallback.
- Quick Log CTAs untouched — already "always new point" by construction (in-page `setViewMode('quicklog')` + unconditional `addPointFn` in QuickLogView).

**Commit 2 — Problem B per-coach stream infrastructure:**
- New hook `src/hooks/useCoachPointCounter.js`: per-(matchKey, uid) counter with localStorage persistence, zero Firestore round-trip on reserveNext.
- Doc ID scheme `{matchKey}_{coachShortId}_{NNN}` (matchKey = matchId or matchupId; coachShortId = first 8 chars of uid; NNN = zero-padded index).
- `dataService.setPointWithId / setTrainingPointWithId` helpers for deterministic-ID writes via `setDoc`.
- `usePoints` / `useTrainingPoints` opt-in filter via `{ currentUid, merged }` options:
  - `currentUid`: client-side filter `!p.coachUid || p.coachUid === uid` (legacy grandfathered per Blocker 2 — Firestore `in [uid, null]` does not match field-missing docs, hence client-side).
  - `merged`: filter to `canonical === true` only. Flag threaded but set active only by Commit 3's endMatchAndMerge.
  - Default (no options) = all points, backward-compat for non-opting callers.
- MatchPage: counter hook + `savePointAsNewStream` helper wrapping `setPointWithId/setTrainingPointWithId` with `coachUid / coachShortId / index / canonical:false / mergedInto:null` enrichment. `mode=new` branch in savePoint now calls `savePointAsNewStream`.
- Per Blocker 3: training also gets coachUid schema (solo per matchup; `endMatchupAndMerge` collapses to single-coach branch in Commit 3).

**Commit 3 — Problem B end-match merge:**
- `ds.endMatchAndMerge(tid, mid)`: idempotent (match.merged=true → no-op). Groups points by coachUid; legacy bucket (no coachUid) → canonical standalone per Blocker 2 audit. Solo (1 non-legacy stream) → canonical in place. 2+ coaches → per-index lockstep merge, writes canonical merged docs `{matchId}_merged_{NNN}` with both sides populated, source docs get `mergedInto` audit pointer. Leftover mismatched indexes (Coach A 12 / Coach B 10) → canonical standalone with unmerged count. Match doc: `merged:true, mergedAt, mergeStats { merged, unmerged }`.
- `ds.endMatchupAndMerge(trid, mid)`: training solo per Blocker 3 — mark all canonical, flip matchup.merged=true. No merge logic.
- End match confirm modal (L1774) wired: runs appropriate merge per isTraining, then flips status='closed'. Transient toast `⚠ {n} unmerged points — audit manually` if unmerged > 0.

**Known issues / must-dos:**
- 🔴 **iPhone validation pending before Saturday 2026-04-25.** Brief 8 Tests 1-4 + 6 (solo flows + regression) all need device verification. Test 5 (2-device concurrent) deferred to Tymek session.
- 🟡 **Firestore indexes deferred** — client-side filter covers current load; add `coachUid ASC` / `canonical ASC` if server-side queries become necessary.
- 🟡 **Persistent post-merge banner deferred** — toast only in v1. `match.mergeStats` is queryable in Firestore for audit.
- 🟡 **Legacy points grandfathered** — points missing `coachUid` (pre-Brief 8 data, including current BUG-C test match with 6+ points) stay visible to all coaches during match; marked canonical standalone at end-match. Zero migration script run.
- 🟡 **Diagnostic [BUG-B] + [BUG-C] logs still live in prod.** Kept for Brief 8 validation signal. Cleanup PR after Saturday validation passes.
- 🟡 **Counter sync hint for late-joining coach** — if coach B joins match mid-stream, their counter starts at 0, out of sync with Coach A. User responsibility per brief founding assumption. Follow-up UI hint possible.
- 🟡 **Manual merge conflict resolution UI** — stream length mismatch (A scouted 12, B scouted 10) shows unmerged audit banner but no reconciliation UI. Follow-up if field use demands.

## 2026-04-21 — Narrow joinable mirror at startNewPoint L852 (Brief 6 follow-up)
**Commit:** (merge of `fix/narrow-joinable-condition-L852` at `257c80b`)
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Mirror of Brief 6 (Fix X) narrowing applied to the duplicate buggy OR clause at `MatchPage.jsx:L852-860` inside `startNewPoint`. The "+ Add Point" flow in editor view (not match-review "Scout ›") had the identical `p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean)` condition; with a terminal `scouted` point the third OR was tautologically true and caused `editPoint(joinable)` to load a completed point into drafts. Removed the OR clause. Dropped the now-unused `otherSide` local. Updated adjacent comment with § 18 / § 40 / Brief 6 cross-ref.

**Note:** This closes a latent mirror bug Brief 6 flagged and de-scoped. Parallel to `[BUG-C]` diagnostic at `28fd0eb` — does NOT explain Jacek's Scout › routing symptom (different call path, auto-attach at L572 not startNewPoint).

**Known issues:**
- iPhone validation per Jacek's scenario pending — tournament match with existing scouted points, tap "+ Add Point" → verify no "Point already in progress" toast, no editPoint-into-scouted-point.

## 2026-04-21 — Fix Y guard edit flip (Brief 7, fieldSide rendering resolution)
**Commit:** (merge of `fix/guard-edit-flip` at `17cd6e5`)
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Two defense-in-depth guards in `src/pages/MatchPage.jsx` to stop `match.currentHomeSide` from flipping on edit saves:
- **Guard 2 (L202-212, state-intent layer):** G2 auto-swap effect now early-returns when `editingId` is truthy. `editPoint` hydrating `outcome` from Firestore no longer re-arms `sideChange=true`. Deps updated to `[outcome, editingId]`.
- **Guard 1 (L1066, write-path layer):** post-tracked swap-flip block now predicated on `&& !editingId`. Even if `sideChange` somehow leaks true during edit (e.g. manual pill toggle in save sheet), Firestore mutation is blocked. `editingId` is closed-over from savePoint invocation — `resetDraft()`'s async `setEditingId(null)` doesn't change scope value.

**Resolves:** Problem Y from [BUG-B] prod log 2026-04-21 (Jacek) — same point `1imySsDDYy1...` re-entered 3× with stable `fieldSide='right'` payload but visual side flip on each cycle because `match.currentHomeSide` was flipping on every edit save, then URL effect at L496-502 seeded local fieldSide from the polluted value on next entry, racing against `editPoint`'s correct per-point resolution at L1110.

**Semantic clarification codified:** `point.{homeData,awayData}.fieldSide` = historical snapshot (frozen after first write, authoritative for edit renders); `match.currentHomeSide` = live pointer (flips only on new-point save with winner per § 2.5). See new DESIGN_DECISIONS § 41. PROJECT_GUIDELINES § 2.5 updated with "fires ONLY on new-point scouting" qualifier.

**Known issues / must-dos:**
- 🟡 **Duplicate L840 still pending** (same issue as Fix X in `startNewPoint` "+ Add Point" flow) — Brief 7-bis if Jacek wants symmetric fix. Out of this brief's scope.
- 🟡 **Diagnostic logs still in prod** (`[BUG-B]` prefix in savePoint, auto-attach, URL effect, editPoint). Help confirm Fix X + Fix Y in post-deploy iPhone validation. Separate cleanup PR planned.
- **Training/solo else-if branch at L1077 unchanged** — different semantic (no `match.currentHomeSide` concept; local flip only). Intentionally out of scope per brief.
- iPhone empirical validation pending Jacek 2026-04-25:
  - **Regression check:** new-point save with winner still flips `match.currentHomeSide` (G2 rule intact)
  - **Core fix:** edit saved point + save → `match.currentHomeSide` unchanged; re-open → orientation stable across 3+ cycles

## 2026-04-21 — Fix X narrow joinable condition (Brief 6, Bug B resolution)
**Commit:** (merge of `fix/narrow-joinable-condition` at `bc6954d`)
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Removed the over-permissive OR clause in `savePoint`'s joinable-search fallback at `src/pages/MatchPage.jsx:L944` (was L898 pre-diagnostic-merge). The prior condition `p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean)` made every `status='scouted'` point a join target, because scouted ≡ both sides populated (§ 18) makes the third OR tautologically true on any completed point. Condition now restricted to `p.status === 'open' || p.status === 'partial'`. Scouted points are never overwritten by fresh saves from the other team.

**Resolves:** Problem X confirmed by 43-step repro 2026-04-21 (Jacek). Scouting Team B after Ballistics-only points was silently routing ALA data into Ballistics' empty `awayData` slots in reverse order. Post-fix: fresh save creates a new `partial` shell as intended. Diagnostic validated the root cause via `diagnostic/bug-b-instrumentation` @ `724abee`.

**Known issues / must-dos:**
- 🔴 **Known duplicate bug, NOT fixed this PR** — the identical buggy OR clause exists at `MatchPage.jsx:L840` inside `startNewPoint` (the "+ Add Point" flow in editor view). Same root cause; different user action triggers it ("+" tap vs "Scout ›" tap). Out of brief scope per strict instruction. Follow-up Brief 7 can mirror this fix — single-line change.
- 🟡 **Fix Y still pending** — fieldSide rendering on edit + G2 auto-swap firing on outcome hydrated from `editPoint`. Different code path, different brief (§ sideChange state + `savePoint` L1059 flip guard). Not fixed here per brief scope.
- 🟡 **Diagnostic logs still in prod** — `[BUG-B]`-prefixed console.logs from `diagnostic/bug-b-instrumentation` remain active. They help confirm this fix in post-deploy iPhone validation (look for `joinable search result: no match` on first ALA save). Separate cleanup PR to revert after Fix Y lands.
- iPhone empirical validation pending Jacek 2026-04-25. Validation signal: Firestore shows a new doc with `awayData.players.length > 0` and `homeData` empty; old Ballistics points 1-4 untouched. `[BUG-B]` console shows `joinable search result: no match` on first ALA save.

## 2026-04-21 — Per-team heatmap visibility toggle (Brief 3)
**Commit:** (merge of `fix/per-team-heatmap-toggle` at e695880) · § 40
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Replaced the two global heatmap pills (`● Positions` / `⊕ Shots`) with `PerTeamHeatmapToggle` — a 2-row block where each team gets its own Positions + Shots chip pair grouped by a team tag (dot + name). Independent on/off per team per layer — 4 boolean combinations. Lets coaches isolate opponent-only or own-team-only views. `HeatmapCanvas` gains optional `visibility` prop (`{ A: {positions, shots}, B: {positions, shots} }`); legacy `showPositions`/`showShots` booleans preserved for `FieldView` backward-compat (no caller migration forced). State lives in parent `MatchPage.jsx` as `hmVisibility`, non-persisted (resets on view remount — intentional v1; flag for future persistence if field use demands it). Active-chip styling reuses § 24 scope-pill pattern (amber border + bg #f59e0b08), consistent with existing primitives. New DESIGN_DECISIONS § 40 documents.

**Known issues:**
- iPhone empirical validation still pending; Jacek to verify 4-combo flow (All on / RANGER only / ALA only / Positions-only) on device before trusting for 2026-04-25 match.
- Visibility state does NOT persist across match-review → editor → match-review navigations — re-opens to all-on default. If coaches find themselves re-tapping same combo every point, add localStorage persistence (trivial follow-up).

## 2026-04-21 — Bug B diagnostic instrumentation (Brief 4, diagnostic-only)
**Commit:** (merge of `diagnostic/bug-b-instrumentation` at 724abee)
**Status:** ⚠️ Deployed as instrumentation — REVERT after Bug B fix merges
**What changed:** Zero-behavior-change instrumentation on `src/pages/MatchPage.jsx` save path to diagnose user-reported 2026-04-21 "Team B save data loss" (bug flagged `CC_BRIEF_BUGFIX_PRE_SATURDAY_4`). Four paths instrumented with `[BUG-B]`-prefixed `console.log`/`console.group`:
- URL `?scout=` effect (~L478): scoutingSide/activeTeam resolution + transitions
- Auto-attach effect (~L563): per-fire deps snapshot, guard skip reasons, openPoint search result, "will load" preview
- `savePoint` (~L838): console.group per save — entry state, branch taken (CONCURRENT/SOLO), homeHasData/awayHasData, joinable search result, per-write payload JSON.stringify, ✓ id or ✗ error. Inner try/catch-rethrow around each updatePointFn/addPointFn so silent Firestore errors surface with context. `finally{}` closes group on both success and throw.
- `editPoint` (~L1066): re-entry point loader — logs point id + player counts across homeData/awayData/teamA/teamB

**Ready-to-fix hypothesis (Suspect 3 from static analysis):** Fallback joinable search @ L896-899 too permissive. Condition `p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean)` captures already-`scouted` points where other side has data — so when scout A finishes 4 points for Team A and then scouts Team B, each new Team B save attaches to an existing Team A point (`otherSide` populated, `mySide=awayData` empty, status=`scouted` tautologically satisfies `otherSide?.players?.some` gate). Diagnostic output will confirm.

**Known issues / must-dos:**
- 🔴 Revert this commit after Bug B fix lands. Diagnostic logs are not production-grade (JSON.stringify of full payloads on every save — performance + privacy of player names in console).
- 43-step repro from Jacek (Ballistics vs ALA — 4 points scouted A, then scout B, data lands in B1-B4) still required to confirm Suspect 3 vs alternative race.
- No fix applied — per brief "reproduce first, confirm hypothesis, then fix."

## 2026-04-21 — Scout workflow polish (G3 + G4 + F1)
**Commit:** 2485653 (merge) · branch `fix/scout-workflow-polish` · commits f68a70c + 8d5686f
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Companion to the pre-NXL Saturday bugfix sprint. Two scout-workflow polish items:
- **G3 + G4:** Role-gated match summary on MatchPage heatmap view. Pure-scout users (roles contain `'scout'` but NOT `'admin'`/`'coach'`) now see the new **ScoutScoreSheet** — a 4-row data-completeness dashboard (Players placed / Breaks / Shots recorded / Result) replacing the coaching analytics block they couldn't action. Coaches/admins keep `CoachingStats` unchanged. Multi-role users (Jacek) fall into coach branch first → no regression. Values color-coded per § 27 semantic palette (green 100% / amber 60-99% partial / red <60% / neutral Result). Breaks uses the brief's canonical definition (placed player within 0.15 of a bunker — matches § 30 kill-attribution distance threshold), scout's side only. New DESIGN_DECISIONS § 39 documents the role-gating rationale.
- **F1:** Elimination reason picker in LivePointTracker (training mode) auto-closes on reason tap. Previously required two taps (reason + "Zapisz i zwiń ▲"); now one. Same-cause re-tap is a confirm (close, no data change) instead of toggle-off. Reason cells bumped to minHeight 44 per § 27 touch targets. Architectural note: reason sits in component state, Firestore write happens only on W/L outcome tap — so "auto-save" here means "commit in-memory + close picker", no per-tap writes, and the brief's debounce-concern is moot.

**Known issues:**
- ScoutScoreSheet's Breaks metric uses bunker-distance inference (0.15 threshold); accuracy depends on layout having bunkers with valid `{x,y}` positions. Layouts without bunker data → Breaks shows `0/N (0%)`.
- Existing inline Breaks+Shots mini-strip in Points section (MatchPage ~L1405) uses a different "Breaks" definition (placed / totalSlots across both sides) and is intentionally unchanged — ScoutScoreSheet is the new canonical surface; the old strip stays as supplementary coach context. Out of brief scope.
- iPhone empirical validation still pending; Jacek to verify scout-role view + 1-tap reason flow before Saturday 2026-04-25.

## 2026-04-21 — Bugfix sprint pre-NXL Saturday (F3 + G2 + G1)
**Commit:** 0c39e52 (merge) · branch `fix/bugfix-sprint-pre-nxl-saturday` · commits 07391a4 + ada6936
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Three bugfix items from 2026-04-20 post-merge test sweep:
- **F3 (BLOCKER):** Firestore `addDoc()` crash on quick-log save in tournament mode — `src/pages/MatchPage.jsx` QuickLogView branch was writing `shots: Array(5).fill([])` (nested array, Firestore rejects). Swapped for the object-map shape (`shots: {}`) that `pointFactory.baseSide` + `shotsFromFirestore` round-trip already expects. Training quick-log path (TrainingScoutTab → createPointData → pointFactory) was already clean, no change there.
- **G2:** Auto-swap sides on winner selection restored per PROJECT_GUIDELINES § 2.5. The 2026-04-15 over-correction that forced Same on every outcome change was replaced with `win_a/win_b → Swap, timeout/null → Same`, keyed on outcome change so user manual override persists until outcome actually changes. BUG-1 concurrent-scouting sync machinery untouched.
- **G1:** Corner `✕` elimination marker swapped for `💀` in `drawPlayers.js drawElimMark`. Two iterations: first pass rewrote the full marker (bigger disc, translucent, no red ring), rolled back in `ada6936` to preserve original backdrop + red ring, replacing only the glyph. Photo grayscale + red tint overlay on player circle were never touched.

**Known issues:**
- Historic Firestore documents written before the nested-array fix could not have persisted (Firestore rejects at write), so no data migration needed. Reader (`shotsFromFirestore`) already handles both array and object shapes.
- Self-log shots written before Commit 4 (§ 38.9) still lack `scoutedBy` — player edit/delete via future Tier 2 UI will not be able to touch those docs (accepted per earlier brief: "self-log is write-only for now").
- iPhone empirical validation still pending; Jacek to verify on device before Saturday 2026-04-25.

## 2026-04-20 — Security Role System + View Switcher codified (§ 38)
**Commit:** 8424e70
**Status:** ✅ Docs committed (no deploy needed — doc-only)
**What changed:** Transferred 17.04 Opus chat decisions on security refactor + view switcher to repo per § 37.2. DESIGN_DECISIONS.md gained § 38 (11 subsections covering role model, admin determination, Settings UI, View Switcher, protected routes matrix, migration, data model, Firestore rules outline, anti-patterns, and open Path A/B decision). HANDOVER.md awaiting-decision row resolved, § 38 added to recent decisions, security refactor inserted at priority 4 in next-on-deck queue. Update protocol gained a proactive-patching rule to prevent decision-to-repo gaps from compounding.
**Known issues:** Implementation path (A full refactor vs B MVP switcher) still pending Jacek's call. Brief not written until path chosen.

## 2026-04-20 — Documentation cleanup (chore/docs-cleanup)
**Commit:** 2f4464d (merge) · branch `chore/docs-cleanup` · 3 commits
**Status:** ✅ Deployed (docs-only, no code changes)
**What changed:** Repo restructure per the new documentation discipline rules added in DESIGN_DECISIONS § 37 and PROJECT_GUIDELINES § 10.
- Root reduced from 14 to 4 .md files: README, CLAUDE, NEXT_TASKS, DEPLOY_LOG.
- 17 files moved via `git mv` (history preserved): DESIGN_DECISIONS/PROJECT_GUIDELINES → `docs/`; BALLISTICS_SYSTEM/BUNKER_RECOGNITION/TACTIC_WORKFLOW + docs/BREAK_ANALYZER_* + docs/HALF_FIELD_SPEC → `docs/architecture/`; DEV_SETUP/SECURITY/HANDOVER/FEATURE_OCR_LANDSCAPE → `docs/ops/`; IDEAS_BACKLOG + docs/VISION/FEEDBACK_EXTRACT/SLAWEK_COACH_WORKFLOW_TRANSCRIPT → `docs/product/`; docs/AUDIT_CODE/AUDIT_DESIGN_HIG/CURRENT_STATE_MAP → `docs/archive/audits/`.
- New: `docs/architecture/PLAYER_SELFLOG.md` (full Tier-1 architecture doc), `docs/archive/cc-briefs/INDEX.md` (28 briefs categorized).
- 9 cross-reference edits in active docs (CLAUDE.md mandatory reads, NEXT_TASKS.md header, REVIEW_CHECKLIST.md, DESIGN_DECISIONS + PROJECT_GUIDELINES self-refs, VISION.md FEEDBACK_EXTRACT path, BREAK_ANALYZER_DOMAIN_v2.md footer).
- PROJECT_GUIDELINES § 10 'Documentation discipline' added (quick reference to §37 rules).
- CLAUDE.md gained 'Documentation map' section at top (path table + decisions-from-chat rule + CC brief lifecycle pointer).

**Known issues:** None. DEPLOY_LOG.md and `docs/archive/**` intentionally not rewritten — historical entries preserved at-time paths.

## 2026-04-20 — Player Self-Report MVP Tier 1 (feat/player-selflog)
**Commit:** ffb9b43 (merge) · branch `feat/player-selflog` · 4c72779 + 75d8347 + 8a43e3b
**Status:** ✅ Deployed (code + Firebase indexes)
**What changed:** Self-log subsystem — player logs own breakout + shots + outcome in ~10-15s between points via FAB + bottom sheet in MatchPage. Use case: coach plays + trains, no time to scout; players self-report.
- Foundation: `player.emails[]` field, `useSelfLogIdentity` hook (maps logged-in user to player via email), OnboardingModal in MainPage (unmatched users only, dismissable per session), shared team `breakoutVariants` subcollection, self-log CRUD in dataService (`setPlayerSelfLog`, `addSelfLogShot`, training-path variants).
- Shots schema: new subcollection `points/{pid}/shots/{sid}` with `source: 'self'` (scout shots stay on point.shots field — zero migration). `layoutId`, `breakout`, `breakoutVariant`, `targetBunker`, `result` ('hit'|'miss'|'unknown') fields. Synthetic coords = target bunker center (existing heatmap/canvas viz works unchanged).
- Firestore collection group indexes deployed: `(layoutId ASC, breakout ASC)` and `(playerId ASC, createdAt DESC)`. `firebase.json` now references `firestore.indexes.json`.
- HotSheet UI: bottom sheet with 4 fields (breakout → variant → shots → outcome). Adaptive pickers — bootstrap shows all bunkers when history <5 (breakout) / <20 (layout shots), mature shows top 5 / top 6 with weighted freq (hit=2, miss=1, unknown=0.5). Breakout bootstrap collapses to header bar after select; shots picker stays full grid.
- Shot cell cycle-tap: unselected → hit → miss → unknown → unselected (soft limit 3 shots).
- All elim outcomes use `COLORS.danger`, label distinguishes (§27 color discipline).
- FAB (56px amber gradient with glow) bottom-right in MatchPage — visible ONLY when `playerId` matched AND `field.layout` resolved. Badge shows pending count (points without selfLog for this player).
- `NewVariantModal` — adds breakout-specific variant to team pool (shared across all players on team).
- i18n PL + EN for full HotSheet UI.

**Known limitations / iteration flags:**
- Visual extrapolated from textual spec only (PlayerSelfReportV4.jsx mockup referenced but not in repo). Expected iteration after iPhone test for spacing, colors, collapse transitions.
- Pickers use master bunkers only (no mirrors) — same grid for breakout AND shots. Lacks explicit "my side / opponent side" visual separation. Revisit if confusing in use.
- Point creation on save: reuses latest pending point or creates new with `order=Date.now()`. Race possible if two players log simultaneously; each still gets own `selfLogs[playerId]` slot so no data loss.
- Onboarding modal shows in MainPage on first login — dismissable per session (needsOnboarding stays true for next reload).
- Tier 2 (PlayerStatsPage "Mój dzień", Tier 2 edit modal, shot accuracy, ScoutedTeamPage hybrid, tactic suggestions) deferred to Commit 3 (separate session).
- Self-log is write-only for now — no inline edit/delete UI. Edits come with Tier 2 cold-review.

## 2026-04-19 — Unified polygon zone editor (Google-Maps style)
**Commit:** ce40944 (merge) · feature branch `fix/polygon-zone-editor` · 0f21eaf
**Status:** ✅ Deployed
**What changed:** Rebuilt zone editing for all 3 zones (Danger/Sajgon/BigMove) with single code path. New interaction model: drag vertex to reposition, drag edge midpoint ghost (+ glyph, 50% opacity) to insert new vertex, tap vertex of completed polygon to select (pulsing ring), tap trash button (red, offset) to delete. Minimum 3 vertices enforced (delete hidden on triangles). All hit targets 44×44px (Apple HIG). iOS Safari magnifier suppressed via non-passive touchstart/touchmove listeners attached in useEffect + CSS (touchAction:none, WebkitTouchCallout:none, WebkitTapHighlightColor:transparent) on canvas. Banner copy context-aware (zone_hint_drawing when <3 pts, else zone_hint_editing).
**Root cause of magnifier:** React synthetic touch events are passive by default, so preventDefault() on touchstart was silently ignored. Fix: addEventListener with { passive: false } in useEffect. This affects ALL FieldCanvas usage (scouting, heatmap, tactics, zones) — preventDefault calls that existed in handleDown/handleMove now actually fire.
**Known issues / regression risk:** Touch listener change applies globally to FieldCanvas — scouting / heatmap / tactics flows also affected. No regressions expected (preventDefault was already intended behavior), but untested on iPhone in non-zone contexts (deployed blind per Jacek's authorization). If scouting/heatmap touch feels off after 19.04 deploy — rollback candidate.

## 2026-04-19 — Notes + Big Moves + Kluczowi gracze refinements (3 branches)
**Commit:** 95db593 (merge) · incl. merges 6d6f74f, 2e44f89
**Status:** ✅ Deployed
**What changed:** Three feature/fix branches merged in one deploy session:
1. `fix/training-match-navigation` (6b96a70) — PlayerStatsPage match-history now respects `isTraining` flag, routes to `/training/.../matchup/...` instead of hanging on tournament-only route
2. `feat/big-moves` (brought in Coach Notes ancestor too):
   - Coach Notes subsystem: Firestore subcollection `scouted/{sid}/notes`, NotatkiSection in ScoutedTeamPage, AddNoteSheet, UnseenNotesModal in MatchPage (tournament mode only, once-per-session), role filter via existing `workspace.role`
   - Section renames: "1. Breakouty"/"2. Strzały"/"3. Tendencja"/"4. Kluczowi gracze" → "Rozbiegi"/"Strzelanie"/"Tendencja"/"Kluczowi gracze" (numbers dropped, Lucide icons: Footprints/Crosshair/Route/Medal)
   - Column renames: Chodzą/Przeżywają/Strzelają/Trafiają → Rozbieg%/Przeżycie%/Strzela%/Celność%
   - Big Moves user-drawn polygon zone: `layout.bigMoveZone` bare `[{x,y},...] | null` (mirrors dangerZone/sajgonZone), drawing UI in LayoutDetailPage toolbar + Lines & Zones modal (amber), `computeBigMoves()` using existing `pointInPolygon` helper, new BigMovesSection in ScoutedTeamPage (3 states: data above-fold / no-detections / no-zone-configured)
3. `fix/key-players-tiebreakers` (3f13e7b) — `computeTopHeroes` multi-key sort (diff DESC → winRate DESC → ptsPlayed DESC; tertiary opposite of PBLeagues to prefer volume on tie); weak data banner when `avg(+/-) of top 5 < 0` signals "least losers, not leaders"

Rebase resolved conflict in ScoutedTeamPage Kluczowi gracze section: kept Medal icon (big-moves) AND weak data banner (key-players).

**Known issues:**
- Lucide react added (`lucide-react@1.8.0`) — 3 npm audit warnings noted, not addressed
- CoachTabContent.jsx:155 has tournament-only `navigate` pattern; safe in tournament context today, latent landmine if reused for training — flagged for future ticket
- §27 tech debt flagged earlier (5× `#1a2234` in MatchPage/PlayerStatsPage) not addressed, separate cleanup ticket

## 2026-04-18 22:36 — Coach Brief View (CC_WORK_PACKAGE)
**Commit:** 0f4ef8a (merge) · feature branch `feat/coach-brief-view` · ae59b49
**Status:** ✅ Deployed
**What changed:** ScoutedTeamPage redesigned to Sławek's 4 priorities above the fold: Breakouty (top 7 bunkers with freq + survival %), Strzały (3 zones with shot % + accuracy %), Tendencja (3 cards D/C/S per § 34.4), Kluczowi gracze (top 5 by +/-). Everything else (Counter plan, Insights, Tactical signals, Heatmap, Matches) collapsed under "Additional sections" toggle. Confidence banner reduced to 2 pills (Positions + Shots with precision qualifier). Added canonical <SideTag> component (§ 34.3). New insight helpers: computeBreakSurvival, computeSideTendency (3-way with Center box), computeTopHeroes, zonesWithAccuracy in computeShotTargets. Also pushed § 34 Field Side Standard to DESIGN_DECISIONS.md + docs/SLAWEK_COACH_WORKFLOW_TRANSCRIPT.md.
**Known issues:** Big Moves placeholder card is explicit "Wkrótce" — awaiting Sławek's taxonomy + scouting pipeline. `eliminationTimes` typically absent in tournament scouting, so survival% currently falls back to binary eliminated→not-survived (matches existing data shape; no schema change).

## 2026-04-17 — Email-based admin + disable anonymous auth for new users
**Commit:** (see below)
**Status:** ✅ Deployed
**What changed:** Admin check switched from UID-based to email-based (jacek@epicsports.pl) in featureFlags.js, useFeatureFlag.js, and firestore.rules. Anonymous sign-in removed from ensureAuth() — existing anonymous sessions still work, new users must use email/password. signInAnonymously import removed from firebase.js.
**Known issues:** `firebase deploy --only firestore:rules` still needed manually for email-based rule. Existing anonymous users will keep working until Firebase Console anonymous auth is disabled.

## 2026-04-17 — Sentry fix: remove PROD guard
**Commit:** (see below)
**Status:** ✅ Deployed
**What changed:** `enabled: import.meta.env.PROD` → `enabled: true` in sentry.js. Previous builds had Sentry disabled because GitHub Pages serves the app but Vite may have been evaluating PROD differently. Now Sentry is unconditionally enabled whenever DSN is present.
**Known issues:** Sentry will also fire in local dev if DSN is in .env — acceptable for debugging phase.

## 2026-04-17 — Feature Flags + Sentry: real DSN + admin UID (clean rebuild)
**Commit:** (see below)
**Status:** ✅ Deployed (force clean rebuild — rm node_modules/.vite + dist)
**What changed:** Verified DSN present in production bundle (grep confirms `ingest.de.sentry.io` in dist/assets/index-*.js). Previous deploy may have used stale Vite cache without DSN. This deploy is from clean state with real VITE_SENTRY_DSN in .env + hardcoded fallback in sentry.js.
**Known issues:** `firebase deploy --only firestore:rules` still needs manual run by Jacek.

## 2026-04-17 — Feature Flags + Sentry (CC_BRIEF_FEATURE_FLAGS_AND_SENTRY)
**Commit:** d8652d2
**Status:** ✅ Deployed
**What changed:** Added 3-layer feature flags system (static + Firestore dynamic + role-based audience), Sentry error tracking (graceful no-op without DSN), FeatureGate component for gating beta features, Debug Flags page (/debug/flags, admin only), admin-only link in More tab (both tournament + training). ErrorBoundary replaced with Sentry.withErrorBoundary preserving existing crash UI. Firestore rules updated for /config/ subcollection.
**Known issues:** Two TODO placeholders: `UID_JACEK_TBD` in useFeatureFlag.js + firestore.rules (Jacek to provide real UID), `__SENTRY_DSN_TBD__` in .env.example (Jacek to create Sentry project). App works fully without both — graceful defaults. Bundle grew ~19KB (838KB index, from 819KB) due to @sentry/react.

## 2026-04-16 — More tab actions + workspace in Account (CC_BRIEF_MORE_TAB_ACTIONS_AND_ACCOUNT)
**Commit:** d7c742a
**Status:** ✅ Deployed
**What changed:** Simplified More tab across training + tournament. Removed `StatusHeader` + LIVE toggle + `WorkspaceFooter` (from cea1a20 — superseded by this brief). Actions section is now a single adaptive row: Zakończ/Zamknij when live → Usuń when ended (no reopen path). Workspace moved into Account section between Profile and Sign out. Scout tab read-only when session closed: matchup/match tap routes to review-only, hint shows "tap to view", no Add CTA. Context bar badges gray out and subtitle gains "zakończony" suffix when closed. New i18n keys: `end_training_msg`, `close_tournament_msg`, `session_ended`, `actions_single` (pl + en). Confirm modal copy localized.
**Known issues:** Reopen flow is gone — if a user ends by mistake they must delete + recreate; confirm acceptable before wide rollout. "tap to scout" / "tap to view" hints in tournament Scout tab are still hardcoded English. `NEXT_TASKS.md` is partially stale (PLANNED still lists already-shipped briefs as ACTIVE) — not touched this deploy.

## 2026-04-15 16:00 — Bilingual support PL/EN (CC_BRIEF_I18N)
**Commit:** 66b856a
**Status:** ✅ Deployed
**What changed:** Added a lightweight custom i18n layer (no library): `src/utils/i18n.js` flat dictionary PL+EN, `useLanguage` hook with localStorage persistence (default Polish), and a `LangToggle` pill wired into `PageHeader` so it appears on every screen. Wired `t()` into ScoutedTeamPage, QuickLogView, LineupStatsSection, TrainingPage, ScoutRankingPage, PlayerStatsPage, and SessionContextBar. Refactored `generateInsights`/`generateCounters` to accept a `lang` param and attach a stable `key` + `data` payload to each insight; counters now match on `insight.key` instead of Polish substring parsing, so language switches re-render insights cleanly.
**Known issues:** Some lower-traffic labels in PlayerStatsPage (metric card labels, shot-bar section titles) and match history copy remain untranslated — not in brief scope. Precommit reports pre-existing warnings in scoutStats.js/theme.js (not touched). Polish strings in the new i18n.js dictionary itself trip the Polish-string linter, which is expected for a translation file.

## 2026-04-15 — Status system + layout scope + lineup analytics + zone picker (CC brief)
**Commit:** 48bf709
**Status:** ✅ Deployed to GitHub Pages
**What changed (4 parts):**
- **Part 1 — status/eventType/isTest:** tournaments gain `status` (open/live/closed),
  `eventType` (tournament/sparing), `isTest` flag; trainings gain `isTest`.
  NewTournamentModal has a 3-way selector (Tournament/Sparing/Training) plus a
  Test session checkbox. App.jsx now renders a persistent `SessionContextBar`
  above BottomNav that surfaces any LIVE tournament/training; TrainingPage
  footer has Set LIVE / ● LIVE — deactivate; tournament LIVE toggle lives in
  the More tab Tournament section. TEST badges in TournamentPicker + AppShell.
- **Part 2 — zone picker in QuickLogView:** three-step flow pick → zone → win.
  Each selected player gets Dorito/Centrum/Snake toggles that map to synthetic
  `{x,y}` coordinates (0.15/0.20, 0.15/0.50, 0.15/0.80) so lineup analytics can
  zone-classify without full canvas scouting. Skip link at both steps logs
  score only. TrainingPage + MatchPage onSavePoint pass `players[]` through.
- **Part 3 — layout scope:** new `useLayoutScope` hook; PlayerStatsPage
  `?scope=layout&lid=` with picker + summary header counting sparing/tournament
  events; ScoutedTeamPage "Ten turniej / Cały layout" pills that aggregate
  heatmapPoints across every tournament sharing the same layoutId (resolved
  per-tournament via scouted entry matching teamId); ScoutRankingPage now has
  three scope pills Globalny / Ten layout / Ten turniej with filtered stats.
- **Part 4 — lineup analytics:** `computeLineupStats()` in generateInsights.js
  builds pair and trio win-rate combos by side with D/C/S zone classification
  (position-first, slot-index fallback), played ≥ 3 threshold, lowSample flag.
  New `LineupStatsSection` component with Pary — dorito / — snake and Trójki
  groups wired into PlayerStatsPage above Preferred position.

**Known issues:**
- Layout aggregation on ScoutedTeamPage re-fetches per tournament on every
  scope toggle — no caching. Fine for small layouts, may lag for large ones.
- Zone picker is per-point; if lineup stays the same, zones persist across
  saves, but you'll still see the zone step for every new selection change.

---

## 2026-04-15 — Coach language overhaul (CC brief)
**Commit:** 946f337
**Status:** ✅ Deployed to GitHub Pages
**What changed:** All coach-facing analytics text on ScoutedTeamPage +
generateInsights rewritten to plain Polish, with section reordering so
"Jak ich pokonać" (Counter plan) appears before "Jak grają" (Key insights).
Pills, row labels, side tendency classifiers, performance rows, confidence
banner, scout ranking subtitle and QuickLogView strings all localized.
Counter generator keyword matching updated to Polish across text+detail
so predictable-formation D/S counts and side vulnerability zones still work.
**Known issues:**
- Precommit emits ~40 "Polish string detected" warnings (expected — the
  brief explicitly authorizes Polish for coach analytics); they're warnings,
  not errors, so commits still pass.
- CC_BRIEF_I18N.md landed upstream during this work; a future proper i18n
  pass may supersede this hard-coded Polish copy.

---

## 2026-04-15 — Practice UX + Scout Ranking scope (CC brief)
**Commit:** d7de9b4
**Status:** ✅ Deployed to GitHub Pages
**What changed:** ScoutRankingPage now has a Global / Tournament scope toggle
with a tournament picker; TrainingPage context bar uses shared Btn ghost
components and gained an Attendees back link; MatchupCard no longer does
tap=won direct saves (every tap opens QuickLogView); QuickLogView renders two
labeled squad sections with color dots and shows an Advanced scouting link.
**Known issues:**
- If no players are picked, QuickLogView still saves with empty assignments;
  TrainingPage's per-squad auto-fill catches that, but MatchPage single-team
  tournament quick-log will persist an empty lineup — watch for roster-less
  points in tournament review.

---

## 2026-04-15 — Auth + Scout Ranking (CC brief)
**Commits:** ab0dff5 → c6e2917 (2 commits)
**Status:** ✅ Deployed to GitHub Pages
**What changed:** Email/password login via Firebase Auth (LoginPage) gates the app
before the workspace code; Firestore /users profiles on first real login; new
Scout Ranking / Scout Detail / My scouting TODO pages computed from per-point
`scoutedBy` attribution; confidence banner and MatchPage review cards now
surface scout display names via a cached `useUserNames` hook.
**Known issues:**
- Email/Password provider must be enabled in Firebase Console
  (Authentication → Sign-in method) or login fails with
  `auth/operation-not-allowed`.
- Existing legacy anonymous sessions pass through unchanged, so old workspaces
  still work without an email account.

---

## 2026-04-15 02:00 — Opus direct session (massive feature + bugfix batch)
**Commits:** debdde6 → b035bf6 (14 commits)
**Status:** ✅ Deployed to GitHub Pages

**Features shipped:**
- Quick Logging mode — roster chips → tap winner → next, no canvas (Don's paper replacement)
- Counter Suggestions — tactical recommendations from opponent insights ("Send runner to snake", "Eliminate key player")
- Formation consistency insight — "Predictable — same formation 73% (2D 1S 2C)"
- Fifty bunker detection — "Aggressive Snake 50" instead of generic zone
- Full player profile — bunkers, break/obstacle shot patterns, kills, K/pt on PlayerStatsPage
- Tournament settings + Close tournament in More tab
- New tournament / New training buttons in More tab + empty state
- Practice mode simplified (no league/division/year required)
- Squad names R1/R2/R3/R4 (was Red/Blue/Green/Yellow)
- Cleaner base labels (just team name, no "BASE" text/arrows/borders)
- Separated break vs obstacle shot indicators (two concentric rings, different end markers)

**Bug fixes:**
- fieldSide bug: solo save gave both teams same fieldSide → heatmap/run lines from wrong base
- Auto-swap after save: disabled (was auto-enabling "Swap sides" on winner selection)
- Toolbar dismiss: transparent backdrop catches taps outside buttons
- QuickShotPanel dismiss: tap canvas closes panel
- Back button: 28px → 44px touch target + replace navigation
- PointSummary bar removed (redundant)
- Switch team button removed (cleaner flow)
- Score colon color: #2a3548 → #64748b (4 places)
- PlayerStatsPage kills: piped opponent data through buildPlayerPointsFromMatch

**Apple HIG audit:**
- Touch targets: squad chips 40→44, +/- buttons 32→44, edit squads 32→44
- fontFamily: FONT added to Training pages, MoreTabContent, QuickLogView
- All elevation layers verified correct

**Known issues:** None critical

---

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
