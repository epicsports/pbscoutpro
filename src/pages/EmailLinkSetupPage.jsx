/**
 * EmailLinkSetupPage — express registration via the email-link invite (§ durable
 * invite). Shown by App.jsx when the URL is a Firebase email sign-in link
 * (isEmailSignInLink). Flow:
 *   1. resolve the invited email — from this device's localStorage, else ask;
 *   2. completeEmailLinkSignIn → the Auth account is created here (passwordless);
 *   3. set a password (+ display name) → express registration → "activated";
 *   4. replace the URL with the app root → clean reload; the email-keyed
 *      self-claim (useInviteRedemption) then associates the workspace on login.
 *
 * Spark-native: Firebase sends + validates the link; no backend.
 */
import React, { useEffect, useState } from 'react';
import {
  auth, completeEmailLinkSignIn, getStoredSignInEmail, setPasswordAndName,
} from '../services/firebase';
import { claimEmailInvite } from '../services/dataService';
import { useLanguage } from '../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, TOUCH } from '../utils/theme';

export default function EmailLinkSetupPage() {
  const { t } = useLanguage();
  // 'email' (need the address) | 'completing' | 'password' | 'saving' | 'error'
  const [step, setStep] = useState('completing');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  // Try to complete sign-in immediately if we already know the email (same
  // device as the invite was sent). Otherwise ask for it (different device).
  useEffect(() => {
    const stored = getStoredSignInEmail();
    if (stored) { complete(stored); } else { setStep('email'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function complete(addr) {
    setStep('completing'); setError('');
    try {
      await completeEmailLinkSignIn(addr.trim());
      setStep('password');
    } catch (e) {
      console.error('Email-link sign-in failed:', e?.code || e?.message);
      setError(t('email_link_invalid') || 'Link wygasł lub jest nieprawidłowy. Poproś o nowe zaproszenie.');
      setStep('error');
    }
  }

  async function handleSetPassword(e) {
    if (e) e.preventDefault();
    setError('');
    if (password.length < 6) { setError(t('pw_too_short') || 'Hasło musi mieć minimum 6 znaków.'); return; }
    if (password !== confirm) { setError(t('pw_mismatch') || 'Hasła się nie zgadzają.'); return; }
    setStep('saving');
    try {
      await setPasswordAndName(password, displayName.trim());
      // Claim the email-invite NOW, at activation — write membership+role before
      // we hand off, rather than relying on the post-reload background effect
      // (which is gated off while this email-link page owns the session). The link
      // sign-in set email_verified=true so the self-claim rule passes. Best-effort:
      // a failure here still hands off — the gated background self-claim retries on
      // the #/ load, and the admin pending view is the safety net.
      const u = auth.currentUser;
      if (u?.email) {
        try { await claimEmailInvite(u.email, u.uid); }
        catch (err) { console.warn('[invite] activation self-claim failed (retries on load):', err?.code || err?.message); }
      }
      // Drop the email-link params + reload into the app; auto-enter resolves the
      // freshly-written membership (or the background self-claim retries).
      window.location.replace(`${import.meta.env.BASE_URL || '/'}#/`);
    } catch (e2) {
      console.error('Set password failed:', e2?.code || e2?.message);
      setError(t('email_link_setpw_failed') || 'Nie udało się ustawić hasła. Odśwież i spróbuj ponownie.');
      setStep('password');
    }
  }

  const outer = {
    minHeight: '100dvh', background: COLORS.bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  };
  const card = {
    width: '100%', maxWidth: 340, background: COLORS.surface,
    border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24,
    display: 'flex', flexDirection: 'column', gap: 14,
  };
  const title = { fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700, color: COLORS.text, textAlign: 'center' };
  const input = {
    width: '100%', padding: '12px', borderRadius: 10, boxSizing: 'border-box',
    background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.text,
    fontFamily: FONT, fontSize: FONT_SIZE.md, minHeight: TOUCH.minTarget || 44,
  };
  const btn = (enabled) => ({
    width: '100%', padding: '14px', borderRadius: 10, border: 'none',
    background: enabled ? COLORS.accentGradient : COLORS.border,
    color: enabled ? COLORS.black : COLORS.textMuted,
    fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 800,
    cursor: enabled ? 'pointer' : 'default', minHeight: TOUCH.minTarget || 44,
  });
  const errBox = error ? (
    <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.danger, padding: '8px 12px', background: COLORS.danger + '15', borderRadius: 8 }}>{error}</div>
  ) : null;

  if (step === 'completing' || step === 'saving') {
    return <div style={outer} data-testid="email-link-setup"><div style={card}><div style={title}>{t('email_link_working') || 'Aktywacja konta…'}</div></div></div>;
  }
  if (step === 'error') {
    return <div style={outer} data-testid="email-link-setup"><div style={card}><div style={title}>{t('email_link_error_title') || 'Coś poszło nie tak'}</div>{errBox}</div></div>;
  }
  if (step === 'email') {
    return (
      <div style={outer} data-testid="email-link-setup">
        <form style={card} onSubmit={(e) => { e.preventDefault(); if (email.trim()) complete(email); }}>
          <div style={title}>{t('email_link_confirm_email') || 'Potwierdź swój e-mail'}</div>
          <input style={input} type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          {errBox}
          <button type="submit" style={btn(!!email.trim())} disabled={!email.trim()}>{t('continue_btn') || 'Dalej'}</button>
        </form>
      </div>
    );
  }
  // step === 'password' — express registration
  return (
    <div style={outer} data-testid="email-link-setup">
      <form style={card} onSubmit={handleSetPassword}>
        <div style={title}>{t('email_link_set_password') || 'Ustaw hasło'}</div>
        <input style={input} type="text" autoComplete="name" placeholder={t('login_field_display_name') || 'Imię / nick'}
          value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
        <input style={input} type="password" autoComplete="new-password" placeholder={t('login_field_password') || 'Hasło'}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <input style={input} type="password" autoComplete="new-password" placeholder={t('pw_confirm_ph') || 'Powtórz hasło'}
          value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {errBox}
        <button type="submit" style={btn(!!password && !!confirm)} disabled={!password || !confirm}>
          {t('email_link_activate') || 'Aktywuj konto'}
        </button>
      </form>
    </div>
  );
}
