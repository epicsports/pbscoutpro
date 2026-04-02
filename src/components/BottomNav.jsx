import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { COLORS, FONT, TOUCH } from '../utils/theme';
import { Icons } from './ui';

const tabs = [
  { path: '/',        label: 'Home',    icon: () => <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M2 8l6-5.5L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 9v4.5a1 1 0 001 1h7a1 1 0 001-1V9" stroke="currentColor" strokeWidth="1.5"/></svg> },
  { path: '/layouts', label: 'Layouts', icon: () => <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 6h13M8 6v8" stroke="currentColor" strokeWidth="1.3"/></svg> },
  { path: '/teams',   label: 'Teams',   icon: Icons.Users },
  { path: '/players', label: 'Players', icon: Icons.DB },
];

// Pages where bottom nav is hidden (detail/sub screens)
const HIDDEN_PATTERNS = [
  /^\/layout\/.+/,
  /^\/team\/.+/,
  /^\/tournament\/.+/,
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  // Hide on detail screens
  if (HIDDEN_PATTERNS.some(p => p.test(path))) return null;

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'stretch',
      background: COLORS.surface,
      borderTop: `1px solid ${COLORS.border}`,
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(tab => {
        const active = path === tab.path;
        const Icon = tab.icon;
        return (
          <div key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '8px 0 6px', cursor: 'pointer',
              color: active ? COLORS.accent : COLORS.textMuted,
              WebkitTapHighlightColor: 'transparent',
              minHeight: 48,
            }}>
            <Icon />
            <span style={{
              fontFamily: FONT, fontSize: 10, fontWeight: active ? 700 : 400,
              letterSpacing: 0.2,
            }}>{tab.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
