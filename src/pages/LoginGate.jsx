import React, { useState } from 'react';
import { COLORS, FONT, TOUCH, APP_NAME, APP_AUTHOR, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function LoginGate({ onEnter, error: externalError }) {
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

        {/* ── Combined logo: illustration + typography ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Illustration — hand squeezing bunker */}
          <picture>
            <source srcSet={`${BASE}logo-icon.webp`} type="image/webp" />
            <img
              src={`${BASE}logo-icon.png`}
              alt="PBScoutPRO"
              style={{ width: 180, height: 180, objectFit: 'contain', display: 'block' }}
            />
          </picture>
          {/* Typography — PBScoutPRO wordmark */}
          <img
            src={`${BASE}logo-text.png`}
            alt="PBScoutPRO"
            style={{ width: 280, height: 'auto', display: 'block', marginTop: -16 }}
          />
        </div>

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
              background: code.trim() ? COLORS.accent : COLORS.border,
              color: code.trim() ? '#000' : COLORS.textMuted,
              border: 'none', fontFamily: FONT, fontSize: TOUCH.fontBase,
              fontWeight: 800, cursor: code.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s', letterSpacing: 0.5,
            }}>
            {loading ? '⏳ Wczytywanie...' : '→ Enter'}
          </button>
        </div>

        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, textAlign: 'center', margin: 0 }}>
          PBScoutPRO · paintball scouting &amp; analytics
        </p>
      </div>
    </div>
  );
}
