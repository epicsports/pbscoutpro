# Resume after PC reset — 2026-05-28

Written before a planned PC reset. Everything in git is safe on `origin/main`
(**HEAD `8118e4f0`**); this file lists what git will NOT restore and the one
live-app issue to fix.

## ✅ RESOLVED — live web app was broken, now fixed (2026-05-28)

Earlier this session, `npm run deploy` built the bundle with **placeholder**
Firebase config (no `.env`/`VITE_FIREBASE_*` present → `firebase.js` fell back to
`YOUR_API_KEY`), so the live app couldn't reach Firebase. **Fixed:** fetched the
real web config via `firebase apps:sdkconfig WEB --project pbscoutpro` (SA key),
wrote `pbscoutpro/.env`, and redeployed — bundle now embeds the real key. Live
app works. (Data work + rules deploy were never affected — admin SA key /
rules don't use the web config.)

**After a wipe, `.env` is gone (gitignored, local-only) — recreate it before any
local `npm run deploy`:**
- Fastest (with the SA key, below): `firebase apps:sdkconfig WEB --project pbscoutpro`
  → copy the 6 values into `pbscoutpro/.env` as `VITE_FIREBASE_*` (see `.env.example`).
  Note `STORAGE_BUCKET=pbscoutpro.firebasestorage.app` (not `.appspot.com`).
- Or Firebase Console → Project Settings → Web app → SDK config.
- CC can do this end-to-end once the SA key is back on the machine.

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
