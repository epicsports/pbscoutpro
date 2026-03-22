import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS, FONT } from '../utils/theme';
import { Btn, Icons } from './ui';

export default function Header({ breadcrumbs = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface, flexShrink: 0,
    }}>
      {!isHome && (
        <Btn variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <Icons.Back />
        </Btn>
      )}
      <span style={{ fontSize: 16 }}>🎯</span>
      <span style={{
        fontFamily: FONT, fontWeight: 800, fontSize: 14,
        color: COLORS.accent, letterSpacing: 0.5,
      }}>
        SCOUT
      </span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3, flex: 1, overflow: 'hidden',
      }}>
        {breadcrumbs.map((b, i) => (
          <span key={i} style={{
            fontFamily: FONT, fontSize: 10, color: COLORS.textDim,
            display: 'flex', alignItems: 'center', gap: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            <Icons.Chev /> {b}
          </span>
        ))}
      </div>
    </div>
  );
}
