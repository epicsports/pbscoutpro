# Resume after PC reset — 2026-05-28

Written before a planned PC reset. Everything in git is safe on `origin/main`
(**HEAD `8118e4f0`**); this file lists what git will NOT restore and the one
live-app issue to fix.

## 🔴 URGENT — the live web app is currently broken (placeholder Firebase config)

This session's `npm run deploy` runs built the web bundle with **placeholder**
Firebase config (`apiKey: 'YOUR_API_KEY'`, `authDomain: 'YOUR_PROJECT…'`),
because there is **no `.env` and no `VITE_FIREBASE_*` env var on this machine**.
`firebase.js` falls back to placeholders when those are unset, so the deployed
gh-pages app can't reach Firebase (auth + Firestore fail).

**Not affected:** all data work this session (selfReports cutover + cleanup) used
the **admin service-account key** server-side and is correct; the Firestore
**rules** deploy is also fine (rules don't use web config). Only the deployed
*web bundle* is bad.

**Fix (needs the real web config — recreate `.env` then redeploy):**
1. Firebase Console → Project Settings → your **Web app** → SDK config.
2. Create `pbscoutpro/.env` (gitignored) from `.env.example`:
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=pbscoutpro.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=pbscoutpro
   VITE_FIREBASE_STORAGE_BUCKET=pbscoutpro.appspot.com (or .firebasestorage.app)
   VITE_FIREBASE_MESSAGING_SENDER_ID=…
   VITE_FIREBASE_APP_ID=1:…:web:…
   VITE_SENTRY_DSN=…   (optional)
   ```
3. `npm run deploy` → verify the live app loads + logs in. (CC can do this once `.env` exists.)

## Things git will NOT restore (back up before a full wipe, or recreate after)

1. **`.env`** — the Firebase web config above. NOT in git (`.gitignore` has `.env*`).
   It is also currently **absent on this machine** → recreate from the console.
2. **Admin service-account key** — `dk/pbscoutpro-firebase-adminsdk-fbsvc-*.json`
   (one dir ABOVE the repo). Used by CC to run migrations + `firebase deploy`
   directly. NOT in git (secret). Re-download: Console → Project Settings →
   Service accounts → Generate new private key; drop it in the repo's parent dir
   (the `.cmd` wrappers auto-detect `pbscoutpro-firebase-adminsdk-fbsvc-*.json`).
3. **Claude auto-memory** — `~/.claude/projects/C--Users-JacekPARCZEWSKI-desktop-dk-pbscoutpro/`
   (CC's cross-session memory: MEMORY.md + feedback/project notes). Lost on a wipe
   unless backed up. Back up the whole `~/.claude/` to be safe.
4. **`outputs/`** — ephemeral discovery scratch (DISCOVERY_WORKSPACE_PROVISIONING.md,
   DISCOVERY_PRIVILEGE_MODEL.md). Not committed by design; their actionable essence
   is already summarized in `NEXT_TASKS.md` (catalog-isolation + FIT-carrier bullets),
   so safe to lose.

## Fresh-machine setup after re-clone
```
git clone <origin>  →  cd pbscoutpro
npm install                       # restores firebase-admin + deps
npm i -g firebase-tools           # if `firebase` CLI missing (was 15.18)
# create .env (above); place the SA key in the repo's parent dir
npm run deploy                    # rebuild + ship working app
```

## How CC runs Firebase directly (per 2026-05-28 grant)
- Admin scripts: `GOOGLE_APPLICATION_CREDENTIALS="<SA key>" node scripts/migration/<x>.cjs --dry|--live` (Bash tool, sandbox disabled — needs network).
- Deploys: `GOOGLE_APPLICATION_CREDENTIALS="<SA key>" firebase deploy --only firestore:rules --project pbscoutpro --non-interactive`.
- Autonomy: **full on the active task** (dry → live/deploy, gate on dry output). See memory `feedback_firebase_direct_run`.

## Where work stands
- **§ 90 Stage 1 fully closed** — selfReports moved to flat `/workspaces/{ws}/selfReports/`; legacy nested path deleted + retired from code + rules.
- Read `docs/ops/HANDOVER.md` (top) + `NEXT_TASKS.md` for the rest.
- **Next real track: Phase 2.2.d** (workspace-local players/teams relocation — FIT data isolation) — awaiting an Opus brief, not started.
