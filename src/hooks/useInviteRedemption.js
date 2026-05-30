import { useEffect, useState, useRef } from 'react';
import * as ds from '../services/dataService';
import { useWorkspace } from './useWorkspace';

// Model B invite redemption (Stage 2). The magic link is `#/invite/{token}`,
// but the app's gate layer renders BEFORE the HashRouter mounts, so the token
// can't be a normal route. Instead: capture it from the hash on mount (survives
// the LoginPage render in sessionStorage), then redeem once the user is
// authenticated — entering the invited workspace on success.
const STASH_KEY = 'pb_invite_token';

function captureTokenFromHash() {
  const m = (window.location.hash || '').match(/#\/invite\/([A-Za-z0-9]+)/);
  if (!m) return;
  try { sessionStorage.setItem(STASH_KEY, m[1]); } catch { /* private mode */ }
  // Strip so the post-login HashRouter doesn't try to route /invite/{token}.
  try { window.location.hash = '#/'; } catch { /* ignore */ }
}

export function useInviteRedemption() {
  const { user, userReady, setActiveWorkspace } = useWorkspace();
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState(null);
  const doneRef = useRef(false);

  // Capture once on mount — runs before auth resolves; token survives LoginPage.
  useEffect(() => { captureTokenFromHash(); }, []);

  useEffect(() => {
    if (doneRef.current) return;
    if (!userReady) return;
    let token = null;
    try { token = sessionStorage.getItem(STASH_KEY); } catch { /* ignore */ }
    if (!token) return;
    if (!user?.uid || user.isAnonymous) return; // wait for sign-in (LoginPage)
    doneRef.current = true;
    setRedeeming(true);
    ds.redeemInvite(token, user.uid)
      .then(({ slug }) => {
        try { sessionStorage.removeItem(STASH_KEY); } catch { /* ignore */ }
        setActiveWorkspace(slug); // persists active + reloads into the workspace
      })
      .catch((e) => {
        try { sessionStorage.removeItem(STASH_KEY); } catch { /* ignore */ }
        setRedeeming(false);
        setError(e?.message || 'INVITE_ERROR');
      });
  }, [user?.uid, user?.isAnonymous, userReady, setActiveWorkspace]);

  return { inviteRedeeming: redeeming, inviteError: error };
}
