import React, { useState } from 'react';
import { COLORS, FONT, FONT_SIZE, TOUCH } from '../utils/theme';
import { loginWithEmail, registerWithEmail, resetPassword } from '../services/firebase';
import { useOnline } from '../hooks/useOnline';
import { useLanguage } from '../hooks/useLanguage';
import { ReadsWordmark, ReadsWelcomeSplash } from '../components/ReadsWordmark';

/**
 * LoginPage — email / password sign-in + register (§ 33).
 *
 * Appears when there's no Firebase user at all. After login,
 * WorkspaceProvider auto-enters the user's default workspace (per the
 * 2026-04-24 retire-team-code hotfix) — no intermediate code-entry gate.
 */
export default function LoginPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const online = useOnline();

  const goReset = () => { setMode('reset'); setError(''); setResetError(''); setResetSent(false); };
  const goLogin = () => { setMode('login'); setError(''); setResetError(''); setResetSent(false); };

  const handleReset = async () => {
    if (!email.trim()) return;
    setResetError(''); setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      const code = err?.code || '';
      setResetError(
        code === 'auth/user-not-found' ? (t('reset_err_notfound') || 'No account found with that email.')
        : code === 'auth/invalid-email' ? (t('reset_err_invalid') || 'Enter a valid email address.')
        : (t('reset_err_invalid') && err?.message) || 'Could not send the reset email. Try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Offline + no cached session (this page renders only when there's no Firebase
  // user). Sign-in needs the network, so show a clear "connect once" message
  // instead of a dead form — a first online sign-in is unavoidable, after which
  // the session persists (IndexedDB) and the app cold-boots offline at venues.
  if (!online) {
    return (
      <div style={{
        minHeight: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <ReadsWordmark width={220} tagline />
          <div data-testid="login-offline" style={{
            width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center',
          }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700, color: COLORS.danger }}>
              {t('login_offline_title')}
            </div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {t('login_offline_body')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Password reset (A1) — Firebase-native reset email. Shown when the user taps
  // "Forgot password?" on the sign-in form.
  if (mode === 'reset') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleReset(); }}
          style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <ReadsWordmark width={220} tagline />
          <div style={{ width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700, color: COLORS.text, textAlign: 'center' }}>
              {t('reset_title') || 'Reset password'}
            </div>
            {resetSent ? (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.success, lineHeight: 1.5, textAlign: 'center' }}>
                {t('reset_sent', email.trim())}
              </div>
            ) : (
              <>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 1.5 }}>
                  {t('reset_intro') || 'Enter your account email — we’ll send a link to set a new password.'}
                </div>
                <Field label={t('login_field_email')}>
                  <TextInput value={email} onChange={setEmail} placeholder={t('email_placeholder_example')} type="email" autoComplete="email" autoFocus />
                </Field>
                {resetError && (
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.danger, padding: '8px 12px', background: COLORS.danger + '15', borderRadius: 8 }}>
                    {resetError}
                  </div>
                )}
                <button type="submit" disabled={!email.trim() || loading}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 10, marginTop: 4,
                    background: (email.trim() && !loading) ? COLORS.accentGradient : COLORS.border,
                    color: (email.trim() && !loading) ? COLORS.black : COLORS.textMuted,
                    boxShadow: (email.trim() && !loading) ? COLORS.accentGlow : 'none',
                    border: 'none', fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 800,
                    cursor: (email.trim() && !loading) ? 'pointer' : 'default', minHeight: TOUCH.minTarget || 44,
                  }}>
                  {loading ? (t('reset_sending') || 'Sending…') : (t('reset_send_btn') || 'Send reset link')}
                </button>
              </>
            )}
            <button type="button" onClick={goLogin}
              style={{ background: 'transparent', border: 'none', color: COLORS.accent, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, cursor: 'pointer', padding: '6px 0', minHeight: 44 }}>
              {t('reset_back') || '← Back to sign in'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const isLogin = mode === 'login';
  const canSubmit = email.trim() && password.trim() && (isLogin || displayName.trim()) && !loading;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email.trim(), password);
      } else {
        if (password.length < 6) throw { code: 'auth/weak-password' };
        await registerWithEmail(email.trim(), password, displayName.trim());
      }
      // Auth state listener in WorkspaceProvider will route forward.
    } catch (err) {
      setError(mapAuthError(err, t));
      setLoading(false);
    }
  };

  return (
    <>
      <ReadsWelcomeSplash />
      <div style={{
        minHeight: '100vh', background: COLORS.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}>
        <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        <ReadsWordmark width={220} tagline />

        <div style={{
          width: '100%', background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 14, padding: 24,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700,
            color: COLORS.text, textAlign: 'center', marginBottom: 4,
          }}>
            {isLogin ? t('login_title_signin') : t('login_title_register')}
          </div>

          {!isLogin && (
            <Field label={t('login_field_display_name')}>
              <TextInput value={displayName} onChange={setDisplayName}
                placeholder={t('b13_eg_kacper')} autoComplete="name" autoFocus />
            </Field>
          )}

          <Field label={t('login_field_email')}>
            <TextInput value={email} onChange={setEmail} placeholder={t('email_placeholder_example')}
              type="email" autoComplete="email" autoFocus={isLogin} />
          </Field>

          <Field label={t('login_field_password')}>
            <TextInput value={password} onChange={setPassword} placeholder="••••••"
              type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} />
          </Field>

          {error && (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.danger,
              padding: '8px 12px', background: COLORS.danger + '15', borderRadius: 8,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, marginTop: 4,
              background: canSubmit ? COLORS.accentGradient : COLORS.border,
              color: canSubmit ? COLORS.black : COLORS.textMuted,
              boxShadow: canSubmit ? COLORS.accentGlow : 'none',
              border: 'none', fontFamily: FONT, fontSize: FONT_SIZE.md,
              fontWeight: 800, cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.15s', minHeight: TOUCH.minTarget || 44,
            }}>
            {loading ? t('login_loading') : isLogin ? t('login_submit_login') : t('login_submit_register')}
          </button>

          <button
            type="button"
            onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}
            style={{
              background: 'transparent', border: 'none', color: COLORS.accent,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
              cursor: 'pointer', padding: '6px 0', minHeight: 44,
            }}>
            {isLogin ? t('login_switch_to_register') : t('login_switch_to_login')}
          </button>

          {isLogin && (
            <button
              type="button"
              onClick={goReset}
              style={{
                background: 'transparent', border: 'none', color: COLORS.textMuted,
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                cursor: 'pointer', padding: '2px 0', minHeight: 44,
              }}>
              {t('forgot_password') || 'Forgot password?'}
            </button>
          )}
        </div>
        </form>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
        color: COLORS.textMuted, marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: 0.4,
      }}>
        {label}
      </div>
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', autoComplete, autoFocus }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      autoCapitalize="off"
      spellCheck="false"
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 10,
        border: `1px solid ${COLORS.border}`, background: COLORS.bg,
        color: COLORS.text, fontFamily: FONT, fontSize: 16,
        fontWeight: 500, outline: 'none', boxSizing: 'border-box',
        minHeight: 44, transition: 'border-color 0.15s',
      }}
      onFocus={e => (e.target.style.borderColor = COLORS.accent)}
      onBlur={e => (e.target.style.borderColor = COLORS.border)}
    />
  );
}

function mapAuthError(err, t) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return t('login_auth_err_credentials');
  }
  if (code === 'auth/invalid-email') return t('login_auth_err_invalid_email');
  if (code === 'auth/email-already-in-use') return t('login_auth_err_email_in_use');
  if (code === 'auth/weak-password') return t('login_auth_err_weak_password');
  if (code === 'auth/network-request-failed') return t('login_auth_err_network');
  if (code === 'auth/too-many-requests') return t('login_auth_err_too_many');
  if (code === 'auth/operation-not-allowed') return t('login_auth_err_not_allowed');
  return err?.message || t('login_auth_err_generic');
}
