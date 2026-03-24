import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS, FONT, TOUCH, APP_NAME } from '../utils/theme';
import { Btn, Icons } from './ui';

/**
 * Breadcrumbs now accept objects: { label: 'text', path: '/route' }
 * Or plain strings (no navigation).
 */
export default function Header({ breadcrumbs = [], rightContent }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface, flexShrink: 0, minHeight: 50,
    }}>
      {!isHome && (
        <Btn variant="ghost" size="sm" onClick={() => navigate(-1)} style={{ minWidth: 36, padding: '6px' }}>
          <Icons.Back />
        </Btn>
      )}
      {/* Logo — clickable, goes home */}
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="PbScoutPro" style={{ height: 28, width: 'auto' }} />
      </div>
      {/* Breadcrumbs — clickable if path provided */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, overflow: 'hidden' }}>
        {breadcrumbs.map((b, i) => {
          const label = typeof b === 'string' ? b : b.label;
          const path = typeof b === 'object' ? b.path : null;
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} style={{
              fontFamily: FONT, fontSize: TOUCH.fontXs,
              color: isLast ? COLORS.text : COLORS.textDim,
              display: 'flex', alignItems: 'center', gap: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              cursor: path ? 'pointer' : 'default',
              fontWeight: isLast ? 600 : 400,
            }}
            onClick={() => path && navigate(path)}>
              <Icons.Chev />
              <span style={{ textDecoration: path ? 'underline' : 'none', textDecorationColor: COLORS.textMuted + '50' }}>{label}</span>
            </span>
          );
        })}
      </div>
      {rightContent}
    </div>
  );
}
