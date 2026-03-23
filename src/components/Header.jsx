import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS, FONT, TOUCH, APP_NAME } from '../utils/theme';
import { Btn, Icons } from './ui';

export default function Header({ breadcrumbs = [], rightContent }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface, flexShrink: 0, minHeight: 52,
    }}>
      {!isHome && (
        <Btn variant="ghost" size="sm" onClick={() => navigate(-1)} style={{ minWidth: 36, padding: '6px' }}>
          <Icons.Back />
        </Btn>
      )}
      <span style={{ fontSize: 18 }}>🎯</span>
      <span style={{
        fontFamily: FONT, fontWeight: 800, fontSize: TOUCH.fontLg,
        color: COLORS.accent, letterSpacing: 0.5,
      }}>{APP_NAME}</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, flex: 1, overflow: 'hidden',
      }}>
        {breadcrumbs.map((b, i) => (
          <span key={i} style={{
            fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim,
            display: 'flex', alignItems: 'center', gap: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <Icons.Chev /> {b}
          </span>
        ))}
      </div>
      {rightContent}
    </div>
  );
}
