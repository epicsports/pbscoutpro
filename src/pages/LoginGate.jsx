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

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 10 }}>🎯</div>
          <h1 style={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, color: COLORS.accent, margin: 0, letterSpacing: 2 }}>{APP_NAME}</h1>
          <p style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim, margin: '8px 0 0', lineHeight: 1.5 }}>
            Paintball Scouting Tool
          </p>
        </div>

        <div style={{
          width: '100%', background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div>
            <label style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 700, color: COLORS.text, display: 'block', marginBottom: 8 }}>
              Kod drużyny
            </label>
            <p style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textMuted, margin: '0 0 12px', lineHeight: 1.5 }}>
              Wpisz kod swojego teamu. Istniejący kod załaduje dane, nowy stworzy przestrzeń.
            </p>
            <input type="text" value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="np. venom-squad" autoFocus autoComplete="off" autoCapitalize="off" spellCheck="false"
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 10,
                border: `2px solid ${COLORS.border}`, background: COLORS.bg,
                color: COLORS.text, fontFamily: FONT, fontSize: TOUCH.fontXl,
                fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                textAlign: 'center', letterSpacing: 1, transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = COLORS.accent)}
              onBlur={e => (e.target.style.borderColor = COLORS.border)}
            />
          </div>

          {externalError && (
            <div style={{
              fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.danger,
              background: COLORS.dangerDim + '30', padding: '10px 14px',
              borderRadius: 8, border: `1px solid ${COLORS.danger}30`,
            }}>{externalError}</div>
          )}

          <button onClick={handleSubmit} disabled={!code.trim() || loading}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: 10,
              border: 'none', background: COLORS.accent,
              color: '#000', fontFamily: FONT, fontSize: TOUCH.fontLg,
              fontWeight: 800, cursor: !code.trim() || loading ? 'not-allowed' : 'pointer',
              opacity: !code.trim() || loading ? 0.4 : 1, transition: 'all 0.15s',
              minHeight: TOUCH.targetLg,
            }}
            onMouseEnter={e => !loading && (e.target.style.filter = 'brightness(1.1)')}
            onMouseLeave={e => (e.target.style.filter = 'none')}>
            {loading ? '⏳ Łączenie...' : '🔓 Wejdź'}
          </button>
        </div>

        <p style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted + '80', textAlign: 'center', lineHeight: 1.6 }}>
          Udostępnij kod członkom teamu — każdy z tym kodem widzi dane w real-time.
          <br />created by {APP_AUTHOR}
        </p>
      </div>
    </div>
  );
}
