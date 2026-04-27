# Security Audit — 2026-04-25 (end-of-MAX cleanup)

**Auditor:** CC
**Date:** 2026-04-25
**App version:** `2ebcce2` (HEAD prior to this audit)
**Brief:** `CC_BRIEF_PRODUCTION_AUDIT_2026-04-25` (Phase 1)

---

## 🚨 EXECUTIVE SUMMARY

**P0 ESCALATE — needs Jacek action TODAY:**
- **Anthropic API key leaked in public Git history.** Key `sk-ant-api03-KYGNizd7Du…lQ-wNVrmgAA` was committed at `f7450b7` (2026-04-06) inside a `.env` file and only deleted from HEAD at `4c74335f` (2026-04-20). The commit is still publicly retrievable from `https://github.com/epicsports/pbscoutpro` via `git show f7450b7^:.env`. **ROTATE THIS KEY IMMEDIATELY** at https://console.anthropic.com → Settings → API Keys. Rotation invalidates the leaked key — that is sufficient. History scrubbing (filter-branch / BFG) is OPTIONAL; the published key is already cached in clones, GitHub forks, and internet archives, so scrubbing buys nothing once rotation is done. See `## 3. Secrets / config audit` for the verbatim diff and step-by-step rotation guidance.

**P0 fixed inline this session:**
- **VisionScan.jsx env-fallback hole closed.** `src/components/VisionScan.jsx:159` previously did `localStorage.getItem(...) || import.meta.env.VITE_ANTHROPIC_API_KEY`. If anyone re-introduces a `.env` with that variable, Vite would inline the secret into the public JS bundle on `npm run deploy`. Removed the env fallback; the key is now sourced exclusively from user-provided localStorage (matching `OCRBunkerDetect.jsx` + `ScheduleImport.jsx`). 1-line edit, cosmetic comment. Will be in the same commit as this audit report.

**P1 deferred (logged below; do not require immediate fix):**
- 6 latent rules-level concerns originally logged. **Two SHIPPED 2026-04-25 in `bed5d05` (Tier B rules hardening):** P1.1 (`/users` disabled-flag bypass — closed via allow-list `hasOnly(['displayName', 'email', 'linkSkippedAt'])` on self-update) and P1.2 (`passwordHash` self-write window — closed by dropping it from the workspace self-join allow-list). Jacek verified 4 flows post-deploy.
- 4 still deferred: /users global read at scale, selfReports per-pid ownership, userRoles self-write diff gap, workspace adminUid create-time injection. All known-acceptable under today's single-admin + invited-only-workspace threat model. Real fixes need custom-claims migration → Brief G territory.

**ESCALATE items (need Jacek decision):**
- (1) Rotate the Anthropic key — not something CC can do; needs console.anthropic.com auth.
- (2) Decide whether to scrub git history. **CC recommendation: skip** unless the key is genuinely high-value (it is — but the public exposure is already committed; rotation is the corrective action).

**NOT in scope for tonight (deferred to Phase 2 / Brief G):**
- Custom-claims-based admin gating (replace `ADMIN_EMAILS = ['jacek@epicsports.pl']` allowlist)
- Server-side Firebase Auth deletion (true delete vs `disabled` flag)
- Migration of `users/{uid}.roles` bootstrap to a single source of truth in workspace.userRoles

---

## 1. Firestore rules audit

`firestore.rules` (304 lines) read in full. Helper functions are minimal and consistent: `isAdmin / isCoach / isScout / isPlayer / isMember` all chain into `wsData(slug).userRoles[uid]` for role checks; `isAdmin` includes the hardcoded `jacek@epicsports.pl` email allowlist as an emergency-restore path.

**Per-collection authority table:**

| Collection | Read | Write / Update / Create / Delete | Concern level | Notes |
|---|---|---|---|---|
| `/users/{uid}` | any auth | self (write any field) + jacek@email (update disabled-family fields only) | **P1** | Self-write rule allows user to clear `disabled` flag and re-enable themselves (soft-delete bypass via SDK). Real fix needs custom claims. |
| `/{path=**}/selfReports/{sid}` (collection-group) | any auth | n/a (CG read only) | **P1** | Cross-workspace read possible at multi-workspace scale. Single-workspace today (ranger1996) → no actual leak. Used by `getLayoutShotFrequencies` crowdsource query. |
| `/workspaces/{slug}` (root) | any auth | admin: any. Self-join envelope: members + userRoles + pendingApprovals + lastAccess + **passwordHash**. Self-leave envelope: same minus passwordHash + lastAccess. Delete: admin. | **P1** | `passwordHash` in self-join allow-list permits any auth user to overwrite the workspace password during an enterWorkspace call. Mitigated today: ranger1996 already has a passwordHash so the line-184 fallback in `useWorkspace.jsx` is unreachable; LoginGate retired so password-typed entry is admin-only; jacek admin via email allowlist not via password. Recommend dropping `passwordHash` from the allow-list in a future rules deploy. |
| `/workspaces/{slug}/config/{doc}` | isMember | isAdmin | OK | Feature flags + workspace config. Tight. |
| `/workspaces/{slug}/players/{pid}` | isMember | isCoach (any) + 3 carve-outs (self-link, self-edit, self-unlink), each `affectedKeys.hasOnly(...)` field-restricted | OK | Recently hardened (`d548ad3` 2026-04-25 missing-field fix via `data.get('linkedUid', null)`). Carve-outs verified tight. |
| `/workspaces/{slug}/players/{pid}/selfReports/{sid}` | isMember | create/update/delete: isPlayer (any player in workspace) | **P1** | Rule gates on role, NOT on `pid == linkedUid(auth.uid)`. Any player can write under any other player's pid path. Already tracked in HANDOVER § 49.11 follow-up. Invited-workspace model contains attack surface; tightening = defense-in-depth. |
| `/workspaces/{slug}/pendingSelfReports/{sid}` | auth + isMember + uid match | create: auth + isMember + payload uid match. read/update/delete: auth + isMember + resource uid match. | OK | Strict per-doc ownership. Recent ship (`fa2f15c` 2026-04-24) got it right. |
| `/workspaces/{slug}/teams/{teamId}` + sub | isMember | isCoach | OK | Roster/team data. Tight. |
| `/workspaces/{slug}/notes/{nid}` | isMember | isCoach | OK | Coach notes. |
| `/workspaces/{slug}/layouts/{lid}` + sub | isMember | isCoach | OK | Layouts + bunkers + tactics. |
| `/workspaces/{slug}/tournaments/{tid}` + sub | isMember | isScout (any), with self-log carve-out at `…/shots/{sid}` for `source == 'self'` create/update/delete | OK | Carve-out correctly precedes catch-all `/{document=**}` so self-log writes win. |
| `/workspaces/{slug}/trainings/{trid}` + sub | isMember | isScout, mirror tournament structure | OK | Same shape, shots carve-out present. |

### P1 findings (deferred — rules unchanged this audit)

**P1.1 — `/users/{uid}` self-write rule allows soft-disable bypass. ✅ SHIPPED 2026-04-25 in `bed5d05` (Tier B rules hardening).**
```firestore
allow write: if request.auth != null && request.auth.uid == uid;
```
A user soft-disabled by admin (`users/{uid}.disabled = true`) can still authenticate (their Firebase Auth account is intact); the AppRoutes bootstrap renders `DisabledAccountScreen` and signs out, but a technically-savvy user can open the browser dev console while authenticated and call `firebase.firestore().doc('users/<uid>').update({disabled: false})` — the rule accepts it because self-writes are unrestricted. Soft-delete is NOT enforceable at the rules layer today.

Mitigations: requires SDK knowledge; single-admin (jacek) can re-disable from Firebase console; § 50.7 already tracks "server-side Firebase Auth deletion" as the proper fix. Defense-in-depth fix would split `allow write` into `allow create/update/delete` and add `affectedKeys.hasAny(['disabled', 'disabledAt', 'disabledBy', 'reEnabledAt'])` exclusion to self-update — see Recommendations.

**P1.2 — `passwordHash` writable via self-join envelope. ✅ SHIPPED 2026-04-25 in `bed5d05` (Tier B rules hardening).**
```firestore
allow update: if … || (
  request.auth != null
  && request.resource.data.members is list
  && request.auth.uid in request.resource.data.members
  && request.resource.data.diff(resource.data).affectedKeys()
     .hasOnly(['members', 'userRoles', 'pendingApprovals', 'lastAccess', 'passwordHash'])
)
```
Any auth user joining the workspace can additionally rewrite `passwordHash` to an arbitrary value, locking out future password-typed entry. Mitigated today: (a) ranger1996 already has a passwordHash, so `useWorkspace.jsx:184`'s legitimate-write path is unreachable; (b) LoginGate is RETIRED so password-typed entry is admin-only via Settings → workspace switch; (c) jacek admin grant comes from the email allowlist, not password. So the realistic exploit blocks "non-jacek admin re-enters via password" — empty set today.

Recommended fix: drop `passwordHash` from the self-join `hasOnly` list. Only admin (path a `isAdmin(slug)`) should be able to mutate passwordHash. This is a one-token deletion in `firestore.rules:121`. Hold for next rules deploy window (don't ship in tonight's audit since rules deploys are irreversible-ish).

**P1.3 — `/users/{uid}` global read by any auth user.**
```firestore
allow read: if request.auth != null;
```
Reading any other user's full doc (email, displayName, photoURL, defaultWorkspace, roles[], pbliId, linkSkippedAt, disabled flags) is allowed for any authenticated user, including users in other workspaces. Single-workspace today → low actual leak. As multi-workspace adoption grows this is a privacy concern. Fix is non-trivial (Members panel needs to see all user docs, but only admin should — would need a workspace-aware read predicate or split into self vs admin paths).

**P1.4 — `selfReports` write rule lacks per-pid ownership check.**
Rule gates on `isPlayer(slug)`. Any workspace player can append/edit/delete under any other player's `/players/{pid}/selfReports/` path. Already tracked in HANDOVER § 49.11.

**P1.5 — `userRoles[uid]` self-write diff gap.**
Self-join envelope rule allows the user to write arbitrary values into their own `userRoles[uid]` map slot during enterWorkspace. Latent privilege-escalation risk. Already tracked in HANDOVER § 49.11.

**P1.6 — Workspace `adminUid` create-time injection.**
The `allow create` rule on `/workspaces/{slug}` requires only `keys().hasAll(['name', 'members'])` and `members is list` and caller in members. A user can craft a `setDoc` that ALSO sets `adminUid: <other-uid>`, granting admin privileges to a third party via the `data.adminUid == uid` path in `isAdmin()`. Single-workspace reality (no UI surface for cross-workspace mischief) means this is unreachable from the app today. Defense-in-depth: tighten create rule to require `request.resource.data.adminUid == request.auth.uid` if `adminUid` is present.

### Decision tree applied

- ✅ No `allow true` / open-access rule found.
- ✅ All sensitive writes gated on auth.
- ❌ No P0 inline fix made to firestore.rules tonight. Reasoning: every P1 above is currently unreachable or low-impact under the single-workspace + single-admin + invited-only model. Rules deploys are heavyweight (irreversible without redeploy of the previous version, observable as production behavior). The Saturday-prep series (`d548ad3`, `c817516`, `fa2f15c`) already shipped tightening; layering more without device validation risks breaking a working flow. Recommend bundling P1.1 + P1.2 into a single hardening deploy at next windowed session.

---

## 2. Auth flow audit

**Bootstrap chain (`App.jsx:47-156`):**
1. `WorkspaceProvider` resolves Firebase auth state via `useWorkspace`.
2. While loading → spinner.
3. No Firebase user → `<LoginPage />`.
4. `userProfile.disabled === true` → `<DisabledAccountScreen onSignOut={signOutUser} />`. App content unreachable.
5. No workspace yet → spinner OR `<AutoEnterErrorScreen>` with sign-out escape (auto-enter failed).
6. Onboarding gate: `!isAdmin && !premigration && !linkedPlayer && !linkSkippedAt` → `<PbleaguesOnboardingPage />`.
7. Pending approval gate: `!isAdmin && !premigration && isPendingApproval` → `<PendingApprovalPage />`.
8. Otherwise `<Routes>` rendered inside `<HashRouter>`.

**Conclusions:**
- ✅ No path renders sensitive data without auth + workspace + role check.
- ✅ Admin-only routes (`/debug/flags`, `/settings/members`, `/settings/members/:uid`) wrapped in `<AdminGuard>` using `effectiveIsAdmin` from `useViewAs` (so admin impersonating lower role is blocked, per § 38.6).
- ✅ Other routes wrapped in `<RouteGuard>` use `canAccessRoute(effectiveRoles, pathname)` from `roleUtils.js`. (Sweep is incomplete per HANDOVER carry-over — `/profile`, `/scouts`, `/teams`, `/players` etc. are unguarded; URL-typing into them works for any auth user. Defense-in-depth gap, not a bypass — Firestore rules still gate the data.)
- ✅ `signOutUser` (`useWorkspace.jsx:390`) calls `leaveWorkspace()` (clears localStorage + sessionStorage workspace key + setWorkspace(null)) followed by `signOut(auth)`. Auth listener fires → setUser(null) → all dependent effects re-run with cleared identity. No state leak between users in the same browser session observed.
- ✅ Workspace boundaries enforced server-side via `isMember(slug)` rule check on every `workspaces/{slug}/...` path. User from workspace A genuinely cannot read workspace B (matches manual reasoning of single-tenant scenarios in `firestore.rules` — collection-group selfReports caveat covered as P1.x above).

**Concerns:**
- **Anonymous-user carve-out (`App.jsx:64`):** "Anonymous users (legacy sessions that already passed through the retired team-code gate) are allowed through." Real anon users are pre-§51-retire-team-code legacy sessions. Per `firebase.js:54` "ensureAuth requires email; legacy anonymous sessions still accepted — new anonymous sign-in disabled." Ship-side, no new anon users are created. Existing anon users (if any) remain authenticated until they sign out. Acceptable; should stop existing once everyone re-enrolls. P2 note: confirm via Firebase Auth console whether any anonymous users still hold workspace membership. (Logged-in `users/{uid}` docs created by anon users would have `auth.uid` = anon UID; same uid persists across sessions on same device.)
- **No CSRF surface:** App is SPA over HashRouter; no server endpoints other than Firestore (token-authed); no cookies. ✓ Not applicable.
- **Token refresh:** Firebase SDK handles automatically; no stale-token exposure.

**No P0 found in auth flow.**

---

## 3. Secrets / config audit

### 3.1 Anthropic API key leaked in git history — P0 ESCALATE

```
$ git log --diff-filter=AM -- .env
f7450b7 2026-04-06 Create .env             ← key INTRODUCED
b280315 2026-03-22 Add files via upload    ← (earlier, content unknown)

$ git show 4c74335f^:.env
VITE_ANTHROPIC_API_KEY=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
```

This file lived in the public repo from 2026-04-06 to 2026-04-20 (14 days). Removed at `4c74335f` ("chore: remove .env from tracking and properly gitignore it"). Removal does NOT scrub history — the file content is retrievable from any of the ~100 intermediate commits.

**Risk profile of the leaked key:**
- Anthropic API keys grant full API access on the owner's account (billed to Jacek). Abuse vectors: rate-limit spam, generation-quota burn, policy-bypass attempts.
- Public repos are scraped by automated key-harvesters. Assume the key is INDEXED.
- 14-day window with no rotation since = the key has been potentially exfiltrated and may be in attacker hands.

**Required action — TODAY:**
1. Open https://console.anthropic.com → Settings → API Keys.
2. Find the key starting with `sk-ant-api03-KYGNizd7Du...` and revoke it.
3. Generate a replacement key. Store it in `.env.local` (already in `.gitignore`, won't be tracked) for build-time use, OR provide it via the Vision-scan UI's localStorage prompt at runtime (current design — see VisionScan.jsx after this audit).
4. Verify the new key works: `npm run dev`, scan a layout, confirm the key prompt accepts the new value.

**Optional (not recommended):** Rewrite git history (BFG / `git filter-repo`) to remove the file from `f7450b7` and all subsequent commits. This requires force-pushing main (rewrites SHAs) — breaks all clones, breaks any CI, breaks any deploy pipeline that pinned a SHA. Since rotation invalidates the leaked key, scrubbing is purely cosmetic and the public exposure is already irreversible (caches, forks, archives). **CC recommends: rotate only.** Document in audit + runbook that the key in history is invalidated.

### 3.2 VisionScan.jsx env fallback — P0 FIXED INLINE

Source location: `src/components/VisionScan.jsx:159`.

**Before:**
```js
const apiKey = localStorage.getItem('pbscoutpro_anthropic_key') || import.meta.env.VITE_ANTHROPIC_API_KEY;
```

**After (this audit):**
```js
// Key is user-provided via localStorage; env fallback removed because Vite would inline VITE_ANTHROPIC_API_KEY into the public bundle.
const apiKey = localStorage.getItem('pbscoutpro_anthropic_key');
```

Rationale: if anyone (Jacek, future contributor, automation) re-creates a `.env` containing `VITE_ANTHROPIC_API_KEY=...`, Vite (per design — see https://vitejs.dev/guide/env-and-mode.html) inlines the value into the production JS bundle, which `npm run deploy` then publishes to the public GitHub Pages site. The original 14-day leak likely happened via an earlier deploy of exactly this kind. Closing the fallback removes the foot-gun.

`OCRBunkerDetect.jsx` and `ScheduleImport.jsx` already used localStorage-only via a `getApiKey()` helper. VisionScan.jsx was the outlier. Now consistent.

### 3.3 Firebase config — public-by-design

`src/services/firebase.js:27-34` reads `VITE_FIREBASE_API_KEY` + 5 sibling fields from env. Per Firebase docs (https://firebase.google.com/docs/projects/api-keys), Web SDK API keys are designed to be public — security is enforced via Firebase Auth + Firestore Security Rules. Bundling them into the deploy is intentional. ✅ Not a leak.

`.env.example` references only Firebase + Sentry vars. No Anthropic key referenced. ✅

### 3.4 Sentry DSN — public-by-design

`src/services/sentry.js:3-4` reads `VITE_SENTRY_DSN` with hardcoded fallback. Sentry DSNs are designed to be embedded in client-side JS — they identify the project for error ingestion, not authenticate API access. ✅ Not a leak.

### 3.5 Firebase service account / admin SDK — not present

```
$ ls *.json
firebase.json (3 lines, project config only)
firestore.indexes.json
package.json / package-lock.json
```

No service account JSON committed. Admin SDK not used in client (correctly). ✅

### 3.6 .gitignore coverage

```
.env
.env.local
*.log
.DS_Store
```

`.env` and `.env.local` covered. `.env.development` / `.env.production` / `.env.staging` NOT explicitly listed. Vite reads any `.env*` file in the project root by default. Recommend tightening `.gitignore` to `.env*` (single line catches all variants) — P2 hygiene. Not blocking.

---

## 4. Admin operational risks

### 4.1 Lock-out scenarios

**Scenario: jacek removes self from workspace.**
- UI guard in `MemberCard.jsx` + `MoreTabContent.jsx` (Wyjdź flow) checks last-admin and blocks.
- Firestore rules do NOT enforce last-admin; the self-leave envelope (`firestore.rules:123-129`) accepts the write.
- IF UI guard is bypassed (SDK call): workspace has no admin via `userRoles`, but `isAdmin(slug)` ALSO grants via `request.auth.token.email == 'jacek@epicsports.pl'`. Jacek can still perform admin actions. ✅ Safety net.

**Scenario: jacek's Firebase Auth account suspended.**
- Email allowlist would no longer match (no token). Workspace becomes unmanageable via Settings.
- Mitigation: jacek creates a new Firebase account with the same verified email → token email matches → admin restored. ✅ Recoverable.

**Scenario: jacek loses the Firebase project owner GCP credentials.**
- Cannot deploy rules / indexes / app.
- Mitigation: GCP project owner recovery via Google account flow.
- Fully blocked only if BOTH the GCP account AND Anthropic Console + GitHub access lost simultaneously.

### 4.2 Critical user flows under admin absence

| Flow | Admin needed? | Fallback if admin away |
|---|---|---|
| Email signup | No (Firebase Auth, public) | ✅ Works |
| Auto-enter ranger1996 | No (rules accept self-join envelope on default workspace) | ✅ Works |
| PBLI link to player profile | No (self-link carve-out) | ✅ Works |
| "Pomiń na razie" skip-link | No | ✅ Works (unlinked PPT mode shipped) |
| Player profile creation (new player) | **YES — coach role** | ❌ Blocks new linkers until admin/coach returns. Mitigation: PPT unlinked-mode lets player log without a profile. |
| Match scouting | No (scout role) | ✅ Works for existing scouts |
| Tournament creation | No (scout+) | ✅ Works for coach |
| Tournament close/reopen | Password-protected | ✅ Works if password known |
| Workspace member removal | **YES — admin role** | ❌ Stuck users can self-Wyjdź. |
| Role assignment changes | **YES — admin** | ❌ New roles cannot be granted. |
| Soft-disable user | **YES — jacek email allowlist** | ❌ Cannot disable bad actors. |

**Verdict:** Most flows degrade gracefully under admin absence. The ones that block (new player profile, role changes, soft-disable) are administrative-cleanup-grade, not operational-blockers. App usable for 6+ months without active admin intervention IF: (a) all current users are linked, (b) no new players join, (c) no role changes needed.

### 4.3 No automated database backup

Firestore has Google's automatic point-in-time recovery (default 7 days). No user-initiated export schedule configured. If data corruption occurs >7 days before discovery, full recovery is not possible.

**P1 — recommended runbook section in Phase 2:** document manual export procedure (`gcloud firestore export gs://...`) and recommend running it monthly via Cloud Console.

### 4.4 No P0 found in admin operational risks

Email allowlist + email-based account recovery cover the catastrophic single-admin scenarios. The blocking flows (new player creation, role grants) are non-urgent enough that 1-week admin absence is tolerable.

---

## Recommendations for Phase 2 / post-MAX

**Inline-able tonight (already done):**
- ✅ `VisionScan.jsx` env fallback removed (P0 leak prevention).

**ESCALATE TODAY (Jacek):**
- 🚨 Rotate the leaked Anthropic API key at console.anthropic.com.

**Next windowed rules deploy (1-2h, low risk if validated):**
- Drop `passwordHash` from self-join `hasOnly` allow-list (P1.2).
- Split `/users/{uid}` `allow write` into `allow create/update/delete`, exclude `disabled` family from self-update (P1.1).
- Tighten `.gitignore` to `.env*` glob.

**Brief G territory (multi-day, off-hours):**
- Custom-claims-based admin grant (replace email allowlist).
- Server-side Firebase Auth deletion (Cloud Function trigger).
- Per-pid selfReports ownership rule (P1.4).
- userRoles self-write field-value validation (P1.5).
- Workspace adminUid create-time validation (P1.6).
- /users global read scoping (P1.3).

**Operational runbook (delivered in Phase 2 step 10):**
- Manual Firestore export procedure (P2.4.3).
- Anthropic key rotation procedure (with this audit's verbatim revoke instructions).
- Sentry triage cheat-sheet.

---

## Phase 1 commit summary

This audit + the VisionScan.jsx fix will land in one commit:

```
audit(security): production audit 2026-04-25 (end-of-MAX)

- Add SECURITY_AUDIT_2026-04-25.md
- VisionScan.jsx: drop VITE_ANTHROPIC_API_KEY env fallback (P0 leak prevention)

P0 ESCALATE for Jacek: rotate Anthropic key sk-ant-api03-KYGNizd7Du... — leaked
in git history at f7450b7 (2026-04-06), removed from HEAD at 4c74335f. See
audit § 3.1 for revocation steps.
```

Phase 2 follows tomorrow per brief.
