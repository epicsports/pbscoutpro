import React, { useState } from 'react';
import { COLORS, FONT, FONT_SIZE, TOUCH } from '../utils/theme';
import { loginWithEmail, registerWithEmail } from '../services/firebase';

/**
 * LoginPage — email / password sign-in + register (§ 33).
 *
 * Appears before the workspace gate. After login, WorkspaceProvider picks up
 * the Firebase user via onAuthStateChanged and the existing LoginGate asks
 * for the workspace code.
 */
export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const BASE = import.meta.env.BASE_URL;

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
      setError(mapAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: 320,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        <picture>
          <source srcSet={`${BASE}logo.webp`} type="image/webp" />
          <img src={`${BASE}logo.png`} alt="PBScoutPRO"
            style={{ width: 200, height: 200, objectFit: 'contain', display: 'block' }} />
        </picture>

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
            {isLogin ? 'Sign in' : 'Create account'}
          </div>

          {!isLogin && (
            <Field label="Display name">
              <TextInput value={displayName} onChange={setDisplayName}
                placeholder="e.g. Kacper" autoComplete="name" autoFocus />
            </Field>
          )}

          <Field label="Email">
            <TextInput value={email} onChange={setEmail} placeholder="you@example.com"
              type="email" autoComplete="email" autoFocus={isLogin} />
          </Field>

          <Field label="Password">
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
              color: canSubmit ? '#000' : COLORS.textMuted,
              boxShadow: canSubmit ? COLORS.accentGlow : 'none',
              border: 'none', fontFamily: FONT, fontSize: FONT_SIZE.md,
              fontWeight: 800, cursor: canSubmit ? 'pointer' : 'default',
              transition: 'all 0.15s', minHeight: TOUCH.minTarget || 44,
            }}>
            {loading ? '⏳ Please wait…' : isLogin ? '→ Log in' : '→ Create account'}
          </button>

          <button
            type="button"
            onClick={() => { setMode(isLogin ? 'register' : 'login'); setError(''); }}
            style={{
              background: 'transparent', border: 'none', color: COLORS.accent,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
              cursor: 'pointer', padding: '6px 0', minHeight: 44,
            }}>
            {isLogin ? 'Create account' : 'Already have an account? Log in'}
          </button>
        </div>

        <p style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          textAlign: 'center', margin: 0,
        }}>
          PBScoutPRO · paintball scouting &amp; analytics
        </p>
      </form>
    </div>
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

function mapAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/network-request-failed') return 'Connection failed, try again.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a moment.';
  if (code === 'auth/operation-not-allowed') return 'Email/password sign-in is not enabled in Firebase.';
  return err?.message || 'Sign in failed. Try again.';
}
