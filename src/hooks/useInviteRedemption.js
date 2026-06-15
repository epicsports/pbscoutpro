import { useEffect, useState, useRef } from 'react';
import * as ds from '../services/dataService';
import { useWorkspace } from './useWorkspace';
import { isEmailSignInLink } from '../services/firebase';

// Model B invite redemption (Stage 2). The magic link is `#/invite/{token}`,
// but the app's gate layer renders BEFORE the HashRouter mounts, so the token
// can't be a normal route. Instead: capture it from the hash on mount, then
// redeem once the user is authenticated — entering the invited workspace.
//
// Stash in localStorage (NOT sessionStorage): the token must survive the gap
// between opening the link and finishing signup. sessionStorage is per-tab — it
// was being lost when the link was opened in one tab and the account finished in
// another (or after close/reopen), stranding invited accounts on NoWorkspace
// (Maks #3). localStorage persists across tabs + sessions in the same browser.
// (Cross-BROWSER / chat-app in-app-browser hops still can't carry it — that needs
// the server-side invite-intent follow-up.)
const STASH_KEY = 'pb_invite_token';

function captureTokenFromHash() {
  const m = (window.location.hash || '').match(/#\/invite\/([A-Za-z0-9]+)/);
  if (!m) return;
  try { localStorage.setItem(STASH_KEY, m[1]); } catch { /* private mode */ }
  // Strip so the post-login HashRouter doesn't try to route /invite/{token}.
  try { window.location.hash = '#/'; } catch { /* ignore */ }
}

export function useInviteRedemption() {
  const { user, userReady } = useWorkspace();
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState(null);
  const doneRef = useRef(false);
  const emailDoneRef = useRef(false);

  // Capture once on mount — runs before auth resolves; token survives LoginPage.
  useEffect(() => { captureTokenFromHash(); }, []);

  // Email-keyed self-claim — runs on EVERY login (self-recovering, browser-
  // agnostic). If a pending invites/{authEmail} exists, claim membership + role.
  // No token / no localStorage dependency → survives the in-app-browser → Safari
  // hop that the token path cannot. Idempotent no-op when there's no invite.
  useEffect(() => {
    if (emailDoneRef.current) return;
    if (!userReady) return;
    // While the email-link express-reg page owns the session (sign-in happens
    // BEFORE set-password), defer the self-claim: claiming + reload() mid-flow
    // reloads the still-active email-link URL → loops the invitee back to the
    // empty confirm step (2026-06-15). EmailLinkSetupPage replaces the URL with
    // `#/` on activation; the self-claim then runs cleanly on that fresh load.
    if (isEmailSignInLink()) return;
    const email = user?.email;
    if (!user?.uid || user.isAnonymous || !email) return;
    emailDoneRef.current = true;
    ds.claimEmailInvite(email, user.uid)
      .then((res) => {
        if (!res?.slug) return;
        // Reload (not setActiveWorkspace): membership was just written, but an
        // immediate getDoc races read-after-write. A fresh load lets auto-enter
        // resolve the new membership cleanly via its members-query. Show the
        // joining state through the reload.
        setRedeeming(true);
        window.location.reload();
      })
      .catch((e) => { console.warn('[invite] email self-claim failed:', e?.code || e?.message); });
  }, [user?.uid, user?.isAnonymous, user?.email, userReady]);

  useEffect(() => {
    if (doneRef.current) return;
    if (!userReady) return;
    if (isEmailSignInLink()) return; // defer until express-reg hands off to `#/`
    let token = null;
    try { token = localStorage.getItem(STASH_KEY); } catch { /* ignore */ }
    if (!token) return;
    if (!user?.uid || user.isAnonymous) return; // wait for sign-in (LoginPage)
    doneRef.current = true;
    setRedeeming(true);
    ds.redeemInvite(token, user.uid)
      .then(() => {
        try { localStorage.removeItem(STASH_KEY); } catch { /* ignore */ }
        // Reload (not setActiveWorkspace): membership was just written; an
        // immediate getDoc races read-after-write (esp. under the added login
        // concurrency of the email self-claim effect) and would strand the user
        // on "Joining workspace…". A fresh load lets auto-enter resolve the new
        // membership via its members-query — race-free, same as the email path.
        window.location.reload();
      })
      .catch((e) => {
        try { localStorage.removeItem(STASH_KEY); } catch { /* ignore */ }
        setRedeeming(false);
        setError(e?.message || 'INVITE_ERROR');
      });
  }, [user?.uid, user?.isAnonymous, userReady]);

  return { inviteRedeeming: redeeming, inviteError: error };
}
