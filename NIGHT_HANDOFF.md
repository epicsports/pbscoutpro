# NIGHT HANDOFF — 2026-06-16 → 17

`PRE-FLIGHT done.` Night-autonomous run. This file = the morning decision-queue.

---

## A. Packing Checklist (`feat/packing-checklist`) — STAGE F handoff

**Status:** ✅ SHIPPED 2026-06-17 (merge `a73a7744`). e2e green (fail-first caught 3 real bugs — see DEPLOY_LOG), merged to main (app auto-deploy), owner-only `appState` rule deployed. Closeout in DEPLOY_LOG + NEXT_TASKS.

### STEP 0 findings (verified live)
- **Player menu:** Option A — "Checklista" added to the **KONTO** section of `MoreTabContent.jsx` (linkedPlayer-gated, beside "Moje statystyki") → lazy `/player/checklist` route (`App.jsx`). All routes are `React.lazy` (its own chunk; manualChunks touches node_modules only).
- **ui.jsx:** reused `Btn`, `Input`, `ConfirmModal`. Checkbox/stepper/sheet/ring kept LOCAL to the feature (v1, per brief OUT-list).
- **e2e:** Playwright `playwright.emulator.config.js`, specs `tests/e2e/`, emulator-seeded serial.

### STEP 0.5 — persistence (the key decision)
- `users/{uid}` doc EXISTS (`getOrCreateUserProfile`). No prior per-user prefs store (handedness is localStorage). uid via `useWorkspace().user.uid`.
- **Chosen path: `users/{uid}/appState/packing`** (Stage D wired): read-once on mount + debounced 600ms `setDoc(merge)` with **nested-map literals** (dot-notation trap avoided). All reads/writes try/catch → **degrade silently to in-memory** (React state is source of truth).
- **Players ≠ auth users** distinction confirmed: the checklist is per-AUTH-user, gated on `linkedPlayer` (so it shows for linked players). Unlinked users don't see the entry.

### ⚠ STAGED, NOT DEPLOYED — `firestore.rules`
Added an owner-only `match /users/{uid}/appState/{doc}` rule (read,write if `auth.uid==uid`). **Deploy with GO:** `firebase deploy --only firestore:rules`. Until then prod persistence degrades to in-memory (UI still fully works). The EMULATOR loads the branch rules, so e2e persistence is testable.

### e2e — written, NOT YET RUN (run denied this session)
`tests/e2e/packing-checklist.spec.js` drives the REAL path: menu entry → `/player/checklist` → reset → critical badge (N>0) → check all critical via the sheet → success (`Komplet — możesz jechać`) → reload-persists (0 missing) → landscape (no h-overflow, header+bar visible). **Owed: run it** (`npm run test:e2e -- packing-checklist`) to confirm red→green before merge. Build + precommit (0 errors) pass.

### Token deltas vs brief §4 (theme.js wins — used theme tokens)
- `FONT_SIZE` is keyed `xxs10/xs12/sm13/base15/lg17/xl20/xxl24` (brief said xs11/md17/lg20/xl25) — used the theme keys.
- `RADIUS` keyed `xs4/sm6/md10/lg12/xl14/xxl20` (brief sm8/md12/lg16/xl22) — used theme keys.
- One allowed `rgba` (critical-row tint `rgba(245,158,11,0.07)`) per brief §4. Otherwise zero new hex.
- **Lint note:** the static catalog's Polish item labels trip the warning-level Polish-string lint (21 warnings) — they're domain DATA (like `i18n.js`, which is skipped). **Follow-up:** add `src/data/` to the lint skip.

### Drafted DEPLOY_LOG entry (push on merge)
> `## 2026-06-17 — [FEATURE] Packing Checklist "Checklista wyjazdowa" (player)` — in-app travel checklist (static catalog v1, 3 templates, binary/counted items, critical sheet, custom items, progress ring), per-user persistence `users/{uid}/appState/packing` (degrade-to-memory). RULES: deployed the staged `appState` owner-only rule. Menu: KONTO → Checklista (linkedPlayer). e2e green. Phase 2 parked (weather/trip-context/shared templates).

### Ready-for-GO summary
Feature is branch-complete + builds; **run the e2e + eyeball the screen**, then GO to (1) merge, (2) `firebase deploy --only firestore:rules`. Phase 2 (weather banner, trip-context card, shared templates, quantity-edit, promote-to-ui.jsx) recorded in `docs/PACKING_CHECKLIST.md`.

---

## B. Broader night run — decision-queue

### ✅ Shipped to main (CI-gated)
- **B26 closed** (retired misframed repair box) + **player dedup** (Item 1 prevention LIVE; `--live` merged 13 obvious dups; 0 collisions; 61 namesakes left).
- **view-as re-enabled** (`f45086ea`) — real impersonation + persistent visible exit; e2e green.
- **Playbooks** (`de9f16bb`) — coach-framed drawer entry + role-branded LayoutsPage; e2e green.
- **i18n aria-labels** (`fcc62b3d`).
- **Reads Mini STAGE 1 docs** (`b0022305`, §117) — spec only.

### 🟡 Owed a decision / GO (Jacek / Opus)
- **Reads Mini STAGE 2 build** — GO to build (STAGE 3 App Check separate). Audio file `sky-catcher-loop60.m4a` to drop into `public/sounds/`.
- **Tactics consolidation** — `--live` migrate 9 + delete 24 orphans. PREP (backups + final coverage read) owed; both `--live` ops Hard-ESCALATE → GO each.
- **Packing Checklist** — merge + rules deploy (above).
- **§93 logo (iPhone)** — diagnosis done: likely a broken/mixed-content `logoUrl` value OR a stale PWA CacheFirst opaque response. Read the affected workspace's `logoUrl` + load it in mobile Safari to bisect (data vs cache). You smoke iPhone.

### ℹ Findings (no action / closed)
- **i18n duplicate keys** — ZERO genuine collisions; all 5 board-listed names are distinct prefixed keys. Board claim retired; no dedup needed.

### ⏭ Still-queued safe items (not yet done tonight)
- DRY `drawLineFromTo` (refactor, pixel-diff=0) · ci-flake `hitability-responsive` (stabilize waits) · loupe pan-lag (small throttle OK / structural→defer) · add `src/data/` to lint skip.
