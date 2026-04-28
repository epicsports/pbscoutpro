# Admin Operational Runbook — PbScoutPro

**Audience:** Jacek (single admin) — and any future admin Jacek hands the keys to.
**Created:** 2026-04-25 by CC during end-of-MAX production audit (Phase 2, step 10).
**When to use:** the app is running in production; CC is no longer actively patching; something broke or needs admin intervention.
**Authoritative state lives in:** Firestore (workspace `ranger1996`), Firebase Auth, GitHub repo `epicsports/pbscoutpro`, GitHub Pages.

> ⚠️ **Pre-flight check before any destructive action:** the email allowlist `jacek@epicsports.pl` in `firestore.rules` (function `isAdmin`) is the emergency-restore path. If admin role grants get corrupted, you can still act as admin from any logged-in session whose token email matches that string. Do NOT remove this allowlist without a custom-claims migration in place first.

---

## 1. Adding a new player

### 1.1 Single player via Members panel

1. Sign in as admin (`jacek@epicsports.pl`).
2. Navigate to Settings → ZARZĄDZAJ → Gracze (`/players`).
3. Click "+ Dodaj gracza" CTA (top right or sticky bottom).
4. Fill: nickname (required), name, number, age, nationality, position, class, team, PBLI ID.
5. Save → player doc lands at `/workspaces/ranger1996/players/{auto-id}`.

### 1.2 Bulk import via CSV

1. Navigate to Settings → ZARZĄDZAJ → Gracze → "Import CSV" (top of page).
2. CSV format: header row with columns `nickname,name,number,age,nationality,position,class,team,pbliId`. UTF-8.
3. Paste OR upload .csv file. Preview shows rows. Confirm.
4. Each row creates a player doc; rows with blank `nickname` are skipped.
5. After import: refresh `/players` to see new entries. Each player will show as "unlinked" until they self-link via PBLeagues onboarding (or admin links them via § 1.3).

### 1.3 Pure manual create via Firestore Console

1. Open https://console.firebase.google.com → project `pbscoutpro` → Firestore Database.
2. Navigate to `workspaces / ranger1996 / players`.
3. Add document → auto-id → fields:
   - `nickname` (string)
   - `name` (string, optional)
   - `number` (number)
   - `position` (string: 'Front' | 'Mid' | 'Insert' | 'Back')
   - `class` (string)
   - `team` (string — must match an existing team doc id under `/workspaces/ranger1996/teams`)
   - `pbliId` (string — short form, e.g. `61114-8236`)
   - `createdAt` (timestamp; use `Server timestamp` button)
4. Save. Refresh app → player visible in lists immediately (Firestore listeners auto-resync).

**Use this only when the in-app flow is unavailable** (e.g., admin role grants got corrupted). Console writes bypass app validation.

---

## 2. Linking a user to a player profile (admin override)

A user signs up but their PBLI ID doesn't match any existing player → they hit "Pomiń na razie" (skip-link) and operate in unlinked mode. Admin can link them later.

1. Sign in as admin.
2. Settings → ZARZĄDZAJ → Členkowie (`/settings/members`).
3. Find the user (recent joiners have a green NOWY badge). Tap their row.
4. UserDetailPage opens (`/settings/members/{uid}`).
5. "Połącz z graczem" → opens LinkProfileModal.
6. Search by nickname / name / PBLI ID. Confirm "Czy to ja?" prompt.
7. Save → atomic write via `ds.adminLinkPlayer(playerId, uid)`. Conflicts (player already linked to a different user) are surfaced inline; admin must explicitly re-link to override.
8. Side effect: any pending self-reports the user submitted in unlinked mode are automatically migrated to the canonical player path on next session via `onPlayerLinked(uid, playerId)`.

---

## 3. Rotating a leaked / compromised API key

### 3.1 Anthropic API key

**Symptoms:** key leaked in Git history (see `docs/audits/SECURITY_AUDIT_2026-04-25.md` § 3.1 for the original 2026-04-06 incident), unauthorized API usage on Anthropic billing dashboard, key shared by mistake.

1. Open https://console.anthropic.com → Settings → API Keys.
2. Find the suspected key (first 20 chars usually shown). **Revoke** it.
3. Generate a new key. Copy it (it's shown ONLY ONCE).
4. Decide where the new key lives:
   - **Vision-scan UI in the app**: paste it into the `OCRBunkerDetect` / `ScheduleImport` / `VisionScan` prompt; saved to browser localStorage under key `pbscoutpro_anthropic_key`. This is the recommended runtime path — see `src/components/VisionScan.jsx` after the 2026-04-25 hardening.
   - **CLI reviewer scripts** (`scripts/reviewers/*.js`): set `ANTHROPIC_API_KEY=...` in `.env.local` (gitignored) or pass at command line. NEVER set as `VITE_ANTHROPIC_API_KEY` in any `.env*` file at the project root — Vite would inline it into the public bundle on next deploy.
5. If the leaked key is in Git history, rewriting history (BFG / `git filter-repo`) is OPTIONAL. The key is already invalidated by step 2, and public-history scrubbing requires force-pushing main (breaks all clones, breaks any CI pipeline pinned to commit SHAs). Recommended: skip the scrub; document the rotation in `DEPLOY_LOG.md`.

### 3.2 Firebase API key

**Note:** Firebase Web SDK API keys are designed to be public — security is enforced via Firestore Rules + Firebase Auth. A leaked Firebase key is NOT a credential leak in the same sense as an Anthropic key. **Rotate only if** Google flagged abuse / Firestore quota anomalies or quota-spam attack via Auth API.

1. Firebase Console → Project Settings → Your Apps → Web app → Add new web app (creates new config).
2. Copy the new `firebaseConfig` object.
3. Update `.env.local` with the new `VITE_FIREBASE_*` values.
4. Rebuild + redeploy the app (`npm run deploy`). Old key remains active until you delete it.
5. Delete the old Web app entry in Firebase Console after new deploy is verified live.

### 3.3 Sentry DSN

Sentry DSNs are designed to be public (embedded in client JS). Rotate only if you want to switch projects or cut off error ingestion from an old deploy. Replace `VITE_SENTRY_DSN` in `.env.local` and the hardcoded fallback in `src/services/sentry.js:4`. Redeploy.

---

## 4. Deploying Firestore rules

Rules live in `firestore.rules` at repo root. Backed by `firestore.rules.backup` (manually maintained pre-§38 snapshot, not auto-rotated).

```bash
# pre-flight: dry-run via Rules Playground in Firebase Console first
# Then deploy:
firebase deploy --only firestore:rules

# Verify deploy landed:
# Firebase Console → Firestore → Rules tab → top-right shows latest publish timestamp.
```

**Rollback if a deploy breaks production:**
1. Firebase Console → Firestore → Rules → Click **History** in the top-right.
2. Find the previous-known-good version (timestamp / "Created by jacek@epicsports.pl").
3. Click "Rollback" — re-deploys that version.
4. Resolve the bug locally, commit fix, redeploy via the bash command above.

**Common rules deploy failures:**
- `Property 'X' is undefined on object` → rule references a field that may be missing on existing docs. Use `resource.data.get('X', defaultValue)` for resilience (precedent: 2026-04-25 self-link missing-field fix at `firestore.rules:180-181`).
- `Permission denied` on routine writes after deploy → almost always an `affectedKeys.hasOnly([...])` allow-list that's missing a field the client now writes (precedent: 2026-04-24 `setDoc(merge)` dot-notation trap, commit `c81dade`). Diagnostic logging in `useWorkspace.jsx:autoEnterDefaultWorkspace` catch block captures payload + workspace shape.

---

## 5. Building and deploying the app

```bash
# Standard deploy (build + push to GitHub Pages):
npm run deploy

# What it does:
#   1. npm run build  → vite build → dist/
#   2. gh-pages -d dist  → publishes dist/ to gh-pages branch on GitHub
#   3. GitHub Pages serves from gh-pages branch (typically ~30-90s after push)
#
# Verify deploy live:
#   Open https://epicsports.github.io/pbscoutpro
#   Hard-reload (Cmd+Shift+R / Ctrl+Shift+F5) to bust the SW cache.
```

**Pre-deploy checklist:**
1. `npm run precommit` — must pass (build + UI lint + § 27 nudges).
2. Verify there are no uncommitted/unstaged secret-looking files (`.env`, `service-account.json`, etc.).
3. `git status` clean except for the changes you intend to ship.
4. Commit + push to main BEFORE deploy — so HEAD on GitHub matches the deployed bundle.

**SW (service worker) cache caveat:** the app registers a service worker at `main.jsx:18-20`. After deploy, returning users sometimes see the old version cached for one full session. Hard reload or "Empty cache and hard reload" in dev tools forces refresh. This is not a bug.

---

## 6. Reading Sentry errors

**Where to look:** https://sentry.io → project `pbscoutpro` (org `o4511234579103744`).

**Tags set on every event:**
- `workspace`: slug (`ranger1996`)
- `role`: comma-joined role names (`scout,coach,admin` etc.)
- User identity: `Sentry.setUser({ id: uid, email, username: workspace })`

**Filter recipes:**
- `role:player` — pure-player issues (PPT bugs).
- `role:scout role:coach role:admin` — scouting / match flow issues.
- `environment:production` — exclude dev runs.

**Errors safe to IGNORE (usually):**
- `ResizeObserver loop limit exceeded` — already filtered in `sentry.js:19`. If it appears, that filter regressed.
- `Non-Error promise rejection captured` — typically Firebase SDK noise.
- `NetworkError` / `Failed to fetch` — user offline. App falls back to cached data via Firestore offline persistence.
- iframe / IAB (in-app browser) noise — Facebook / TikTok / LinkedIn webview quirks, NOT real bugs. Tag pattern: `ua:*FB*` / `ua:*TikTok*`.

**Errors to take seriously:**
- `permission-denied` (FirebaseError code) → check rules + check if affected user actually has the role they expect. Cross-reference `request.auth.uid` from the error context with `workspaces/ranger1996.userRoles[uid]`.
- `Module script failed to load` / `Failed to fetch dynamically imported module` → user has stale SW cache holding deleted chunk hashes. Tell user to hard-reload. If recurring across many users post-deploy, the SW didn't update properly — investigate `main.jsx:18-20` registration.
- React #310 (rendered fewer hooks than expected) → component has a conditional hook call. Recent precedent: `bbad249` (2026-04-24 ScoutTabContent). Hoist hooks above any early-return.
- React #301 (cannot update component while rendering) → setState during render. Trace stack to identify offending component.

---

## 7. Common error responses — quick reference

| Error message | Likely cause | Fix |
|---|---|---|
| `permission-denied` on workspace read | User not in `members[]` array of workspace doc | Settings → Členkowie → ensure user has roles assigned (admin assigns) |
| `permission-denied` on player update | Self-link rule mismatch — usually `linkedUid` field absent | Already mitigated by `data.get('linkedUid', null)` (2026-04-25). If recurring, check rule wasn't reverted |
| `Module script failed to load` | Stale SW cache holding deleted bundle hash | User: hard reload. Persistent: clear SW via DevTools → Application → SW → Unregister |
| `auth/operation-not-allowed` | Firebase Console → Auth → Email/Password provider got disabled | Re-enable in Firebase Console → Authentication → Sign-in methods |
| `Auth timeout — Firebase not responding` | Network problem, Firebase quota hit, or auth domain misconfig | Check Firebase Status (https://status.firebase.google.com), verify `VITE_FIREBASE_AUTH_DOMAIN` |
| `Default workspace not found. Contact admin.` | `userProfile.defaultWorkspace` points to a slug that doesn't exist (or `DEFAULT_WORKSPACE_SLUG` constant got changed) | Check `src/utils/constants.js`. Fix or create the missing workspace. |
| White screen / "Crash Report" surface | Caught by Sentry ErrorBoundary | "Reload App" button on the screen does a fresh navigation. Investigate via Sentry. |
| LIVE match score stays 0:0 | Brief 9 Bug 2 architectural decision: scores don't write during LIVE per-coach streams; merged at end-match. Check `useLiveMatchScores` hook is firing. | Verify points are being created under the correct `homeData/awayData` doc IDs. |

---

## 8. Emergency rollback (deploy broke production)

### 8.1 Roll back the app deploy

```bash
# Option A — re-deploy a previous commit's bundle:
git log --oneline -10        # find a known-good SHA
git checkout <good-sha>
npm run deploy               # builds that SHA's source and publishes
git checkout main            # back to where you were
# This leaves main HEAD ahead of what's deployed; either revert in main OR
# keep main as-is and hot-fix forward.

# Option B — revert the bad commit on main, then deploy:
git revert <bad-sha>         # creates a revert commit
git push origin main
npm run deploy               # deploys the reverted state
```

**Recommendation:** Option B (revert + push) for clarity — main HEAD always equals deployed bundle.

### 8.2 Roll back Firestore rules

See § 4 above — Firebase Console → Firestore → Rules → History → Rollback.

### 8.3 Roll back data corruption

Firestore has automatic point-in-time recovery for the past 7 days (default). Use the Firebase Console → Firestore → "Restore from PIT" UI, or `gcloud firestore import` from a manual export (see § 9 if you have one). Beyond 7 days: data is unrecoverable unless you have an export.

---

## 9. Database backup

**Current state:** Google's automatic point-in-time recovery covers 7 days. NO scheduled manual exports.

**Recommended:** monthly manual export (~5 min effort).

```bash
# Authenticate to gcloud first (one-time setup):
gcloud auth login
gcloud config set project pbscoutpro

# Create a Cloud Storage bucket for exports (one-time):
gsutil mb -l europe-west3 gs://pbscoutpro-firestore-backups

# Export current Firestore state:
gcloud firestore export gs://pbscoutpro-firestore-backups/$(date +%Y-%m-%d)

# Verify the export:
gsutil ls gs://pbscoutpro-firestore-backups/
```

**Restore:**
```bash
# CAUTION: this overwrites collections in the live database.
# Only do this if you're recovering from corruption.
gcloud firestore import gs://pbscoutpro-firestore-backups/2026-XX-XX
```

**Frequency:** monthly is fine for current scale (10-20 users + low write volume). Bump to weekly if write volume grows or after any schema-changing migration.

---

## 10. Monitoring health post-MAX

Quick weekly hygiene check (5 min):

1. **Sentry:** open the dashboard, filter `environment:production`, check for new error types in the last 7 days. Triage per § 6.
2. **Firebase Console → Firestore → Usage:** confirm reads/writes are within free tier (50K reads / 20K writes per day). If trending up, may need to upgrade plan.
3. **Firebase Console → Authentication → Users:** scan for anomalies (unexpected new accounts, disabled flag still applied, etc.).
4. **GitHub Actions / Pages:** confirm latest deploy is the one you intended (https://github.com/epicsports/pbscoutpro/deployments).

If any check raises a concern, see the appropriate section above for action.

---

## 11. Periodic anonymous user cleanup

**When to run:** if anonymous Firebase Auth ever gets re-enabled accidentally (signal: § 10 step 3 weekly scan shows growing count of users with no `providerData`), or as a routine sweep if drive-by traffic re-appears.

**Background:** `signInAnonymously` was active in `ensureAuth()` pre-§51 and accumulated 611 legacy anonymous users by 2026-04-11. Disabled 2026-04-17, bulk-purged 2026-04-26 via Admin SDK script (see `docs/audits/SECURITY_AUDIT_2026-04-25.md § 2A`). The script is retained for re-use.

**Prerequisites:** Firebase service account JSON. Generate one if you don't have it: Firebase Console → Project settings → Service accounts → "Generate new private key" → save JSON locally (NEVER commit — `.gitignore` already covers `firebase-admin-*.json` + `service-account*.json` patterns, but keep the file outside the repo dir to be safe).

**Procedure:**

```bash
# 1. Point Admin SDK at your service account JSON (use the actual local path)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/pbscoutpro-firebase-adminsdk-xxxxx.json

# 2. AUDIT first — counts only, no deletions
node scripts/purge-anonymous-users.cjs audit

# Output shows: total count + oldest 3 + newest 3.
# Sanity check: if newest createdAt is RECENT (post-§51 disable date 2026-04-17),
# something is re-creating anonymous users. STOP and investigate firebase.js
# for accidental signInAnonymously calls before deleting anything.

# 3. DELETE — only after audit numbers confirmed reasonable
node scripts/purge-anonymous-users.cjs delete 2>&1 | tee logs/anonymous-purge-$(date +%Y-%m-%d).log

# Script gives a 5-second abort window before the actual delete.
# Batches in groups of 1000.

# 4. Re-audit to confirm 0 remaining
node scripts/purge-anonymous-users.cjs audit
```

**Irreversibility:** `auth.deleteUsers()` is permanent. Affected users must re-register with email/password if they had a real session. Audit-then-delete pattern exists for exactly this reason.

**Orphaned data:** the script deletes Auth records only. `/users/{uid}` Firestore docs and `scoutedBy` references on points remain — they display as "Unknown" in the UI, which is acceptable. Cleanup of those Firestore orphans is optional and not automated; doable from Firebase Console if it ever becomes user-facing noise.

---

## Appendix A — Hardcoded admin allowlist

`firestore.rules` `isAdmin()` function grants admin via THREE independent paths:
1. `workspace.userRoles[uid]` contains `'admin'`
2. `workspace.adminUid == uid`
3. `request.auth.token.email == 'jacek@epicsports.pl'`

Path 3 is the emergency restore path. **Do NOT change the email** without a custom-claims migration in place first — losing this means losing the only out-of-band admin recovery mechanism.

When transferring admin to another person:
- Add their email as a SECOND allowlist entry: `email == 'jacek@epicsports.pl' || email == 'newadmin@example.com'`.
- Deploy rules.
- Have them sign in once to provision their `users/{uid}` doc.
- Add their UID to `workspaces/ranger1996.userRoles` with `['admin']`.
- After they confirm admin works, remove the old entry from the allowlist (only if you trust they're stable). Otherwise keep both for safety.

---

## Appendix B — Where things live

| Resource | Location |
|---|---|
| App live URL | https://epicsports.github.io/pbscoutpro |
| Repo | https://github.com/epicsports/pbscoutpro |
| Firebase Console | https://console.firebase.google.com → project `pbscoutpro` |
| Firestore rules source | `firestore.rules` in repo root |
| Firestore indexes source | `firestore.indexes.json` in repo root |
| Sentry dashboard | https://sentry.io → org `epicsports` → project `pbscoutpro` |
| Anthropic key dashboard | https://console.anthropic.com → Settings → API Keys |
| GitHub Pages config | https://github.com/epicsports/pbscoutpro/settings/pages |
| Build/deploy scripts | `npm run deploy` (uses `gh-pages` package) |
| Active task queue | `NEXT_TASKS.md` (root) |
| Architecture / design docs | `docs/architecture/` + `docs/DESIGN_DECISIONS.md` |
| This runbook | `docs/ops/ADMIN_RUNBOOK.md` |
