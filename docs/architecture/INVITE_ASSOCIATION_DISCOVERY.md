# Discovery — Durable invite association on Spark (no backend) — 2026-06-15

**Status:** STEP 1 read-only discovery for the CC brief "Durable invite association WITHOUT a backend." Report → Opus ratifies mechanism → build + rules draft (Jacek CONFIRM) → deploy. No code changed.

## 1. How invites work TODAY (token-keyed OPEN links)

- **Create (admin):** `InviteSection.jsx` → `ds.createInvite(slug, role)` → writes `invites/{token}` (token = random 160-bit id) = `{ workspaceSlug, role, createdBy, createdAt, expiresAt, redeemedBy:null, redeemedAt:null }`. The admin picks **workspace + role only** — **no invitee email is entered**. Output = a copyable **open link** `#/invite/{token}` (anyone with the link can redeem).
- **Carry:** `useInviteRedemption.js` captures the token from the hash on app load → **localStorage** (was sessionStorage; fixed 2026-06-14) → after sign-in calls `redeemInvite`.
- **Redeem:** `redeemInvite(token, uid)` — atomic batch: `invites/{token}.redeemedBy=uid` + `workspaces/{slug}.members += uid` + `userRoles[uid]=[role]` + `lastRedeemedInviteToken`. This is the **only** thing that associates the account.
- **Rules:** `invites/{token}` read = any authed; create = admin-of-ws (non-admin role) or super; update(redeem) = unredeemed+unexpired, sets `redeemedBy=self`. Workspace invite-grant branch (firestore.rules:312-334) validates the membership write against the invite.

**The break (confirmed):** association depends on the **token surviving from link-open to redeem**. A client token (localStorage/sessionStorage) **cannot cross a browser context** — player clicks the link in a Messenger/WhatsApp/Gmail **in-app browser** (browser A, token stored there), then opens the PWA in **Safari/Chrome** (browser B, no token) → never redeems → authed but unassociated → NoWorkspaceScreen + invisible to admin. localStorage (#2) only fixes the *same-browser* hop.

## 2. Constraint check: which durable variant is viable on Spark

The brief's **email-keyed** mechanism keys association on the user's email (identical in both browser contexts) instead of a token — the right idea. BUT it needs an email to key on:

- **Pre-known-email invites (RECOMMENDED primary):** admin enters the invitee's email when generating → write `invites/{normalizedEmail}` = `{ workspace, role, invitedBy, status:'pending', createdAt }`. On login/bootstrap the app checks `invites/{authEmail}` → self-claims. **Browser-agnostic — no token hop.** This is the real fix. **Requires a UI change:** the admin invite flow must collect the invitee email (today it doesn't). For a known team roster, Jacek has the emails — viable.
- **Open-link token-bridge (FALLBACK only):** keep the token link; at *registration* (the one moment the token exists in that browser) write `invites/{thatEmail}` from the token, then self-claim on login. **Caveat — does NOT fix the headline cross-browser case:** if registration happens in browser B (which never had the token), there's nothing to bridge. It only helps "registered in browser A, then opens browser B."

→ **The cross-browser failure is only truly fixed by pre-known-email invites.** The token-bridge is a partial add-on. This is the key decision for Opus/Jacek (see §6).

## 3. Recommended mechanism (email-keyed self-claim, Spark-only)

1. **Invite create (UI + data):** admin enters invitee email + role → `invites/{normalizedEmail}` = `{ workspaceSlug, role, invitedBy, status:'pending', createdAt }`. (normalizedEmail = trim+lowercase.) Optionally still emit a link, but association no longer depends on it.
2. **Self-claim on login** (extend `useInviteRedemption` or a sibling hook): on `userReady` with `user.email`, read `invites/{normalize(user.email)}`; if `status==='pending'` → write membership (`workspaces/{ws}.members += uid`, `userRoles[uid]=[role]`) + set the invite `status:'claimed', claimedBy:uid`. **Idempotent** (re-run no-ops if already a member/claimed). Runs in ANY browser because it keys on the authenticated email.
3. **Result:** player clicks link anywhere, registers with the invited email in any browser, opens the PWA → auto-associated on login. Self-recovering.

## 4. Rules DRAFT (CONFIRM-gated — tenant-isolation; Jacek approves before deploy)

Sketch only — to be finalized at build:
- `match /invites/{emailId}`: `allow read: if request.auth != null && request.auth.token.email.lower() == emailId;` (a user reads only their OWN invite). `allow create: if isAdmin(resource workspace) || isSuperAdmin()` (+ role allow-list, non-admin role for ws-admins). `allow update` (claim): `request.auth != null && request.auth.token.email.lower() == emailId && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','claimedBy','claimedAt']) && request.resource.data.claimedBy == request.auth.uid`.
- Workspace self-claim write — a NEW invite-grant branch (sibling to firestore.rules:312-334) keyed on `invites/{auth.email}`: invitee adds ONLY their own uid to `members` + sets `userRoles[uid] == [invite.role]`, validated against the unclaimed email-invite. **Tenant-isolation predicate → explicit Jacek CONFIRM.**
- **Email-ownership caveat:** `request.auth.token.email` is present for password signups but is NOT proof of ownership unless `email_verified`. For a tight rule, gate the claim on `request.auth.token.email_verified == true` — which means the app must require email verification (not currently enforced). **Flag for Jacek:** accept email-only (low risk, paintball roster) vs require verification (more secure, adds a verify step).

## 5. Admin pending view (always-available manual path)

Super-admin "Zaproszenia / oczekujące" view listing the `invites` collection (pending/claimed) for the workspace → manual grant. (Listing "authed accounts with a profile but no membership" is hard on Spark — it needs scanning all `/users` ✗ membership across all workspaces; defer or approximate via the invites list.) This is the safety net so onboarding can never hard-block.

## 6. Decision for Opus/Jacek (shapes the build)

1. **Are invitee emails known at invite time?** YES → email-keyed primary (real cross-browser fix). NO/sometimes → token-bridge fallback only (weaker — doesn't fix the headline case). Jacek's Messenger batch implies known players → email-keyed is viable.
2. **Email verification for the claim rule?** email-only (simpler, slight risk) vs require `email_verified` (secure, adds a step).
3. **Keep the open-link token path** in parallel (back-compat for existing links) — yes, additive; the email-keyed path is the new primary.

## 7. e2e plan (fail-first, at build)
- (a) invite-by-email created → register with that email in a **fresh context (no carried token)** → login → auto-associated with role.
- (b) bulk: 3 email-invites → 3 registrations → all 3 self-claim.
- (c) admin pending view shows pending + manual grant works.

## 8. Recovery (parallel stopgap — NOT the fix)
The currently-stuck accounts get a one-off local admin-SDK association (Jacek sends `{UID→workspace→role}` + GO; --live write). Recovery ≠ durable fix.

### 8.1 Source-of-truth strand — RESOLVED 2026-06-15 (HEAD `4ddbf0b2`)
Live data (Maks `maks090105`): role granted in `ranger1996.userRoles=[coach,scout,player]`, in `members`, `rolesVersion:2`; `users/{uid}` `roles` empty, `defaultWorkspace` null, `linkSkippedAt` set — yet stuck on "poczekaj na admina".
- **Source of truth = `workspace.userRoles[uid]`** (NOT `users/{uid}.roles`). `useWorkspace.roles` → `getRolesForUser` reads it; `isPendingApproval` reads it; the `users/{uid}.roles` fallback is tab-visibility only, never the gate. `linkSkippedAt` already bypasses the profile-link onboarding (App.jsx:137) → **profile-linking is already decoupled from access.**
- **Why grant doesn't sync `users/{uid}`:** the `/users/{uid}` self-update rule allows only `['displayName','email','linkSkippedAt']`; `roles`/`defaultWorkspace` are write-once-at-create / admin-SDK-only. So neither admin nor user can client-sync `users/{uid}` on grant — "sync both stores" is rules-blocked.
- **The real strand = ENTRY, not the store:** with `defaultWorkspace` null, `autoEnter` falls back to the `members array-contains` query and entered `docs[0]` (doc-ID order). For a >1-membership user that can be an empty-roles ws → PendingApproval, despite another ws holding the roles.
- **Fix (option a):** `autoEnterDefaultWorkspace` prefers a membership with non-empty `userRoles[uid]` (fallback to `docs[0]` only if none) → `userRoles` authoritative for entry too. No rules change. e2e `role-source-of-truth.spec.js` (fail-first RED→GREEN).
- **Maks specifically was single-membership** → the fix is prevention, not his cause; his strand was a **stale PWA bundle** (pre-2026-06-14 STEP-9/listener fixes). Recovered by stamping `users/{uid}.defaultWorkspace=ranger1996` (admin-SDK, robust across all bundles). `scripts/diag/{recover-stuck-user,stranded-accounts-audit,ranger-membership-read}.cjs`.

## 9. Jacek's chosen flow (2026-06-15) + Spark feasibility — RATIFIED DIRECTION

Jacek: switch to email. Flow: players give their email → admin enters it → a link is auto-generated for that email and **emailed** → invitee clicks → lands on a **set-password / express-registration** screen → on confirm the account is **activated** (+ associated).

**Spark-native realization = Firebase Email-Link (passwordless) sign-in** (all client-callable, no backend, free on Spark; the app has none of it today — only `sendPasswordResetEmail`):
1. **Admin enters email + role** → write `invites/{normalizedEmail}` = `{ workspaceSlug, role, invitedBy, status:'pending', createdAt }` (Firestore) **and** call `sendSignInLinkToEmail(email, { url: <appUrl>, handleCodeInApp:true })` — Firebase emails the magic link (Auth email-link template). The admin's own session is unaffected.
2. **Invitee clicks the emailed link** → app detects `isSignInWithEmailLink` → `signInWithEmailLink(email, link)` → **the Auth account is created here** (passwordless). The app then shows a **"set password"** screen (`updatePassword` + `updateProfile` displayName) = the express registration → "activated."
3. **Self-claim on login** (email-keyed, §3) → reads `invites/{authEmail}` → writes own membership. Browser-agnostic — works even if the email is opened on the phone in a different browser (email-link prompts for the email when not in the originating device's localStorage).

**⚠️ One nuance vs Jacek's mental model:** on Spark the **Auth account can't be minted when the admin types the email** (a client can't create another user without switching its own session; no Admin SDK in prod). What the admin's action creates is the **invite record + the emailed link**; the **account is created when the invitee clicks the link + sets a password**. Same end-to-end outcome (admin enters email → invitee gets link → sets password → activated → associated), just the account-creation instant is at invitee-click. Confirm this is acceptable (it's the only Spark-viable shape).

**Requires (build + Jacek console):**
- Firebase Console (Jacek): enable **Email link (passwordless)** sign-in provider; configure the sign-in email template + **authorized domains** (the GitHub Pages origin). Without this `sendSignInLinkToEmail` won't send.
- Code (Opus brief → CC build): invite-by-email admin UI; `sendSignInLinkToEmail` wiring; email-link completion + set-password screen; email-keyed self-claim on login; admin "pending invites" view.
- **Rules (CONFIRM):** `invites/{email}` read/claim keyed on `auth.token.email`; the self-claim workspace membership write (tenant-isolation predicate). Draft in §4.
- Keep the legacy token open-link path in parallel (back-compat), additive.

**Size:** this is a multi-part feature (auth-flow + UI + rules + console) → an Opus build brief, not an autonomous one-shot. CC has the discovery + plan; awaiting the brief + Jacek's console enablement + rules CONFIRM.

---
**Bottom line:** Jacek's email-first flow is Spark-viable via Firebase **email-link sign-in** + **email-keyed self-claim** — browser-agnostic, no backend. Nuance: the account is created at invitee-click (not admin-entry); admin-entry creates the invite + sends the link. Needs an Opus build brief, a Firebase-console email-link enablement (Jacek), and a CONFIRM'd rules change before it ships.
