# Cross-device render audit — FINDINGS_FULL — ⛔ REGISTER DEFERRED (no valid run yet)

> **Do not triage any render findings from this file or `findings-full.json` yet.**
> As of **2026-06-10**, no audit run has produced a trustworthy baseline. The
> crash that contaminated earlier runs is FIXED and verified — but the audit
> *harness* still needs stabilization before the render register is reliable.
> Tracked as a stabilization item in `NEXT_TASKS.md`.

## What IS done (the crash hotfix — solid, independent of the register)
- **generateInsights `zoneShots` crash fixed** — `Array.isArray` guard
  (`src/utils/generateInsights.js`); fail-first unit test RED→GREEN
  (`tests/unit/generate-insights-tags.spec.js`).
- **Prod data scanned clean** — `scripts/migration/scan_nonarray_zoneshots.cjs`:
  505 points across 2 workspaces, **0** non-array `zoneShots` inners. The crash
  shape was a seed-authoring artifact; no production data affected, no remediation.
- **Harness hardened** — check #8 (crash/error state + `crashUI`/console-error),
  `about:blank` cascade isolation, single per-capture hard-timeout guard, and a
  run-level watchdog sidecar (`scripts/audit/run-with-watchdog.cjs`). See
  `docs/ops/AUDIT_RUNBOOK.md`.

## Why every run so far is INVALID
| Run | Verdict | Cause |
|---|---|---|
| wave-1 / 3-role partial (`9e32286e`) | **INVALID** | generateInsights crash → most captures measured the Sentry "Crash Report" fallback (hash-only goto kept a dead React tree). |
| 2026-06-10 v2 (post-crash-fix) | **INVALID** | coach (the delta baseline) authenticated but auth did not persist across the per-route `about:blank` reload → all 160 coach captures were the **login page** (bodyText 112). Every "differs-from-coach" was just "differs from a logged-out baseline." scout 20/20 hard-timeout (auto-enter + per-route reload); player never reached. |

## Harness gaps to fix before the next run (→ stabilization brief)
1. `READY_PRED` treats the **login page as "ready"** (bodyText > 40). It must
   reject the sign-in screen.
2. **No post-login assertion** — after `clearAuthAndLogin`, assert we are NOT on
   the login page (and a known logged-in marker IS present) before capturing;
   fail the role fast otherwise instead of capturing 160 login screens.
3. **scout/player auto-enter** does a blocking member-write per cold-load; the
   harness's per-route reload re-pays it every route → 55s timeouts. Either fix
   the auto-enter perf (backlog item) or skip non-admin render and rely on
   `audit/REACHABILITY_MAP.md` (authoritative for non-admin access).

`audit/REACHABILITY_MAP.md` (guard-derived per-role access) remains valid and is
unaffected by the above.
