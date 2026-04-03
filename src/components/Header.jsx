import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS, FONT, TOUCH, APP_NAME, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';
import { Btn, Icons } from './ui';
import { useSaveStatus } from '../hooks/useSaveStatus';

/**
 * Breadcrumbs now accept objects: { label: 'text', path: '/route' }
 * Or plain strings (no navigation).
 */
export default function Header({ breadcrumbs = [], rightContent }) {
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDevice();
  const R = responsive(device.type);
  const isHome = location.pathname === '/' || location.pathname === '';
  const headerHeight = device.isDesktop ? 44 : 52;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: device.isDesktop ? '6px 24px' : '8px 16px',
      borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface, flexShrink: 0, minHeight: headerHeight,
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      {!isHome && (
        <Btn variant="ghost" size="sm" onClick={() => navigate(-1)} style={{ minWidth: 36, padding: '6px' }}>
          <Icons.Back />
        </Btn>
      )}
      {/* Logo — typography wordmark, clickable, goes home */}
      <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <picture>
          <source srcSet={`${import.meta.env.BASE_URL}logo-header.webp`} type="image/webp" />
          <img src={`${import.meta.env.BASE_URL}logo-header.png`} alt="PBScoutPRO" style={{ height: 28, width: 'auto', display: 'block' }} />
        </picture>
      </div>
      {/* Breadcrumbs — clickable if path provided */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flex: 1, overflow: 'hidden' }}>
        {breadcrumbs.map((b, i) => {
          const label = typeof b === 'string' ? b : b.label;
          const path = typeof b === 'object' ? b.path : null;
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} style={{
              fontFamily: FONT, fontSize: R.font.xs,
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
      <SaveIndicator />
      {rightContent}
    </div>
  );
}

function SaveIndicator() {
  const { status } = useSaveStatus();
  if (status === 'idle') return null;
  const config = {
    saving: { text: 'Saving...', color: COLORS.accent },
    saved:  { text: 'Saved ✓',  color: '#22c55e' },
    error:  { text: 'Error!',   color: COLORS.danger },
  };
  const c = config[status];
  return (
    <span style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 600,
      color: c.color, whiteSpace: 'nowrap', flexShrink: 0,
      animation: status === 'saving' ? 'pulse 1.2s infinite' : 'none',
    }}>
      {c.text}
    </span>
  );
}
