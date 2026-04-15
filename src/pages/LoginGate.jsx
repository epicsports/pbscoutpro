import React, { useState } from 'react';
import { COLORS, FONT, TOUCH, APP_NAME, APP_AUTHOR, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function LoginGate({ onEnter, error: externalError, user, onSignOut }) {
  const device = useDevice();
  const R = responsive(device.type);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    await onEnter(code);
    setLoading(false);
  };

  const BASE = import.meta.env.BASE_URL;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* ── Logo ── */}
        <picture>
          <source srcSet={`${BASE}logo.webp`} type="image/webp" />
          <img
            src={`${BASE}logo.png`}
            alt="PBScoutPRO"
            style={{ width: 280, height: 280, objectFit: 'contain', display: 'block' }}
          />
        </picture>

        {/* ── Login card ── */}
        <div style={{
          width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div>
            <label style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 8 }}>
              Team code
            </label>
            <p style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, margin: '0 0 12px', lineHeight: 1.5 }}>
              Enter your team code. An existing code loads your data, a new one creates a workspace.
            </p>
            <p style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, margin: '0 0 12px', lineHeight: 1.4 }}>
              Player? Add <strong style={{ color: COLORS.accent }}>?</strong> before the code for view-only access (e.g. <em>?venom-squad</em>)
            </p>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. venom-squad" autoFocus autoComplete="off" autoCapitalize="off" spellCheck="false"
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 10,
                border: `2px solid ${COLORS.border}`, background: COLORS.bg,
                color: COLORS.text, fontFamily: FONT, fontSize: TOUCH.fontXl,
                fontWeight: 700, letterSpacing: 1, outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = COLORS.accent}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>

          {externalError && (
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.danger, padding: '8px 12px', background: COLORS.danger + '15', borderRadius: 8 }}>
              {externalError}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            style={{
              width: '100%', padding: '14px', borderRadius: 10,
              background: code.trim() ? COLORS.accentGradient : COLORS.border,
              color: code.trim() ? '#000' : COLORS.textMuted,
              boxShadow: code.trim() ? COLORS.accentGlow : 'none',
              border: 'none', fontFamily: FONT, fontSize: TOUCH.fontBase,
              fontWeight: 800, cursor: code.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s', letterSpacing: 0.5,
            }}>
            {loading ? '⏳ Loading...' : '→ Enter'}
          </button>
        </div>

        {user && !user.isAnonymous && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted,
          }}>
            <span>Signed in as <strong style={{ color: COLORS.text }}>{user.displayName || user.email}</strong></span>
            {onSignOut && (
              <button type="button" onClick={onSignOut}
                style={{
                  background: 'transparent', border: 'none', color: COLORS.accent,
                  fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 600,
                  cursor: 'pointer', padding: 4, minHeight: 32,
                }}>Sign out</button>
            )}
          </div>
        )}

        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, textAlign: 'center', margin: 0 }}>
          PBScoutPRO · paintball scouting &amp; analytics
        </p>
      </div>
    </div>
  );
}
