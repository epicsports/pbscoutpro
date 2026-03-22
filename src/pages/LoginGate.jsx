import React, { useState } from 'react';
import { COLORS, FONT } from '../utils/theme';

export default function LoginGate({ onEnter, error: externalError }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'checking' | 'existing' | 'new' | null

  const handleSubmit = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setStatus('checking');
    const ok = await onEnter(code);
    if (!ok) {
      setStatus(null);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', background: COLORS.bg, display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🎯</div>
          <h1 style={{
            fontFamily: FONT, fontSize: 28, fontWeight: 800,
            color: COLORS.accent, margin: 0, letterSpacing: 2,
          }}>
            SCOUT
          </h1>
          <p style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textDim,
            margin: '6px 0 0', lineHeight: 1.5,
          }}>
            Paintball Scouting Tool
          </p>
        </div>

        {/* Input card */}
        <div style={{
          width: '100%', background: COLORS.surface,
          border: `1px solid ${COLORS.border}`, borderRadius: 12,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <label style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 700,
              color: COLORS.text, display: 'block', marginBottom: 6,
            }}>
              Kod drużyny
            </label>
            <p style={{
              fontFamily: FONT, fontSize: 10, color: COLORS.textMuted,
              margin: '0 0 10px', lineHeight: 1.5,
            }}>
              Wpisz kod swojego teamu. Jeśli kod istnieje — załadujesz dane.
              Jeśli nie — stworzysz nową przestrzeń.
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="np. venom-squad"
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 8,
                border: `2px solid ${COLORS.border}`, background: COLORS.bg,
                color: COLORS.text, fontFamily: FONT, fontSize: 16,
                fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                textAlign: 'center', letterSpacing: 1,
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = COLORS.accent)}
              onBlur={(e) => (e.target.style.borderColor = COLORS.border)}
            />
          </div>

          {/* Error */}
          {externalError && (
            <div style={{
              fontFamily: FONT, fontSize: 10, color: COLORS.danger,
              background: COLORS.dangerDim + '30', padding: '8px 12px',
              borderRadius: 6, border: `1px solid ${COLORS.danger}30`,
            }}>
              {externalError}
            </div>
          )}

          {/* Status */}
          {status === 'checking' && (
            <div style={{
              fontFamily: FONT, fontSize: 10, color: COLORS.accent,
              textAlign: 'center',
            }}>
              Sprawdzanie...
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || loading}
            style={{
              width: '100%', padding: '12px 20px', borderRadius: 8,
              border: 'none', background: COLORS.accent,
              color: '#000', fontFamily: FONT, fontSize: 14,
              fontWeight: 800, cursor: !code.trim() || loading ? 'not-allowed' : 'pointer',
              opacity: !code.trim() || loading ? 0.4 : 1,
              transition: 'all 0.15s', letterSpacing: 0.5,
            }}
            onMouseEnter={(e) => !loading && (e.target.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.target.style.filter = 'none')}
          >
            {loading ? '⏳ Łączenie...' : '🔓 Wejdź'}
          </button>
        </div>

        {/* Footer hint */}
        <p style={{
          fontFamily: FONT, fontSize: 9, color: COLORS.textMuted,
          textAlign: 'center', lineHeight: 1.6, maxWidth: 280,
        }}>
          Kod działa jak hasło do Twojej przestrzeni danych.
          Udostępnij go członkom drużyny scoutingowej —
          każdy z tym kodem widzi te same dane w czasie rzeczywistym.
        </p>
      </div>
    </div>
  );
}
