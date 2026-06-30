# CC_AUTOPILOT_ENVELOPE.md

> Governance envelope for hands-off CC execution. Defines how much CC may do
> without a Jacek gate, scaled to blast radius. This lowers the *approval*
> gate per tier — it never lowers the *quality* bar (see Verification, which
> is tier-independent).
>
> **CANONICAL.** This is the single source of truth for the CC merge / deploy
> authorization gate. It supersedes `PROJECT_GUIDELINES.md` §7.6 (TWO-TIER v2 +
> Tier 1.5) and the `CLAUDE.md` "never merges without Jacek GO — including
> doc-only" line. See "Supersession & tier mapping" below.

## Core dial: blast radius
A task's tier is set by what can break if the change is wrong — not by effort
or size. One small file that rewrites a write path is RED. A large cosmetic
refactor across arcade screens is GREEN.

## Tiers

### GREEN — hands-free to merge
No Jacek gate. CC runs the full cycle and merges. Qualifies only if ALL true:
- No Firestore schema change (no new/changed collection, field, or write path)
- No route change
- No auth / permission / invite / magic-link surface
- No multi-tenant isolation surface
- Scope self-contained (isolated file or tightly-bound set)
Typical: arcade internals, copy/content, isolated style/CSS, logo/asset swap,
doc edits, self-contained utility.
Cycle: branch → implement → build → verify → merge --no-ff → push → DEPLOY_LOG.
Jacek touch: none. Inspect anytime via git log / DEPLOY_LOG.

### AMBER — one gate at merge
None of the RED triggers, AND any of:
- New screen/view reading existing collections (no new write path)
- New feature on an established, shipped pattern
- Multi-file change inside one shipped architecture
- Change to a shared component used across screens
Cycle: full discovery + implementation + build + verify on the branch.
ONE stop — immediately before merge. CC posts a merge-readiness note:
files changed · test results (incl. the real-acceptance test) · what to check
on prod. Where a locked mockup exists for the task, CC compares the built
screen against it and reports any drift before the stop.
Jacek touch: one GO + prod eyes, then CC completes merge → push → DEPLOY_LOG.

### RED — full discipline (status quo, deliberately slow)
ANY one of these → RED:
- New or changed Firestore collection / field / write path
- Multi-tenant data isolation (FIT separation, §90 Catalog + Tenant data model;
  Phase 2.2.d / 2.3.d scope)
- Auth, permissions, invite control, magic-link
- Cross-event aggregation / events-collection unification (Model B/C territory)
- Route shape implying a new context
- Any task where the right answer might be "this is architecture, not a hotfix"
  — architecture signals: different collection · different write path ·
  different route shape · UI/copy that assumes a single context
Cycle: staged briefs from Opus. No architectural decisions by CC.
Architectural escalation to Jacek. GO at every checkpoint.
This is FIT-readiness work. It stays slow on purpose.

## The ratchet (safety invariant)
Tier can only go UP, never down.
- Jacek declares the tier at handoff. If he doesn't, CC classifies and
  proposes, defaulting to the highest plausible tier.
- If during discovery CC finds a trigger for a higher tier, CC PROMOTES the
  task and stops to escalate.
- CC may NEVER demote a task or talk itself into a lower tier.
  Uncertain → treat as the higher tier.

## Verification — tier-independent, non-negotiable
Autopilot lowers the approval gate, not the quality bar. These hold in GREEN too:
- "Done" = a test that reproduces the real user acceptance and fails first.
  A green e2e that does not exercise the real path is NOT a done-signal.
- After one failed fix, instrument before the second attempt.
  No chained speculative fixes.
- **Scope tests to the change — do NOT run the full suite per iteration.** Run only the
  specs that exercise the touched surface PLUS the relevant golden/parity spec. e.g. a
  scout/`MatchPage` chrome or canvas-render change = `matchpage-modes` + the `capture-parity`
  golden (+ tactic golden if drawing touched) — NOT all ~116. The full suite is the CI
  **deploy gate's** job (runs on main-push); locally, the minimal change-relevant set gives
  the same signal far cheaper. Running the whole suite every iteration burns tokens/time for
  zero added signal. (`npm run test:e2e -- &lt;spec-glob&gt;` / `--grep`.)
- **Gate on the TEST RESULT, never a masked exit code.** A pipe's exit status is its LAST
  command's — so `npm run test:e2e ... | tail` (or `| grep`) returns `tail`'s 0 even when specs
  FAILED. NEVER chain `&& git commit && git push` after a piped test command — you'll ship red.
  Read the actual `N passed / N failed` line first, THEN commit. (This footgun once pushed a
  failing spec to main; the CI gate caught it, but don't rely on that.)
- **e2e suite runs in the app DEFAULT language (Polish).** So a UI text assertion must match the
  RENDERED language: when you localize a previously-hardcoded English string, update its spec
  assertions to the Polish text (or, better, a `data-testid`). Do NOT globally pin the suite to
  English — it was tried and reverted (it broke specs that assert Polish, e.g. `scoutedteam-rail`'s
  `getByLabel('Rysuj plan coacha')`). Prefer `data-testid` over text matches for new assertions.
- **Never claim a verification you did not actually perform.** The emulator render-harness can
  stall on the LOGIN screen (auth seed / stale service-worker / wrong port) → it screenshots
  login, not the screen — so "render-verified the visual" is then HOLLOW. If a render check
  didn't reach the real screen, say so; **visual fidelity falls to Jacek's prod eyes**, never a
  fabricated "render-verified". Data correctness (capture-parity golden) stays reliable
  regardless. (This is why a visual mismatch can ship under a green gate — see
  [[feedback_render_verify_catches_gate_misses]] in memory.)

## Channel
Design ↔ CC is the repo. A locked prototype is the contract; CC implements
against it. There is no live model-to-model channel — the repo is the
handoff, and that is by design (repo = truth).

## What stays with Jacek (never automated)
- GO on every RED merge
- Intent ("is this what I meant") and product feel ("does it feel right on
  prod") — Jacek is the only prod eyes
- Tier declaration at handoff / confirming CC's proposed tier
- Every architectural call

## What CC may now do without asking
- GREEN: the full cycle through merge
- AMBER: the full cycle up to the merge gate
- Both: choose implementation detail within the locked design and patterns

## Supersession & tier mapping
This envelope replaces the prior two frameworks; do not also follow them as
prescriptive (they remain only as dated historical record).

| Prior (PROJECT_GUIDELINES §7.6) | Maps to here |
|---|---|
| Tier 1 — approved-pattern / proven-identity / logic-only / docs | **GREEN** (logic/docs/self-contained) or **AMBER** (shared component / multi-file in shipped arch) |
| Tier 1.5 — mockup-approved Tier-2 work in an authorized autonomous block | **AMBER** — the locked mockup IS the contract; CC compares build↔mockup, reports drift; in an autonomous block the "one gate" collapses to Jacek's prod smoke after (same as Tier 1.5 did) |
| Tier 2 — new pattern, no mockup, new write path / route / auth / tenant | **RED** |

Preserved invariants (unchanged by this doc):
- **Tenant-isolation rule changes are ALWAYS RED** + need an explicit in-brief
  CONFIRM before deploy, regardless of block authorization (see CLAUDE.md
  Firebase-autonomy policy — that policy is governed there, not here).
- **Never merge red** — any failing build / precommit / e2e stops the merge at
  every tier.
- Precedent: §B phase view (mockup-6) + §C nav drawer (mockup-7) shipped under
  the old Tier 1.5 → now AMBER-with-mockup.

## Scope boundary
This envelope governs the **app merge/deploy approval gate** only. Firebase-side
autonomy (admin-SDK reads, `--dry` migrations, indexes, `--live` + rules) stays
governed by the canonical Firebase-autonomy policy in `CLAUDE.md` — unchanged.
