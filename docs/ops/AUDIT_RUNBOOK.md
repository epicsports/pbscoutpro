# Cross-device render audit — runbook

How to run the automated cross-device / multi-role render audit, and the
non-negotiable discipline around trusting its output. Born from the wave-1
INVALID incident (a generateInsights crash made most captures measure the Sentry
"Crash Report" fallback, so the layout register was garbage). Read before triage.

---

## 0. The rule that comes first

**An automated register is NEVER accepted sight-unseen.** Before any triage,
Jacek eyeballs ~10 random screenshots from `audit/screenshots-full/`. If those 10
don't match what the register claims (e.g. register says "clean" but the shot is a
crash screen, or vice-versa), the whole run is suspect — STOP, find the root
cause, fix, re-run. A green register is a hypothesis until the screenshots confirm
it.

**Corollary (check #8):** a crash capture is not a layout finding. If
`FINDINGS_FULL.md` → "Crash / error state" shows crash-screens > 0, fix the crash
and re-run before trusting any layout number in the file. A dead React tree
reports bogus widths/heights.

---

## 1. Prerequisites

- **Portable JRE** (Firestore emulator needs Java; this machine has none on PATH):
  ```powershell
  $env:JAVA_HOME = "$env:LOCALAPPDATA\jre-temurin"
  $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
  ```
- **No zombie processes on the emulator/dev ports.** A killed run can leave the
  emulator holding `8080` (firestore) / `9099` (auth) / `5173` (vite) with a STALE
  seed — the next run reuses it and you audit last run's data. If the harness hangs
  despite the fixes, **check zombie processes on those ports FIRST** (before
  touching the harness):
  ```powershell
  Get-NetTCPConnection -LocalPort 5173,8080,9099 -State Listen -ErrorAction SilentlyContinue |
    Select-Object LocalPort, OwningProcess
  # then: Stop-Process -Id <pid> -Force
  ```
  (`$PID` is a PowerShell reserved variable — name your loop var `$procId`, not `$PID`.)
- **Stash-protect the experimental CLI files** so they never enter an audit
  branch:
  ```powershell
  git stash push -u -- scout.js scout.py scout.pys package.json package-lock.json
  ```
- **Laptop must stay awake** — the local emulator run dies if the machine sleeps.

---

## 2. Run

```powershell
# ALWAYS run under the watchdog (never bare playwright — see "Liveness" below).
# The runner spawns playwright (config sets reuseExistingServer:false → fresh
# emulator + fresh seed-stress.cjs) and aborts the run if it wedges.
node scripts/audit/run-with-watchdog.cjs
node scripts/audit/build-findings-full.cjs
```

### Liveness (GUARD #2 — non-negotiable)

**"Brak powiadomienia ≠ działa; the watchdog is the only source of truth about
run liveness."** A silent background run can be wedged (a pegged browser renderer
hangs `page.evaluate`/`page.screenshot`, which have no native timeout) and look
identical to a slow-but-healthy one. Two guards make a hang a non-terminal state:

1. **Per-capture guard (in the spec):** the ENTIRE per-capture unit (viewport +
   nav + reload + wait-for-ready + checks + screenshot) runs inside ONE 55s hard
   timeout. No `await` in the capture loop lives outside it. A wedged page fails
   that one capture and the run advances.
2. **Run-level watchdog (`run-with-watchdog.cjs`):** a sidecar polls
   `audit/findings-full.json` mtime every 30s; staleness > 120s (after a 180s
   boot grace) ⇒ it appends a `RUN-ABORTED-WATCHDOG` record, `taskkill /F /T`s
   the whole tree, and exits — so the task COMPLETES and the notification fires
   on its own. Worst case is an automatic abort ~2 min after a wedge WITH
   diagnostics (last completed capture in the record), never minutes of silence.

If `build-findings-full.cjs` prints the **RUN ABORTED BY WATCHDOG** banner, the
register is partial: read the reason (it names the last completed capture — that
route is the prime wedge suspect), fix, re-run.

Outputs:
- `audit/findings-full.json` — raw per-capture records (written incrementally; a
  hung run still leaves partial data).
- `audit/FINDINGS_FULL.md` — the human register.
- `audit/screenshots-full/<role>/<route>__<viewport>.png` — the eyeball evidence.
- `audit/REACHABILITY_MAP.md` — guard-derived per-role access deltas (authoritative
  for "who can reach what"; the render crawl can't reach what the guards block).

The harness is **fail-fast per route AND per role**: a stuck/slow login records
`FAILED login-blocked` and continues; a route that doesn't reach READY in 15s
records `not-ready` and continues. It does NOT hang the whole run. Each route is
isolated with `goto('about:blank')` first so one crash can't cascade into the next
capture's measurements.

---

## 3. Check #8 — crash / error state

Every capture records:
- `crashUI` — the Sentry `<h2>Crash Report</h2>` fallback is on screen.
- `consoleErrors` / `consoleErrSample` — console-error + pageerror count (reset per
  route).

In the register:
- `crashUI` (or `contentStatus === 'FAILED-CONTENT'`) ⇒ a single `P0 crash-screen`
  flag, and **all geometry checks are skipped** for that capture.
- console errors with no crash ⇒ a soft `P2 console-error` flag (UI rendered, but
  something threw in the background — eyeball it).
- The "Crash / error state" section at the top of `FINDINGS_FULL.md` rolls these up
  across all roles.

---

## 4. Known constraints

- **Non-admin roles (scout/player)** may not capture under automation: their
  workspace auto-enter does a blocking member-write per cold-load ("Preparing your
  workspace…"), which can outlast the login budget. They record as login-blocked +
  continue. Their access deltas live in `REACHABILITY_MAP.md`; allowed-route render
  ≈ coach baseline (shared components, no role-branched layout). The blocking
  member-write is logged as a backlog perf item (NEXT_TASKS).
- **"Disappeared since wave-1"** is mostly expected (touch<44 cluster was fixed;
  stress fixture differs from wave-1). Verify the non-touch entries only.
